/* ==========================================================
   screens/body.js — body weight + optional measurements.
   The chart shows each weigh-in (dots) and a 7-day average line,
   so daily water/food swings don't fool you.
   ========================================================== */
GT.screens.body = {
  render(view) {
    const h = GT.ui.h, U = GT.util;
    const st = GT.store.state;
    const me = GT.screens.body;
    view.appendChild(h('h1', null, 'Body'));

    // --- Log weight ---
    const date = h('input', { class: 'input', type: 'date', value: U.today(), max: U.today() });
    const kg = h('input', { class: 'input', type: 'text', inputmode: 'decimal', placeholder: '70.0' });
    const log = GT.ui.card('Log body weight', 'scale');
    log.appendChild(h('p', { class: 'muted small' }, 'Best: weigh yourself in the morning, after the toilet, before eating.'));
    log.appendChild(h('div', { class: 'form-grid' },
      h('label', { class: 'field' }, 'Date', date),
      h('label', { class: 'field' }, 'Weight (kg)', kg)));
    const saveWeight = () => {
      const v = U.toNum(kg.value);
      if (v < 20 || v > 400) { GT.ui.toast('Enter a weight in kg, e.g. 70.4'); kg.focus(); return; }
      const d = date.value || U.today();
      const existing = st.bodyweight.find(b => b.date === d);
      if (existing) existing.kg = v;
      else st.bodyweight.push({ date: d, kg: v });
      st.bodyweight.sort((a, b) => a.date.localeCompare(b.date));
      GT.store.save();
      GT.ui.toast(existing ? 'Updated' : 'Saved  +' + GT.game.XP.weighIn + ' XP', 'good');
      GT.game.announce(GT.game.checkNew());
      GT.app.render();
    };
    kg.addEventListener('keydown', e => { if (e.key === 'Enter') saveWeight(); });
    log.appendChild(h('button', { class: 'btn btn-primary', onclick: saveWeight }, GT.ui.icon('check'), 'Save'));
    view.appendChild(log);

    // --- Stats + chart ---
    const bw = st.bodyweight;
    if (bw.length) {
      const avg = me.rollingAverage(bw);
      const latestAvg = avg[avg.length - 1].y;
      // Compare with the 7-day average ~4 weeks ago (if we have it)
      const target = U.addDays(bw[bw.length - 1].date, -28);
      const old = avg.filter(a => a.date <= target).pop();
      const change = old ? latestAvg - old.y : null;

      const card = GT.ui.card('Trend', 'trend');
      card.appendChild(h('div', { class: 'stats' },
        GT.ui.stat('Latest', U.fmtKg(bw[bw.length - 1].kg) + ' kg', U.fmtDay(bw[bw.length - 1].date)),
        GT.ui.stat('7-day avg', U.round1(latestAvg) + ' kg'),
        GT.ui.stat('4 weeks', change == null ? '–' : (change > 0 ? '+' : '') + U.round1(change) + ' kg',
          change == null ? 'needs more data' : 'change in average')));
      const canvas = h('canvas', { class: 'chart', role: 'img', 'aria-label': 'Body weight chart' });
      card.appendChild(canvas);
      card.appendChild(h('div', { class: 'legend' },
        h('span', null, h('i', { style: 'background:var(--muted)' }), 'Daily'),
        h('span', null, h('i', { style: 'background:var(--accent)' }), '7-day average')));
      view.appendChild(card);
      // Show the last 120 days
      const from = U.addDays(U.today(), -120);
      const x = d => U.parseDate(d).getTime();
      GT.chart.line(canvas, {
        height: 210,
        series: [
          { points: bw.filter(b => b.date >= from).map(b => ({ x: x(b.date), y: b.kg })), color: '--muted', dotsOnly: true, dotSize: 3 },
          { points: avg.filter(a => a.date >= from).map(a => ({ x: x(a.date), y: a.y })), color: '--accent', width: 3 },
        ],
      });

      // History list
      const hist = GT.ui.card('History', 'calendar');
      const list = h('div', { class: 'list' });
      bw.slice().reverse().slice(0, 14).forEach(b => list.appendChild(h('div', { class: 'list-item' },
        h('span', { class: 'grow' }, U.fmtDate(b.date)),
        h('b', { class: 'num' }, U.fmtKg(b.kg) + ' kg'),
        h('button', { class: 'btn btn-sm btn-icon btn-ghost', 'aria-label': 'Delete entry', onclick: () =>
          GT.ui.confirm('Delete this weigh-in?', U.fmtDate(b.date) + ': ' + U.fmtKg(b.kg) + ' kg', 'Delete', () => {
            st.bodyweight = st.bodyweight.filter(x => x !== b);
            GT.store.save();
            GT.app.render();
          }, true) }, GT.ui.icon('trash')))));
      hist.appendChild(list);
      view.appendChild(hist);
    }

    // --- Measurements (optional) ---
    me.measurementsCard(view);
  },

  /** For each weigh-in: average of all weigh-ins in the 7 days up to that date */
  rollingAverage(bw) {
    return bw.map(b => {
      const from = GT.util.addDays(b.date, -6);
      const win = bw.filter(x => x.date >= from && x.date <= b.date);
      return { date: b.date, y: win.reduce((s, x) => s + x.kg, 0) / win.length };
    });
  },

  measurementsCard(view) {
    const h = GT.ui.h, U = GT.util;
    const st = GT.store.state;
    const card = GT.ui.card('Measurements (optional)', 'ruler');
    card.appendChild(h('p', { class: 'muted small' }, 'In cm. Measure every 2–4 weeks, same time of day. Waist going down + arms going up = great progress.'));
    const date = h('input', { class: 'input', type: 'date', value: U.today(), max: U.today() });
    const fields = {};
    ['waist', 'arms', 'chest'].forEach(k => {
      fields[k] = h('input', { class: 'input', type: 'text', inputmode: 'decimal', placeholder: 'cm' });
    });
    card.appendChild(h('div', { class: 'form-grid' },
      h('label', { class: 'field' }, 'Date', date),
      h('label', { class: 'field' }, 'Waist', fields.waist),
      h('label', { class: 'field' }, 'Arms', fields.arms),
      h('label', { class: 'field' }, 'Chest', fields.chest)));
    card.appendChild(h('button', { class: 'btn', onclick: () => {
      const entry = { date: date.value || U.today() };
      let any = false;
      for (const k in fields) {
        const v = U.toNum(fields[k].value);
        if (v > 0) { entry[k] = v; any = true; }
      }
      if (!any) { GT.ui.toast('Enter at least one measurement'); return; }
      st.measurements = st.measurements.filter(m => m.date !== entry.date);
      st.measurements.push(entry);
      st.measurements.sort((a, b) => a.date.localeCompare(b.date));
      GT.store.save();
      GT.ui.toast('Measurements saved', 'good');
      GT.app.render();
    } }, GT.ui.icon('check'), 'Save measurements'));

    if (st.measurements.length) {
      const list = h('div', { class: 'list' });
      const show = v => (v ? U.fmtKg(v) : '–');
      st.measurements.slice().reverse().slice(0, 10).forEach(m => list.appendChild(h('div', { class: 'list-item' },
        h('div', { class: 'grow' }, h('b', null, U.fmtDate(m.date)),
          h('div', { class: 'muted small' }, 'Waist ' + show(m.waist) + ' · Arms ' + show(m.arms) + ' · Chest ' + show(m.chest))),
        h('button', { class: 'btn btn-sm btn-icon btn-ghost', 'aria-label': 'Delete measurement', onclick: () =>
          GT.ui.confirm('Delete these measurements?', U.fmtDate(m.date), 'Delete', () => {
            st.measurements = st.measurements.filter(x => x !== m);
            GT.store.save();
            GT.app.render();
          }, true) }, GT.ui.icon('trash')))));
      card.appendChild(list);
    }
    view.appendChild(card);
  },
};
