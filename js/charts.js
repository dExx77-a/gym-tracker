/* ==========================================================
   charts.js — a small line chart drawn on a <canvas>.
   No chart library needed (so it works offline).

   GT.chart.line(canvas, {
     height: 200,
     series: [
       { points: [{x: timeMs, y: number}], color: '--accent', width: 3, dots: true, dashed: false },
     ],
     unit: 'kg'
   })
   Colours are CSS variable names, so they follow light/dark mode.
   ========================================================== */
GT.chart = {
  /** Read a CSS colour variable like '--accent' */
  css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; },

  line(canvas, opts) {
    const series = opts.series.filter(s => s.points.length);
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 320;
    const H = opts.height || 200;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    c.font = '600 11px ' + GT.chart.css('--font');

    if (!series.length) {
      c.fillStyle = GT.chart.css('--muted');
      c.textAlign = 'center';
      c.fillText('No data yet', W / 2, H / 2);
      return;
    }

    // 1. Find the data range
    const xs = [], ys = [];
    series.forEach(s => s.points.forEach(p => { xs.push(p.x); ys.push(p.y); }));
    let x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (x0 === x1) { x0 -= 3 * 86400000; x1 += 3 * 86400000; } // one point: centre it
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    const span = (y1 - y0) || Math.max(1, Math.abs(y1) * 0.1);
    y0 -= span * 0.15;
    y1 += span * 0.15;

    // 2. Helpers that turn data values into pixel positions
    const pad = { l: 42, r: 12, t: 10, b: 24 };
    const X = x => pad.l + (x - x0) / (x1 - x0) * (W - pad.l - pad.r);
    const Y = y => pad.t + (1 - (y - y0) / (y1 - y0)) * (H - pad.t - pad.b);

    // 3. Grid lines + y labels
    c.strokeStyle = GT.chart.css('--border');
    c.fillStyle = GT.chart.css('--muted');
    c.lineWidth = 1;
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const v = y0 + (y1 - y0) * i / 4;
      const y = Y(v);
      c.beginPath(); c.moveTo(pad.l, y); c.lineTo(W - pad.r, y); c.stroke();
      c.fillText(span < 5 ? v.toFixed(1) : Math.round(v), pad.l - 6, y);
    }

    // 4. Date labels: first, middle, last
    c.textBaseline = 'alphabetic';
    const dateLabel = x => { const d = new Date(x); return d.getDate() + ' ' + GT.util.MONTHS[d.getMonth()]; };
    c.textAlign = 'left'; c.fillText(dateLabel(x0), pad.l, H - 6);
    c.textAlign = 'right'; c.fillText(dateLabel(x1), W - pad.r, H - 6);
    if (W > 300) { c.textAlign = 'center'; c.fillText(dateLabel((x0 + x1) / 2), (pad.l + W - pad.r) / 2, H - 6); }

    // 5. Lines and dots
    series.forEach(s => {
      const col = GT.chart.css(s.color || '--accent');
      const pts = s.points.slice().sort((a, b) => a.x - b.x);
      if (!s.dotsOnly) {
        c.strokeStyle = col;
        c.lineWidth = s.width || 2.5;
        c.lineJoin = 'round';
        c.setLineDash(s.dashed ? [6, 5] : []);
        c.beginPath();
        pts.forEach((p, i) => (i ? c.lineTo(X(p.x), Y(p.y)) : c.moveTo(X(p.x), Y(p.y))));
        c.stroke();
        c.setLineDash([]);
      }
      if (s.dots || s.dotsOnly) {
        c.fillStyle = col;
        pts.forEach(p => { c.beginPath(); c.arc(X(p.x), Y(p.y), s.dotSize || 3.5, 0, Math.PI * 2); c.fill(); });
      }
    });
  },
};
