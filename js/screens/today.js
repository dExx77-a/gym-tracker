/* ==========================================================
   screens/today.js — the home screen.
   Shows today's planned workout (or rest day), a big Start button,
   and for every exercise: what you did last time + a hint.
   ========================================================== */
GT.screens.today = {
  render(view) {
    const h = GT.ui.h, U = GT.util, S = GT.stats;
    const st = GT.store.state;
    const today = U.today();
    const workout = S.plannedFor(today);
    const doneToday = st.sessions.filter(s => s.date === today);

    // --- Workout in progress? ---
    if (st.activeSession) {
      view.appendChild(h('section', { class: 'card' },
        h('div', { class: 'chip chip-accent' }, GT.ui.icon('clock'),
          h('span', null, st.activeSession.name + ' is in progress (started ' +
            U.fmtDuration(Date.now() - st.activeSession.start) + ' ago).')),
        h('button', { class: 'btn btn-primary btn-big', onclick: () => GT.app.go('#workout') },
          GT.ui.icon('play'), 'Resume workout')));
    }

    // --- Hero card ---
    const hero = h('section', { class: 'card hero' + (workout ? '' : ' hero-rest') },
      h('div', { class: 'hero-date' }, U.DAY_LONG[U.dow(today)] + ', ' + U.fmtDay(today)));

    if (workout) {
      hero.appendChild(h('div', { class: 'hero-title' }, workout.name + ' day'));
      hero.appendChild(h('div', { class: 'row-wrap' },
        h('span', { class: 'badge' }, workout.items.length + ' exercises'),
        h('span', { class: 'badge' }, '~' + GT.screens.today.estimateMinutes(workout) + ' min'),
        doneToday.length ? h('span', { class: 'badge badge-good' }, GT.ui.icon('check', 'icon-sm'), 'Done today') : null));
      hero.appendChild(h('div', { class: 'chip chip-accent' }, GT.ui.icon('bolt'), h('span', null, GT.data.INTENSITY_TIP)));
      hero.appendChild(h('p', { class: 'muted small' },
        'Bad day? Just do the first ' + workout.minExercises + ' exercise' + (workout.minExercises === 1 ? '' : 's') +
        ' (marked in purple). It still counts for your streak.'));
      if (!st.activeSession) {
        hero.appendChild(h('button', {
          class: 'btn btn-primary btn-big',
          onclick: () => GT.workout.start(workout.id),
        }, GT.ui.icon('play'), doneToday.length ? 'Train again' : 'Start workout'));
      }
    } else {
      hero.appendChild(h('div', { class: 'row' }, GT.ui.icon('moon', 'icon-xl'),
        h('div', null, h('div', { class: 'hero-title' }, 'Rest day'),
          h('p', { class: 'muted' }, 'Muscles grow while you recover. Sleep well and eat your protein.'))));
      const next = GT.screens.today.nextTraining(today);
      if (next) hero.appendChild(h('div', { class: 'chip chip-accent' }, GT.ui.icon('calendar'),
        h('span', null, 'Next: ' + next.workout.name + ' on ' + U.DAY_LONG[U.dow(next.date)])));
    }
    view.appendChild(hero);

    // --- This week ---
    view.appendChild(GT.screens.today.weekCard());

    // --- Exercise list with last time + hints ---
    if (workout) {
      const list = GT.ui.card('What to beat today', 'target');
      const box = h('div');
      workout.items.forEach((it, i) => box.appendChild(GT.screens.today.exerciseLine(it, i, workout.minExercises)));
      list.appendChild(box);
      view.appendChild(list);
    }

    // --- Train a different workout ---
    if (!st.activeSession && st.workouts.length) {
      const other = GT.ui.card(workout ? 'Other workouts' : 'Train anyway?', 'dumbbell');
      other.appendChild(h('div', { class: 'row-wrap' },
        st.workouts.filter(w => !workout || w.id !== workout.id).map(w =>
          h('button', { class: 'btn btn-sm', onclick: () => GT.workout.start(w.id) }, GT.ui.icon('play', 'icon-sm'), w.name))));
      view.appendChild(other);
    }
  },

  /** One exercise in the list: name, target, last time, hint chips */
  exerciseLine(it, i, minN) {
    const h = GT.ui.h, S = GT.stats;
    const ex = S.exercise(it.exerciseId);
    const last = S.lastFor(it.exerciseId);
    const hint = S.overloadHint(it.exerciseId, it);
    const plateau = S.plateau(it.exerciseId);
    return h('div', { class: 'ex-line' },
      h('div', { class: 'ex-num' + (i < minN ? ' min' : '') }, i + 1),
      h('div', { class: 'ex-info' },
        h('div', { class: 'ex-name' }, ex.name),
        h('div', { class: 'muted small' }, it.sets + ' × ' + it.repMin + '–' + it.repMax + (ex.timed ? ' sec' : ' reps') + ' · rest ' + it.rest + 's'),
        h('div', { class: 'small' }, last
          ? [h('b', null, 'Last: '), S.setsText(last.sets, ex.timed), h('span', { class: 'muted' }, ' ' + S.whenText(last))]
          : h('span', { class: 'muted' }, 'No history yet. Today sets your baseline.')),
        hint && hint.type === 'up' ? h('div', { class: 'chip chip-good' }, GT.ui.icon('trend'), h('span', null, hint.text)) : null,
        plateau ? h('div', { class: 'chip chip-warn' }, GT.ui.icon('alert'),
          h('span', null, 'No progress in 3 sessions. Try a lighter week, or change the rep range.')) : null));
  },

  /** Mon-Sun dots: done / missed / planned */
  weekCard() {
    const h = GT.ui.h;
    const w = GT.stats.weekSummary();
    const card = GT.ui.card('This week', 'calendar',
      h('span', { class: 'badge ' + (w.done >= w.planned && w.planned ? 'badge-good' : 'badge-accent') }, w.done + ' / ' + w.planned + ' done'));
    card.appendChild(h('div', { class: 'week-dots' }, w.days.map(d =>
      h('div', { class: 'wd' + (d.planned ? ' planned' : '') + (d.done ? ' done' : '') + (d.missed ? ' missed' : '') + (d.isToday ? ' today' : ''),
        title: d.workout ? d.workout.name : 'Rest' },
        h('div', { class: 'wd-dot' }, d.done ? GT.ui.icon('check') : d.missed ? GT.ui.icon('x') : (d.workout ? d.workout.name.charAt(0) : '')),
        d.label))));
    return card;
  },

  /** Next planned day after `from` (within a week) */
  nextTraining(from) {
    for (let i = 1; i <= 7; i++) {
      const d = GT.util.addDays(from, i);
      const w = GT.stats.plannedFor(d);
      if (w) return { date: d, workout: w };
    }
    return null;
  },

  /** Rough duration: each set ~45 s of work + its rest */
  estimateMinutes(w) {
    const sec = w.items.reduce((n, it) => n + it.sets * (45 + it.rest), 0);
    return Math.round(sec / 60 / 5) * 5;
  },
};
