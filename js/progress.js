/* Progress: overview (weekly summary, streaks, calendar heat-map, muscle map), records board and achievements. */
(function () {
  'use strict';
  const F = window.Forge;
  const { esc, HOOKS, VIEWS, ICON, C } = F;
  const S = () => F.S;
  const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves'];

  F.progressTabs = (on) => `<div class="seg wide ptabs">${[['progress', 'Overview'], ['body', 'Body'], ['records', 'Records'], ['history', 'History']].map(([r, l]) => `<a class="${on === r ? 'on' : ''}" href="#/${r}">${l}</a>`).join('')}</div>`;

  // ---------- helpers ----------
  const inRange = (from, to) => S().sessions.filter((s) => s.start >= from && s.start < to);
  function setsByMuscle(sessions) {
    const out = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
    sessions.forEach((s) => s.exercises.forEach((e) => {
      const ex = F.exById(e.ex);
      if (out[ex.category] != null && ex.type !== 'cardio') out[ex.category] += F.working(e.sets).length;
    }));
    return out;
  }
  function weekStats(from) {
    const to = F.addDays(from, 7), ss = inRange(from, to);
    let vol = 0, km = 0, sets = 0, prs = 0;
    ss.forEach((s) => { prs += (s.prs || []).length; s.exercises.forEach((e) => {
      const ex = F.exById(e.ex); vol += F.volume(ex, e.sets); sets += F.working(e.sets).length;
      if (ex.type === 'cardio') e.sets.forEach((x) => { km += (+x.distance || 0) / (ex.dist === 'm' ? 1000 : 1); });
    }); });
    const days = {};
    S().foodLog.forEach((e) => { const t = F.fromKey(e.date); if (t >= from && t < to) days[e.date] = (days[e.date] || 0) + e.kcal; });
    const kc = Object.values(days);
    const tr = F.weightTrend().filter((p) => { const t = F.fromKey(p.date); return t >= from && t < to; });
    return { n: ss.length, vol, km, sets, prs, kcal: kc.length ? kc.reduce((a, b) => a + b, 0) / kc.length : null, weight: tr.length ? tr[tr.length - 1].avg : null };
  }
  function foodDayStreak() {
    const days = new Set(S().foodLog.map((e) => e.date));
    let t = F.startOfDay(Date.now());
    if (!days.has(F.dateKey(t))) t = F.addDays(t, -1);
    let n = 0;
    while (days.has(F.dateKey(t))) { n++; t = F.addDays(t, -1); }
    return n;
  }

  // ---------- muscle map ----------
  function muscleMap(sets) {
    const fill = (m) => { const n = sets[m] || 0; return n ? `color-mix(in srgb, var(--accent) ${Math.min(100, 30 + n * 4)}%, var(--surface-2))` : 'var(--surface-2)'; };
    const e = (m, cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill(m)}"><title>${m}: ${sets[m] || 0} sets</title></ellipse>`;
    const r = (m, x, y, w, h, rr) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="${fill(m)}"><title>${m}: ${sets[m] || 0} sets</title></rect>`;
    const base = `<g class="sil"><circle cx="50" cy="16" r="11"/><rect x="45" y="26" width="10" height="8" rx="3"/><rect x="30" y="36" width="40" height="72" rx="14"/>
      <rect x="15" y="40" width="13" height="72" rx="6"/><rect x="72" y="40" width="13" height="72" rx="6"/><rect x="33" y="104" width="16" height="104" rx="7"/><rect x="51" y="104" width="16" height="104" rx="7"/></g>`;
    const front = `${base}${e('Shoulders', 29, 45, 9, 8)}${e('Shoulders', 71, 45, 9, 8)}${e('Chest', 41, 55, 10, 8)}${e('Chest', 59, 55, 10, 8)}
      ${e('Biceps', 21, 66, 5.5, 11)}${e('Biceps', 79, 66, 5.5, 11)}${e('Forearms', 21, 94, 5, 13)}${e('Forearms', 79, 94, 5, 13)}
      ${r('Core', 41, 66, 18, 36, 6)}${e('Quads', 41, 134, 7.5, 24)}${e('Quads', 59, 134, 7.5, 24)}${e('Calves', 41, 184, 5, 15)}${e('Calves', 59, 184, 5, 15)}`;
    const back = `${base}${e('Back', 50, 48, 17, 9)}${e('Shoulders', 29, 45, 8, 7)}${e('Shoulders', 71, 45, 8, 7)}${e('Back', 39, 70, 8, 14)}${e('Back', 61, 70, 8, 14)}
      ${r('Back', 45, 82, 10, 16, 4)}${e('Triceps', 21, 66, 5.5, 11)}${e('Triceps', 79, 66, 5.5, 11)}${e('Forearms', 21, 94, 5, 13)}${e('Forearms', 79, 94, 5, 13)}
      ${e('Glutes', 42, 112, 8.5, 9)}${e('Glutes', 58, 112, 8.5, 9)}${e('Hamstrings', 41, 142, 7, 19)}${e('Hamstrings', 59, 142, 7, 19)}${e('Calves', 41, 182, 6, 15)}${e('Calves', 59, 182, 6, 15)}`;
    return `<div class="mmap"><figure><svg viewBox="0 0 100 212" role="img" aria-label="Front muscles trained">${front}</svg><figcaption>Front</figcaption></figure>
      <figure><svg viewBox="0 0 100 212" role="img" aria-label="Back muscles trained">${back}</svg><figcaption>Back</figcaption></figure></div>`;
  }

  // ---------- calendar heat-map ----------
  function heatmap() {
    const weeks = 18, start = F.addDays(F.mondayOf(Date.now()), -7 * (weeks - 1));
    const count = {};
    S().sessions.forEach((s) => { const k = F.dateKey(s.start); count[k] = (count[k] || 0) + 1; });
    const todayK = F.dateKey(Date.now());
    let cols = '', months = '';
    for (let w = 0; w < weeks; w++) {
      const wk = F.addDays(start, 7 * w), d0 = new Date(wk);
      months += `<span>${d0.getDate() <= 7 ? d0.toLocaleDateString(undefined, { month: 'short' }) : ''}</span>`;
      let cells = '';
      for (let d = 0; d < 7; d++) {
        const t = F.addDays(wk, d), k = F.dateKey(t), n = count[k] || 0;
        cells += `<i class="h${Math.min(3, n ? n + 1 : 0)} ${k > todayK ? 'fut' : ''} ${k === todayK ? 'today' : ''}" title="${F.fmtDate(t)}: ${n} workout${n === 1 ? '' : 's'}"></i>`;
      }
      cols += `<div>${cells}</div>`;
    }
    return `<div class="heat"><div class="hm-months">${months}</div><div class="hm-grid">${cols}</div></div>`;
  }

  // ---------- achievements ----------
  const best = (ids) => Math.max(0, ...S().sessions.flatMap((s) => s.exercises.filter((e) => ids.includes(e.ex)).flatMap((e) => F.working(e.sets).filter((x) => +x.reps >= 1).map((x) => +x.weight || 0))));
  const liftAch = (key, label, ids, pairs) => pairs.map(([kg, lb]) => ({
    id: `${key}-${kg}`, icon: '🏋️', title: () => `${label} ${F.unit() === 'lb' ? lb + ' lb' : kg + ' kg'}`, desc: 'Lift it for at least one rep',
    test: () => best(ids) >= (F.unit() === 'lb' ? C.fromDisp(lb, 'lb') : kg) - 0.01,
  }));
  function runs() {
    return S().sessions.flatMap((s) => s.exercises.filter((e) => F.exById(e.ex).category === 'Running' || e.ex === 'hyrox-run-1km').flatMap((e) => {
      const ex = F.exById(e.ex); return e.sets.map((x) => ({ km: (+x.distance || 0) / (ex.dist === 'm' ? 1000 : 1), time: +x.time || 0 }));
    }));
  }
  const fastest = (km) => Math.min(Infinity, ...runs().filter((r) => r.km >= km && r.km <= km * 1.1 && r.time).map((r) => (r.time * km) / r.km));
  const lifetimeVol = () => S().sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + F.volume(F.exById(e.ex), e.sets), 0), 0);
  const hyrox = () => S().sessions.filter((s) => s.hyrox).map((s) => (s.end - s.start) / 1000);
  const ACH = [
    ...[[1, 'First workout'], [10, '10 workouts'], [50, '50 workouts'], [100, '100 workouts'], [250, '250 workouts']].map(([n, t]) => ({ id: `w${n}`, icon: '💪', title: () => t, desc: 'Workouts logged', test: () => S().sessions.length >= n })),
    ...[[4, '4-week streak'], [12, '12-week streak'], [26, '26-week streak']].map(([n, t]) => ({ id: `streak${n}`, icon: '🔥', title: () => t, desc: 'Train every week', test: () => F.weekStreak() >= n })),
    ...liftAch('bench', 'Bench', ['barbell-bench-press'], [[60, 135], [100, 225], [140, 315]]),
    ...liftAch('squat', 'Squat', ['back-squat', 'high-bar-squat', 'low-bar-squat'], [[100, 225], [140, 315], [180, 405]]),
    ...liftAch('dead', 'Deadlift', ['conventional-deadlift', 'sumo-deadlift', 'trap-bar-deadlift'], [[140, 315], [180, 405], [220, 495]]),
    ...liftAch('ohp', 'Overhead press', ['overhead-press'], [[60, 135], [80, 185]]),
    { id: 'vol10k', icon: '🧱', title: () => `${F.unit() === 'lb' ? '22,000 lb' : '10,000 kg'} in one session`, desc: 'Total weight × reps', test: () => S().sessions.some((s) => s.exercises.reduce((b, e) => b + F.volume(F.exById(e.ex), e.sets), 0) >= 10000) },
    { id: 'vol1m', icon: '🏔️', title: () => (F.unit() === 'lb' ? '2.2 million lb lifted' : '1,000 tonnes lifted'), desc: 'Lifetime volume', test: () => lifetimeVol() >= 1e6 },
    { id: 'run5k', icon: '🏃', title: () => 'First 5K', desc: 'Run 5 km in one go', test: () => runs().some((r) => r.km >= 5) },
    { id: 'run5k25', icon: '⚡', title: () => 'Sub-25 5K', desc: '5 km in under 25 minutes', test: () => fastest(5) < 1500 },
    { id: 'run10k', icon: '🏃', title: () => 'First 10K', desc: 'Run 10 km in one go', test: () => runs().some((r) => r.km >= 10) },
    { id: 'runhm', icon: '🥇', title: () => 'Half marathon', desc: 'Run 21.1 km in one go', test: () => runs().some((r) => r.km >= 21.1) },
    { id: 'hyrox1', icon: '🏁', title: () => 'First HYROX race', desc: 'Complete a race in race mode', test: () => hyrox().length >= 1 },
    { id: 'hyrox90', icon: '🏁', title: () => 'HYROX sub-90', desc: 'Finish in under 1:30:00', test: () => hyrox().some((t) => t < 5400) },
    { id: 'hyrox75', icon: '🏆', title: () => 'HYROX sub-75', desc: 'Finish in under 1:15:00', test: () => hyrox().some((t) => t < 4500) },
    { id: 'food7', icon: '🥗', title: () => '7-day food streak', desc: 'Log food 7 days in a row', test: () => foodDayStreak() >= 7 },
    { id: 'food30', icon: '📒', title: () => '30 days logged', desc: 'Days with food logged', test: () => new Set(S().foodLog.map((e) => e.date)).size >= 30 },
    { id: 'weigh10', icon: '⚖️', title: () => '10 weigh-ins', desc: 'Bodyweight logged', test: () => S().weights.length >= 10 },
    { id: 'photo1', icon: '📸', title: () => 'First progress photo', desc: 'Track how you look, not just numbers', test: () => S().photos.length >= 1 },
  ];
  function checkAchievements(silent) {
    const got = S().achievements;
    const first = !got._init;
    const fresh = [];
    ACH.forEach((a) => { if (!got[a.id]) { let ok = false; try { ok = a.test(); } catch (e) { /* ignore */ } if (ok) { got[a.id] = Date.now(); fresh.push(a); } } });
    got._init = true;
    if (fresh.length || first) F.save();
    if (!silent && !first && fresh.length) setTimeout(() => F.toast(`🏅 Achievement unlocked: ${fresh[0].title()}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`), 2400);
  }
  HOOKS.afterFinish.push(() => checkAchievements());
  HOOKS.afterSave.push(() => checkAchievements());

  // ---------- overview ----------
  VIEWS.progress = () => {
    checkAchievements(true);
    const mon = F.mondayOf(Date.now());
    const a = weekStats(mon), b = weekStats(F.addDays(mon, -7));
    const d = (x, y, fmt, invert) => { if (x == null || y == null || x === y) return ''; const up = x > y; return `<span class="delta ${(up !== !!invert) ? 'good' : 'bad'}">${up ? '▲' : '▼'} ${fmt(Math.abs(x - y))}</span>`; };
    const u = F.unit();
    const sets = setsByMuscle(inRange(F.addDays(F.startOfDay(Date.now()), -6), Date.now() + 1));
    const got = S().achievements;
    const ach = ACH.map((x) => ({ ...x, at: got[x.id] })).sort((p, q) => (q.at || 0) - (p.at || 0));
    const nGot = ach.filter((x) => x.at).length;
    return `
      <header class="top"><h1>Progress</h1><a class="icon-btn" href="#/settings" aria-label="Settings">${ICON.gear}</a></header>
      ${F.progressTabs('progress')}
      <h2>This week</h2>
      <div class="card summary">
        <div><span class="muted small">Workouts</span><b>${a.n}</b>${d(a.n, b.n, (v) => v)}</div>
        <div><span class="muted small">Working sets</span><b>${a.sets}</b>${d(a.sets, b.sets, (v) => v)}</div>
        <div><span class="muted small">Volume (${u})</span><b>${Math.round(C.toDisp(a.vol, u)).toLocaleString()}</b>${d(a.vol, b.vol, (v) => Math.round(C.toDisp(v, u)).toLocaleString())}</div>
        <div><span class="muted small">Cardio</span><b>${a.km.toFixed(1)} km</b>${d(a.km, b.km, (v) => v.toFixed(1))}</div>
        <div><span class="muted small">Avg calories</span><b>${a.kcal == null ? '–' : Math.round(a.kcal).toLocaleString()}</b>${a.kcal != null && b.kcal != null ? `<span class="delta muted">${Math.round(b.kcal).toLocaleString()} last wk</span>` : ''}</div>
        <div><span class="muted small">Weight (avg)</span><b>${a.weight == null ? '–' : F.fmtBW(a.weight)}</b>${a.weight != null && b.weight != null ? `<span class="delta muted">${F.fmtBWDelta(a.weight - b.weight)}</span>` : ''}</div>
      </div>
      <div class="row gap streaks"><div class="card grow"><b>🔥 ${F.weekStreak()}</b><span class="muted small">week training streak</span></div><div class="card grow"><b>🥗 ${foodDayStreak()}</b><span class="muted small">day food-log streak</span></div></div>
      <h2>Last 18 weeks</h2>
      <div class="card">${heatmap()}</div>
      <h2>Muscles trained · last 7 days</h2>
      <div class="card">
        ${muscleMap(sets)}
        <div class="mvol">${MUSCLES.map((m) => `<div class="mv"><span>${m}</span><div class="track"><div style="width:${Math.min(100, (sets[m] / 20) * 100)}%"></div><i style="left:50%"></i></div><b>${sets[m]}</b></div>`).join('')}</div>
        <p class="muted small">Working sets per muscle. Around 10–20 hard sets a week (the marker is 10) is a good range for growth.</p>
      </div>
      <h2>Achievements <span class="muted small">${nGot}/${ACH.length}</span></h2>
      <div class="achs">${ach.map((x) => `<div class="ach ${x.at ? 'got' : ''}"><span class="ai">${x.icon}</span><b>${esc(x.title())}</b><span class="muted small">${x.at ? F.fmtDate(x.at) : esc(x.desc)}</span></div>`).join('')}</div>`;
  };

  // ---------- records ----------
  VIEWS.records = () => {
    const rows = {};
    S().sessions.forEach((s) => s.exercises.forEach((e) => {
      const ex = F.exById(e.ex);
      if (s.hyrox) return;
      const r = rows[e.ex] || (rows[e.ex] = { ex, e1: 0, e1d: 0, heavy: null, dist: 0, pace: Infinity, paceD: 0, last: 0 });
      r.last = Math.max(r.last, s.start);
      F.working(e.sets).forEach((x) => {
        if (ex.type === 'strength') {
          const v = C.e1rm(+x.weight || 0, +x.reps || 0);
          if (v > r.e1) { r.e1 = v; r.e1d = s.start; }
          if (!r.heavy || +x.weight > r.heavy.weight) r.heavy = { weight: +x.weight, reps: x.reps, d: s.start };
        } else if (ex.type === 'cardio') {
          if (+x.distance > r.dist) r.dist = +x.distance;
          if (x.distance && x.time && x.time / x.distance < r.pace) { r.pace = x.time / x.distance; r.paceD = s.start; }
        } else if (ex.type === 'bodyweight' || ex.type === 'timed') {
          const v = ex.type === 'timed' ? +x.time || 0 : +x.reps || 0;
          if (v > r.dist) { r.dist = v; r.paceD = s.start; }
        }
      });
    }));
    const list = Object.values(rows).sort((a, b) => b.last - a.last);
    const lifts = list.filter((r) => r.ex.type === 'strength' && r.e1);
    const cardio = list.filter((r) => r.ex.type === 'cardio');
    const other = list.filter((r) => (r.ex.type === 'bodyweight' || r.ex.type === 'timed') && r.dist);
    const runPB = [[1, '1 km'], [5, '5 km'], [10, '10 km'], [21.1, 'Half marathon']].map(([km, l]) => ({ l, t: fastest(km) })).filter((x) => x.t < Infinity);
    const hy = S().sessions.filter((s) => s.hyrox);
    const hyBest = hy.length ? Math.min(...hy.map((s) => (s.end - s.start) / 1000)) : null;
    const u = F.unit();
    return `
      <header class="top"><h1>Progress</h1><a class="icon-btn" href="#/settings" aria-label="Settings">${ICON.gear}</a></header>
      ${F.progressTabs('records')}
      ${runPB.length ? `<h2>Running bests</h2><div class="card stats">${runPB.map((x) => `<div><b>${C.fmtTime(x.t, x.t >= 3600)}</b><span>${x.l}</span></div>`).join('')}</div>` : ''}
      ${hyBest ? `<h2>HYROX</h2><div class="card stats"><div><b>${C.fmtTime(hyBest, true)}</b><span>best race</span></div><div><b>${hy.length}</b><span>races</span></div></div>` : ''}
      <h2>Lifts</h2>
      ${lifts.length ? `<div class="card">${lifts.map((r) => `<a class="list-item plain" href="#/exercise/${encodeURIComponent(r.ex.id)}"><div class="grow"><div>${esc(r.ex.name)}</div><div class="muted small">Heaviest ${F.W(r.heavy.weight)} ${u} × ${r.heavy.reps} · ${F.fmtDate(r.heavy.d)}</div></div><div class="right"><b>${F.W(r.e1)}</b><div class="muted small">est. 1RM</div></div></a>`).join('')}</div>` : '<p class="muted small">Log some weighted sets to see your records.</p>'}
      ${cardio.length ? `<h2>Cardio</h2><div class="card">${cardio.map((r) => `<a class="list-item plain" href="#/exercise/${encodeURIComponent(r.ex.id)}"><div class="grow"><div>${esc(r.ex.name)}</div><div class="muted small">Longest ${r.dist} ${r.ex.dist}</div></div><div class="right"><b>${r.pace < Infinity ? esc(C.pace(r.ex, 1, r.pace)) : '–'}</b><div class="muted small">best pace</div></div></a>`).join('')}</div>` : ''}
      ${other.length ? `<h2>Bodyweight & holds</h2><div class="card">${other.map((r) => `<a class="list-item plain" href="#/exercise/${encodeURIComponent(r.ex.id)}"><div class="grow">${esc(r.ex.name)}</div><b>${r.ex.type === 'timed' ? C.fmtTime(r.dist) : r.dist + ' reps'}</b></a>`).join('')}</div>` : ''}`;
  };
})();
