# Forge – Workout Tracker

A fully customisable training and nutrition app for gym, running, cycling, rowing, swimming and HYROX.
It's an installable web app (PWA): it works offline and keeps all data on your phone.

Live: https://connorgodwin.github.io/Gym-app/

## Features

**Training**
- Edit any past workout (date, duration, sets) or log one you missed; suggestions use only the workouts before that date.
- Custom plans, or 34 templates in seven groups: strength (PPL, Upper/Lower, 5×5, powerlifting, calisthenics, kettlebell, beginner machines), running and endurance (Couch to 5K, 5K, 10K, half marathon, marathon, triathlon, swimming, rowing, cycling), HYROX and functional fitness, team sports (football, rugby, basketball/netball), racket and combat (tennis/padel/squash, boxing, MMA), outdoor (climbing, golf, ski prep), and health (daily mobility, posture, 50+ strength and balance, walking, yoga). Each plan has 1–5 working sets, rep ranges, weights and rest times.
- 503 exercises (including sport sessions, agility/plyometrics and combat drills) and custom exercises. 137 have demo images (26 with short videos) and step-by-step instructions from [wger](https://wger.de), plus coaching cues and a YouTube link for every exercise.
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
- Light, dark or automatic theme, 12 accent colours plus a custom colour, kg/lb for lifting, and separate body units (kg, lb or st & lb; cm or ft & in; cm or in).
- Update banner, JSON backup export/import, and the screen stays awake during workouts.

## Run it
No build step. Serve the folder with any static server:
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Store apps (Android & iOS)
`native/` holds a [Capacitor](https://capacitorjs.com) project that wraps this web app for Google Play and the App Store, adding rest-timer notifications, keep-awake, haptics, native barcode scanning (Android), share-sheet backups and file-backed storage (`js/native.js`).
- Every push that touches the app builds an installable **Android test APK** and compiles the **iOS** app (Actions → *Native apps* → Artifacts).
- Local: `cd native && npm ci && npm run android` (or `npm run ios` on a Mac) opens the project in Android Studio / Xcode.
- Icons and splash screens: `python3 native/scripts/make-icons.py`.
- Store listing text, privacy-form answers, screenshots and release steps: [`store/README.md`](store/README.md).

## Tests
Automated tests run on GitHub for every push (see the Actions tab). To run them locally:
```
cd tests
npm ci
npx playwright install chromium   # first time only
npm test                          # unit tests + browser tests
```
- `tests/unit`: progression maths, and checks that the exercises, templates, demos and offline-cache list fit together (Node's built-in test runner).
- `tests/e2e`: every screen and feature in a real browser, at Android and iPhone sizes, with no sideways scrolling at 320–412 px in light and dark mode. Open Food Facts is mocked, and any JavaScript error fails the test.

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
| `js/demos.js`, `images/exercises`, `videos/exercises` | Exercise demos from wger |

## Adding a cloud database later
The data layer is built so sync can be added without touching the screens:
- Every saved record lives in a collection (`Store.COLLECTIONS`) with a unique `id` and an `updatedAt` timestamp, and deletes leave a tombstone (`{coll, id, at}`).
- Storage goes through an adapter with `load()` and `save()`. A sync adapter (for example Supabase or Firebase) can push records where `updatedAt > lastSync`, apply tombstones, pull remote changes, and resolve conflicts by latest `updatedAt`.
- `Store.SCHEMA` and `MIGRATIONS` upgrade old saves and backups.
- Progress photos are stored separately (IndexedDB, keyed by the record id), so they can go to file storage.

## Credits
Exercise images, videos and step-by-step instructions come from [wger](https://wger.de), the free and open-source workout manager. They are by wger contributors and licensed CC BY-SA 3.0/4.0 (a few CC0/CC BY); each exercise page shows its credit and links to the source. Videos were re-encoded to smaller H.264 files, and images converted to WebP. Food data comes from [Open Food Facts](https://openfoodfacts.org) (ODbL). Barcode scanning uses [ZXing](https://github.com/zxing-js/library) (Apache-2.0).
