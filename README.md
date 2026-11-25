# Forge – Workout Tracker

A fully customisable workout app for gym, running, cycling, rowing, swimming and HYROX training.
It's an installable web app (PWA): it works offline and keeps all data on your phone.

## Features
- **Custom plans**: build plans from scratch or start from a template (Push/Pull/Legs, Upper/Lower, Full Body, 5×5, HYROX, 5K running, cycling, bodyweight). Set the sets (1–5), rep range, starting weight, distance, hold time and rest for every exercise, and reorder days and exercises.
- **441 exercises** across chest, back, shoulders, arms, legs, core, Olympic lifts, kettlebell, running, cycling, rowing/erg, swimming, HYROX stations, conditioning and mobility. You can also add your own.
- **Logging for each type of exercise**: weight × reps, bodyweight reps (+ added weight), timed holds, distance + time (with pace in min/km, km/h, /500m or /100m), sleds and carries (distance + load), reps for time.
- **Last session and next-session suggestions**: every exercise shows what you did last time, with each set's previous values, and pre-fills a suggested weight, sets and reps:
  - Strength (double progression): hit the top of the rep range on every set and the weight goes up (+2.5 kg upper body, +5 kg lower body, +2 kg dumbbells…). Inside the range, aim for +1 rep. Miss the bottom of the range twice in a row and it deloads by about 10%.
  - Cardio: go about 5% further at the same pace, then hold that distance and go about 2% faster. Fixed-distance intervals target a faster pace.
  - Holds: add seconds. Sleds and carries: add load once the full distance is covered, then go faster.
- **Timers**: a rest timer starts automatically when you tick a set (adjustable ±15 s), plus a stopwatch with laps, a countdown, and intervals (Tabata, EMOM, 30/30, custom).
- **History and progress**: past workouts, per-exercise history, an estimated 1RM or pace chart, and personal bests.
- kg/lb, JSON backup export/import, light and dark mode, and the screen stays awake during a workout.

## Run it
No build step. Serve the folder with any static server:
```
python3 -m http.server 8000   # then open http://localhost:8000
```
To install it on your phone, host it (for example on GitHub Pages: Settings → Pages → deploy from this branch), open the URL, then choose **Add to Home Screen**.

## Code
- `js/exercises.js`: exercise library (one line per exercise, easy to extend)
- `js/templates.js`: starter plans
- `js/progression.js`: formatting and the suggestion engine (pure functions)
- `js/app.js`: UI, storage, timers
