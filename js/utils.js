/* ==========================================================
   utils.js — small helpers used everywhere.
   Everything in the app hangs off one global object: GT ("Gym Tracker").
   Dates are stored as text "YYYY-MM-DD" in LOCAL time (not UTC),
   so a workout at 11pm still counts for the right day.
   ========================================================== */
window.GT = window.GT || {};
GT.screens = {}; // each screen file adds itself here, e.g. GT.screens.today

GT.util = {
  DAY_SHORT: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  DAY_LONG: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  // Monday-first order of weekday numbers (0 = Sunday in JavaScript)
  WEEK_ORDER: [1, 2, 3, 4, 5, 6, 0],

  /** Date object -> "YYYY-MM-DD" */
  dateStr(d) {
    const m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  },
  /** Today's date as "YYYY-MM-DD" */
  today() { return GT.util.dateStr(new Date()); },
  /** "YYYY-MM-DD" -> Date object (local midnight) */
  parseDate(s) { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); },
  /** Add n days to a "YYYY-MM-DD" string */
  addDays(s, n) { const d = GT.util.parseDate(s); d.setDate(d.getDate() + n); return GT.util.dateStr(d); },
  /** Weekday number 0-6 (0 = Sunday) */
  dow(s) { return GT.util.parseDate(s).getDay(); },
  /** The Monday of the week that contains date s */
  weekStart(s) { return GT.util.addDays(s, -((GT.util.dow(s) + 6) % 7)); },
  /** Whole days from a to b */
  daysBetween(a, b) { return Math.round((GT.util.parseDate(b) - GT.util.parseDate(a)) / 86400000); },

  /** "Mon 10 Nov" */
  fmtDate(s) {
    const d = GT.util.parseDate(s);
    return GT.util.DAY_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + GT.util.MONTHS[d.getMonth()];
  },
  /** "10 Nov" */
  fmtDay(s) { const d = GT.util.parseDate(s); return d.getDate() + ' ' + GT.util.MONTHS[d.getMonth()]; },

  /** 52.5 -> "52.5", 50 -> "50" */
  fmtKg(n) { return String(Math.round(n * 100) / 100); },
  /** 12345 -> "12,345" */
  fmtNum(n) { return Math.round(n).toLocaleString('en-US'); },
  /** milliseconds -> "52 min" or "1 h 05 min" */
  fmtDuration(ms) {
    const mins = Math.max(0, Math.round(ms / 60000));
    if (mins < 60) return mins + ' min';
    const m = mins % 60;
    return Math.floor(mins / 60) + ' h ' + (m < 10 ? '0' : '') + m + ' min';
  },
  /** seconds -> "1:05" */
  fmtClock(sec) {
    sec = Math.max(0, Math.round(sec));
    const s = sec % 60;
    return Math.floor(sec / 60) + ':' + (s < 10 ? '0' : '') + s;
  },

  /** Short random id like "lq3k9a8xz1" */
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

  /** Read a number from text, accepting "52,5" as well as "52.5" */
  toNum(v) {
    const n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  },

  /**
   * Estimated 1-rep max (Epley formula): weight x (1 + reps / 30).
   * Example: 60 kg x 8 reps -> 76 kg. Above ~12 reps it gets less accurate.
   */
  e1rm(kg, reps) {
    if (!kg || !reps) return 0;
    if (reps === 1) return kg;
    return kg * (1 + reps / 30);
  },
  round1(n) { return Math.round(n * 10) / 10; },

  /** Deep copy plain data (objects/arrays) */
  copy(o) { return JSON.parse(JSON.stringify(o)); },
};
