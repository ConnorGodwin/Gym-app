# Forge – Workout Tracker

A fully customisable training and nutrition app for gym, running, cycling, rowing, swimming and HYROX.
It's an installable web app (PWA): it works offline and keeps all data on your phone.

Live: https://connorgodwin.github.io/Gym-app/

## Features

**Training**
- Custom plans (or templates: PPL, Upper/Lower, Full Body, 5×5, HYROX, 5K, cycling, bodyweight), 1–5 working sets, rep ranges, weights, rest times.
- 441 exercises, custom exercises, and how-to cues with a "Watch a demo" link.
- Last session shown per set, and next-session suggestions based on double progression. RPE feeds in: very hard sets hold the weight, easy sets jump further.
- Warm-up sets (auto ramp), set types (warm-up, drop, failure), RPE per set, plate calculator, supersets (rest only after the last exercise).
- Weekly schedule with an "Up next" card and week strip, and optional deload weeks (about 10% lighter, one set fewer).
- Timers: rest (auto), stopwatch, countdown, intervals, and HYROX race mode with live splits against your bests.

**Nutrition**
- Food diary (breakfast, lunch, dinner, snacks) with calories and macros.
- Open Food Facts search (UK by default, or worldwide) and barcode scanning: native `BarcodeDetector` where available, otherwise the bundled ZXing library.
- Quick add, custom foods, recipes (per-serving macros), saved meals, copying a meal or a whole day.
- Targets from Mifflin-St Jeor plus activity and goal, an optional training-day bonus, and a weekly adaptive check-in that estimates real maintenance from your intake and weight trend.
- Water tracker, weekly meal plan with "Log all", and a shopping list that splits recipes into their ingredients.

**Body and progress**
- Bodyweight with a 7-day average, measurements, and progress photos (IndexedDB, compare side by side).
- Weekly summary against last week, training and food-log streaks, an 18-week calendar heat-map, a muscle map with weekly sets per muscle, a records board, and achievements.

**App**
- Light, dark or automatic theme, 12 accent colours plus a custom colour, kg/lb.
- Update banner, JSON backup export/import, and the screen stays awake during workouts.

## Run it
No build step. Serve the folder with any static server:
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Releasing updates
Bump `VERSION` in `sw.js` with every change. Installed apps check for a new version on launch, on returning to the foreground and every 30 minutes, then show an "Update available – Refresh" banner.

## Code
| File | What it does |
|---|---|
| `js/store.js` | Data layer: schema version and migrations, record ids/timestamps, tombstones, storage adapter, IndexedDB for photos |
| `js/progression.js` | Pure maths: suggestions, RPE, deloads, warm-ups, plates, formatting |
| `js/app.js` | Core UI: routing, workouts, plans, exercise library, timers, settings, update checks |
| `js/training.js` | Schedule, deloads, "Up next", how-to, HYROX race mode |
| `js/nutrition.js` | Food diary, search/barcode, recipes, meals, targets, meal plan, shopping list |
| `js/body.js` | Weight, measurements, photos |
| `js/progress.js` | Overview, heat-map, muscle map, records, achievements |
| `js/exercises.js`, `js/templates.js`, `js/howto.js` | Exercise library, starter plans, coaching cues |

## Adding a cloud database later
The data layer is built so sync can be added without touching the screens:
- Every saved record lives in a collection (`Store.COLLECTIONS`) with a unique `id` and an `updatedAt` timestamp, and deletes leave a tombstone (`{coll, id, at}`).
- Storage goes through an adapter with `load()` and `save()`. A sync adapter (for example Supabase or Firebase) can push records where `updatedAt > lastSync`, apply tombstones, pull remote changes, and resolve conflicts by latest `updatedAt`.
- `Store.SCHEMA` and `MIGRATIONS` upgrade old saves and backups.
- Progress photos are stored separately (IndexedDB, keyed by the record id), so they can go to file storage.
