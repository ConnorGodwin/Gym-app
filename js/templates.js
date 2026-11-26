/* Starter plan templates. Copied into the user's plans when chosen – everything is editable afterwards.
 * Exercise config: ex (exercise id), sets (1-5), repMin/repMax, rest (s), time (s), distance (km or m) */
(function () {
  const s = (ex, sets, repMin, repMax, rest = 90, extra = {}) => ({ ex, sets, repMin, repMax, rest, ...extra });
  const t = (ex, sets, time, rest = 60) => ({ ex, sets, time, rest });
  const c = (ex, sets, distance, rest = 0, time) => ({ ex, sets, distance, rest, ...(time ? { time } : {}) });

  window.PLAN_TEMPLATES = [
    {
      name: 'Push / Pull / Legs', group: 'Strength & muscle',
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
      name: 'Upper / Lower', group: 'Strength & muscle',
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
      name: 'Full Body 3x', group: 'Strength & muscle',
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
      name: '5×5 Strength', group: 'Strength & muscle',
      desc: 'Classic linear progression. Alternate A and B.',
      days: [
        { name: 'Workout A', exercises: [
          s('back-squat', 5, 5, 5, 180), s('barbell-bench-press', 5, 5, 5, 180), s('barbell-row', 5, 5, 5, 180) ] },
        { name: 'Workout B', exercises: [
          s('back-squat', 5, 5, 5, 180), s('overhead-press', 5, 5, 5, 180), s('conventional-deadlift', 1, 5, 5, 180) ] },
      ],
    },
    {
      name: 'HYROX Training', group: 'HYROX & fitness',
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
      name: 'Running – 5K Builder', group: 'Running & endurance',
      desc: 'Easy, speed and long-run days to build your 5K.',
      days: [
        { name: 'Easy Run', exercises: [ c('easy-run', 1, 5, 0), t('calf-stretch', 2, 30, 15) ] },
        { name: 'Intervals', exercises: [ c('easy-run', 1, 1.5, 60), c('400m-repeats', 5, 400, 90), c('recovery-run', 1, 1.5, 0) ] },
        { name: 'Tempo', exercises: [ c('easy-run', 1, 1.5, 60), c('tempo-run', 1, 3, 60), c('recovery-run', 1, 1, 0) ] },
        { name: 'Long Run', exercises: [ c('long-run', 1, 8, 0), t('hip-flexor-stretch', 2, 45, 15) ] },
      ],
    },
    {
      name: 'Cycling', group: 'Running & endurance',
      desc: 'Endurance, intervals and recovery rides.',
      days: [
        { name: 'Endurance Ride', exercises: [ c('outdoor-ride', 1, 40, 0) ] },
        { name: 'Interval Session', exercises: [ c('indoor-trainer-ride', 1, 5, 60), c('bike-intervals', 5, 2, 120), c('indoor-trainer-ride', 1, 5, 0) ] },
        { name: 'Recovery Spin', exercises: [ c('stationary-bike', 1, 15, 0) ] },
      ],
    },
    {
      name: 'Home / Bodyweight', group: 'Strength & muscle',
      desc: 'No equipment needed.',
      days: [
        { name: 'Bodyweight Circuit', exercises: [
          s('push-up', 4, 10, 20, 60), s('bodyweight-squat', 4, 15, 25, 60), s('inverted-row', 4, 8, 15, 60),
          s('bodyweight-lunge', 3, 10, 15, 60), s('pike-push-up', 3, 6, 12, 60), t('plank', 3, 45, 45), s('burpee', 3, 10, 15, 60) ] },
      ],
    },

    // ---------------- strength & muscle ----------------
    {
      name: 'Beginner Gym (Machines)', group: 'Strength & muscle',
      desc: 'Two simple full-body days using machines. Great for your first 8–12 weeks.',
      days: [
        { name: 'Day A', exercises: [
          s('leg-press', 3, 10, 12, 90), s('chest-press-machine', 3, 10, 12, 90), s('lat-pulldown', 3, 10, 12, 90),
          s('seated-leg-curl', 2, 10, 12, 60), s('machine-shoulder-press', 2, 10, 12, 60), t('plank', 2, 30, 45) ] },
        { name: 'Day B', exercises: [
          s('goblet-squat', 3, 10, 12, 90), s('seated-cable-row', 3, 10, 12, 90), s('dumbbell-bench-press', 3, 10, 12, 90),
          s('leg-extension', 2, 12, 15, 60), s('cable-curl', 2, 12, 15, 60), s('rope-tricep-pushdown', 2, 12, 15, 60) ] },
      ],
    },
    {
      name: 'Powerlifting (SBD)', group: 'Strength & muscle',
      desc: 'Squat, bench and deadlift focus with heavy triples and volume work. 4 days.',
      days: [
        { name: 'Squat (heavy)', exercises: [ s('back-squat', 5, 3, 5, 240), s('pause-squat', 3, 3, 4, 180), s('romanian-deadlift', 3, 6, 8, 150), t('plank', 3, 45, 60) ] },
        { name: 'Bench (heavy)', exercises: [ s('barbell-bench-press', 5, 3, 5, 240), s('close-grip-bench-press', 3, 5, 6, 180), s('barbell-row', 4, 6, 8, 120), s('face-pull', 3, 12, 15, 60) ] },
        { name: 'Deadlift (heavy)', exercises: [ s('conventional-deadlift', 5, 2, 4, 240), s('front-squat', 3, 5, 6, 180), s('pull-up', 3, 5, 8, 120), s('hanging-leg-raise', 3, 10, 12, 60) ] },
        { name: 'Bench (volume)', exercises: [ s('barbell-bench-press', 4, 6, 8, 150), s('overhead-press', 3, 6, 8, 120), s('dumbbell-row', 3, 8, 10, 90), s('tricep-dip', 3, 8, 12, 90) ] },
      ],
    },
    {
      name: 'Calisthenics', group: 'Strength & muscle',
      desc: 'Bodyweight strength: pull-ups, dips, push-ups, pistols and core skills.',
      days: [
        { name: 'Push & Legs', exercises: [ s('chest-dip', 4, 6, 12, 120), s('pike-push-up', 3, 6, 10, 90), s('archer-push-up', 3, 5, 8, 90), s('pistol-squat', 3, 4, 8, 90), s('bulgarian-split-squat', 3, 8, 12, 90), t('l-sit', 3, 15, 60) ] },
        { name: 'Pull & Core', exercises: [ s('pull-up', 4, 5, 10, 120), s('chin-up', 3, 6, 10, 120), s('inverted-row', 3, 8, 15, 90), s('hanging-leg-raise', 3, 8, 12, 90), t('hollow-body-hold', 3, 30, 60), s('dragon-flag', 3, 3, 6, 90) ] },
      ],
    },
    {
      name: 'Kettlebell Only', group: 'Strength & muscle',
      desc: 'Two days with one or two kettlebells. Home-friendly.',
      days: [
        { name: 'KB Strength', exercises: [ s('kettlebell-front-squat', 4, 6, 10, 90), s('kettlebell-press', 4, 5, 8, 90), s('kettlebell-row', 4, 8, 12, 90), s('turkish-get-up', 3, 2, 3, 90), s('kettlebell-windmill', 2, 5, 6, 60) ] },
        { name: 'KB Power', exercises: [ s('kettlebell-swing', 5, 15, 20, 60), s('kettlebell-clean', 4, 5, 8, 75), s('kettlebell-snatch', 4, 5, 8, 75), s('goblet-squat', 3, 10, 15, 60), s('suitcase-carry', 3, 1, 1, 60, { distance: 40 }) ] },
      ],
    },
    // ---------------- running & endurance ----------------
    {
      name: 'Couch to 5K', group: 'Running & endurance',
      desc: 'Run/walk intervals three times a week. Increase the run time as it gets easier.',
      days: [
        { name: 'Run/Walk 1', exercises: [ c('brisk-walk', 1, 0.5, 0), t('couch-to-5k-run-walk', 1, 1200, 0), t('calf-stretch', 2, 30, 15) ] },
        { name: 'Run/Walk 2', exercises: [ c('brisk-walk', 1, 0.5, 0), t('couch-to-5k-run-walk', 1, 1200, 0), t('hip-flexor-stretch', 2, 30, 15) ] },
        { name: 'Run/Walk 3', exercises: [ c('brisk-walk', 1, 0.5, 0), t('couch-to-5k-run-walk', 1, 1500, 0), t('hamstring-stretch', 2, 30, 15) ] },
      ],
    },
    {
      name: 'Running – 10K', group: 'Running & endurance',
      desc: 'Easy, interval, tempo and long runs plus a strength day.',
      days: [
        { name: 'Easy Run', exercises: [ c('easy-run', 1, 6, 0), c('strides', 4, 100, 60) ] },
        { name: 'Intervals', exercises: [ c('easy-run', 1, 2, 60), c('800m-repeats', 5, 800, 120), c('recovery-run', 1, 2, 0) ] },
        { name: 'Tempo', exercises: [ c('easy-run', 1, 2, 60), c('tempo-run', 1, 5, 60), c('recovery-run', 1, 1.5, 0) ] },
        { name: 'Long Run', exercises: [ c('long-run', 1, 12, 0) ] },
        { name: 'Runner Strength', exercises: [ s('bulgarian-split-squat', 3, 8, 10, 90), s('single-leg-romanian-deadlift', 3, 8, 10, 90), s('single-leg-calf-raise', 3, 12, 15, 60), t('copenhagen-plank', 3, 20, 45), t('side-plank', 3, 30, 45) ] },
      ],
    },
    {
      name: 'Half Marathon', group: 'Running & endurance',
      desc: '4–5 runs a week building the long run to 18–20 km, plus strength.',
      days: [
        { name: 'Easy Run', exercises: [ c('easy-run', 1, 8, 0), c('strides', 4, 100, 60) ] },
        { name: 'Threshold', exercises: [ c('easy-run', 1, 2, 60), c('1km-repeats', 5, 1000, 90), c('recovery-run', 1, 2, 0) ] },
        { name: 'Steady / Tempo', exercises: [ c('easy-run', 1, 2, 60), c('tempo-run', 1, 8, 60), c('recovery-run', 1, 2, 0) ] },
        { name: 'Long Run', exercises: [ c('long-run', 1, 16, 0) ] },
        { name: 'Runner Strength', exercises: [ s('back-squat', 3, 5, 6, 150), s('romanian-deadlift', 3, 6, 8, 120), s('dumbbell-step-up', 3, 8, 10, 90), s('standing-calf-raise', 3, 10, 15, 60), t('plank', 3, 45, 45) ] },
      ],
    },
    {
      name: 'Marathon', group: 'Running & endurance',
      desc: '5 runs a week with marathon-pace work and a long run building towards 30–32 km.',
      days: [
        { name: 'Easy Run', exercises: [ c('easy-run', 1, 10, 0) ] },
        { name: 'Intervals', exercises: [ c('easy-run', 1, 3, 60), c('mile-repeats', 5, 1609, 120), c('recovery-run', 1, 2, 0) ] },
        { name: 'Marathon Pace', exercises: [ c('easy-run', 1, 3, 0), c('progression-run', 1, 12, 0), c('recovery-run', 1, 2, 0) ] },
        { name: 'Recovery Run', exercises: [ c('recovery-run', 1, 8, 0), t('foam-rolling', 1, 600, 0) ] },
        { name: 'Long Run', exercises: [ c('long-run', 1, 24, 0) ] },
      ],
    },
    {
      name: 'Triathlon (Sprint / Olympic)', group: 'Running & endurance',
      desc: 'Swim, bike and run sessions plus a brick (bike straight into a run).',
      days: [
        { name: 'Swim Technique', exercises: [ c('freestyle-swim', 1, 400, 60), c('kickboard-drills', 4, 50, 30), c('pull-buoy-swim', 4, 100, 30), c('swim-intervals', 5, 100, 20) ] },
        { name: 'Bike Intervals', exercises: [ c('indoor-trainer-ride', 1, 8, 60), c('bike-intervals', 5, 3, 120), c('indoor-trainer-ride', 1, 5, 0) ] },
        { name: 'Run', exercises: [ c('easy-run', 1, 2, 60), c('tempo-run', 1, 4, 60), c('recovery-run', 1, 1, 0) ] },
        { name: 'Brick', exercises: [ c('outdoor-ride', 1, 30, 0), c('brick-run-off-the-bike', 1, 5, 0) ] },
        { name: 'Long Swim / Open Water', exercises: [ c('open-water-swim', 1, 1500, 0) ] },
      ],
    },
    {
      name: 'Swimming', group: 'Running & endurance',
      desc: 'Technique, threshold and endurance sets in the pool.',
      days: [
        { name: 'Technique', exercises: [ c('freestyle-swim', 1, 300, 60), c('kickboard-drills', 5, 50, 30), c('pull-buoy-swim', 5, 100, 30), c('backstroke', 4, 50, 30) ] },
        { name: 'Threshold', exercises: [ c('freestyle-swim', 1, 400, 60), c('swim-intervals', 5, 200, 30), c('breaststroke', 4, 50, 30) ] },
        { name: 'Endurance', exercises: [ c('freestyle-swim', 1, 1500, 0) ] },
      ],
    },
    {
      name: 'Rowing', group: 'Running & endurance',
      desc: 'Erg intervals, steady state and a 2K test day.',
      days: [
        { name: 'Intervals', exercises: [ c('rowing-machine', 1, 1000, 60), c('500m-row-repeats', 5, 500, 120) ] },
        { name: 'Steady State', exercises: [ c('rowing-machine', 1, 8000, 0) ] },
        { name: '2K Test', exercises: [ c('rowing-machine', 1, 1500, 180), c('rowing-machine', 1, 2000, 0) ] },
      ],
    },
    // ---------------- HYROX & fitness ----------------
    {
      name: 'Functional Fitness', group: 'HYROX & fitness',
      desc: 'CrossFit-style strength plus conditioning: barbell, gymnastics and engine.',
      days: [
        { name: 'Strength + Metcon', exercises: [ s('back-squat', 5, 3, 5, 150), s('barbell-thruster', 3, 10, 10, 60), s('pull-up', 3, 10, 10, 60), t('amrap-block', 1, 600, 0) ] },
        { name: 'Olympic + Gymnastics', exercises: [ s('power-clean', 5, 2, 3, 120), s('push-jerk', 4, 3, 3, 120), s('toes-to-bar', 4, 8, 12, 60), s('double-unders', 4, 30, 50, 60) ] },
        { name: 'Engine', exercises: [ c('rowing-machine', 5, 500, 90), c('assault-bike', 5, 1000, 90), s('burpee', 3, 15, 15, 60), s('wall-ball', 3, 20, 20, 60) ] },
      ],
    },
    // ---------------- team sports ----------------
    {
      name: 'Football (Soccer)', group: 'Team sports',
      desc: 'Speed, agility and injury-proofing (Nordics, Copenhagens) around training and matches.',
      days: [
        { name: 'Speed & Agility', exercises: [ t('agility-ladder', 4, 30, 45), t('cone-drill-5-10-5', 5, 10, 60), c('sprint', 5, 30, 90), s('skater-jump', 3, 6, 8, 60), s('lateral-bound', 3, 5, 6, 60) ] },
        { name: 'Strength & Injury Prevention', exercises: [ s('trap-bar-deadlift', 4, 4, 6, 150), s('bulgarian-split-squat', 3, 6, 8, 90), s('nordic-hamstring-curl', 3, 4, 6, 90), t('copenhagen-plank', 3, 20, 45), s('single-leg-calf-raise', 3, 12, 15, 60) ] },
        { name: 'Conditioning', exercises: [ c('shuttle-run', 5, 150, 60), c('200m-repeats', 5, 200, 60), t('mountain-climber', 3, 30, 30) ] },
        { name: 'Match / Training', exercises: [ t('football-match', 1, 5400, 0), t('foam-rolling', 1, 600, 0) ] },
      ],
    },
    {
      name: 'Rugby', group: 'Team sports',
      desc: 'Heavy strength, power and repeated-sprint conditioning for contact sports.',
      days: [
        { name: 'Lower Strength & Power', exercises: [ s('back-squat', 5, 3, 5, 180), s('hang-power-clean', 4, 3, 3, 120), s('romanian-deadlift', 3, 6, 8, 120), s('box-jump', 3, 5, 5, 60), c('sled-push', 4, 20, 90) ] },
        { name: 'Upper Strength', exercises: [ s('barbell-bench-press', 5, 3, 5, 180), s('weighted-pull-up', 4, 4, 6, 150), s('push-press', 3, 4, 6, 120), s('barbell-row', 3, 6, 8, 90), s('barbell-shrug', 3, 8, 12, 60) ] },
        { name: 'Conditioning', exercises: [ c('shuttle-run', 5, 120, 45), c('sprint', 5, 40, 60), t('battle-ropes', 4, 30, 30), s('burpee', 3, 10, 10, 45) ] },
        { name: 'Training / Match', exercises: [ t('rugby-training', 1, 5400, 0) ] },
      ],
    },
    {
      name: 'Basketball & Netball', group: 'Team sports',
      desc: 'Jump power, change of direction and court conditioning.',
      days: [
        { name: 'Jump & Power', exercises: [ s('vertical-jump', 4, 5, 5, 90), s('depth-jump', 3, 5, 5, 90), s('front-squat', 4, 4, 6, 150), s('single-leg-hop', 3, 6, 8, 60), s('standing-calf-raise', 3, 12, 15, 60) ] },
        { name: 'Agility & Conditioning', exercises: [ t('lateral-shuffle', 5, 20, 40), t('cone-drill-5-10-5', 5, 10, 60), c('shuttle-run', 5, 100, 45), t('jump-rope', 3, 60, 30) ] },
        { name: 'Strength', exercises: [ s('trap-bar-deadlift', 4, 4, 6, 150), s('dumbbell-bench-press', 3, 8, 10, 90), s('pull-up', 3, 6, 10, 90), s('bulgarian-split-squat', 3, 8, 10, 90), t('pallof-press', 3, 30, 45) ] },
        { name: 'Game / Training', exercises: [ t('basketball-game', 1, 3600, 0) ] },
      ],
    },
    // ---------------- racket & combat ----------------
    {
      name: 'Tennis, Padel & Squash', group: 'Racket & combat',
      desc: 'Footwork, rotational power and shoulder health for racket sports.',
      days: [
        { name: 'Footwork & Speed', exercises: [ t('agility-ladder', 4, 30, 45), t('lateral-shuffle', 5, 20, 40), t('reaction-ball-drill', 4, 30, 30), c('sprint', 5, 20, 60) ] },
        { name: 'Rotational Power & Strength', exercises: [ s('rotational-med-ball-throw', 4, 6, 8, 60), s('cable-woodchopper', 3, 10, 12, 60), s('goblet-squat', 3, 8, 10, 90), s('lateral-lunge', 3, 8, 10, 60), s('dumbbell-row', 3, 8, 10, 60) ] },
        { name: 'Shoulder & Wrist Care', exercises: [ s('cable-external-rotation', 3, 12, 15, 45), s('face-pull', 3, 12, 15, 45), s('band-pull-apart', 3, 15, 20, 30), s('wrist-curl', 2, 15, 20, 30), s('reverse-wrist-curl', 2, 15, 20, 30) ] },
        { name: 'Match', exercises: [ t('tennis-match', 1, 5400, 0) ] },
      ],
    },
    {
      name: 'Boxing', group: 'Racket & combat',
      desc: 'Rounds on the bag and pads, roadwork and strength for punching power.',
      days: [
        { name: 'Bag & Pads', exercises: [ t('jump-rope', 3, 180, 60), t('shadow-boxing', 3, 180, 60), t('heavy-bag-rounds', 5, 180, 60), t('pad-work', 3, 180, 60) ] },
        { name: 'Strength & Power', exercises: [ s('trap-bar-deadlift', 4, 4, 6, 150), s('medicine-ball-chest-pass', 4, 6, 8, 60), s('rotational-med-ball-throw', 4, 6, 8, 60), s('pull-up', 3, 6, 10, 90), t('plank', 3, 45, 45) ] },
        { name: 'Roadwork & Conditioning', exercises: [ c('easy-run', 1, 5, 60), c('sprint', 5, 50, 60), t('speed-bag', 3, 120, 45), s('burpee', 3, 10, 10, 45) ] },
      ],
    },
    {
      name: 'MMA & Martial Arts', group: 'Racket & combat',
      desc: 'Striking, grappling conditioning and strength to stay injury-free.',
      days: [
        { name: 'Striking', exercises: [ t('shadow-boxing', 3, 180, 60), t('heavy-bag-rounds', 4, 180, 60), t('kicks-on-bag', 3, 120, 60), s('sprawl', 3, 10, 10, 45) ] },
        { name: 'Grappling Conditioning', exercises: [ t('grappling-drills', 4, 300, 60), s('kettlebell-swing', 4, 15, 20, 45), c('farmer-s-carry', 3, 40, 60), t('battle-ropes', 3, 30, 30) ] },
        { name: 'Strength', exercises: [ s('back-squat', 4, 4, 6, 150), s('weighted-pull-up', 4, 4, 6, 120), s('overhead-press', 3, 5, 8, 120), t('neck-mobility', 2, 60, 30), t('side-plank', 3, 30, 30) ] },
        { name: 'Class / Sparring', exercises: [ t('martial-arts-class', 1, 3600, 0) ] },
      ],
    },
    // ---------------- outdoor & other ----------------
    {
      name: 'Climbing & Bouldering', group: 'Outdoor & other',
      desc: 'Finger strength, pulling power and antagonist work to stay healthy.',
      days: [
        { name: 'Fingers & Pull', exercises: [ t('hangboard-hang', 5, 10, 180), s('pull-up', 4, 5, 8, 120), t('lock-off-hold', 3, 10, 90), t('l-sit', 3, 15, 60) ] },
        { name: 'Antagonists & Core', exercises: [ s('push-up', 3, 10, 15, 60), s('dumbbell-shoulder-press', 3, 8, 12, 60), s('reverse-wrist-curl-antagonist', 3, 15, 20, 45), s('hanging-leg-raise', 3, 8, 12, 60), s('band-pull-apart', 3, 15, 20, 30) ] },
        { name: 'Climb', exercises: [ t('bouldering-session', 1, 5400, 0) ] },
      ],
    },
    {
      name: 'Golf', group: 'Outdoor & other',
      desc: 'Rotational power, hip and thoracic mobility for a longer, healthier swing.',
      days: [
        { name: 'Mobility', exercises: [ s('thoracic-rotation', 2, 10, 10, 30), s('90-90-hip-switch', 2, 10, 10, 30), s('world-s-greatest-stretch', 2, 5, 5, 30), t('hip-flexor-stretch', 2, 45, 15) ] },
        { name: 'Rotational Power & Strength', exercises: [ s('rotational-med-ball-throw', 4, 6, 8, 60), s('cable-woodchopper', 3, 10, 12, 60), s('goblet-squat', 3, 8, 10, 90), s('single-leg-romanian-deadlift', 3, 8, 10, 60), t('pallof-press', 3, 30, 30) ] },
        { name: 'Round', exercises: [ t('golf-round', 1, 14400, 0) ] },
      ],
    },
    {
      name: 'Ski & Snowboard Prep', group: 'Outdoor & other',
      desc: 'Leg endurance, eccentric strength and balance for the slopes. Start 6–8 weeks out.',
      days: [
        { name: 'Leg Strength', exercises: [ s('back-squat', 4, 6, 8, 120), s('bulgarian-split-squat', 3, 8, 10, 90), s('lateral-lunge', 3, 8, 10, 60), t('wall-sit', 3, 60, 60), s('single-leg-calf-raise', 3, 12, 15, 45) ] },
        { name: 'Power & Balance', exercises: [ s('skater-jump', 4, 8, 10, 60), s('box-jump', 3, 5, 5, 60), s('lateral-bound', 3, 6, 8, 60), t('single-leg-balance', 3, 30, 15), t('side-plank', 3, 30, 30) ] },
        { name: 'Endurance', exercises: [ c('stationary-bike', 1, 15, 0), t('battle-ropes', 4, 30, 30), t('mountain-climber', 4, 30, 30) ] },
      ],
    },
    // ---------------- health & mobility ----------------
    {
      name: 'Daily Mobility (15 min)', group: 'Health & mobility',
      desc: 'A short full-body routine to do every day, or as a warm-up.',
      days: [
        { name: 'Daily Mobility', exercises: [ s('cat-cow', 1, 10, 10, 0), s('world-s-greatest-stretch', 1, 5, 5, 0), s('90-90-hip-switch', 1, 10, 10, 0), s('thoracic-rotation', 1, 8, 8, 0), t('deep-squat-hold', 2, 45, 15), t('couch-stretch', 2, 45, 15), t('downward-dog', 1, 45, 0) ] },
      ],
    },
    {
      name: 'Desk Worker / Posture', group: 'Health & mobility',
      desc: 'Undo long hours sitting: upper back, neck and hips. 2–3× a week.',
      days: [
        { name: 'Posture', exercises: [ s('chin-tuck', 2, 10, 12, 30), s('wall-angels', 2, 10, 12, 30), s('band-pull-apart', 3, 15, 20, 30), s('face-pull', 3, 12, 15, 45), t('doorway-chest-stretch', 2, 45, 15), t('hip-flexor-stretch', 2, 45, 15), s('glute-bridge', 3, 12, 15, 45), t('neck-mobility', 1, 60, 0) ] },
      ],
    },
    {
      name: 'Strength & Balance (50+)', group: 'Health & mobility',
      desc: 'Keeps muscles, bones and balance strong. Start light and progress slowly.',
      days: [
        { name: 'Session A', exercises: [ s('sit-to-stand', 3, 8, 12, 60), s('wall-push-up', 3, 8, 12, 60), s('seated-cable-row', 3, 10, 12, 60), t('single-leg-balance', 3, 20, 20), s('glute-bridge', 2, 10, 12, 45), c('brisk-walk', 1, 2, 0) ] },
        { name: 'Session B', exercises: [ s('goblet-squat', 3, 8, 10, 60), s('dumbbell-shoulder-press', 2, 8, 10, 60), s('dumbbell-row', 3, 8, 10, 60), t('heel-to-toe-walk', 3, 30, 20), s('dumbbell-step-up', 2, 8, 10, 45), s('standing-calf-raise', 2, 12, 15, 45) ] },
      ],
    },
    {
      name: 'Walking for Health', group: 'Health & mobility',
      desc: 'Build up to 30–45 minutes of brisk walking most days, with one longer walk.',
      days: [
        { name: 'Brisk Walk', exercises: [ c('brisk-walk', 1, 3, 0) ] },
        { name: 'Long Walk / Hike', exercises: [ c('hike', 1, 8, 0) ] },
        { name: 'Walk + Strength', exercises: [ c('brisk-walk', 1, 2, 0), s('sit-to-stand', 2, 10, 15, 45), s('wall-push-up', 2, 10, 15, 45), t('plank', 2, 20, 30) ] },
      ],
    },
    {
      name: 'Yoga & Recovery', group: 'Health & mobility',
      desc: 'Low-intensity recovery days: yoga, breathing and soft-tissue work.',
      days: [
        { name: 'Yoga Flow', exercises: [ t('yoga-flow', 1, 1800, 0), t('breathing-meditation', 1, 300, 0) ] },
        { name: 'Recovery', exercises: [ t('foam-rolling', 1, 600, 0), t('pigeon-pose', 2, 60, 15), t('child-s-pose', 1, 60, 0), t('breathing-meditation', 1, 300, 0) ] },
      ],
    },
  ];
})();
