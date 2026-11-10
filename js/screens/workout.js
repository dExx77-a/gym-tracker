/* ==========================================================
   screens/workout.js — live workout logging + the summary screen.

   While you train, the workout lives in state.activeSession and is saved
   after every change (so a refresh or closed tab doesn't lose it).
   When you press Finish it moves into state.sessions.
   ========================================================== */
GT.workout = {
  summaryInfo: null, // extra info for the summary screen (level up, new achievements)

  /** Create a new session from a workout template, pre-filled with last time's numbers */
  start(workoutId) {
    const st = GT.store.state;
    if (st.activeSession) {
      GT.ui.confirm('Workout already running',
        'Discard "' + st.activeSession.name + '" and start a new workout?', 'Discard and start',
        () => { st.activeSession = null; GT.workout.start(workoutId); }, true);
      return;
    }
    const w = GT.stats.workout(workoutId);
    if (!w) return;
    st.activeSession = {
      id: GT.util.uid(),
      workoutId: w.id,
      name: w.name,
      date: GT.util.today(),
      start: Date.now(),
      end: null,
      notes: '',
      minExercises: w.minExercises,
      exercises: w.items.map(it => GT.workout.newExercise(it)),
    };
    GT.store.save();
    GT.app.go('#workout');
  },

  /** One exercise in a session. Sets are pre-filled from the last time you did it. */
  newExercise(it) {
    const last = GT.stats.lastFor(it.exerciseId);
    const sets = [];
    for (let i = 0; i < it.sets; i++) {
      const prev = last ? (last.sets[i] || last.sets[last.sets.length - 1]) : null;
      sets.push({ kg: prev ? prev.kg : 0, reps: prev ? prev.reps : it.repMin, done: false });
    }
    return {
      exerciseId: it.exerciseId, skipped: false, notes: '',
      target: { sets: it.sets, repMin: it.repMin, repMax: it.repMax, rest: it.rest },
      sets,
    };
  },

  /** Count checked sets in the running session */
  countDone(s) {
    return s.exercises.reduce((n, ex) => n + (ex.skipped ? 0 : ex.sets.filter(x => x.done).length), 0);
  },
  countAll(s) {
    return s.exercises.reduce((n, ex) => n + (ex.skipped ? 0 : ex.sets.length), 0);
  },

  /** Finish button */
  finish() {
    const s = GT.store.state.activeSession;
    const done = GT.workout.countDone(s);
    if (!done) {
      GT.ui.confirm('Nothing logged yet', 'No sets are checked. Discard this workout?', 'Discard',
        () => GT.workout.discard(), true);
      return;
    }
    GT.ui.confirm('Finish workout?', done + ' sets logged. Unchecked sets will not be saved.', 'Finish', () => GT.workout.complete());
  },

  discard() {
    GT.store.state.activeSession = null;
    GT.store.save();
    GT.timer.stop();
    GT.app.go('#today');
  },

  /** Save the session into history, work out PRs/XP/streak, show the summary */
  complete() {
    const st = GT.store.state;
    const s = st.activeSession;
    const levelBefore = GT.game.levelInfo(GT.game.totalXP()).level;

    s.end = Date.now();
    // Keep only sets you actually did
    s.exercises.forEach(ex => { ex.sets = ex.sets.filter(x => x.done && x.reps > 0); });
    // Minimum version: every non-skipped exercise among the first N has at least one set
    const minList = s.exercises.slice(0, s.minExercises).filter(ex => !ex.skipped);
    s.minDone = minList.every(ex => ex.sets.length > 0);
    // Bonus: you did something beyond the minimum
    s.bonus = s.exercises.slice(s.minExercises).some(ex => !ex.skipped && ex.sets.length > 0);
    // PRs are checked against history BEFORE this session is added
    s.prs = GT.stats.detectPRs(s);

    st.sessions.push(s);
    st.activeSession = null;
    GT.store.save();
    GT.timer.stop();

    const levelAfter = GT.game.levelInfo(GT.game.totalXP()).level;
    GT.workout.summaryInfo = {
      id: s.id,
      levelUp: levelAfter > levelBefore ? levelAfter : 0,
      achievements: GT.game.checkNew(),
    };
    GT.app.go('#summary/' + s.id);
  },
};

/* ---------- The logging screen ---------- */
GT.screens.workout = {
  render(view) {
    const h = GT.ui.h;
    const s = GT.store.state.activeSession;
    if (!s) {
      view.appendChild(h('section', { class: 'card' }, GT.ui.empty('dumbbell', 'No workout running',
        'Start one from the Today screen.',
        h('button', { class: 'btn btn-primary', onclick: () => GT.app.go('#today') }, 'Go to Today'))));
      return;
    }
    const me = GT.screens.workout;

    // Sticky header: name, time, progress
    const timeEl = h('span', { class: 'num' }, GT.util.fmtClock((Date.now() - s.start) / 1000));
    me.progressText = h('span', { class: 'num' });
    me.progressBar = h('div');
    view.appendChild(h('section', { class: 'card wo-head' },
      h('div', { class: 'spread' },
        h('div', null, h('h1', null, s.name), h('div', { class: 'muted small row' }, GT.ui.icon('clock', 'icon-sm'), timeEl, ' · ', me.progressText)),
        h('button', { class: 'btn btn-good', onclick: GT.workout.finish }, GT.ui.icon('flag'), 'Finish')),
      h('div', { class: 'progress-line' }, me.progressBar),
      h('div', { class: 'muted tiny' }, GT.data.INTENSITY_TIP)));
    me.updateProgress();

    // Clock that ticks every second; stopped when you leave the screen
    const iv = setInterval(() => { timeEl.textContent = GT.util.fmtClock((Date.now() - s.start) / 1000); }, 1000);
    GT.app.cleanup = () => clearInterval(iv);

    // Exercise cards
    me.cards = [];
    const list = h('div', { class: 'stack', style: 'gap:14px' });
    s.exercises.forEach((ex, i) => {
      const card = me.exerciseCard(ex, i);
      me.cards.push(card);
      list.appendChild(card);
    });
    view.appendChild(list);

    // Add an extra exercise to this session only
    view.appendChild(h('button', { class: 'btn btn-block', onclick: () => GT.ui.pickExercise(id => {
      const it = GT.stats.templateItem(id) || { exerciseId: id, sets: 3, repMin: 8, repMax: 12, rest: 90 };
      s.exercises.push(GT.workout.newExercise(Object.assign({}, it, { exerciseId: id })));
      GT.store.save();
      GT.app.render();
    }) }, GT.ui.icon('plus'), 'Add exercise'));

    // Workout notes
    view.appendChild(h('section', { class: 'card' },
      h('label', { class: 'field' }, 'Workout notes',
        h('textarea', { class: 'input', placeholder: 'How did it feel? Sleep, energy, pain...',
          value: s.notes, oninput: e => { s.notes = e.target.value; GT.store.save(); } }))));

    view.appendChild(h('button', { class: 'btn btn-good btn-big', onclick: GT.workout.finish }, GT.ui.icon('flag'), 'Finish workout'));
    view.appendChild(h('button', { class: 'btn btn-ghost btn-block', style: 'color:var(--bad)',
      onclick: () => GT.ui.confirm('Discard workout?', 'Everything logged in this workout will be lost.', 'Discard', GT.workout.discard, true) },
      GT.ui.icon('trash'), 'Discard workout'));
  },

  updateProgress() {
    const me = GT.screens.workout, s = GT.store.state.activeSession;
    if (!s || !me.progressText) return;
    const done = GT.workout.countDone(s), all = GT.workout.countAll(s);
    me.progressText.textContent = done + ' / ' + all + ' sets';
    me.progressBar.style.width = (all ? done / all * 100 : 0) + '%';
  },

  /** Redraw just one exercise card (keeps your scroll position) */
  refreshCard(i) {
    const me = GT.screens.workout, s = GT.store.state.activeSession;
    const fresh = me.exerciseCard(s.exercises[i], i);
    me.cards[i].replaceWith(fresh);
    me.cards[i] = fresh;
    me.updateProgress();
  },

  /** One exercise: header, last time, hint, set rows, quick buttons */
  exerciseCard(ex, i) {
    const h = GT.ui.h, S = GT.stats, me = GT.screens.workout;
    const s = GT.store.state.activeSession;
    const info = S.exercise(ex.exerciseId);
    const t = ex.target;
    const isMin = i < s.minExercises;
    const allDone = !ex.skipped && ex.sets.length && ex.sets.every(x => x.done);
    const save = () => GT.store.save();
    const refresh = () => { save(); me.refreshCard(i); };

    const card = h('section', { class: 'card ex-card' + (allDone ? ' complete' : '') + (ex.skipped ? ' skipped' : '') },
      h('div', { class: 'spread' },
        h('div', { class: 'grow' },
          h('h3', null, info.name),
          h('div', { class: 'muted small' }, t.sets + ' × ' + t.repMin + '–' + t.repMax + (info.timed ? ' sec' : ' reps') + ' · rest ' + t.rest + 's')),
        isMin ? h('span', { class: 'badge badge-accent' }, 'MINIMUM') : h('span', { class: 'badge' }, 'BONUS')));

    if (ex.skipped) {
      card.appendChild(h('div', { class: 'spread' },
        h('span', { class: 'muted' }, 'Skipped. No penalty.'),
        h('button', { class: 'btn btn-sm', onclick: () => { ex.skipped = false; refresh(); } }, 'Undo')));
      return card;
    }

    // Last time + coaching hint
    const last = S.lastFor(ex.exerciseId);
    if (last) {
      card.appendChild(h('div', { class: 'small' }, h('b', null, last.baseline ? 'Starting weight: ' : 'Last time: '), S.setsText(last.sets, info.timed)));
      const hint = S.overloadHint(ex.exerciseId, t);
      if (hint) card.appendChild(h('div', { class: 'chip ' + (hint.type === 'up' ? 'chip-good' : 'chip-accent') },
        GT.ui.icon(hint.type === 'up' ? 'trend' : 'target'), h('span', null, hint.text)));
    } else {
      card.appendChild(h('div', { class: 'small muted' }, 'First time: pick a weight you can do for ' + t.repMax + ' clean reps.'));
    }

    // Set rows
    card.appendChild(h('div', { class: 'set-head' }, h('span', null, '#'), h('span', null, 'kg'),
      h('span', null, info.timed ? 'sec' : 'reps'), h('span', null, 'done')));
    ex.sets.forEach((set, j) => {
      const row = h('div', { class: 'set-row' + (set.done ? ' done' : '') },
        h('div', { class: 'set-n' }, j + 1),
        me.stepper(set, 'kg', 2.5, save),
        me.stepper(set, 'reps', 1, save),
        h('button', {
          class: 'check-btn', 'aria-label': 'Set ' + (j + 1) + ' done',
          onclick: e => {
            if (!set.done && !(set.reps > 0)) { GT.ui.toast('Enter your reps first'); return; }
            set.done = !set.done;
            if (set.done) {
              GT.ui.xpPop(e.currentTarget, '+' + GT.game.XP.set + ' XP');
              GT.timer.start(t.rest);
            }
            refresh();
          },
        }, GT.ui.icon('check')));
      card.appendChild(row);
    });

    // Quick buttons: change all sets that aren't done yet
    const notDone = () => ex.sets.filter(x => !x.done);
    card.appendChild(h('div', { class: 'tool-row' },
      h('button', { class: 'btn btn-sm', onclick: () => { notDone().forEach(x => { x.kg = Math.round((x.kg + 2.5) * 100) / 100; }); refresh(); } }, '+2.5 kg'),
      h('button', { class: 'btn btn-sm', onclick: () => { notDone().forEach(x => { x.reps += 1; }); refresh(); } }, '+1 rep'),
      h('button', { class: 'btn btn-sm', onclick: () => {
        const lastSet = ex.sets[ex.sets.length - 1] || { kg: 0, reps: t.repMin };
        ex.sets.push({ kg: lastSet.kg, reps: lastSet.reps, done: false });
        refresh();
      } }, '+ Set'),
      h('button', { class: 'btn btn-sm', onclick: () => { if (ex.sets.length > 1) { ex.sets.pop(); refresh(); } } }, '− Set')));

    // Notes + skip
    const notes = h('textarea', { class: 'input' + (ex.notes ? '' : ' hidden'), placeholder: 'Notes: seat height, grip, how it felt...',
      value: ex.notes, oninput: e => { ex.notes = e.target.value; save(); } });
    card.appendChild(h('div', { class: 'row' },
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { notes.classList.toggle('hidden'); notes.focus(); } },
        GT.ui.icon('note', 'icon-sm'), 'Note'),
      h('div', { class: 'grow' }),
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { ex.skipped = true; refresh(); } },
        GT.ui.icon('skip', 'icon-sm'), 'Skip exercise')));
    card.appendChild(notes);
    return card;
  },

  /** [-] [value] [+] control for kg or reps */
  stepper(set, key, step, onChange) {
    const h = GT.ui.h;
    const input = h('input', {
      type: 'text', inputmode: key === 'kg' ? 'decimal' : 'numeric', value: GT.util.fmtKg(set[key]),
      'aria-label': key,
      onfocus: e => e.target.select(),
      onchange: e => {
        set[key] = Math.max(0, GT.util.toNum(e.target.value));
        if (key === 'reps') set[key] = Math.round(set[key]);
        e.target.value = GT.util.fmtKg(set[key]);
        onChange();
      },
    });
    const bump = d => {
      set[key] = Math.max(0, Math.round((set[key] + d) * 100) / 100);
      input.value = GT.util.fmtKg(set[key]);
      onChange();
    };
    return h('div', { class: 'stepper' },
      h('button', { type: 'button', 'aria-label': 'Less ' + key, onclick: () => bump(-step) }, GT.ui.icon('minus')),
      input,
      h('button', { type: 'button', 'aria-label': 'More ' + key, onclick: () => bump(step) }, GT.ui.icon('plus')));
  },
};

/* ---------- Summary after finishing ---------- */
GT.screens.summary = {
  render(view, id) {
    const h = GT.ui.h, U = GT.util, S = GT.stats;
    const s = GT.store.state.sessions.find(x => x.id === id);
    if (!s) { GT.app.go('#today'); return; }
    const extra = GT.workout.summaryInfo && GT.workout.summaryInfo.id === id ? GT.workout.summaryInfo : null;

    let sets = 0, volume = 0;
    s.exercises.forEach(ex => { if (!ex.skipped) { const d = S.doneSets(ex); sets += d.length; volume += S.volume(d); } });
    const xp = GT.game.sessionXP(s);
    const streak = S.streak();

    view.appendChild(h('section', { class: 'card summary-hero' },
      h('div', { class: 'ring' }, GT.ui.icon('check')),
      h('h1', null, 'Workout complete'),
      h('p', { class: 'muted' }, s.name + ' · ' + U.fmtDate(s.date)),
      s.minDone
        ? h('span', { class: 'badge badge-good' }, GT.ui.icon('shield', 'icon-sm'), s.bonus ? 'Minimum done + bonus. Streak safe!' : 'Minimum done. Streak safe!')
        : h('span', { class: 'badge badge-warn' }, 'Minimum not reached. Doesn\'t count for the streak.')));

    view.appendChild(h('section', { class: 'card' }, h('div', { class: 'stats' },
      GT.ui.stat('Duration', U.fmtDuration(s.end - s.start)),
      GT.ui.stat('Sets', sets),
      GT.ui.stat('Volume', U.fmtNum(volume) + ' kg'),
      GT.ui.stat('XP', '+' + xp),
      GT.ui.stat('Streak', streak.current))));

    if (extra && extra.levelUp) {
      view.appendChild(h('section', { class: 'card' },
        h('div', { class: 'chip chip-accent' }, GT.ui.icon('star'),
          h('span', null, 'Level up! You are now level ' + extra.levelUp + ' (' + GT.game.rank(extra.levelUp) + ').'))));
    }

    if (s.prs && s.prs.length) {
      const card = GT.ui.card('New personal records', 'trophy');
      s.prs.forEach(p => card.appendChild(h('div', { class: 'pr-item' }, GT.ui.icon('trophy'), h('span', null, p.text))));
      view.appendChild(card);
    }

    if (extra && extra.achievements.length) {
      const card = GT.ui.card('Achievements unlocked', 'star');
      extra.achievements.forEach(a => card.appendChild(h('div', { class: 'pr-item' }, GT.ui.icon(a.icon), h('span', null, a.name + ': ' + a.desc))));
      view.appendChild(card);
    }

    // What was done
    const detail = GT.ui.card('Exercises', 'dumbbell');
    const list = h('div', { class: 'list' });
    s.exercises.forEach(ex => {
      const e = S.exercise(ex.exerciseId);
      list.appendChild(h('div', { class: 'list-item' },
        h('div', { class: 'grow' }, h('b', null, e.name),
          h('div', { class: 'muted small' }, ex.skipped ? 'Skipped' : ex.sets.length ? S.setsText(ex.sets, e.timed) : 'Not done'),
          ex.notes ? h('div', { class: 'small' }, ex.notes) : null)));
    });
    detail.appendChild(list);
    if (s.notes) detail.appendChild(h('p', { class: 'small' }, h('b', null, 'Notes: '), s.notes));
    view.appendChild(detail);

    view.appendChild(h('button', { class: 'btn btn-primary btn-big', onclick: () => GT.app.go('#today') }, 'Done'));

    // Celebrate only right after finishing (not when revisiting)
    if (extra && !extra.shown) {
      extra.shown = true;
      if (s.prs.length || extra.levelUp) GT.ui.celebrate();
      GT.game.announce(extra.achievements);
    }
  },
};
