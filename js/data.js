/* ==========================================================
   data.js — the starting data for a brand-new user:
   - the exercise library (you can add more in the app: Plan -> Exercise library)
   - your 5 workout templates and weekly schedule
   Only used the very first time (or after "Reset all data").
   ========================================================== */
GT.data = {
  // Muscle groups used for "weekly volume per muscle"
  MUSCLES: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'],

  // id: never change once used (history refers to it). timed: reps are seconds (e.g. plank).
  EXERCISES: [
    // Chest
    { id: 'incline_press', name: 'Incline Press', muscle: 'Chest' },
    { id: 'bench', name: 'Bench Press', muscle: 'Chest' },
    { id: 'incline_bench', name: 'Incline Bench Press', muscle: 'Chest' },
    { id: 'incline_db', name: 'Incline Dumbbell Press', muscle: 'Chest' },
    { id: 'db_bench', name: 'Dumbbell Bench Press', muscle: 'Chest' },
    { id: 'chest_press', name: 'Chest Press Machine', muscle: 'Chest' },
    { id: 'pec_deck', name: 'Pec Deck', muscle: 'Chest' },
    { id: 'cable_fly', name: 'Cable Fly', muscle: 'Chest' },
    { id: 'pec_fly', name: 'Cable / Machine Fly', muscle: 'Chest' },
    { id: 'pushup', name: 'Push-up', muscle: 'Chest' },
    // Back
    { id: 'deadlift', name: 'Deadlift', muscle: 'Back' },
    { id: 'lat_pulldown', name: 'Lat Pulldown', muscle: 'Back' },
    { id: 'pullup', name: 'Pull-up', muscle: 'Back' },
    { id: 'bb_row', name: 'Barbell Row', muscle: 'Back' },
    { id: 'cable_row', name: 'Seated Cable Row', muscle: 'Back' },
    { id: 'chest_row', name: 'Chest-supported Row', muscle: 'Back' },
    { id: 'db_row', name: 'One-arm Dumbbell Row', muscle: 'Back' },
    { id: 'straight_arm', name: 'Straight-arm Pulldown', muscle: 'Back' },
    // Shoulders
    { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders' },
    { id: 'db_shoulder', name: 'Dumbbell Shoulder Press', muscle: 'Shoulders' },
    { id: 'lat_raise', name: 'Dumbbell Lateral Raise', muscle: 'Shoulders' },
    { id: 'cable_lat_raise', name: 'Cable Lateral Raise', muscle: 'Shoulders' },
    { id: 'machine_lat_raise', name: 'Machine Lateral Raise', muscle: 'Shoulders' },
    { id: 'incline_lat_raise', name: 'Incline Lateral Raise (chest-supported)', muscle: 'Shoulders' },
    { id: 'face_pull', name: 'Face Pull', muscle: 'Shoulders' },
    { id: 'reverse_pec_deck', name: 'Reverse Pec Deck', muscle: 'Shoulders' },
    { id: 'rear_delt', name: 'Cable Rear Delt Fly', muscle: 'Shoulders' },
    // Biceps
    { id: 'ez_curl', name: 'EZ-bar Curl', muscle: 'Biceps' },
    { id: 'bb_curl', name: 'Barbell Curl', muscle: 'Biceps' },
    { id: 'db_curl', name: 'Dumbbell Curl', muscle: 'Biceps' },
    { id: 'machine_curl', name: 'Machine Curl', muscle: 'Biceps' },
    { id: 'cable_curl', name: 'Cable Curl', muscle: 'Biceps' },
    { id: 'hammer_curl', name: 'Hammer Curl', muscle: 'Biceps' },
    // Triceps
    { id: 'pushdown', name: 'Triceps Pushdown', muscle: 'Triceps' },
    { id: 'oh_ext', name: 'Overhead Cable Extension', muscle: 'Triceps' },
    { id: 'cg_bench', name: 'Close-grip Bench Press', muscle: 'Triceps' },
    { id: 'dips', name: 'Dips', muscle: 'Triceps' },
    // Legs
    { id: 'squat', name: 'Squat', muscle: 'Quads' },
    { id: 'front_squat', name: 'Front Squat', muscle: 'Quads' },
    { id: 'pendulum_squat', name: 'Pendulum Squat', muscle: 'Quads' },
    { id: 'leg_press', name: 'Leg Press', muscle: 'Quads' },
    { id: 'leg_ext', name: 'Leg Extension', muscle: 'Quads' },
    { id: 'lunge', name: 'Walking Lunge', muscle: 'Quads' },
    { id: 'rdl', name: 'Romanian Deadlift', muscle: 'Hamstrings' },
    { id: 'sldl', name: 'Stiff-leg Deadlift', muscle: 'Hamstrings' },
    { id: 'leg_curl', name: 'Seated Leg Curl', muscle: 'Hamstrings' },
    { id: 'lying_leg_curl', name: 'Lying Leg Curl', muscle: 'Hamstrings' },
    { id: 'hip_thrust', name: 'Hip Thrust', muscle: 'Glutes' },
    { id: 'hip_abduction', name: 'Hip Abduction Machine', muscle: 'Glutes' },
    { id: 'calf_raise', name: 'Standing Calf Raise', muscle: 'Calves' },
    { id: 'seated_calf', name: 'Seated Calf Raise', muscle: 'Calves' },
    // Core
    { id: 'plank', name: 'Plank', muscle: 'Core', timed: true },
    { id: 'hanging_lr', name: 'Hanging Leg Raise', muscle: 'Core' },
    { id: 'cable_crunch', name: 'Cable Crunch', muscle: 'Core' },
    { id: 'machine_crunch', name: 'Machine Crunch', muscle: 'Core' },
    { id: 'ab_wheel', name: 'Ab Wheel Rollout', muscle: 'Core' },
  ],

  // Bump this number whenever the recommended plan below changes.
  // On load, storage.js adds new library exercises, and switches to the new plan
  // automatically if you haven't logged any workouts yet.
  PLAN_VERSION: 3,

  /**
   * Your starting weights (from your gym notes, 10 Nov 2026).
   * Used until you've logged an exercise yourself: they pre-fill your first
   * sessions, drive the "+2.5 kg" hint, and beating them counts as a PR.
   * Pounds converted to kg (1 lb = 0.4536 kg). Two sets each, like your plan.
   * Pec Deck reps weren't noted, so 10 is assumed.
   */
  STARTING_WEIGHTS: {
    lat_pulldown: [{ kg: 40, reps: 8 }, { kg: 40, reps: 8 }],
    cable_row: [{ kg: 26, reps: 9 }, { kg: 26, reps: 8 }],         // "mid back"
    incline_press: [{ kg: 15, reps: 6 }, { kg: 15, reps: 6 }],
    chest_press: [{ kg: 20, reps: 6 }, { kg: 20, reps: 6 }],       // "normal push machine"
    pec_deck: [{ kg: 18.1, reps: 10 }, { kg: 18.1, reps: 10 }],    // 40 lb
    oh_ext: [{ kg: 18.75, reps: 5 }, { kg: 18.75, reps: 5 }],
    pushdown: [{ kg: 21, reps: 7 }, { kg: 21, reps: 7 }],
    db_curl: [{ kg: 10, reps: 8 }, { kg: 10, reps: 8 }],
    machine_curl: [{ kg: 27.2, reps: 8 }, { kg: 27.2, reps: 8 }],  // 60 lb
    hammer_curl: [{ kg: 7.5, reps: 10 }, { kg: 7.5, reps: 10 }],
    cable_lat_raise: [{ kg: 3.75, reps: 7 }, { kg: 3.75, reps: 6 }], // 2.5 + 1.25
    db_shoulder: [{ kg: 10, reps: 9 }, { kg: 10, reps: 9 }],        // "front 10"
  },

  // Training style reminder, shown on Today and during a workout
  INTENSITY_TIP: '2 hard sets per exercise, each 0–2 reps short of failure. Warm up with 1–2 light sets first (don\'t log them).',

  /** Builds one template line: exercise, sets, rep range, rest in seconds */
  item(exerciseId, sets, repMin, repMax, rest) {
    return { exerciseId, sets, repMin, repMax, rest };
  },

  /**
   * Your plan: low volume, high intensity. 2 hard sets per exercise, 0-2 reps from failure.
   * Main lifts first (longer rest), then small isolation moves.
   * You also run / play volleyball or football weekly, so legs get one gym day.
   * minExercises = the "bad-day minimum": doing just the first N exercises still counts.
   * Rest is in seconds: 150 = 2:30.
   */
  defaultWorkouts() {
    const t = GT.data.item;
    return [
      { id: 'w_push', name: 'Push', minExercises: 2, items: [
        t('incline_press', 2, 6, 10, 150), t('pec_deck', 2, 10, 15, 90),
        t('pushdown', 2, 10, 15, 75), t('oh_ext', 2, 10, 15, 75), t('cable_lat_raise', 2, 12, 20, 75) ] },
      { id: 'w_pull', name: 'Pull', minExercises: 2, items: [
        t('lat_pulldown', 2, 8, 12, 120), t('chest_row', 2, 8, 12, 120),
        t('reverse_pec_deck', 2, 12, 20, 75), t('ez_curl', 2, 8, 12, 90), t('machine_curl', 2, 8, 12, 75) ] },
      { id: 'w_legs', name: 'Legs', minExercises: 2, items: [
        t('leg_press', 2, 8, 12, 150), t('rdl', 2, 8, 10, 150),
        t('leg_ext', 2, 10, 15, 90), t('leg_curl', 2, 10, 15, 90), t('calf_raise', 2, 10, 15, 75) ] },
      { id: 'w_arms', name: 'Arms + Core', minExercises: 2, items: [
        t('dips', 2, 8, 12, 120), t('db_curl', 2, 8, 12, 90),
        t('oh_ext', 2, 10, 15, 75), t('cable_curl', 2, 10, 15, 75),
        t('cable_crunch', 2, 10, 15, 75), t('hanging_lr', 2, 10, 15, 75) ] },
      { id: 'w_upper', name: 'Upper', minExercises: 2, items: [
        t('pullup', 2, 6, 12, 150), t('chest_press', 2, 8, 12, 120),
        t('cable_row', 2, 8, 12, 120), t('cable_fly', 2, 10, 15, 90),
        t('incline_lat_raise', 2, 12, 20, 75), t('face_pull', 2, 12, 20, 75) ] },
    ];
  },

  /** Weekday number -> workout id (null = rest). 0 = Sunday. */
  defaultSchedule() {
    // Mon Push, Tue Pull, Wed Legs, Thu rest, Fri Arms+Core, Sat Upper, Sun rest
    return { 0: null, 1: 'w_push', 2: 'w_pull', 3: 'w_legs', 4: null, 5: 'w_arms', 6: 'w_upper' };
  },

  /** A fresh, empty state for a new user */
  defaultState() {
    return {
      version: 1,
      planVersion: GT.data.PLAN_VERSION,
      settings: { unit: 'kg', theme: 'auto', sound: true, startDate: GT.util.today() },
      exercises: GT.util.copy(GT.data.EXERCISES),
      workouts: GT.data.defaultWorkouts(),
      schedule: GT.data.defaultSchedule(),
      baselines: GT.util.copy(GT.data.STARTING_WEIGHTS), // exercise id -> starting sets
      sessions: [],          // finished workouts
      activeSession: null,   // workout in progress (survives a page refresh)
      bodyweight: [],        // { date, kg }
      measurements: [],      // { date, waist, arms, chest } in cm
      seenAchievements: {},  // achievement id -> date first shown
    };
  },
};
