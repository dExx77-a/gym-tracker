/* ==========================================================
   game.js — XP, levels, ranks and achievements.
   XP and achievements are CALCULATED from your history every time,
   so they can never get out of sync (even after an import).
   ========================================================== */
GT.game = {
  // How much XP each thing gives. Change these to tune the game.
  XP: { set: 10, workout: 50, bonus: 25, pr: 100, weighIn: 5 },

  // Every 3 levels you get a new rank.
  RANKS: ['Rookie', 'Novice', 'Apprentice', 'Regular', 'Grinder', 'Athlete', 'Iron', 'Steel', 'Titan', 'Legend'],

  /** XP earned by one finished workout */
  sessionXP(s) {
    const X = GT.game.XP;
    const sets = s.exercises.reduce((n, ex) => n + (ex.skipped ? 0 : GT.stats.doneSets(ex).length), 0);
    return sets * X.set + (sets > 0 ? X.workout : 0) + (s.bonus ? X.bonus : 0) + (s.prs || []).length * X.pr;
  },

  /** All XP you've ever earned */
  totalXP() {
    const st = GT.store.state;
    return st.sessions.reduce((n, s) => n + GT.game.sessionXP(s), 0) + st.bodyweight.length * GT.game.XP.weighIn;
  },

  /** XP needed to go from level L to L+1 (grows a bit each level) */
  need(L) { return Math.round(100 * Math.pow(L, 1.5)); },
  rank(L) { return GT.game.RANKS[Math.min(GT.game.RANKS.length - 1, Math.floor((L - 1) / 3))]; },

  /** Turn total XP into { level, into (XP inside this level), need, rank } */
  levelInfo(xp) {
    let L = 1, floor = 0;
    while (xp >= floor + GT.game.need(L)) { floor += GT.game.need(L); L++; }
    return { level: L, into: xp - floor, need: GT.game.need(L), rank: GT.game.rank(L), total: xp };
  },

  /** Numbers the achievements look at, computed once */
  context() {
    const st = GT.store.state;
    const t = GT.stats.totals();
    const sk = GT.stats.streak();
    const ppw = Math.max(1, GT.stats.plannedPerWeek());
    let maxKg = 0, prs = 0, bonus = 0;
    st.sessions.forEach(s => {
      prs += (s.prs || []).length;
      if (s.bonus) bonus++;
      s.exercises.forEach(ex => GT.stats.doneSets(ex).forEach(x => { if (x.kg > maxKg) maxKg = x.kg; }));
    });
    // Perfect week: every planned day of some Mon-Sun week was done
    let perfect = 0;
    const sess = GT.stats.sessions();
    if (sess.length && GT.stats.plannedPerWeek() > 0) {
      for (let ws = GT.util.weekStart(sess[0].date); ws <= GT.util.today(); ws = GT.util.addDays(ws, 7)) {
        const w = GT.stats.weekSummary(ws);
        if (w.days.filter(d => d.planned).every(d => d.done)) perfect++;
      }
    }
    const bw = st.bodyweight.length ? st.bodyweight[st.bodyweight.length - 1].kg : 0;
    return { workouts: t.workouts, volume: t.volume, maxKg, prs, bonus, streakBest: sk.best,
      shieldSaves: sk.shieldSaves, ppw, perfect, weighIns: st.bodyweight.length, bw };
  },

  // The achievement list. test(c) gets the context above and returns true when unlocked.
  ACH: [
    { id: 'first', icon: 'flag', name: 'First Step', desc: 'Finish your first workout', test: c => c.workouts >= 1 },
    { id: 'w10', icon: 'dumbbell', name: 'Getting Serious', desc: 'Finish 10 workouts', test: c => c.workouts >= 10 },
    { id: 'w25', icon: 'dumbbell', name: 'Regular', desc: 'Finish 25 workouts', test: c => c.workouts >= 25 },
    { id: 'w50', icon: 'dumbbell', name: 'Gym Rat', desc: 'Finish 50 workouts', test: c => c.workouts >= 50 },
    { id: 'w100', icon: 'star', name: 'Centurion', desc: 'Finish 100 workouts', test: c => c.workouts >= 100 },
    { id: 'pr1', icon: 'trophy', name: 'Record Breaker', desc: 'Set your first PR', test: c => c.prs >= 1 },
    { id: 'pr25', icon: 'trophy', name: 'PR Machine', desc: 'Set 25 PRs', test: c => c.prs >= 25 },
    { id: 'kg100', icon: 'bolt', name: 'Triple Digits', desc: 'Lift 100 kg in any exercise', test: c => c.maxKg >= 100 },
    { id: 'bwlift', icon: 'bolt', name: 'Own Weight', desc: 'Lift your body weight in any exercise', test: c => c.bw > 0 && c.maxKg >= c.bw },
    { id: 'perfect', icon: 'target', name: 'Perfect Week', desc: 'Do every planned workout in a week', test: c => c.perfect >= 1 },
    { id: 'streak4', icon: 'flame', name: 'On Fire', desc: '4-week streak', test: c => c.streakBest >= 4 * c.ppw },
    { id: 'streak12', icon: 'flame', name: 'Unstoppable', desc: '12-week streak', test: c => c.streakBest >= 12 * c.ppw },
    { id: 'shield', icon: 'shield', name: 'Saved!', desc: 'A shield protected your streak', test: c => c.shieldSaves >= 1 },
    { id: 'bonus10', icon: 'plus', name: 'Overachiever', desc: 'Go past the minimum 10 times', test: c => c.bonus >= 10 },
    { id: 'vol10k', icon: 'trend', name: '10 Tonnes', desc: 'Lift 10,000 kg in total', test: c => c.volume >= 10000 },
    { id: 'vol100k', icon: 'trend', name: '100 Tonnes', desc: 'Lift 100,000 kg in total', test: c => c.volume >= 100000 },
    { id: 'weigh1', icon: 'scale', name: 'Check-in', desc: 'Log your body weight', test: c => c.weighIns >= 1 },
    { id: 'weigh30', icon: 'scale', name: 'Data Driven', desc: 'Log body weight 30 times', test: c => c.weighIns >= 30 },
  ],

  /** List of achievements with an `unlocked` flag */
  all() {
    const c = GT.game.context();
    return GT.game.ACH.map(a => Object.assign({}, a, { unlocked: a.test(c) }));
  },

  /** Achievements unlocked since last check. Marks them as seen. */
  checkNew() {
    const seen = GT.store.state.seenAchievements;
    const fresh = GT.game.all().filter(a => a.unlocked && !seen[a.id]);
    fresh.forEach(a => { seen[a.id] = GT.util.today(); });
    if (fresh.length) GT.store.save();
    return fresh;
  },

  /** Used after an import, so old achievements don't all pop up again */
  markAllSeen() {
    const seen = GT.store.state.seenAchievements;
    GT.game.all().forEach(a => { if (a.unlocked && !seen[a.id]) seen[a.id] = GT.util.today(); });
  },

  /** Show a toast for each new achievement */
  announce(list) {
    list.forEach((a, i) => setTimeout(() => GT.ui.toast('Achievement unlocked: ' + a.name, 'gold'), 400 + i * 900));
  },
};
