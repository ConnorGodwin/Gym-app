/* Starter plan templates. Copied into the user's plans when chosen – everything is editable afterwards.
 * Exercise config: ex (exercise id), sets (1-5), repMin/repMax, rest (s), time (s), distance (km or m) */
(function () {
  const s = (ex, sets, repMin, repMax, rest = 90, extra = {}) => ({ ex, sets, repMin, repMax, rest, ...extra });
  const t = (ex, sets, time, rest = 60) => ({ ex, sets, time, rest });
  const c = (ex, sets, distance, rest = 0, time) => ({ ex, sets, distance, rest, ...(time ? { time } : {}) });

  window.PLAN_TEMPLATES = [
    {
      name: 'Push / Pull / Legs',
      desc: '3-day hypertrophy split. Run it once or twice a week.',
      days: [
        { name: 'Push', exercises: [
          s('barbell-bench-press', 4, 6, 8, 150), s('incline-dumbbell-press', 3, 8, 12, 120),
          s('seated-dumbbell-shoulder-press', 3, 8, 12, 120), s('cable-lateral-raise', 3, 12, 15, 60),
          s('rope-tricep-pushdown', 3, 10, 15, 60), s('overhead-cable-extension', 3, 10, 15, 60) ] },
        { name: 'Pull', exercises: [
          s('conventional-deadlift', 3, 4, 6, 180), s('pull-up', 4, 6, 10, 120), s('barbell-row', 3, 8, 10, 120),
          s('face-pull', 3, 12, 15, 60), s('ez-bar-curl', 3, 8, 12, 60), s('hammer-curl', 3, 10, 12, 60) ] },
        { name: 'Legs', exercises: [
          s('back-squat', 4, 5, 8, 180), s('romanian-deadlift', 3, 8, 10, 150), s('leg-press', 3, 10, 15, 120),
          s('lying-leg-curl', 3, 10, 15, 60), s('standing-calf-raise', 4, 10, 15, 60), t('plank', 3, 45) ] },
      ],
    },
    {
      name: 'Upper / Lower',
      desc: '4 days a week, strength + size.',
      days: [
        { name: 'Upper A (Strength)', exercises: [
          s('barbell-bench-press', 4, 4, 6, 180), s('barbell-row', 4, 5, 8, 150), s('overhead-press', 3, 6, 8, 150),
          s('lat-pulldown', 3, 8, 12, 90), s('ez-bar-skull-crusher', 3, 8, 12, 60), s('dumbbell-curl', 3, 8, 12, 60) ] },
        { name: 'Lower A (Strength)', exercises: [
          s('back-squat', 4, 4, 6, 180), s('romanian-deadlift', 3, 6, 8, 150), s('bulgarian-split-squat', 3, 8, 10, 90),
          s('seated-leg-curl', 3, 10, 12, 60), s('standing-calf-raise', 4, 8, 12, 60), s('hanging-leg-raise', 3, 10, 15, 60) ] },
        { name: 'Upper B (Volume)', exercises: [
          s('incline-dumbbell-press', 4, 8, 12, 120), s('chest-supported-dumbbell-row', 4, 8, 12, 90),
          s('arnold-press', 3, 10, 12, 90), s('cable-crossover', 3, 12, 15, 60), s('dumbbell-lateral-raise', 3, 12, 20, 60),
          s('rope-tricep-pushdown', 3, 10, 15, 60), s('incline-dumbbell-curl', 3, 10, 15, 60) ] },
        { name: 'Lower B (Volume)', exercises: [
          s('conventional-deadlift', 3, 3, 5, 180), s('leg-press', 4, 10, 15, 120), s('dumbbell-walking-lunge', 3, 10, 12, 90),
          s('leg-extension', 3, 12, 15, 60), s('barbell-hip-thrust', 3, 8, 12, 90), s('seated-calf-raise', 4, 12, 15, 60) ] },
      ],
    },
    {
      name: 'Full Body 3x',
      desc: 'Three full-body sessions per week (A/B/C).',
      days: [
        { name: 'Full Body A', exercises: [
          s('back-squat', 3, 5, 8, 150), s('barbell-bench-press', 3, 5, 8, 150), s('barbell-row', 3, 8, 10, 120),
          s('dumbbell-lateral-raise', 3, 12, 15, 60), t('plank', 3, 45) ] },
        { name: 'Full Body B', exercises: [
          s('trap-bar-deadlift', 3, 5, 6, 180), s('overhead-press', 3, 6, 8, 120), s('pull-up', 3, 6, 10, 120),
          s('dumbbell-walking-lunge', 3, 10, 12, 90), s('hammer-curl', 3, 10, 12, 60) ] },
        { name: 'Full Body C', exercises: [
          s('front-squat', 3, 6, 8, 150), s('incline-dumbbell-press', 3, 8, 12, 90), s('seated-cable-row', 3, 10, 12, 90),
          s('romanian-deadlift', 3, 8, 10, 120), s('rope-tricep-pushdown', 3, 10, 15, 60) ] },
      ],
    },
    {
      name: '5×5 Strength',
      desc: 'Classic linear progression. Alternate A and B.',
      days: [
        { name: 'Workout A', exercises: [
          s('back-squat', 5, 5, 5, 180), s('barbell-bench-press', 5, 5, 5, 180), s('barbell-row', 5, 5, 5, 180) ] },
        { name: 'Workout B', exercises: [
          s('back-squat', 5, 5, 5, 180), s('overhead-press', 5, 5, 5, 180), s('conventional-deadlift', 1, 5, 5, 180) ] },
      ],
    },
    {
      name: 'HYROX Training',
      desc: 'Race simulation, station strength, compromised running and engine work.',
      days: [
        { name: 'Full Race Simulation', exercises: [
          c('hyrox-run-1km', 1, 1000), c('hyrox-skierg-1000m', 1, 1000),
          c('hyrox-run-1km', 1, 1000), c('hyrox-sled-push-50m', 1, 50),
          c('hyrox-run-1km', 1, 1000), c('hyrox-sled-pull-50m', 1, 50),
          c('hyrox-run-1km', 1, 1000), c('hyrox-burpee-broad-jumps-80m', 1, 80),
          c('hyrox-run-1km', 1, 1000), c('hyrox-row-1000m', 1, 1000),
          c('hyrox-run-1km', 1, 1000), c('hyrox-farmers-carry-200m', 1, 200),
          c('hyrox-run-1km', 1, 1000), c('hyrox-sandbag-lunges-100m', 1, 100),
          c('hyrox-run-1km', 1, 1000), { ex: 'hyrox-wall-balls-100-reps', sets: 1, repMin: 100, repMax: 100, rest: 0 } ] },
        { name: 'Station Strength', exercises: [
          c('sled-push', 4, 25, 90), c('sled-pull', 4, 25, 90), s('wall-ball', 4, 20, 25, 60),
          c('sandbag-walking-lunge', 3, 50, 90), c('kettlebell-farmers-carry', 3, 100, 90), s('burpee-broad-jump', 3, 10, 15, 60) ] },
        { name: 'Compromised Running', exercises: [
          c('compromised-run-after-station', 4, 1000, 0), s('wall-ball', 4, 20, 20, 0),
          c('sled-push', 4, 25, 0), c('rowing-machine', 4, 500, 60) ] },
        { name: 'Engine / Erg Intervals', exercises: [
          c('skierg', 5, 500, 90), c('rowing-machine', 5, 500, 90), c('400m-repeats', 5, 400, 60) ] },
      ],
    },
    {
      name: 'Running – 5K Builder',
      desc: 'Easy, speed and long-run days to build your 5K.',
      days: [
        { name: 'Easy Run', exercises: [ c('easy-run', 1, 5, 0), t('calf-stretch', 2, 30, 15) ] },
        { name: 'Intervals', exercises: [ c('easy-run', 1, 1.5, 60), c('400m-repeats', 5, 400, 90), c('recovery-run', 1, 1.5, 0) ] },
        { name: 'Tempo', exercises: [ c('easy-run', 1, 1.5, 60), c('tempo-run', 1, 3, 60), c('recovery-run', 1, 1, 0) ] },
        { name: 'Long Run', exercises: [ c('long-run', 1, 8, 0), t('hip-flexor-stretch', 2, 45, 15) ] },
      ],
    },
    {
      name: 'Cycling',
      desc: 'Endurance, intervals and recovery rides.',
      days: [
        { name: 'Endurance Ride', exercises: [ c('outdoor-ride', 1, 40, 0) ] },
        { name: 'Interval Session', exercises: [ c('indoor-trainer-ride', 1, 5, 60), c('bike-intervals', 5, 2, 120), c('indoor-trainer-ride', 1, 5, 0) ] },
        { name: 'Recovery Spin', exercises: [ c('stationary-bike', 1, 15, 0) ] },
      ],
    },
    {
      name: 'Home / Bodyweight',
      desc: 'No equipment needed.',
      days: [
        { name: 'Bodyweight Circuit', exercises: [
          s('push-up', 4, 10, 20, 60), s('bodyweight-squat', 4, 15, 25, 60), s('inverted-row', 4, 8, 15, 60),
          s('bodyweight-lunge', 3, 10, 15, 60), s('pike-push-up', 3, 6, 12, 60), t('plank', 3, 45, 45), s('burpee', 3, 10, 15, 60) ] },
      ],
    },
  ];
})();
