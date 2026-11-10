/* ==========================================================
   screens/progress.js — charts, personal records, coaching hints,
   recent PRs and weekly volume per muscle group.
   #progress/<exerciseId> opens a specific exercise.
   ========================================================== */
GT.screens.progress = {
  weekOffset: 0, // 0 = this week, 1 = last week (for the muscle volume card)

  render(view, arg) {
    const h = GT.ui.h, U = GT.util, S = GT.stats;
    const st = GT.store.state;
    view.appendChild(h('h1', null, 'Progress'));

    if (!st.sessions.length) {
      view.appendChild(h('section', { class: 'card' }, GT.ui.empty('chart', 'No workouts yet',
        'Finish your first workout and your charts and records show up here.',
        h('button', { class: 'btn btn-primary', onclick: () => GT.app.go('#today') }, 'Go to Today'))));
      return;
    }

    // Exercises you have history for, most recently trained first
    const lastDate = {};
    S.sessions().forEach(s => s.exercises.forEach(ex => {
      if (!ex.skipped && S.doneSets(ex).length) lastDate[ex.exerciseId] = s.date;
    }));
    const ids = Object.keys(lastDate).sort((a, b) => lastDate[b].localeCompare(lastDate[a]));
    if (!ids.length) {
      view.appendChild(h('section', { class: 'card' }, h('p', { class: 'muted' }, 'No completed sets yet.')));
    } else {
      const current = ids.includes(arg) ? arg : ids[0];
      GT.screens.progress.exerciseSection(view, current, ids);
    }

    GT.screens.progress.recentPRs(view);
    GT.screens.progress.muscleCard(view);
  },

  /** Picker + chart + records + hints for one exercise */
  exerciseSection(view, exId, ids) {
    const h = GT.ui.h, U = GT.util, S = GT.stats;
    const ex = S.exercise(exId);
    const hist = S.historyFor(exId);
    const rec = S.records(exId, hist);
    const weighted = rec.maxKg > 0;

    const picker = h('select', { class: 'input', 'aria-label': 'Exercise',
      onchange: e => GT.app.go('#progress/' + e.target.value) },
      ids.map(id => h('option', { value: id }, S.exercise(id).name)));
    picker.value = exId;
    view.appendChild(picker);

    // Chart
    const chartCard = GT.ui.card(ex.name, 'chart');
    const canvas = h('canvas', { class: 'chart', role: 'img', 'aria-label': 'Progress chart for ' + ex.name });
    chartCard.appendChild(canvas);
    chartCard.appendChild(h('div', { class: 'legend' }, weighted
      ? [h('span', null, h('i', { style: 'background:var(--accent)' }), 'Best weight'),
         h('span', null, h('i', { style: 'background:var(--gold)' }), 'Estimated 1RM')]
      : h('span', null, h('i', { style: 'background:var(--accent)' }), ex.timed ? 'Longest set (sec)' : 'Most reps')));
    view.appendChild(chartCard);
    const x = e => U.parseDate(e.date).getTime();
    GT.chart.line(canvas, {
      height: 210,
      series: weighted
        ? [{ points: hist.map(e => ({ x: x(e), y: e.bestE1rm })), color: '--gold', dashed: true, width: 2, dots: true, dotSize: 2.5 },
           { points: hist.map(e => ({ x: x(e), y: e.topKg })), color: '--accent', width: 3, dots: true }]
        : [{ points: hist.map(e => ({ x: x(e), y: e.maxReps })), color: '--accent', width: 3, dots: true }],
    });

    // Records
    const recCard = GT.ui.card('Personal records', 'trophy');
    recCard.appendChild(h('div', { class: 'stats' },
      weighted ? GT.ui.stat('Heaviest', U.fmtKg(rec.maxKg) + ' kg', U.fmtDay(rec.maxKgDate)) : null,
      weighted ? GT.ui.stat('Best e1RM', U.round1(rec.maxE1rm) + ' kg', U.fmtDay(rec.maxE1rmDate)) : null,
      GT.ui.stat(ex.timed ? 'Longest' : 'Most reps', rec.maxReps + (ex.timed ? ' s' : '')),
      GT.ui.stat('Sessions', rec.sessions)));
    if (weighted) {
      const weights = Object.keys(rec.repsAt).map(Number).filter(k => k > 0).sort((a, b) => b - a).slice(0, 6);
      const list = h('div', { class: 'list' });
      weights.forEach(kg => list.appendChild(h('div', { class: 'list-item', style: 'min-height:40px' },
        h('span', { class: 'grow' }, U.fmtKg(kg) + ' kg'), h('b', { class: 'num' }, rec.repsAt[String(kg)] + ' reps'))));
      recCard.appendChild(h('div', { class: 'muted small' }, 'Most reps at each weight'));
      recCard.appendChild(list);
    }
    view.appendChild(recCard);

    // Coaching
    const hint = S.overloadHint(exId);
    const coach = GT.ui.card('Coach', 'target');
    if (hint) coach.appendChild(h('div', { class: 'chip ' + (hint.type === 'up' ? 'chip-good' : 'chip-accent') },
      GT.ui.icon(hint.type === 'up' ? 'trend' : 'target'), h('span', null, hint.text)));
    if (S.plateau(exId)) {
      coach.appendChild(h('div', { class: 'chip chip-warn' }, GT.ui.icon('alert'),
        h('span', null, 'Plateau: no improvement in your last 3 sessions. Try one lighter week (about -10%), sleep more, or switch rep range (e.g. 6–8 instead of 8–12).')));
    } else if (hist.length >= 2) {
      coach.appendChild(h('div', { class: 'chip chip-good' }, GT.ui.icon('check'), h('span', null, 'Still improving. Keep going.')));
    }
    if (coach.children.length > 1) view.appendChild(coach);
  },

  /** Latest PRs across all exercises */
  recentPRs(view) {
    const h = GT.ui.h;
    const items = [];
    GT.stats.sessions().slice().reverse().forEach(s => (s.prs || []).forEach(p => items.push({ date: s.date, text: p.text })));
    if (!items.length) return;
    const card = GT.ui.card('Recent PRs', 'trophy');
    items.slice(0, 8).forEach(p => card.appendChild(h('div', { class: 'pr-item' }, GT.ui.icon('trophy', 'icon-sm'),
      h('span', { class: 'grow' }, p.text), h('span', { class: 'tiny muted' }, GT.util.fmtDay(p.date)))));
    view.appendChild(card);
  },

  /** Horizontal bars: hard sets per muscle group this/last week */
  muscleCard(view) {
    const h = GT.ui.h, U = GT.util, me = GT.screens.progress;
    const ws = U.addDays(U.weekStart(U.today()), -7 * me.weekOffset);
    const data = GT.stats.weeklyMuscle(ws);
    const seg = h('div', { class: 'seg' },
      ['This week', 'Last week'].map((label, i) => h('button', { class: me.weekOffset === i ? 'on' : '',
        onclick: () => { me.weekOffset = i; GT.app.render(); } }, label)));
    const card = GT.ui.card('Volume per muscle', 'dumbbell');
    card.appendChild(seg);
    if (!data.length) {
      card.appendChild(h('p', { class: 'muted' }, 'No sets logged in this week.'));
    } else {
      const max = Math.max(...data.map(d => d.sets), 10);
      data.forEach(d => card.appendChild(h('div', { class: 'bar-row' },
        h('div', { class: 'bar-label' }, d.muscle),
        h('div', { class: 'bar-track' },
          h('div', { class: 'bar-fill', style: 'width:' + (d.sets / max * 100) + '%;opacity:.35' }),
          h('div', { class: 'bar-text' }, d.sets + ' sets · ' + U.fmtNum(d.volume) + ' kg')))));
    }
    card.appendChild(h('p', { class: 'muted small' }, 'For muscle growth, about 10–20 hard sets per muscle per week is a good target.'));
    view.appendChild(card);
  },
};
