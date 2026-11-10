/* ==========================================================
   stats.js — all the "smart" calculations:
   last-time numbers, personal records (PRs), overload hints,
   plateau warnings, weekly volume, streak + shields, heatmap.
   Nothing here changes data; it only reads GT.store.state.
   ========================================================== */
GT.stats = {
  st() { return GT.store.state; },

  /** Exercise object by id (or a placeholder if it was deleted) */
  exercise(id) {
    return GT.stats.st().exercises.find(e => e.id === id) ||
      { id, name: '(deleted exercise)', muscle: 'Other' };
  },
  /** Workout template by id */
  workout(id) { return GT.stats.st().workouts.find(w => w.id === id) || null; },
  /** Workout planned for a date ("YYYY-MM-DD"), or null on rest days */
  plannedFor(date) {
    const id = GT.stats.st().schedule[GT.util.dow(date)];
    return id ? GT.stats.workout(id) : null;
  },
  /** How many days per week are planned */
  plannedPerWeek() {
    const s = GT.stats.st().schedule;
    return [0, 1, 2, 3, 4, 5, 6].filter(d => s[d] && GT.stats.workout(s[d])).length;
  },
  /** First template line that uses this exercise (for target reps), if any */
  templateItem(exId) {
    for (const w of GT.stats.st().workouts) {
      const it = w.items.find(i => i.exerciseId === exId);
      if (it) return it;
    }
    return null;
  },

  /** Finished workouts, oldest first */
  sessions() {
    return GT.stats.st().sessions.slice().sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start || 0) - (b.start || 0));
  },
  /** Sets that were actually done (checked, reps > 0) */
  doneSets(ex) { return (ex.sets || []).filter(s => s.done && s.reps > 0); },
  /** Total volume (kg x reps) of a list of sets */
  volume(sets) { return sets.reduce((sum, s) => sum + s.kg * s.reps, 0); },

  /**
   * Every past session of one exercise, oldest first. Each entry:
   * { date, sets, topKg, bestE1rm, maxReps, volume }
   */
  historyFor(exId) {
    const out = [];
    for (const s of GT.stats.sessions()) {
      for (const ex of s.exercises) {
        if (ex.exerciseId !== exId || ex.skipped) continue;
        const sets = GT.stats.doneSets(ex);
        if (!sets.length) continue;
        out.push({
          date: s.date,
          sessionId: s.id,
          sets,
          topKg: Math.max(...sets.map(x => x.kg)),
          bestE1rm: Math.max(...sets.map(x => GT.util.e1rm(x.kg, x.reps))),
          maxReps: Math.max(...sets.map(x => x.reps)),
          volume: GT.stats.volume(sets),
        });
      }
    }
    return out;
  },
  /**
   * Your starting weight for an exercise (from GT.data.STARTING_WEIGHTS), shaped
   * like a history entry with baseline: true. Null if there is none.
   */
  baselineFor(exId) {
    const sets = (GT.stats.st().baselines || {})[exId];
    if (!sets || !sets.length) return null;
    return {
      date: null,
      baseline: true,
      sets: sets.map(s => ({ kg: s.kg, reps: s.reps, done: true })),
      topKg: Math.max(...sets.map(x => x.kg)),
      bestE1rm: Math.max(...sets.map(x => GT.util.e1rm(x.kg, x.reps))),
      maxReps: Math.max(...sets.map(x => x.reps)),
      volume: GT.stats.volume(sets),
    };
  },

  /** The most recent session of an exercise; falls back to your starting weight (or null) */
  lastFor(exId) {
    const h = GT.stats.historyFor(exId);
    return h.length ? h[h.length - 1] : GT.stats.baselineFor(exId);
  },

  /** "(10 Nov)" for a logged session, "(starting weight)" for a baseline */
  whenText(entry) {
    return entry.baseline ? '(starting weight)' : '(' + GT.util.fmtDay(entry.date) + ')';
  },

  /** Sets as short text, e.g. "50 kg × 8, 8, 7" or "8, 7, 6 reps" */
  setsText(sets, timed) {
    if (!sets || !sets.length) return '';
    const same = sets.every(s => s.kg === sets[0].kg);
    const reps = sets.map(s => s.reps).join(', ');
    if (same && sets[0].kg === 0) return reps + (timed ? ' sec' : ' reps');
    if (same) return GT.util.fmtKg(sets[0].kg) + ' kg × ' + reps;
    return sets.map(s => GT.util.fmtKg(s.kg) + '×' + s.reps).join(', ');
  },

  /** Personal records for an exercise, worked out from its history */
  records(exId, history) {
    const h = history || GT.stats.historyFor(exId);
    const rec = { maxKg: 0, maxKgDate: null, maxE1rm: 0, maxE1rmDate: null, maxReps: 0, repsAt: {}, sessions: h.length };
    h.forEach(e => {
      e.sets.forEach(s => {
        const e1 = GT.util.e1rm(s.kg, s.reps);
        if (s.kg > rec.maxKg) { rec.maxKg = s.kg; rec.maxKgDate = e.date; }
        if (e1 > rec.maxE1rm) { rec.maxE1rm = e1; rec.maxE1rmDate = e.date; }
        if (s.reps > rec.maxReps) rec.maxReps = s.reps;
        const k = String(s.kg);
        if (!rec.repsAt[k] || s.reps > rec.repsAt[k]) rec.repsAt[k] = s.reps;
      });
    });
    return rec;
  },

  /**
   * Compare a just-finished session against all earlier history.
   * Returns a list of new PRs: heaviest weight, best e1RM, most reps at a weight.
   * The very first time you do an exercise is your baseline, not a PR.
   */
  detectPRs(session) {
    const prs = [];
    const U = GT.util;
    session.exercises.forEach(ex => {
      if (ex.skipped) return;
      const sets = GT.stats.doneSets(ex);
      if (!sets.length) return;
      let hist = GT.stats.historyFor(ex.exerciseId);
      // No logged history yet: compare with your starting weight, if you gave one
      if (!hist.length && GT.stats.baselineFor(ex.exerciseId)) hist = [GT.stats.baselineFor(ex.exerciseId)];
      if (!hist.length) return; // truly the first time = baseline, not a PR
      const rec = GT.stats.records(ex.exerciseId, hist);
      const name = GT.stats.exercise(ex.exerciseId).name;
      const unit = GT.stats.exercise(ex.exerciseId).timed ? 'sec' : 'reps';

      const topKg = Math.max(...sets.map(s => s.kg));
      const weightPR = topKg > 0 && topKg > rec.maxKg;
      if (weightPR) {
        prs.push({ exerciseId: ex.exerciseId, type: 'weight', text: name + ': heaviest ever, ' + U.fmtKg(topKg) + ' kg' });
      }
      // e1RM PR only when it isn't already a weight PR (avoids counting the same lift twice)
      const best = Math.max(...sets.map(s => U.e1rm(s.kg, s.reps)));
      if (!weightPR && best > 0 && best > rec.maxE1rm + 0.05) {
        prs.push({ exerciseId: ex.exerciseId, type: 'e1rm', text: name + ': best estimated 1RM, ' + U.round1(best) + ' kg' });
      }
      // Most reps at a weight you've lifted before (pick the heaviest such set)
      let repPR = null;
      sets.forEach(s => {
        const prev = rec.repsAt[String(s.kg)];
        if (prev && s.reps > prev && (!repPR || s.kg > repPR.kg)) repPR = s;
      });
      if (repPR) {
        prs.push({ exerciseId: ex.exerciseId, type: 'reps',
          text: name + ': ' + repPR.reps + ' ' + unit + (repPR.kg ? ' at ' + U.fmtKg(repPR.kg) + ' kg' : '') });
      }
    });
    return prs;
  },

  /**
   * Progressive overload hint. If last time EVERY target set reached the top of
   * the rep range, suggest +2.5 kg. Otherwise suggest beating last time by a rep.
   */
  overloadHint(exId, item) {
    const last = GT.stats.lastFor(exId);
    if (!last) return null;
    const it = item || GT.stats.templateItem(exId) || { sets: 3, repMax: 12 };
    const timed = GT.stats.exercise(exId).timed;
    const hitAll = last.sets.length >= it.sets && last.sets.every(s => s.reps >= it.repMax);
    if (hitAll && last.topKg > 0) {
      return { type: 'up', kg: last.topKg + 2.5,
        text: 'You hit all ' + it.repMax + ' reps last time. Try ' + GT.util.fmtKg(last.topKg + 2.5) + ' kg today.' };
    }
    if (hitAll) {
      return { type: 'up', text: timed ? 'All targets hit. Hold longer or add weight.' : 'All targets hit. Add weight or slow the reps down.' };
    }
    return { type: 'beat', text: 'Beat last time: one more ' + (timed ? 'second' : 'rep') + ' on any set wins.' };
  },

  /**
   * Plateau = the best of your last 3 sessions is not better than your best before them.
   * Uses estimated 1RM (or max reps for bodyweight/timed exercises). Needs 4+ sessions.
   */
  plateau(exId) {
    const h = GT.stats.historyFor(exId);
    if (h.length < 4) return false;
    const metric = e => (e.topKg > 0 ? e.bestE1rm : e.maxReps);
    const recent = Math.max(...h.slice(-3).map(metric));
    const before = Math.max(...h.slice(0, -3).map(metric));
    return recent <= before;
  },

  /** Sets + volume per muscle group for the week starting on Monday `ws` */
  weeklyMuscle(ws) {
    const end = GT.util.addDays(ws, 6);
    const map = {};
    GT.stats.st().sessions.forEach(s => {
      if (s.date < ws || s.date > end) return;
      s.exercises.forEach(ex => {
        if (ex.skipped) return;
        const sets = GT.stats.doneSets(ex);
        if (!sets.length) return;
        const m = GT.stats.exercise(ex.exerciseId).muscle;
        map[m] = map[m] || { muscle: m, sets: 0, volume: 0 };
        map[m].sets += sets.length;
        map[m].volume += GT.stats.volume(sets);
      });
    });
    return Object.values(map).sort((a, b) => b.sets - a.sets);
  },

  /** Set of dates where a workout counted (minimum version reached) */
  countedDates() {
    return new Set(GT.stats.st().sessions.filter(s => s.minDone).map(s => s.date));
  },

  /**
   * Streak, counted in training days.
   * Walk day by day from your first workout to today:
   *  - a day with a counted workout: +1
   *  - a planned day that you missed: uses that week's shield (1 per Mon-Sun week);
   *    if the shield is already used, the streak resets to 0
   *  - rest days do nothing. Today only counts as missed once it's over.
   * Note: it uses your CURRENT schedule for past weeks too.
   */
  streak() {
    const U = GT.util;
    const st = GT.stats.st();
    const today = U.today();
    const all = GT.stats.sessions().filter(s => s.minDone);
    const result = { current: 0, best: 0, shieldReady: true, shieldSaves: 0 };
    if (!all.length) return result;
    const done = GT.stats.countedDates();
    const shieldUsed = {};
    let cur = 0, best = 0;
    for (let d = all[0].date; d <= today; d = U.addDays(d, 1)) {
      const planned = !!(st.schedule[U.dow(d)] && GT.stats.workout(st.schedule[U.dow(d)]));
      if (done.has(d)) {
        cur++;
      } else if (planned && d < today) {
        const wk = U.weekStart(d);
        if (!shieldUsed[wk]) { shieldUsed[wk] = true; result.shieldSaves++; }
        else cur = 0;
      }
      if (cur > best) best = cur;
    }
    result.current = cur;
    result.best = best;
    result.shieldReady = !shieldUsed[U.weekStart(today)];
    return result;
  },

  /** This week's 7 days (Mon-Sun) with planned/done/missed flags */
  weekDays(dateInWeek) {
    const U = GT.util;
    const today = U.today();
    const ws = U.weekStart(dateInWeek || today);
    const done = GT.stats.countedDates();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(ws, i);
      const w = GT.stats.plannedFor(d);
      days.push({
        date: d,
        label: U.DAY_SHORT[U.dow(d)].charAt(0),
        planned: !!w,
        workout: w,
        done: done.has(d),
        // days before you started using the app don't count as missed
        missed: !!w && !done.has(d) && d < today && d >= GT.stats.st().settings.startDate,
        isToday: d === today,
      });
    }
    return days;
  },

  /** Workouts done vs planned in the week containing `date` */
  weekSummary(date) {
    const days = GT.stats.weekDays(date);
    return {
      days,
      planned: days.filter(d => d.planned).length,
      done: days.filter(d => d.done).length,
    };
  },

  /** Heatmap: `weeks` columns of 7 days (Mon-Sun), each { date, volume, count, level } */
  heatmap(weeks) {
    const U = GT.util;
    const today = U.today();
    const start = U.addDays(U.weekStart(today), -(weeks - 1) * 7);
    const byDate = {};
    GT.stats.st().sessions.forEach(s => {
      byDate[s.date] = byDate[s.date] || { volume: 0, count: 0 };
      byDate[s.date].count++;
      s.exercises.forEach(ex => { if (!ex.skipped) byDate[s.date].volume += GT.stats.volume(GT.stats.doneSets(ex)); });
    });
    const max = Math.max(1, ...Object.values(byDate).map(v => v.volume));
    const cells = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = U.addDays(start, i);
      const v = byDate[d] || { volume: 0, count: 0 };
      let level = 0;
      if (v.count) level = Math.max(1, Math.min(4, Math.ceil((v.volume / max) * 4)));
      cells.push({ date: d, volume: v.volume, count: v.count, level, future: d > today, isToday: d === today });
    }
    return cells;
  },

  /** Lifetime totals */
  totals() {
    let sets = 0, volume = 0;
    GT.stats.st().sessions.forEach(s => s.exercises.forEach(ex => {
      if (ex.skipped) return;
      const ds = GT.stats.doneSets(ex);
      sets += ds.length;
      volume += GT.stats.volume(ds);
    }));
    return { workouts: GT.stats.st().sessions.length, sets, volume };
  },
};
