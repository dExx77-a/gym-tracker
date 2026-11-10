/* ==========================================================
   screens/plan.js — your training plan.
   #plan            weekly schedule + list of workouts
   #plan/w/<id>     edit one workout (exercises, sets, reps, rest, order)
   #plan/library    the exercise library (add / rename / delete)
   ========================================================== */
GT.screens.plan = {
  render(view, arg) {
    const parts = (arg || '').split('/');
    if (parts[0] === 'w' && parts[1]) return GT.screens.plan.renderWorkout(view, parts[1]);
    if (parts[0] === 'library') return GT.screens.plan.renderLibrary(view);
    return GT.screens.plan.renderOverview(view);
  },

  /* ----- Overview: schedule + workouts ----- */
  renderOverview(view) {
    const h = GT.ui.h, U = GT.util;
    const st = GT.store.state;
    view.appendChild(h('h1', null, 'Training plan'));

    // Weekly schedule: one dropdown per day
    const sched = GT.ui.card('Weekly schedule', 'calendar',
      h('span', { class: 'badge badge-accent' }, GT.stats.plannedPerWeek() + ' days / week'));
    U.WEEK_ORDER.forEach(d => {
      const select = h('select', { class: 'input', 'aria-label': U.DAY_LONG[d],
        onchange: e => { st.schedule[d] = e.target.value || null; GT.store.save(); GT.app.render(); } },
        h('option', { value: '' }, 'Rest'),
        st.workouts.map(w => h('option', { value: w.id }, w.name)));
      select.value = st.schedule[d] || '';
      sched.appendChild(h('div', { class: 'sched-row' }, h('div', { class: 'sched-day' }, U.DAY_SHORT[d]), select));
    });
    view.appendChild(sched);

    // Workout templates
    const wcard = GT.ui.card('Workouts', 'dumbbell');
    const list = h('div', { class: 'list' });
    st.workouts.forEach(w => list.appendChild(h('div', { class: 'list-item' },
      h('div', { class: 'grow' }, h('b', null, w.name),
        h('div', { class: 'muted small' }, w.items.length + ' exercises · minimum: first ' + w.minExercises)),
      h('button', { class: 'btn btn-sm', onclick: () => GT.app.go('#plan/w/' + w.id) }, GT.ui.icon('edit', 'icon-sm'), 'Edit'))));
    if (!st.workouts.length) list.appendChild(h('p', { class: 'muted' }, 'No workouts yet.'));
    wcard.appendChild(list);
    wcard.appendChild(h('button', { class: 'btn btn-primary', onclick: () =>
      GT.ui.prompt('New workout', 'Name (e.g. "Push B")', '', name => {
        const w = { id: 'w_' + U.uid(), name, minExercises: 2, items: [] };
        st.workouts.push(w);
        GT.store.save();
        GT.app.go('#plan/w/' + w.id);
      }) }, GT.ui.icon('plus'), 'New workout'));
    view.appendChild(wcard);

    // Library link
    view.appendChild(h('button', { class: 'btn btn-block', onclick: () => GT.app.go('#plan/library') },
      GT.ui.icon('search'), 'Exercise library (' + st.exercises.length + ')'));

    // Go back to the built-in plan (data.js) at any time
    view.appendChild(h('button', { class: 'btn btn-ghost btn-block', onclick: () =>
      GT.ui.confirm('Use recommended plan?',
        'Replaces your workouts and weekly schedule with the built-in plan (Push / Pull / Legs / Arms + Core / Upper, 2 hard sets each). Your workout history is kept.',
        'Use it', () => {
          GT.store.applyRecommendedPlan(st);
          GT.store.save();
          GT.app.render();
          GT.ui.toast('Recommended plan loaded', 'good');
        }) }, GT.ui.icon('star'), 'Use recommended plan'));
  },

  /* ----- Edit one workout ----- */
  renderWorkout(view, id) {
    const h = GT.ui.h;
    const st = GT.store.state;
    const w = GT.stats.workout(id);
    if (!w) { GT.app.go('#plan'); return; }
    const save = () => GT.store.save();
    const redraw = () => { save(); GT.app.render(); };

    view.appendChild(h('button', { class: 'btn btn-ghost', style: 'align-self:flex-start', onclick: () => GT.app.go('#plan') },
      GT.ui.icon('back'), 'Plan'));

    // Name + minimum
    const head = GT.ui.card(null);
    head.appendChild(h('label', { class: 'field' }, 'Workout name',
      h('input', { class: 'input', type: 'text', value: w.name, onchange: e => { w.name = e.target.value.trim() || w.name; save(); } })));
    const minN = h('b', { class: 'num' }, w.minExercises);
    head.appendChild(h('div', { class: 'spread' },
      h('div', { class: 'grow' }, h('b', null, 'Bad-day minimum'),
        h('div', { class: 'muted small' }, 'Doing the first ', minN, ' exercise(s) still counts for your streak.')),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Fewer', onclick: () => { w.minExercises = Math.max(1, w.minExercises - 1); redraw(); } }, GT.ui.icon('minus')),
        h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'More', onclick: () => { w.minExercises = Math.min(Math.max(1, w.items.length), w.minExercises + 1); redraw(); } }, GT.ui.icon('plus')))));
    view.appendChild(head);

    // Exercise lines
    const card = GT.ui.card('Exercises', 'dumbbell');
    w.items.forEach((it, i) => {
      const ex = GT.stats.exercise(it.exerciseId);
      const num = (key, label, min) => h('label', null, label,
        h('input', { type: 'number', inputmode: 'numeric', min: min, value: it[key],
          onchange: e => {
            it[key] = Math.max(min, Math.round(GT.util.toNum(e.target.value)));
            if (key === 'repMin' && it.repMax < it.repMin) it.repMax = it.repMin;
            if (key === 'repMax' && it.repMin > it.repMax) it.repMin = it.repMax;
            redraw();
          } }));
      card.appendChild(h('div', { class: 'item-card' },
        h('div', { class: 'spread' },
          h('div', { class: 'row grow' },
            h('div', { class: 'ex-num' + (i < w.minExercises ? ' min' : '') }, i + 1),
            h('div', { class: 'grow' }, h('b', null, ex.name), h('div', { class: 'muted tiny' }, ex.muscle))),
          h('div', { class: 'row', style: 'gap:4px' },
            h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Move up', disabled: i === 0,
              onclick: () => { w.items.splice(i - 1, 0, w.items.splice(i, 1)[0]); redraw(); } }, GT.ui.icon('up')),
            h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Move down', disabled: i === w.items.length - 1,
              onclick: () => { w.items.splice(i + 1, 0, w.items.splice(i, 1)[0]); redraw(); } }, GT.ui.icon('down')),
            h('button', { class: 'btn btn-sm btn-icon', 'aria-label': 'Remove', style: 'color:var(--bad)',
              onclick: () => GT.ui.confirm('Remove ' + ex.name + '?', 'Your history for it is kept.', 'Remove', () => {
                w.items.splice(i, 1);
                w.minExercises = Math.max(1, Math.min(w.minExercises, w.items.length));
                redraw();
              }, true) }, GT.ui.icon('trash')))),
        h('div', { class: 'item-grid' },
          num('sets', 'Sets', 1), num('repMin', ex.timed ? 'Min sec' : 'Min reps', 1),
          num('repMax', ex.timed ? 'Max sec' : 'Max reps', 1), num('rest', 'Rest s', 0))));
    });
    if (!w.items.length) card.appendChild(h('p', { class: 'muted' }, 'No exercises yet. Add some below.'));
    card.appendChild(h('button', { class: 'btn btn-primary', onclick: () => GT.ui.pickExercise(exId => {
      w.items.push(GT.data.item(exId, 3, 8, 12, 90));
      redraw();
    }) }, GT.ui.icon('plus'), 'Add exercise'));
    view.appendChild(card);

    view.appendChild(h('button', { class: 'btn btn-ghost btn-block', style: 'color:var(--bad)', onclick: () =>
      GT.ui.confirm('Delete "' + w.name + '"?', 'The template is removed and its days become rest days. Past workouts stay in your history.', 'Delete', () => {
        st.workouts = st.workouts.filter(x => x.id !== w.id);
        for (const d in st.schedule) if (st.schedule[d] === w.id) st.schedule[d] = null;
        save();
        GT.app.go('#plan');
      }, true) }, GT.ui.icon('trash'), 'Delete workout'));
  },

  /* ----- Exercise library ----- */
  renderLibrary(view) {
    const h = GT.ui.h;
    const st = GT.store.state;
    view.appendChild(h('button', { class: 'btn btn-ghost', style: 'align-self:flex-start', onclick: () => GT.app.go('#plan') },
      GT.ui.icon('back'), 'Plan'));

    // Add new exercise
    const name = h('input', { class: 'input', type: 'text', placeholder: 'e.g. Cable Lateral Raise' });
    const muscle = h('select', { class: 'input' }, GT.data.MUSCLES.map(m => h('option', { value: m }, m)));
    const timed = h('input', { type: 'checkbox' });
    const add = GT.ui.card('Add an exercise', 'plus');
    add.appendChild(h('label', { class: 'field' }, 'Name', name));
    add.appendChild(h('label', { class: 'field' }, 'Muscle group', muscle));
    add.appendChild(h('label', { class: 'row small' }, timed, 'Timed (log seconds instead of reps, like a plank)'));
    add.appendChild(h('button', { class: 'btn btn-primary', onclick: () => {
      const n = name.value.trim();
      if (!n) { name.focus(); return; }
      if (st.exercises.some(e => e.name.toLowerCase() === n.toLowerCase())) { GT.ui.toast('That exercise already exists'); return; }
      st.exercises.push({ id: 'x_' + GT.util.uid(), name: n, muscle: muscle.value, timed: timed.checked || undefined });
      GT.store.save();
      GT.ui.toast('Added ' + n, 'good');
      GT.app.render();
    } }, 'Add to library'));
    view.appendChild(add);

    // List grouped by muscle
    const used = id => st.workouts.some(w => w.items.some(i => i.exerciseId === id));
    const hasHistory = id => st.sessions.some(s => s.exercises.some(e => e.exerciseId === id));
    const muscles = [...new Set(st.exercises.map(e => e.muscle))];
    muscles.forEach(m => {
      const card = GT.ui.card(m);
      const list = h('div', { class: 'list' });
      st.exercises.filter(e => e.muscle === m).forEach(e => list.appendChild(h('div', { class: 'list-item' },
        h('div', { class: 'grow' }, e.name, e.timed ? h('span', { class: 'muted small' }, ' (timed)') : null),
        h('button', { class: 'btn btn-sm btn-icon btn-ghost', 'aria-label': 'Rename ' + e.name, onclick: () =>
          GT.ui.prompt('Rename exercise', 'Name', e.name, v => { e.name = v; GT.store.save(); GT.app.render(); }) }, GT.ui.icon('edit')),
        h('button', { class: 'btn btn-sm btn-icon btn-ghost', 'aria-label': 'Delete ' + e.name, onclick: () => {
          if (used(e.id)) { GT.ui.toast('Remove it from your workouts first'); return; }
          if (hasHistory(e.id)) { GT.ui.toast('It has history, so it is kept for your charts'); return; }
          GT.ui.confirm('Delete ' + e.name + '?', 'It will be removed from the library.', 'Delete', () => {
            st.exercises = st.exercises.filter(x => x.id !== e.id);
            GT.store.save();
            GT.app.render();
          }, true);
        } }, GT.ui.icon('trash')))));
      card.appendChild(list);
      view.appendChild(card);
    });
  },
};
