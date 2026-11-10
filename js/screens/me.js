/* ==========================================================
   screens/me.js — your profile:
   level + XP, streak + shield, weekly summary, calendar heatmap,
   achievements, lifetime totals, settings and data backup.
   ========================================================== */
GT.screens.me = {
  render(view) {
    const h = GT.ui.h, U = GT.util, S = GT.stats, G = GT.game;
    const st = GT.store.state;

    // --- Level ---
    const info = G.levelInfo(G.totalXP());
    const nextRankLevel = Math.floor((info.level - 1) / 3) * 3 + 4;
    view.appendChild(h('section', { class: 'card level-card' },
      h('div', { class: 'lvl-badge' }, info.level),
      h('div', { class: 'grow stack', style: 'gap:6px' },
        h('h1', null, info.rank),
        h('div', { class: 'xpbar' }, h('div', { class: 'xpbar-fill', style: 'width:' + (info.into / info.need * 100) + '%' })),
        h('div', { class: 'muted small' }, (info.need - info.into) + ' XP to level ' + (info.level + 1) +
          (info.rank !== G.rank(nextRankLevel) ? ' · ' + G.rank(nextRankLevel) + ' at level ' + nextRankLevel : '')),
        h('div', { class: 'muted tiny' }, U.fmtNum(info.total) + ' XP total. +10 per set, +50 per workout, +100 per PR.'))));

    // --- Streak + shield ---
    const sk = S.streak();
    const streakCard = GT.ui.card('Consistency', 'flame');
    streakCard.appendChild(h('div', { class: 'stats' },
      GT.ui.stat('Streak', sk.current, 'training days'),
      GT.ui.stat('Best', sk.best, 'training days'),
      h('div', { class: 'stat' },
        h('div', { class: 'stat-label' }, 'Shield'),
        h('div', { class: 'stat-value', style: 'color:' + (sk.shieldReady ? 'var(--good)' : 'var(--muted)') }, GT.ui.icon('shield', 'icon-lg')),
        h('div', { class: 'stat-sub' }, sk.shieldReady ? 'Ready this week' : 'Used this week'))));
    streakCard.appendChild(h('p', { class: 'muted small' },
      'Every workout where you finish at least the minimum adds 1. Rest days never break it. ' +
      'Miss a planned day and your weekly shield saves the streak; a second miss that week resets it.'));
    view.appendChild(streakCard);

    // --- This week ---
    view.appendChild(GT.screens.today.weekCard());

    // --- Heatmap ---
    const weeks = 16;
    const cells = S.heatmap(weeks);
    const heat = GT.ui.card('Last ' + weeks + ' weeks', 'calendar');
    heat.appendChild(h('div', { class: 'heatmap', role: 'img', 'aria-label': 'Workout calendar heatmap' },
      cells.map(c => h('div', {
        class: 'heat l' + c.level + (c.future ? ' future' : '') + (c.isToday ? ' today' : ''),
        title: U.fmtDate(c.date) + (c.count ? ': ' + U.fmtNum(c.volume) + ' kg' : ''),
      }))));
    heat.appendChild(h('div', { class: 'heat-legend' }, 'Less',
      [0, 1, 2, 3, 4].map(l => h('div', { class: 'heat l' + l })), 'More'));
    view.appendChild(heat);

    // --- Achievements ---
    const all = G.all();
    const achCard = GT.ui.card('Achievements', 'star',
      h('span', { class: 'badge badge-gold' }, all.filter(a => a.unlocked).length + ' / ' + all.length));
    achCard.appendChild(h('div', { class: 'ach-grid' }, all.map(a =>
      h('div', { class: 'ach' + (a.unlocked ? '' : ' locked') },
        h('div', { class: 'ach-icon' }, GT.ui.icon(a.unlocked ? a.icon : 'lock')),
        h('div', { class: 'ach-name' }, a.name),
        h('div', { class: 'ach-desc' }, a.desc)))));
    view.appendChild(achCard);

    // --- Totals ---
    const t = S.totals();
    const totals = GT.ui.card('All time', 'trend');
    totals.appendChild(h('div', { class: 'stats' },
      GT.ui.stat('Workouts', t.workouts), GT.ui.stat('Sets', U.fmtNum(t.sets)), GT.ui.stat('Volume', U.fmtNum(t.volume) + ' kg')));
    view.appendChild(totals);

    // --- Settings ---
    const settings = GT.ui.card('Settings', 'edit');
    const themeSeg = h('div', { class: 'seg' }, [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([val, label]) =>
      h('button', { class: st.settings.theme === val ? 'on' : '', onclick: () => {
        st.settings.theme = val; GT.store.save(); GT.app.applyTheme(); GT.app.render();
      } }, label)));
    settings.appendChild(h('div', { class: 'field' }, 'Theme', themeSeg));
    const soundSeg = h('div', { class: 'seg' }, [[true, 'Sound on'], [false, 'Sound off']].map(([val, label]) =>
      h('button', { class: st.settings.sound === val ? 'on' : '', onclick: () => {
        st.settings.sound = val; GT.store.save();
        if (val) { GT.timer.unlockAudio(); GT.timer.beep(); }
        GT.app.render();
      } }, label)));
    settings.appendChild(h('div', { class: 'field' }, 'Rest timer sound', soundSeg));
    view.appendChild(settings);

    // --- Backup ---
    const data = GT.ui.card('Your data', 'download');
    data.appendChild(h('p', { class: 'muted small' },
      'Everything is saved only in this browser on this device. Export a backup file regularly (e.g. weekly) and keep it in OneDrive or Google Drive.'));
    data.appendChild(h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary grow', onclick: () => { GT.store.exportFile(); GT.ui.toast('Backup downloaded', 'good'); } },
        GT.ui.icon('download'), 'Export'),
      h('button', { class: 'btn grow', onclick: GT.store.importFile }, GT.ui.icon('upload'), 'Import')));
    data.appendChild(h('button', { class: 'btn btn-ghost', style: 'color:var(--bad)', onclick: () =>
      GT.ui.confirm('Reset ALL data?', 'Deletes every workout, body weight entry and your plan changes. This cannot be undone. Export a backup first!', 'Delete everything', () => {
        GT.store.reset();
        GT.timer.stop();
        GT.app.applyTheme();
        GT.app.go('#today');
        GT.ui.toast('All data reset');
      }, true) }, GT.ui.icon('trash'), 'Reset all data'));
    view.appendChild(data);
  },
};
