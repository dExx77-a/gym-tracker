/* ==========================================================
   storage.js — saving and loading your data.
   All data lives in ONE localStorage entry (key below) as JSON.
   Export = download that JSON as a file. Import = load such a file back.
   ========================================================== */
GT.store = {
  KEY: 'gymtracker.v1',
  state: null, // the whole app data, see GT.data.defaultState() for its shape

  /** Load from localStorage, or start fresh. Missing fields get default values. */
  load() {
    let raw = null;
    try { raw = localStorage.getItem(GT.store.KEY); } catch (e) { /* storage blocked */ }
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch (e) { console.error('Saved data is broken, starting fresh', e); }
    }
    GT.store.state = data ? GT.store.fillDefaults(data) : GT.data.defaultState();
    GT.store.save();
  },

  /** Make sure every expected field exists (so older or partial backups still work) */
  fillDefaults(data) {
    const def = GT.data.defaultState();
    for (const key in def) {
      // planVersion is left out: a missing one means "old plan", handled by upgradePlan()
      if (data[key] === undefined && key !== 'planVersion') data[key] = def[key];
    }
    data.settings = Object.assign(def.settings, data.settings || {});
    GT.store.upgradePlan(data);
    return data;
  },

  /**
   * When the built-in plan changes (GT.data.PLAN_VERSION goes up):
   *  - new library exercises are always added (your own exercises are kept)
   *  - if you haven't logged a workout yet, the new plan replaces the old one
   *  - otherwise your plan is left alone; use Plan -> "Use recommended plan"
   */
  upgradePlan(data) {
    if ((data.planVersion || 1) >= GT.data.PLAN_VERSION) return;
    GT.data.EXERCISES.forEach(ex => {
      const mine = data.exercises.find(e => e.id === ex.id);
      if (!mine) data.exercises.push(GT.util.copy(ex));
      else if (!data.sessions.length) mine.name = ex.name; // pick up renamed exercises
    });
    if (!data.sessions.length && !data.activeSession) GT.store.applyRecommendedPlan(data);
    data.planVersion = GT.data.PLAN_VERSION;
  },

  /** Replace workouts + schedule with the built-in plan. History is never touched. */
  applyRecommendedPlan(data) {
    GT.data.EXERCISES.forEach(ex => {
      if (!data.exercises.some(e => e.id === ex.id)) data.exercises.push(GT.util.copy(ex));
    });
    data.workouts = GT.data.defaultWorkouts();
    data.schedule = GT.data.defaultSchedule();
  },

  /** Save everything. Called after every change. */
  save() {
    try {
      localStorage.setItem(GT.store.KEY, JSON.stringify(GT.store.state));
    } catch (e) {
      console.error(e);
      if (GT.ui) GT.ui.toast('Could not save. Is browser storage full or blocked?');
    }
  },

  /** Download all data as gym-tracker-backup-YYYY-MM-DD.json */
  exportFile() {
    const json = JSON.stringify(GT.store.state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gym-tracker-backup-' + GT.util.today() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },

  /** Quick check that a parsed file really is a Gym Tracker backup */
  isValidBackup(d) {
    return d && typeof d === 'object' &&
      Array.isArray(d.sessions) && Array.isArray(d.workouts) && Array.isArray(d.exercises);
  },

  /** Ask for a .json file, check it, confirm, then replace all data with it */
  importFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let data;
        try { data = JSON.parse(reader.result); } catch (e) { data = null; }
        if (!GT.store.isValidBackup(data)) {
          GT.ui.toast('That file is not a Gym Tracker backup.');
          return;
        }
        GT.ui.confirm('Import backup?',
          'This replaces ALL current data with the backup (' + data.sessions.length +
          ' workouts). Export first if you want to keep what is here now.',
          'Import', () => {
            GT.store.state = GT.store.fillDefaults(data);
            GT.game.markAllSeen(); // don't pop up every old achievement again
            GT.store.save();
            GT.app.applyTheme();
            GT.app.render();
            GT.ui.toast('Backup imported', 'good');
          }, true);
      };
      reader.readAsText(file);
    };
    input.click();
  },

  /** Delete everything and start over */
  reset() {
    GT.store.state = GT.data.defaultState();
    GT.store.save();
  },
};
