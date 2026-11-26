/* Training extras: shared date helpers, weekly schedule + deloads, "Up next" card, how-to cues,
 * bar weight setting and the HYROX race mode. */
(function () {
  'use strict';
  const F = window.Forge;
  const { esc, HOOKS, A, C } = F;
  const DAY = 864e5;

  // ---------- date helpers (local time) ----------
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const mondayOf = (t) => { const d = new Date(startOfDay(t)); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  Object.assign(F, { dateKey, fromKey, startOfDay, mondayOf, addDays, DAY, DOW });

  // ---------- streaks ----------
  // consecutive Mon–Sun weeks with at least one workout (this week counts once it has one)
  F.weekStreak = () => {
    const S = F.S;
    const weeks = new Set(S.sessions.map((s) => mondayOf(s.start)));
    let w = mondayOf(Date.now());
    if (!weeks.has(w)) w = addDays(w, -7);
    let n = 0;
    while (weeks.has(w)) { n++; w = addDays(w, -7); }
    return n;
  };

  // ---------- deload weeks ----------
  F.isDeloadWeek = (plan) => {
    const n = +plan.deloadEvery;
    if (!n || !plan.cycleStart) return false;
    const weeks = Math.floor((mondayOf(Date.now()) - mondayOf(plan.cycleStart)) / (7 * DAY) + 0.01);
    return weeks >= 0 && weeks % n === n - 1;
  };

  // ---------- schedule ----------
  const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  HOOKS.planExtras.push((p) => {
    const sch = p.schedule || {};
    const opts = (sel) => `<option value="">Rest</option>${p.days.map((d) => `<option value="${d.id}" ${sel === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}`;
    return `
      <div class="card">
        <h3>Weekly schedule</h3>
        <p class="muted small">Pick which day runs on which weekday. Train shows today's session and your week at a glance. Leave it empty to simply rotate through the days in order.</p>
        <div class="sched-grid">${ORDER.map((wd) => `<label><span>${DOW[wd]}</span><select data-f="sched" data-p="${p.id}" data-wd="${wd}">${opts(sch[wd])}</select></label>`).join('')}</div>
        <label class="toggle"><span>Deload week<br><span class="muted small">Every Nth week: about 10% lighter and one set fewer</span></span>
          <select data-f="deload" data-p="${p.id}">${[[0, 'Off'], [4, 'Every 4th week'], [5, 'Every 5th week'], [6, 'Every 6th week'], [8, 'Every 8th week']].map(([v, l]) => `<option value="${v}" ${+p.deloadEvery === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${F.isDeloadWeek(p) ? '<p class="small"><span class="tag">This week is a deload week</span></p>' : ''}
      </div>`;
  });
  HOOKS.change.sched = (el) => { const p = F.getPlan(el.dataset.p); p.schedule = p.schedule || {}; p.schedule[el.dataset.wd] = el.value || null; F.save(); };
  HOOKS.change.deload = (el) => {
    const p = F.getPlan(el.dataset.p);
    p.deloadEvery = +el.value || 0;
    p.cycleStart = p.deloadEvery ? mondayOf(Date.now()) : null; // week 1 of the cycle starts this week
    F.save(); F.render(true);
  };

  // what to train next: today's scheduled day, else the next day in rotation of the plan used last
  F.upNext = () => {
    const S = F.S;
    const today = new Date().getDay();
    const doneToday = S.sessions.filter((s) => s.start >= startOfDay(Date.now()));
    for (const p of S.plans) {
      const did = p.schedule && p.schedule[today];
      const d = did && p.days.find((x) => x.id === did);
      if (d) return { plan: p, day: d, kind: 'today', done: doneToday.some((s) => s.planId === p.id && s.dayId === d.id) };
    }
    const last = S.sessions.find((s) => s.planId && S.plans.some((p) => p.id === s.planId));
    if (last) {
      const p = S.plans.find((x) => x.id === last.planId);
      const scheduled = p.schedule && Object.values(p.schedule).some(Boolean);
      if (!scheduled && p.days.length) {
        const i = p.days.findIndex((d) => d.id === last.dayId);
        return { plan: p, day: p.days[(i + 1) % p.days.length], kind: 'next', done: false };
      }
    }
    return null;
  };

  HOOKS.trainTop.push(() => {
    const S = F.S;
    const mon = mondayOf(Date.now());
    const todayKey = dateKey(Date.now());
    const sessionDays = new Set(S.sessions.map((s) => dateKey(s.start)));
    const strip = ORDER.map((wd, i) => {
      const t = addDays(mon, i), k = dateKey(t);
      const sched = S.plans.some((p) => p.schedule && p.schedule[wd]);
      const cls = [sessionDays.has(k) ? 'done' : '', sched ? 'sched' : '', k === todayKey ? 'today' : ''].join(' ');
      return `<div class="wd ${cls}"><span>${DOW[wd][0]}</span><i>${new Date(t).getDate()}</i></div>`;
    }).join('');
    const streak = F.weekStreak();
    const nx = !S.active && F.upNext();
    const deload = nx && F.isDeloadWeek(nx.plan);
    return `
      <div class="card week">
        <div class="row between"><b>This week</b><span class="small">${streak ? `🔥 ${streak}-week streak` : '<span class="muted">Start a streak this week</span>'}</span></div>
        <div class="weekstrip">${strip}</div>
      </div>
      ${nx ? `<div class="card upnext">
        <div class="grow"><div class="label">${nx.kind === 'today' ? (nx.done ? 'Done today ✓' : 'Today') : 'Up next'}${deload ? ' · deload week' : ''}</div>
          <div class="big">${esc(nx.day.name)}</div><div class="muted small">${esc(nx.plan.name)} · ${nx.day.exercises.length} exercises</div></div>
        ${nx.done ? '' : `<button class="btn primary" data-a="startDay" data-p="${nx.plan.id}" data-d="${nx.day.id}" ${nx.day.exercises.length ? '' : 'disabled'}>Start</button>`}
      </div>` : ''}`;
  });

  // ---------- how-to ----------
  HOOKS.exerciseExtras.push((ex) => {
    const cues = window.HOWTO[ex.id];
    const d = (window.DEMOS || {})[ex.id];
    const q = encodeURIComponent(`${ex.name} exercise form`);
    const imgs = (d && d.i) || [];
    const media = d && (d.v || imgs.length) ? `
        ${d.v ? `<video class="demo-vid" src="videos/exercises/${d.v}.mp4" ${imgs.length ? `poster="images/exercises/${imgs[0]}.webp"` : ''} controls muted loop playsinline preload="none"></video>` : ''}
        ${imgs.length ? `<div class="demo-imgs ${imgs.length > 1 ? 'multi' : ''}">${imgs.map((i, n) => `<img src="images/exercises/${i}.webp" alt="${esc(ex.name)} demonstration ${n + 1}" loading="lazy">`).join('')}</div>` : ''}` : '';
    const steps = d && d.s && d.s.length ? d.s : null;
    return `<h2>How to</h2>
      <div class="card howto">
        ${media}
        ${cues ? `<div class="label-sm">Coaching cues</div><ol class="cues">${cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
        ${steps ? (cues ? `<details class="steps"><summary>Step-by-step instructions</summary><ol class="cues">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`
          : `<div class="label-sm">Step by step</div><ol class="cues">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`) : ''}
        ${!cues && !steps && !media ? '<p class="muted small">No demo for this one yet. Watch one below.</p>' : ''}
        ${d ? `<p class="credit">${d.v || imgs.length ? 'Images' + (d.v ? ' & video' : '') : 'Instructions'}: ${esc(d.c)} · <a href="https://wger.de/en/exercise/${d.w}/view/" target="_blank" rel="noopener">wger.de</a></p>` : ''}
        <a class="btn block" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ More demos on YouTube</a>
      </div>`;
  });

  // ---------- settings: bar weight + plate calculator ----------
  HOOKS.settingsExtras.push(() => {
    const S = F.S;
    const bar = S.settings.barKg || (F.unit() === 'lb' ? C.fromDisp(45, 'lb') : 20);
    return `<h2>Training</h2><div class="card">
      <label class="toggle"><span>Barbell weight (${F.unit()})</span><input class="short" data-f="barKg" inputmode="decimal" value="${F.W(bar)}"></label>
      <button class="btn block" data-a="platesTool">Plate calculator</button></div>`;
  });
  HOOKS.change.barKg = (el) => { const n = F.num(el.value); if (n) { F.S.settings.barKg = C.fromDisp(n, F.unit()); F.save(); } };

  // ---------- HYROX race mode ----------
  const SEG = [
    ['Run 1', 'hyrox-run-1km', { distance: 1000 }], ['SkiErg', 'hyrox-skierg-1000m', { distance: 1000 }],
    ['Run 2', 'hyrox-run-1km', { distance: 1000 }], ['Sled Push', 'hyrox-sled-push-50m', { distance: 50, w: 'push' }],
    ['Run 3', 'hyrox-run-1km', { distance: 1000 }], ['Sled Pull', 'hyrox-sled-pull-50m', { distance: 50, w: 'pull' }],
    ['Run 4', 'hyrox-run-1km', { distance: 1000 }], ['Burpee Broad Jumps', 'hyrox-burpee-broad-jumps-80m', { distance: 80 }],
    ['Run 5', 'hyrox-run-1km', { distance: 1000 }], ['Row', 'hyrox-row-1000m', { distance: 1000 }],
    ['Run 6', 'hyrox-run-1km', { distance: 1000 }], ['Farmers Carry', 'hyrox-farmers-carry-200m', { distance: 200, w: 'farm' }],
    ['Run 7', 'hyrox-run-1km', { distance: 1000 }], ['Sandbag Lunges', 'hyrox-sandbag-lunges-100m', { distance: 100, w: 'bag' }],
    ['Run 8', 'hyrox-run-1km', { distance: 1000 }], ['Wall Balls', 'hyrox-wall-balls-100-reps', { reps: 100, w: 'ball' }],
  ];
  // official loads in kg (sleds include the sled; farmers = per hand)
  const DIV = {
    'Open Men': { push: 152, pull: 103, farm: 24, bag: 20, ball: 6 },
    'Open Women': { push: 102, pull: 78, farm: 16, bag: 10, ball: 4 },
    'Pro Men': { push: 202, pull: 153, farm: 32, bag: 30, ball: 9 },
    'Pro Women': { push: 152, pull: 103, farm: 24, bag: 20, ball: 6 },
  };
  const race = () => F.S.race || (F.S.race = { division: 'Open Men', start: null, marks: [], done: false });
  const hyroxSessions = () => F.S.sessions.filter((s) => s.hyrox);
  const splitsOf = (s) => s.exercises.map((e) => (e.sets[0] || {}).time || null);
  function bestSplits() {
    const best = SEG.map(() => null);
    hyroxSessions().forEach((s) => splitsOf(s).forEach((t, i) => { if (t && (best[i] == null || t < best[i])) best[i] = t; }));
    return best;
  }
  const splitTimes = (r) => r.marks.map((m, i) => (m - (i ? r.marks[i - 1] : r.start)) / 1000);

  F.hyroxBody = () => {
    const r = race(), best = bestSplits();
    const prev = hyroxSessions()[0];
    if (!r.start) {
      return `<div class="phase">HYROX race</div>
        <p class="muted small">Tap after each run and station to record your splits. Times are compared with your best previous splits.</p>
        <label class="toggle"><span>Division</span><select data-f="hyroxDiv">${Object.keys(DIV).map((d) => `<option ${r.division === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        ${prev ? `<p class="small">Last race: <b>${C.fmtTime((prev.end - prev.start) / 1000, true)}</b> · best: <b>${C.fmtTime(Math.min(...hyroxSessions().map((s) => (s.end - s.start) / 1000)), true)}</b></p>` : ''}
        <button class="btn big primary block" data-a="hyStart">Start race</button>`;
    }
    const st = splitTimes(r), seg = r.marks.length;
    const done = seg >= SEG.length;
    const rows = st.map((t, i) => {
      const b = best[i]; const d = b ? t - b : null;
      return `<div class="row between split"><span>${SEG[i][0]}</span><span>${C.fmtTime(t)}</span><span class="${d == null ? 'muted' : d <= 0 ? 'good' : 'bad'}">${d == null ? '' : (d <= 0 ? '−' : '+') + C.fmtTime(Math.abs(d))}</span></div>`;
    }).reverse().join('');
    return `
      <div class="muted small">${esc(r.division)} · total</div>
      <div class="clock" data-tick="hyTotal"></div>
      ${done ? `<div class="phase ph-work">Finished!</div>
        <div class="row gap center"><button class="btn big primary" data-a="hySave">Save race</button><button class="btn big" data-a="hyUndo">Undo last</button><button class="btn big danger-ghost" data-a="hyReset">Discard</button></div>`
        : `<div class="phase ph-work">${SEG[seg][0]}</div>
        <div class="row between small seg-meta"><span>Split <b data-tick="hySplit"></b></span><span class="muted">${best[seg] ? `Best ${C.fmtTime(best[seg])}` : 'No best yet'}</span><span class="muted">${seg + 1}/16</span></div>
        <button class="btn big primary block hy-next" data-a="hyMark">Done → ${esc(seg + 1 < SEG.length ? SEG[seg + 1][0] : 'Finish')}</button>
        <div class="row gap center"><button class="btn" data-a="hyUndo" ${seg ? '' : 'disabled'}>Undo last</button><button class="btn danger-ghost" data-a="hyReset">Stop & discard</button></div>`}
      <div class="splits">${rows}</div>`;
  };
  HOOKS.change.hyroxDiv = (el) => { race().division = el.value; F.save(); };
  A.hyStart = () => { const r = race(); Object.assign(r, { start: Date.now(), marks: [], done: false }); F.save(); F.updateWakeLock(); F.render(true); };
  A.hyMark = () => { const r = race(); r.marks.push(Date.now()); F.beep(1046, 0.15); F.buzz(80); F.save(); F.render(true); };
  A.hyUndo = () => { const r = race(); r.marks.pop(); F.save(); F.render(true); };
  A.hyReset = () => { if (!confirm('Discard this race?')) return; F.S.race = null; F.save(); F.updateWakeLock(); F.render(true); };
  A.hySave = () => {
    const r = race(), st = splitTimes(r), loads = DIV[r.division];
    const exercises = SEG.map(([, ex, o], i) => {
      const set = { time: Math.round(st[i]) };
      if (o.distance) set.distance = o.distance;
      if (o.reps) set.reps = o.reps;
      if (o.w) set.weight = loads[o.w];
      return { ex, sets: [set], notes: '' };
    });
    const end = r.marks[r.marks.length - 1];
    const session = Store.touch({ id: F.uid(), name: `HYROX Race · ${r.division}`, start: r.start, end, exercises, prs: [], hyrox: { division: r.division } });
    F.S.sessions.unshift(session);
    F.S.sessions.sort((a, b) => b.start - a.start);
    F.S.race = null; F.save(); F.updateWakeLock();
    HOOKS.afterFinish.forEach((f) => f(session));
    F.toast(`Race saved: ${C.fmtTime((end - r.start) / 1000, true)} 🏁`);
    F.go('session/' + session.id);
  };
  HOOKS.tick.push((now, set) => {
    const r = F.S.race;
    if (!r || !r.start) return;
    const done = r.marks.length >= SEG.length;
    const endT = done ? r.marks[r.marks.length - 1] : now;
    set('hyTotal', C.fmtTime((endT - r.start) / 1000, true));
    if (!done) set('hySplit', C.fmtTime((now - (r.marks.length ? r.marks[r.marks.length - 1] : r.start)) / 1000));
  });
  // land on the race screen if a race is running
  if (F.S.race && F.S.race.start) F.T.mode = 'hyrox';
})();
