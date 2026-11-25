/* Forge – workout tracker. Vanilla JS, data stored on-device in localStorage. */
(function () {
  'use strict';
  const C = window.Core;
  const MAX = C.MAX_SETS;
  const STORE = 'forge.v1';
  const DEFAULTS = () => ({
    v: 1,
    settings: { unit: 'kg', rest: 90, autoRest: true, sound: true, vibrate: true },
    custom: [], plans: [], sessions: [], active: null,
  });

  // ================= state =================
  let S = load();
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE));
      if (d && typeof d === 'object') return normalise(d);
    } catch (e) { /* fall through */ }
    return DEFAULTS();
  }
  function normalise(d) {
    const base = DEFAULTS();
    const out = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
    ['custom', 'plans', 'sessions'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    out.sessions.sort((a, b) => b.start - a.start);
    return out;
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(S)); }
    catch (e) { toast('Could not save – device storage may be full'); }
  }

  // ================= utils =================
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const unit = () => S.settings.unit;
  const fmtDate = (t, opts) => new Date(t).toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short' });
  const fmtDateLong = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const W = (kg) => (kg == null ? '' : C.fmtW(kg, unit()));
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

  // ================= exercises =================
  let exIndex = null;
  const exAll = () => window.EXERCISES.concat(S.custom);
  function exById(id) {
    if (!exIndex) { exIndex = {}; exAll().forEach((e) => { exIndex[e.id] = e; }); }
    return exIndex[id] || { id, name: String(id).replace(/-/g, ' '), category: 'Other', equipment: 'Other', type: 'strength' };
  }
  const fieldsOf = (ex) => C.SET_FIELDS[ex.type] || C.SET_FIELDS.strength;

  // Past performances of an exercise, newest first. `occ` matches the n-th time the exercise
  // appears within a workout (e.g. the 8 runs in a HYROX simulation).
  function historyFor(exId, occ = 0) {
    const out = [];
    for (const s of S.sessions) {
      const entries = s.exercises.filter((e) => e.ex === exId && e.sets.length);
      if (!entries.length) continue;
      const e = entries[Math.min(occ, entries.length - 1)];
      out.push({ date: s.start, sessionId: s.id, sets: e.sets });
    }
    return out;
  }

  function fmtSet(ex, s, short) {
    if (!s) return '';
    const u = unit();
    const w = s.weight != null && s.weight !== '' ? W(s.weight) : null;
    switch (ex.type) {
      case 'strength': return w != null ? `${w}${short ? '' : ' ' + u} × ${s.reps ?? '–'}` : `× ${s.reps ?? '–'}`;
      case 'bodyweight': return `${s.reps ?? '–'}${short ? '' : ' reps'}${w && +w ? ` +${w}${short ? '' : u}` : ''}`;
      case 'timed': return `${C.fmtTime(s.time) || '–'}${w && +w ? ` @${w}${short ? '' : u}` : ''}`;
      case 'cardio': return `${s.distance ?? '–'}${ex.dist}${s.time ? ` ${C.fmtTime(s.time)}` : ''}`;
      case 'carry': return `${s.distance ?? '–'}m${w ? ` @${w}${short ? '' : u}` : ''}${s.time && !short ? ` ${C.fmtTime(s.time)}` : ''}`;
      case 'reps_time': return `${s.reps ?? '–'}${w ? ` @${w}${short ? '' : u}` : ''}${s.time ? ` ${C.fmtTime(s.time)}` : ''}`;
      default: return '';
    }
  }
  function fmtSets(ex, sets) {
    if (!sets || !sets.length) return '';
    const strs = sets.map((s) => fmtSet(ex, s));
    if (ex.type === 'strength' && sets.every((s) => s.weight === sets[0].weight)) {
      return `${W(sets[0].weight) !== '' ? W(sets[0].weight) + ' ' + unit() : 'BW'} × ${sets.map((s) => s.reps ?? '–').join(', ')}`;
    }
    if (strs.every((x) => x === strs[0])) return sets.length > 1 ? `${sets.length} × ${strs[0]}` : strs[0];
    return strs.join(' · ');
  }
  const volume = (ex, sets) => (ex.type === 'strength' ? sets.reduce((a, s) => a + (+s.weight || 0) * (+s.reps || 0), 0) : 0);

  // ================= routing / render =================
  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'train';
    const [name, arg] = h.split('/');
    return { name, arg: arg ? decodeURIComponent(arg) : null };
  }
  const go = (h) => { if (location.hash === '#/' + h) render(); else location.hash = '#/' + h; };
  window.addEventListener('hashchange', () => render());

  function render(keepScroll) {
    const r = route();
    const y = window.scrollY;
    const view = VIEWS[r.name] || VIEWS.train;
    $('#main').innerHTML = view(r.arg);
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tabOf(r.name)));
    renderRestBar();
    window.scrollTo(0, keepScroll ? y : 0);
    tick();
  }
  const tabOf = (n) => ({ workout: 'train', plan: 'plans', exercise: 'library', session: 'history', settings: 'history' }[n] || n);

  // ================= views =================
  const VIEWS = {};

  // ---------- Train ----------
  VIEWS.train = () => {
    const a = S.active;
    const weekAgo = Date.now() - 7 * 864e5;
    const week = S.sessions.filter((s) => s.start >= weekAgo);
    let vol = 0, km = 0, secs = 0;
    week.forEach((s) => {
      secs += (s.end - s.start) / 1000;
      s.exercises.forEach((e) => {
        const ex = exById(e.ex);
        vol += volume(ex, e.sets);
        if (ex.type === 'cardio') e.sets.forEach((x) => { km += (+x.distance || 0) / (ex.dist === 'm' ? 1000 : 1); });
      });
    });
    const lastDone = (planId, dayId) => { const s = S.sessions.find((x) => x.planId === planId && x.dayId === dayId); return s ? fmtDate(s.start) : null; };
    return `
      <header class="top"><h1>Train</h1><a class="icon-btn" href="#/settings" aria-label="Settings">${ICON.gear}</a></header>
      ${a ? `<div class="card active-card">
          <div><div class="label">Workout in progress</div><div class="big">${esc(a.name)}</div><div class="muted"><span data-tick="elapsed"></span> elapsed</div></div>
          <a class="btn primary" href="#/workout">Resume</a></div>` : ''}
      <div class="stats">
        <div><b>${week.length}</b><span>workouts / 7 days</span></div>
        <div><b>${Math.round(C.toDisp(vol, unit())).toLocaleString()}</b><span>${unit()} lifted</span></div>
        <div><b>${km.toFixed(1)}</b><span>km cardio</span></div>
        <div><b>${Math.round(secs / 60)}</b><span>minutes</span></div>
      </div>
      ${a ? '' : `<button class="btn block" data-a="startEmpty">＋ Start empty workout</button>`}
      <h2>Your plans</h2>
      ${S.plans.length ? S.plans.map((p) => `
        <div class="card">
          <div class="row between"><h3>${esc(p.name)}</h3><a class="link" href="#/plan/${p.id}">Edit</a></div>
          ${p.days.map((d) => `
            <div class="day-row">
              <div><div>${esc(d.name)}</div><div class="muted small">${d.exercises.length} exercises${lastDone(p.id, d.id) ? ' · last ' + lastDone(p.id, d.id) : ''}</div></div>
              <button class="btn small ${a ? '' : 'primary'}" data-a="startDay" data-p="${p.id}" data-d="${d.id}" ${a || !d.exercises.length ? 'disabled' : ''}>Start</button>
            </div>`).join('')}
        </div>`).join('') : `
        <div class="card empty">
          <p>No plans yet. Build your own or start from a template (PPL, Upper/Lower, 5×5, HYROX, running, cycling…).</p>
          <a class="btn primary" href="#/plans">Create a plan</a>
        </div>`}
    `;
  };

  // ---------- Active workout ----------
  VIEWS.workout = () => {
    const a = S.active;
    if (!a) return `<header class="top"><h1>Workout</h1></header><div class="card empty"><p>No workout in progress.</p><a class="btn primary" href="#/train">Go to Train</a></div>`;
    const occ = {};
    return `
      <header class="top sticky">
        <div class="grow"><input class="title-input" data-f="wname" value="${esc(a.name)}" aria-label="Workout name"><div class="muted small"><span data-tick="elapsed"></span></div></div>
        <button class="btn small danger-ghost" data-a="cancelWorkout">Discard</button>
        <button class="btn small primary" data-a="finishWorkout">Finish</button>
      </header>
      ${a.exercises.map((e, i) => { occ[e.ex] = (occ[e.ex] || 0) + 1; return exCard(e, i, occ[e.ex] - 1); }).join('')}
      <button class="btn block" data-a="addExercise">＋ Add exercise</button>
    `;
  };

  function exCard(e, i, occ) {
    const ex = exById(e.ex);
    const hist = historyFor(e.ex, occ);
    const last = hist[0];
    const fields = fieldsOf(ex);
    const label = (f) => ({ weight: (ex.type === 'bodyweight' || ex.type === 'timed') ? '+' + unit() : unit(), reps: 'Reps', time: 'Time', distance: ex.dist || 'm' }[f]);
    const isCardio = ex.type === 'cardio';
    const sg = e.sugg;
    return `
      <div class="card ex-card" id="ex-${i}">
        <div class="row between">
          <a class="ex-name" href="#/exercise/${encodeURIComponent(ex.id)}">${esc(ex.name)}</a>
          <button class="icon-btn" data-a="exMenu" data-e="${i}" aria-label="Exercise options">${ICON.dots}</button>
        </div>
        <div class="muted small">${esc(ex.category)} · ${esc(ex.equipment)}${e.cfg && e.cfg.rest ? ` · rest ${C.fmtTime(e.cfg.rest)}` : ''}</div>
        ${last ? `<div class="last"><span class="tag">Last · ${fmtDate(last.date)}</span> ${esc(fmtSets(ex, last.sets))}</div>` : `<div class="last"><span class="tag">New</span> No previous sessions for this exercise</div>`}
        ${sg ? `<div class="sugg k-${sg.kind}">
            <div><b>${{ up: '▲ Progress', reps: '▲ More reps', repeat: '● Repeat', deload: '▼ Deload', faster: '▲ Faster', longer: '▲ Longer', first: '★ Start', hold: '● Hold' }[sg.kind] || 'Next'}:</b> ${esc(fmtSets(ex, sg.sets))}</div>
            <div class="small">${esc(sg.reason)}</div>
            <div class="row gap">${last ? `<button class="chip" data-a="fill" data-e="${i}" data-mode="sugg">Use suggestion</button><button class="chip" data-a="fill" data-e="${i}" data-mode="last">Use last time</button>` : ''}</div>
          </div>` : ''}
        <table class="sets">
          <thead><tr><th>Set</th><th>Previous</th>${fields.map((f) => `<th>${label(f)}</th>`).join('')}${isCardio ? '<th>Pace</th>' : ''}<th></th></tr></thead>
          <tbody>
          ${e.sets.map((s, j) => `
            <tr class="${s.done ? 'done' : ''}">
              <td class="n">${j + 1}</td>
              <td class="prev">${last && last.sets[j] ? esc(fmtSet(ex, last.sets[j], true)) : '–'}</td>
              ${fields.map((f) => `<td>${setInput(i, j, f, s[f], ex)}</td>`).join('')}
              ${isCardio ? `<td class="prev" id="pace-${i}-${j}">${esc(C.pace(ex, s.distance, s.time))}</td>` : ''}
              <td><button class="check ${s.done ? 'on' : ''}" data-a="toggleSet" data-e="${i}" data-s="${j}" aria-label="Mark set ${j + 1} done">✓</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="row gap">
          <button class="btn small" data-a="addSet" data-e="${i}" ${e.sets.length >= MAX ? 'disabled' : ''}>＋ Set</button>
          <button class="btn small" data-a="delSet" data-e="${i}" ${e.sets.length <= 1 ? 'disabled' : ''}>− Set</button>
          <span class="muted small grow right">${e.sets.length}/${MAX} sets</span>
        </div>
        <textarea class="notes" data-f="exnote" data-e="${i}" placeholder="Notes" rows="1">${esc(e.notes || '')}</textarea>
      </div>`;
  }

  function setInput(i, j, f, v, ex) {
    const at = `data-f="set" data-e="${i}" data-s="${j}" data-k="${f}"`;
    if (f === 'weight') return `<input ${at} inputmode="decimal" value="${v == null ? '' : W(v)}" placeholder="${ex.type === 'strength' || ex.type === 'carry' ? unit() : '0'}">`;
    if (f === 'reps') return `<input ${at} inputmode="numeric" value="${v == null ? '' : v}" placeholder="0">`;
    if (f === 'time') return `<input ${at} inputmode="decimal" value="${v == null ? '' : C.fmtTime(v)}" placeholder="m:ss">`;
    if (f === 'distance') return `<input ${at} inputmode="decimal" value="${v == null ? '' : v}" placeholder="${ex.dist || 'm'}">`;
    return '';
  }

  function parseField(k, v) {
    v = String(v).trim();
    if (v === '') return null;
    if (k === 'weight') { const n = num(v); return n == null ? null : C.fromDisp(n, unit()); }
    if (k === 'reps') { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
    if (k === 'time') return C.parseTime(v);
    if (k === 'distance') return num(v);
    return v;
  }

  // ---------- Plans ----------
  VIEWS.plans = () => `
    <header class="top"><h1>Plans</h1></header>
    <button class="btn block primary" data-a="newPlan">＋ New blank plan</button>
    ${S.plans.map((p) => `
      <a class="card list-item" href="#/plan/${p.id}">
        <div><h3>${esc(p.name)}</h3><div class="muted small">${p.days.length} day${p.days.length === 1 ? '' : 's'} · ${p.days.map((d) => esc(d.name)).join(', ')}</div></div><span class="chev">›</span>
      </a>`).join('')}
    <h2>Templates</h2>
    <p class="muted small">Add a template, then change anything: days, exercises, sets, reps, weights and rest times.</p>
    ${window.PLAN_TEMPLATES.map((t, i) => `
      <div class="card">
        <div class="row between"><h3>${esc(t.name)}</h3><button class="btn small" data-a="addTemplate" data-i="${i}">Add</button></div>
        <div class="muted small">${esc(t.desc)}</div>
        <div class="small">${t.days.map((d) => esc(d.name)).join(' · ')}</div>
      </div>`).join('')}
  `;

  VIEWS.plan = (id) => {
    const p = S.plans.find((x) => x.id === id);
    if (!p) return `<header class="top"><h1>Plan not found</h1></header><a class="btn" href="#/plans">Back</a>`;
    return `
      <header class="top"><a class="icon-btn" href="#/plans" aria-label="Back">${ICON.back}</a><input class="title-input grow" data-f="planName" data-p="${p.id}" value="${esc(p.name)}" aria-label="Plan name"></header>
      ${p.days.map((d, di) => `
        <div class="card day">
          <div class="row gap">
            <input class="day-name grow" data-f="dayName" data-p="${p.id}" data-d="${d.id}" value="${esc(d.name)}" aria-label="Day name">
            <button class="icon-btn" data-a="moveDay" data-p="${p.id}" data-d="${d.id}" data-dir="-1" ${di === 0 ? 'disabled' : ''} aria-label="Move day up">↑</button>
            <button class="icon-btn" data-a="moveDay" data-p="${p.id}" data-d="${d.id}" data-dir="1" ${di === p.days.length - 1 ? 'disabled' : ''} aria-label="Move day down">↓</button>
            <button class="icon-btn" data-a="delDay" data-p="${p.id}" data-d="${d.id}" aria-label="Delete day">${ICON.trash}</button>
          </div>
          ${d.exercises.length ? d.exercises.map((c, ci) => planExRow(p, d, c, ci)).join('') : '<p class="muted small">No exercises yet.</p>'}
          <div class="row gap">
            <button class="btn small" data-a="planAddEx" data-p="${p.id}" data-d="${d.id}">＋ Exercise</button>
            <button class="btn small primary" data-a="startDay" data-p="${p.id}" data-d="${d.id}" ${S.active || !d.exercises.length ? 'disabled' : ''}>Start</button>
          </div>
        </div>`).join('')}
      <button class="btn block" data-a="addDay" data-p="${p.id}">＋ Add day</button>
      <div class="row gap">
        <button class="btn grow" data-a="dupPlan" data-p="${p.id}">Duplicate plan</button>
        <button class="btn grow danger-ghost" data-a="delPlan" data-p="${p.id}">Delete plan</button>
      </div>`;
  };

  function planExRow(p, d, c, ci) {
    const ex = exById(c.ex);
    const at = (k, kind) => `data-f="cfg" data-p="${p.id}" data-d="${d.id}" data-c="${c.id}" data-k="${k}" data-kind="${kind}"`;
    const setsSel = `<label>Sets<select ${at('sets', 'int')}>${[1, 2, 3, 4, 5].map((n) => `<option ${+c.sets === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
    const rest = `<label>Rest<input ${at('rest', 'time')} inputmode="decimal" value="${c.rest != null ? C.fmtTime(c.rest) : ''}" placeholder="m:ss"></label>`;
    const reps = `<label>Reps<span class="pair"><input ${at('repMin', 'int')} inputmode="numeric" value="${c.repMin ?? ''}" placeholder="min">–<input ${at('repMax', 'int')} inputmode="numeric" value="${c.repMax ?? ''}" placeholder="max"></span></label>`;
    const wt = (lbl) => `<label>${lbl}<input ${at('weight', 'kg')} inputmode="decimal" value="${c.weight != null ? W(c.weight) : ''}" placeholder="${unit()}"></label>`;
    const time = (lbl) => `<label>${lbl}<input ${at('time', 'time')} inputmode="decimal" value="${c.time != null ? C.fmtTime(c.time) : ''}" placeholder="m:ss"></label>`;
    const dist = `<label>Distance (${ex.dist || 'm'})<input ${at('distance', 'num')} inputmode="decimal" value="${c.distance ?? ''}" placeholder="${ex.dist || 'm'}"></label>`;
    let fields;
    switch (ex.type) {
      case 'timed': fields = [setsSel, time('Hold'), rest]; break;
      case 'cardio': fields = [setsSel, dist, time('Target time'), rest]; break;
      case 'carry': fields = [setsSel, dist, wt('Start weight'), rest]; break;
      case 'reps_time': fields = [setsSel, `<label>Reps<input ${at('repMin', 'int')} inputmode="numeric" value="${c.repMin ?? ''}"></label>`, wt('Weight'), rest]; break;
      case 'bodyweight': fields = [setsSel, reps, rest]; break;
      default: fields = [setsSel, reps, wt('Start weight'), rest];
    }
    return `
      <div class="plan-ex">
        <div class="row between">
          <div><b>${esc(ex.name)}</b> <span class="muted small">${esc(ex.equipment)}</span></div>
          <div class="row">
            <button class="icon-btn" data-a="movePlanEx" data-p="${p.id}" data-d="${d.id}" data-c="${c.id}" data-dir="-1" ${ci === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
            <button class="icon-btn" data-a="movePlanEx" data-p="${p.id}" data-d="${d.id}" data-c="${c.id}" data-dir="1" ${ci === d.exercises.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
            <button class="icon-btn" data-a="delPlanEx" data-p="${p.id}" data-d="${d.id}" data-c="${c.id}" aria-label="Remove">${ICON.x}</button>
          </div>
        </div>
        <div class="cfg">${fields.join('')}</div>
      </div>`;
  }

  // ---------- Library ----------
  let libQ = '', libCat = '';
  VIEWS.library = () => `
    <header class="top"><h1>Exercises</h1><button class="btn small" data-a="newCustom">＋ Custom</button></header>
    <input class="search" type="search" data-f="libq" placeholder="Search ${exAll().length} exercises…" value="${esc(libQ)}">
    <div class="chips">${['', ...window.EX_CATEGORIES, ...(S.custom.length ? ['Custom'] : [])].map((c) => `<button class="chip ${libCat === c ? 'on' : ''}" data-a="libCat" data-c="${esc(c)}">${c || 'All'}</button>`).join('')}</div>
    <div id="libList">${libList()}</div>`;
  function filterEx(q, cat) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return exAll().filter((e) => (!cat || (cat === 'Custom' ? e.custom : e.category === cat)) &&
      words.every((w) => `${e.name} ${e.category} ${e.equipment}`.toLowerCase().includes(w)));
  }
  function libList() {
    const list = filterEx(libQ, libCat);
    if (!list.length) return '<p class="muted">No matches. Add it as a custom exercise.</p>';
    return list.map((e) => {
      const h = historyFor(e.id)[0];
      return `<a class="list-item plain" href="#/exercise/${encodeURIComponent(e.id)}"><div><div>${esc(e.name)}</div><div class="muted small">${esc(e.category)} · ${esc(e.equipment)}</div></div>${h ? `<span class="muted small right">${esc(fmtSet(e, h.sets[0], true))}<br>${fmtDate(h.date)}</span>` : '<span class="chev">›</span>'}</a>`;
    }).join('');
  }

  VIEWS.exercise = (id) => {
    const ex = exById(id);
    const hist = historyFor(id);
    const sg = C.suggest(ex, hist, findCfg(id), unit());
    let best = '';
    if (hist.length) {
      if (ex.type === 'strength') {
        let bw = 0, b1 = 0;
        hist.forEach((h) => h.sets.forEach((s) => { bw = Math.max(bw, +s.weight || 0); b1 = Math.max(b1, C.e1rm(+s.weight, +s.reps)); }));
        best = `<div class="stats"><div><b>${W(bw)}</b><span>heaviest (${unit()})</span></div><div><b>${W(b1)}</b><span>est. 1RM (${unit()})</span></div><div><b>${hist.length}</b><span>sessions</span></div></div>`;
      } else if (ex.type === 'cardio') {
        let ld = 0, bp = Infinity;
        hist.forEach((h) => h.sets.forEach((s) => { ld = Math.max(ld, +s.distance || 0); if (s.distance && s.time) bp = Math.min(bp, s.time / s.distance); }));
        best = `<div class="stats"><div><b>${ld}</b><span>longest (${ex.dist})</span></div><div><b>${bp < Infinity ? esc(C.pace(ex, 1, bp)) : '–'}</b><span>best pace</span></div><div><b>${hist.length}</b><span>sessions</span></div></div>`;
      } else {
        best = `<div class="stats"><div><b>${hist.length}</b><span>sessions</span></div></div>`;
      }
    }
    return `
      <header class="top"><a class="icon-btn" href="javascript:history.back()" aria-label="Back">${ICON.back}</a><h1 class="grow">${esc(ex.name)}</h1></header>
      <div class="muted">${esc(ex.category)} · ${esc(ex.equipment)} · ${{ strength: 'Weight × reps', bodyweight: 'Bodyweight reps', timed: 'Timed', cardio: 'Distance & time', carry: 'Distance & load', reps_time: 'Reps for time' }[ex.type]}</div>
      ${best}
      ${hist.length > 1 ? chart(ex, hist) : ''}
      <div class="sugg k-${sg.kind}"><div><b>Next session:</b> ${esc(fmtSets(ex, sg.sets) || '-')}</div><div class="small">${esc(sg.reason)}</div></div>
      <h2>History</h2>
      ${hist.length ? hist.map((h) => `<a class="list-item plain" href="#/session/${h.sessionId}"><div><div>${fmtDateLong(h.date)}</div><div class="small">${h.sets.map((s, i) => `<span class="setpill">${i + 1}: ${esc(fmtSet(ex, s))}${ex.type === 'cardio' && s.distance && s.time ? ` (${esc(C.pace(ex, s.distance, s.time))})` : ''}</span>`).join(' ')}</div></div></a>`).join('') : '<p class="muted">Not done yet.</p>'}
      ${ex.custom ? `<button class="btn block danger-ghost" data-a="delCustom" data-id="${esc(ex.id)}">Delete custom exercise</button>` : ''}`;
  };

  function findCfg(exId) {
    for (const p of S.plans) for (const d of p.days) for (const c of d.exercises) if (c.ex === exId) return c;
    return {};
  }

  function chart(ex, hist) {
    const pts = hist.slice(0, 30).reverse().map((h) => {
      let v = 0;
      if (ex.type === 'strength') v = Math.max(...h.sets.map((s) => C.e1rm(+s.weight || 0, +s.reps || 0)));
      else if (ex.type === 'bodyweight' || ex.type === 'reps_time') v = h.sets.reduce((a, s) => a + (+s.reps || 0), 0);
      else if (ex.type === 'timed') v = Math.max(...h.sets.map((s) => +s.time || 0));
      else if (ex.type === 'cardio') v = h.sets.reduce((a, s) => a + (+s.distance || 0), 0);
      else if (ex.type === 'carry') v = Math.max(...h.sets.map((s) => +s.weight || 0));
      return { d: h.date, v };
    }).filter((p) => p.v > 0);
    if (pts.length < 2) return '';
    const label = { strength: `Estimated 1RM (${unit()})`, bodyweight: 'Total reps', reps_time: 'Total reps', timed: 'Longest set', cardio: `Total distance (${ex.dist})`, carry: `Top weight (${unit()})` }[ex.type];
    const fmtV = (v) => (ex.type === 'timed' ? C.fmtTime(v) : (ex.type === 'strength' || ex.type === 'carry') ? W(v) : +v.toFixed(2));
    const Wd = 320, H = 120, P = 8;
    const min = Math.min(...pts.map((p) => p.v)), max = Math.max(...pts.map((p) => p.v));
    const x = (i) => P + (i * (Wd - 2 * P)) / (pts.length - 1);
    const y = (v) => H - P - ((v - min) / ((max - min) || 1)) * (H - 2 * P);
    const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    return `<div class="card chart"><div class="row between small"><span>${label}</span><span class="muted">${fmtV(min)} → ${fmtV(pts[pts.length - 1].v)}</span></div>
      <svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${label} over time"><polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3" fill="var(--accent)"><title>${fmtDate(p.d)}: ${fmtV(p.v)}</title></circle>`).join('')}</svg>
      <div class="row between small muted"><span>${fmtDate(pts[0].d)}</span><span>${fmtDate(pts[pts.length - 1].d)}</span></div></div>`;
  }

  // ---------- History ----------
  VIEWS.history = () => `
    <header class="top"><h1>History</h1><a class="icon-btn" href="#/settings" aria-label="Settings">${ICON.gear}</a></header>
    ${S.sessions.length ? S.sessions.map((s) => {
      const vol = s.exercises.reduce((a, e) => a + volume(exById(e.ex), e.sets), 0);
      return `<a class="card list-item" href="#/session/${s.id}"><div><h3>${esc(s.name)}</h3>
        <div class="muted small">${fmtDateLong(s.start)} · ${C.fmtTime((s.end - s.start) / 1000)} · ${s.exercises.length} exercises${vol ? ` · ${Math.round(C.toDisp(vol, unit())).toLocaleString()} ${unit()}` : ''}</div></div><span class="chev">›</span></a>`;
    }).join('') : '<div class="card empty"><p>No workouts logged yet.</p></div>'}`;

  VIEWS.session = (id) => {
    const s = S.sessions.find((x) => x.id === id);
    if (!s) return `<header class="top"><h1>Not found</h1></header>`;
    return `
      <header class="top"><a class="icon-btn" href="#/history" aria-label="Back">${ICON.back}</a><h1 class="grow">${esc(s.name)}</h1></header>
      <div class="muted">${fmtDateLong(s.start)} · ${C.fmtTime((s.end - s.start) / 1000)}</div>
      ${(s.prs && s.prs.length) ? `<div class="card pr">🏆 New best: ${s.prs.map((p) => esc(exById(p).name)).join(', ')}</div>` : ''}
      ${s.exercises.map((e) => { const ex = exById(e.ex); return `
        <div class="card"><a class="ex-name" href="#/exercise/${encodeURIComponent(ex.id)}">${esc(ex.name)}</a>
          <div class="small">${e.sets.map((x, i) => `<span class="setpill">${i + 1}: ${esc(fmtSet(ex, x))}${ex.type === 'cardio' && x.distance && x.time ? ` (${esc(C.pace(ex, x.distance, x.time))})` : ''}</span>`).join(' ')}</div>
          ${e.notes ? `<div class="muted small">${esc(e.notes)}</div>` : ''}</div>`; }).join('')}
      <div class="row gap"><button class="btn grow primary" data-a="repeatSession" data-id="${s.id}" ${S.active ? 'disabled' : ''}>Repeat workout</button><button class="btn grow danger-ghost" data-a="delSession" data-id="${s.id}">Delete</button></div>`;
  };

  // ---------- Settings ----------
  VIEWS.settings = () => {
    const st = S.settings;
    const tog = (k, label) => `<label class="toggle"><span>${label}</span><input type="checkbox" data-f="setting" data-k="${k}" ${st[k] ? 'checked' : ''}></label>`;
    return `
      <header class="top"><a class="icon-btn" href="javascript:history.back()" aria-label="Back">${ICON.back}</a><h1>Settings</h1></header>
      <div class="card">
        <div class="row between"><span>Weight unit</span><div class="seg">${['kg', 'lb'].map((u) => `<button class="${st.unit === u ? 'on' : ''}" data-a="unit" data-u="${u}">${u}</button>`).join('')}</div></div>
        <label class="toggle"><span>Default rest</span><input class="short" data-f="setting" data-k="rest" inputmode="decimal" value="${C.fmtTime(st.rest)}"></label>
        ${tog('autoRest', 'Start rest timer when a set is ticked')}
        ${tog('sound', 'Timer sounds')}
        ${tog('vibrate', 'Vibrate')}
      </div>
      <h2>Your data</h2>
      <p class="muted small">Everything is stored on this device only. Export a backup regularly, or to move to another phone.</p>
      <div class="card">
        <button class="btn block" data-a="export">Export backup (.json)</button>
        <label class="btn block">Import backup<input type="file" accept="application/json,.json" data-f="import" hidden></label>
        <button class="btn block danger-ghost" data-a="reset">Erase all data</button>
      </div>
      <p class="muted small center">${S.sessions.length} workouts · ${S.plans.length} plans · ${exAll().length} exercises</p>`;
  };

  // ---------- Timer ----------
  const T = {
    mode: 'stopwatch',
    sw: { running: false, start: 0, acc: 0, laps: [] },
    cd: { dur: 60, running: false, end: 0, remain: 60 },
    iv: { work: 20, rest: 10, rounds: 8, prep: 10, running: false, phase: 'ready', round: 0, end: 0, remain: 0, beeped: null },
  };
  VIEWS.timer = () => {
    const tabs = `<div class="seg wide">${[['stopwatch', 'Stopwatch'], ['countdown', 'Countdown'], ['interval', 'Intervals']].map(([m, l]) => `<button class="${T.mode === m ? 'on' : ''}" data-a="tmode" data-m="${m}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (T.mode === 'stopwatch') {
      body = `<div class="clock" data-tick="sw">0:00.0</div>
        <div class="row gap center"><button class="btn big primary" data-a="swToggle">${T.sw.running ? 'Pause' : 'Start'}</button><button class="btn big" data-a="swLap" ${T.sw.running ? '' : 'disabled'}>Lap</button><button class="btn big" data-a="swReset">Reset</button></div>
        <div class="laps">${T.sw.laps.map((l, i) => `<div class="row between"><span>Lap ${T.sw.laps.length - i}</span><span>${fmtMs(l.split)}</span><span class="muted">${fmtMs(l.total)}</span></div>`).join('')}</div>`;
    } else if (T.mode === 'countdown') {
      body = `<div class="clock" data-tick="cd"></div>
        <div class="chips center">${[30, 60, 90, 120, 180, 300, 600].map((s) => `<button class="chip" data-a="cdSet" data-s="${s}">${C.fmtTime(s)}</button>`).join('')}</div>
        <label class="toggle"><span>Custom (m:ss)</span><input class="short" data-f="cdCustom" inputmode="decimal" value="${C.fmtTime(T.cd.dur)}"></label>
        <div class="row gap center"><button class="btn big primary" data-a="cdToggle">${T.cd.running ? 'Pause' : 'Start'}</button><button class="btn big" data-a="cdAdd">+15s</button><button class="btn big" data-a="cdReset">Reset</button></div>`;
    } else {
      const iv = T.iv;
      body = `<div class="phase" data-tick="ivPhase"></div><div class="clock" data-tick="iv"></div><div class="center muted" data-tick="ivRound"></div>
        <div class="chips center">
          <button class="chip" data-a="ivPreset" data-v="20,10,8">Tabata 20/10×8</button>
          <button class="chip" data-a="ivPreset" data-v="60,0,10">EMOM ×10</button>
          <button class="chip" data-a="ivPreset" data-v="30,30,10">30/30×10</button>
          <button class="chip" data-a="ivPreset" data-v="40,20,10">40/20×10</button>
          <button class="chip" data-a="ivPreset" data-v="240,60,8">4min on/1 off ×8</button>
        </div>
        <div class="cfg center-cfg">
          <label>Work<input data-f="iv" data-k="work" inputmode="decimal" value="${C.fmtTime(iv.work)}"></label>
          <label>Rest<input data-f="iv" data-k="rest" inputmode="decimal" value="${C.fmtTime(iv.rest)}"></label>
          <label>Rounds<input data-f="iv" data-k="rounds" inputmode="numeric" value="${iv.rounds}"></label>
          <label>Get ready<input data-f="iv" data-k="prep" inputmode="decimal" value="${C.fmtTime(iv.prep)}"></label>
        </div>
        <div class="row gap center"><button class="btn big primary" data-a="ivToggle">${iv.running ? 'Pause' : iv.phase === 'ready' || iv.phase === 'done' ? 'Start' : 'Resume'}</button><button class="btn big" data-a="ivReset">Reset</button></div>`;
    }
    return `<header class="top"><h1>Timer</h1></header>${tabs}<div class="card timer-card">${body}</div>`;
  };
  const fmtMs = (ms) => `${C.fmtTime(Math.floor(ms / 1000))}.${Math.floor((ms % 1000) / 100)}`;
  const swElapsed = () => T.sw.acc + (T.sw.running ? Date.now() - T.sw.start : 0);
  const cdRemain = () => (T.cd.running ? Math.max(0, (T.cd.end - Date.now()) / 1000) : T.cd.remain);

  function ivAdvance(now) {
    const iv = T.iv;
    const next = (phase, secs) => { iv.phase = phase; iv.end = now + secs * 1000; iv.beeped = null; };
    if (iv.phase === 'prep' || iv.phase === 'rest') { iv.round++; next('work', iv.work); beep(1046, 0.35); return; }
    if (iv.phase === 'work') {
      if (iv.round >= iv.rounds) { iv.phase = 'done'; iv.running = false; beep(880, 0.25, 3); buzz([200, 100, 200, 100, 400]); return; }
      if (iv.rest > 0) { next('rest', iv.rest); beep(660, 0.35); }
      else { iv.round++; next('work', iv.work); beep(1046, 0.35); }
      buzz(200);
    }
  }

  // ================= tick =================
  function tick() {
    const now = Date.now();
    const set = (k, v) => { const el = document.querySelector(`[data-tick="${k}"]`); if (el && el.textContent !== v) el.textContent = v; };
    if (S.active) set('elapsed', C.fmtTime((now - S.active.start) / 1000));
    // rest timer
    const r = S.active && S.active.rest;
    if (r) {
      const left = Math.ceil((r.end - now) / 1000);
      if (left <= 0) {
        S.active.rest = null; save(); beep(880, 0.2, 3); buzz([300, 100, 300]); renderRestBar();
      } else {
        if (left <= 3 && r.beeped !== left) { r.beeped = left; beep(660, 0.08); }
        set('rest', C.fmtTime(left));
        const bar = $('#restbar .fill'); if (bar) bar.style.width = `${(100 * (r.end - now)) / (r.total * 1000)}%`;
      }
    }
    // stopwatch & countdown
    set('sw', fmtMs(swElapsed()));
    if (T.cd.running && cdRemain() <= 0) {
      T.cd.running = false; T.cd.remain = 0; beep(880, 0.25, 3); buzz([300, 100, 300]);
      if (route().name === 'timer') render(true);
    }
    set('cd', C.fmtTime(Math.ceil(cdRemain())));
    // intervals
    const iv = T.iv;
    if (iv.running) {
      if (now >= iv.end) { ivAdvance(now); if (route().name === 'timer' && !iv.running) render(true); }
      const left = Math.ceil((iv.end - now) / 1000);
      if (iv.running && left <= 3 && left > 0 && iv.beeped !== left) { iv.beeped = left; beep(660, 0.08); }
    }
    const ivLeft = iv.running ? Math.max(0, Math.ceil((iv.end - now) / 1000)) : iv.phase === 'ready' ? iv.work : iv.remain;
    set('iv', C.fmtTime(ivLeft));
    set('ivPhase', { ready: 'Ready', prep: 'Get ready', work: 'WORK', rest: 'Rest', done: 'Done!' }[iv.phase]);
    set('ivRound', iv.phase === 'ready' ? `${iv.rounds} rounds` : `Round ${Math.max(1, iv.round)} / ${iv.rounds}`);
    const ph = document.querySelector('[data-tick="ivPhase"]');
    if (ph) ph.className = `phase ph-${iv.phase}`;
  }
  setInterval(tick, 200);

  function renderRestBar() {
    const el = $('#restbar');
    const r = S.active && S.active.rest;
    if (!r || r.end <= Date.now()) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = `<div class="fill"></div><div class="row between"><span>Rest <b data-tick="rest">${C.fmtTime(Math.ceil((r.end - Date.now()) / 1000))}</b></span>
      <span class="row gap"><button class="chip" data-a="restAdj" data-v="-15">−15</button><button class="chip" data-a="restAdj" data-v="15">+15</button><button class="chip" data-a="restSkip">Skip</button></span></div>`;
  }

  function startRest(secs) {
    if (!S.active || !secs) return;
    S.active.rest = { end: Date.now() + secs * 1000, total: secs };
    save(); renderRestBar();
  }

  // ================= sound / vibration / wake lock =================
  let actx = null;
  function unlockAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { /* no audio */ }
  }
  function beep(freq = 880, dur = 0.15, n = 1) {
    if (!S.settings.sound || !actx) return;
    for (let i = 0; i < n; i++) {
      const t0 = actx.currentTime + i * (dur + 0.08);
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    }
  }
  const buzz = (p) => { if (S.settings.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } };
  let wake = null;
  async function updateWakeLock() {
    const want = !!S.active || T.sw.running || T.cd.running || T.iv.running;
    try {
      if (want && !wake && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener('release', () => { wake = null; });
      } else if (!want && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }
  document.addEventListener('visibilitychange', updateWakeLock);

  // ================= workout actions =================
  function buildExercise(cfg, occ) {
    const ex = exById(cfg.ex);
    const sg = C.suggest(ex, historyFor(cfg.ex, occ), cfg, unit());
    return {
      ex: cfg.ex,
      cfg: { sets: cfg.sets, repMin: cfg.repMin, repMax: cfg.repMax, weight: cfg.weight, time: cfg.time, distance: cfg.distance, rest: cfg.rest != null ? cfg.rest : S.settings.rest },
      sugg: { kind: sg.kind, reason: sg.reason, sets: sg.sets },
      sets: sg.sets.map((s) => ({ ...s, done: false })),
      notes: '',
    };
  }
  function startWorkout(name, cfgs, planId, dayId) {
    const occ = {};
    S.active = {
      id: uid(), name, planId: planId || null, dayId: dayId || null, start: Date.now(), rest: null,
      exercises: cfgs.map((c) => { occ[c.ex] = (occ[c.ex] || 0) + 1; return buildExercise(c, occ[c.ex] - 1); }),
    };
    save(); updateWakeLock(); go('workout');
  }
  function occurrenceIndex(i) {
    const a = S.active; let n = 0;
    for (let k = 0; k < i; k++) if (a.exercises[k].ex === a.exercises[i].ex) n++;
    return n;
  }
  function finishWorkout() {
    const a = S.active;
    const exercises = a.exercises.map((e) => ({
      ex: e.ex, notes: e.notes || '',
      sets: e.sets.filter((s) => s.done).map((s) => { const o = {}; fieldsOf(exById(e.ex)).forEach((f) => { if (s[f] != null) o[f] = s[f]; }); return o; }),
    })).filter((e) => e.sets.length);
    if (!exercises.length) {
      if (!confirm('No sets are ticked as done. Discard this workout?')) return;
      S.active = null; save(); updateWakeLock(); go('train'); return;
    }
    const undone = a.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    if (undone && !confirm(`${undone} set${undone > 1 ? 's are' : ' is'} not ticked and won't be saved. Finish anyway?`)) return;
    // personal bests (estimated 1RM for weighted lifts, best pace for cardio)
    const prs = [];
    exercises.forEach((e) => {
      const ex = exById(e.ex);
      const hist = historyFor(e.ex);
      if (!hist.length) return;
      if (ex.type === 'strength') {
        const best = Math.max(...hist.flatMap((h) => h.sets.map((s) => C.e1rm(+s.weight || 0, +s.reps || 0))));
        const now = Math.max(...e.sets.map((s) => C.e1rm(+s.weight || 0, +s.reps || 0)));
        if (now > best + 0.01) prs.push(e.ex);
      } else if (ex.type === 'cardio') {
        const p = (s) => (s.distance && s.time ? s.time / s.distance : Infinity);
        const best = Math.min(...hist.flatMap((h) => h.sets.map(p)));
        if (Math.min(...e.sets.map(p)) < best) prs.push(e.ex);
      }
    });
    const session = { id: a.id, name: a.name, planId: a.planId, dayId: a.dayId, start: a.start, end: Date.now(), exercises, prs };
    S.sessions.unshift(session);
    S.active = null; save(); updateWakeLock();
    toast(prs.length ? `Saved – ${prs.length} new best${prs.length > 1 ? 's' : ''}! 🏆` : 'Workout saved 💪');
    go('session/' + session.id);
  }

  // ================= modal / picker =================
  function showModal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; document.body.classList.add('noscroll'); }
  function closeModal() { pick.ctx = null; const m = $('#modal'); m.hidden = true; m.innerHTML = ''; document.body.classList.remove('noscroll'); }
  let pick = { ctx: null, q: '', cat: '' };
  function openPicker(ctx) {
    pick = { ctx, q: '', cat: '' };
    showModal(`
      <div class="row between"><h2>${ctx.mode === 'swap' ? 'Swap exercise' : 'Add exercise'}</h2><button class="btn small primary" data-a="closeModal">Done</button></div>
      <input class="search" type="search" data-f="pickq" placeholder="Search exercises…">
      <div class="chips" id="pickChips">${pickChips()}</div>
      <div id="pickList" class="pick-list">${pickList()}</div>
      <button class="btn block" data-a="newCustom">＋ Create custom exercise</button>`);
  }
  const pickChips = () => ['', ...window.EX_CATEGORIES, ...(S.custom.length ? ['Custom'] : [])].map((c) => `<button class="chip ${pick.cat === c ? 'on' : ''}" data-a="pickCat" data-c="${esc(c)}">${c || 'All'}</button>`).join('');
  const pickList = () => filterEx(pick.q, pick.cat).map((e) => `<button class="list-item plain" data-a="pick" data-id="${esc(e.id)}"><div><div>${esc(e.name)}</div><div class="muted small">${esc(e.category)} · ${esc(e.equipment)}</div></div><span class="plus">＋</span></button>`).join('') || '<p class="muted">No matches.</p>';

  function defaultCfg(exId) {
    const ex = exById(exId);
    const rest = S.settings.rest;
    switch (ex.type) {
      case 'bodyweight': return { ex: exId, sets: 3, repMin: 8, repMax: 15, rest };
      case 'timed': return { ex: exId, sets: 3, time: 30, rest: 60 };
      case 'cardio': return { ex: exId, sets: 1, rest: 60 };
      case 'carry': return { ex: exId, sets: 3, distance: 20, rest };
      case 'reps_time': return { ex: exId, sets: 1, repMin: 50, rest };
      default: return { ex: exId, sets: 3, repMin: 8, repMax: 12, rest };
    }
  }

  function onPick(exId) {
    const c = pick.ctx;
    if (c.mode === 'plan') {
      const d = getDay(c.p, c.d);
      d.exercises.push({ id: uid(), ...defaultCfg(exId) });
      save(); toast(`Added ${exById(exId).name}`); render(true);
    } else if (c.mode === 'workout') {
      S.active.exercises.push(buildExercise(defaultCfg(exId), S.active.exercises.filter((e) => e.ex === exId).length));
      save(); closeModal(); render(true);
      setTimeout(() => { const el = $(`#ex-${S.active.exercises.length - 1}`); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 50);
    } else if (c.mode === 'swap') {
      const old = S.active.exercises[c.i];
      const cfg = { ...defaultCfg(exId), sets: old.sets.length, rest: old.cfg && old.cfg.rest };
      S.active.exercises[c.i] = buildExercise(cfg, 0);
      save(); closeModal(); render(true);
    }
  }

  function customForm() {
    const opt = (arr, sel) => arr.map((x) => `<option ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('');
    showModal(`
      <h2>Custom exercise</h2>
      <form id="customForm" class="form">
        <label>Name<input name="name" required maxlength="60" placeholder="e.g. Landmine Lateral Raise"></label>
        <label>Category<select name="category">${opt(window.EX_CATEGORIES, 'Chest')}</select></label>
        <label>Equipment<select name="equipment">${opt(window.EX_EQUIPMENT, 'Dumbbell')}</select></label>
        <label>Tracking<select name="type">
          <option value="strength">Weight × reps</option><option value="bodyweight">Bodyweight reps (+ optional weight)</option>
          <option value="timed">Time (holds, intervals)</option><option value="cardio">Distance + time (run, ride, row, swim)</option>
          <option value="carry">Distance + load (sled, carries)</option><option value="reps_time">Reps for time</option></select></label>
        <label>Distance unit (cardio)<select name="dist"><option value="km">km</option><option value="m">m</option></select></label>
        <label>Pace display (cardio)<select name="pace"><option value="run">min/km</option><option value="speed">km/h</option><option value="split">/500m</option><option value="swim">/100m</option></select></label>
        <div class="row gap"><button type="button" class="btn grow" data-a="closeModal">Cancel</button><button class="btn grow primary">Save</button></div>
      </form>`);
  }

  // ================= plan helpers =================
  const getPlan = (id) => S.plans.find((p) => p.id === id);
  const getDay = (pid, did) => getPlan(pid).days.find((d) => d.id === did);
  const move = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
  function withIds(plan) {
    return { id: uid(), name: plan.name, days: plan.days.map((d) => ({ id: uid(), name: d.name, exercises: d.exercises.map((c) => ({ ...clone(c), id: uid() })) })) };
  }

  // ================= events =================
  const A = {}; // click actions
  A.startEmpty = () => startWorkout(`Workout ${fmtDate(Date.now(), { weekday: 'short', day: 'numeric', month: 'short' })}`, []);
  A.startDay = (el) => { const p = getPlan(el.dataset.p), d = getDay(el.dataset.p, el.dataset.d); startWorkout(`${p.name} – ${d.name}`, d.exercises, p.id, d.id); };
  A.addExercise = () => openPicker({ mode: 'workout' });
  A.toggleSet = (el) => {
    const e = S.active.exercises[+el.dataset.e], s = e.sets[+el.dataset.s];
    s.done = !s.done;
    save();
    if (s.done && S.settings.autoRest) startRest(e.cfg && e.cfg.rest != null ? e.cfg.rest : S.settings.rest);
    render(true);
  };
  A.addSet = (el) => {
    const e = S.active.exercises[+el.dataset.e];
    if (e.sets.length >= MAX) return;
    const last = e.sets[e.sets.length - 1] || {};
    e.sets.push({ ...last, done: false }); save(); render(true);
  };
  A.delSet = (el) => {
    const e = S.active.exercises[+el.dataset.e];
    if (e.sets.length > 1) { e.sets.pop(); save(); render(true); }
  };
  A.fill = (el) => {
    const i = +el.dataset.e, e = S.active.exercises[i];
    const src = el.dataset.mode === 'last' ? (historyFor(e.ex, occurrenceIndex(i))[0] || {}).sets : e.sugg.sets;
    if (!src) return;
    e.sets = e.sets.map((s, j) => (s.done ? s : { ...(src[Math.min(j, src.length - 1)]), done: false }));
    save(); render(true);
  };
  A.exMenu = (el) => {
    const i = +el.dataset.e, n = S.active.exercises.length;
    showModal(`<h2>${esc(exById(S.active.exercises[i].ex).name)}</h2>
      <div class="menu">
        <button class="btn block" data-a="exSwap" data-e="${i}">Swap exercise</button>
        <button class="btn block" data-a="exRest" data-e="${i}">Change rest time</button>
        <button class="btn block" data-a="exMove" data-e="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>Move up</button>
        <button class="btn block" data-a="exMove" data-e="${i}" data-dir="1" ${i === n - 1 ? 'disabled' : ''}>Move down</button>
        <button class="btn block danger-ghost" data-a="exRemove" data-e="${i}">Remove from workout</button>
        <button class="btn block" data-a="closeModal">Close</button>
      </div>`);
  };
  A.exSwap = (el) => openPicker({ mode: 'swap', i: +el.dataset.e });
  A.exRest = (el) => {
    const e = S.active.exercises[+el.dataset.e];
    const v = prompt('Rest time between sets (m:ss or seconds)', C.fmtTime(e.cfg.rest));
    if (v == null) return;
    const t = C.parseTime(v);
    if (t != null) { e.cfg.rest = t; save(); }
    closeModal(); render(true);
  };
  A.exMove = (el) => { move(S.active.exercises, +el.dataset.e, +el.dataset.dir); save(); closeModal(); render(true); };
  A.exRemove = (el) => { if (!confirm('Remove this exercise from the workout?')) return; S.active.exercises.splice(+el.dataset.e, 1); save(); closeModal(); render(true); };
  A.finishWorkout = finishWorkout;
  A.cancelWorkout = () => { if (confirm('Discard this workout? Nothing will be saved.')) { S.active = null; save(); updateWakeLock(); go('train'); } };
  A.restAdj = (el) => { const r = S.active && S.active.rest; if (!r) return; r.end += +el.dataset.v * 1000; r.total = Math.max(1, r.total + +el.dataset.v); save(); tick(); };
  A.restSkip = () => { if (S.active) { S.active.rest = null; save(); renderRestBar(); } };

  // plans
  A.newPlan = () => { const p = { id: uid(), name: 'My plan', days: [{ id: uid(), name: 'Day 1', exercises: [] }] }; S.plans.push(p); save(); go('plan/' + p.id); };
  A.addTemplate = (el) => { const p = withIds(window.PLAN_TEMPLATES[+el.dataset.i]); S.plans.push(p); save(); toast('Plan added – edit anything you like'); go('plan/' + p.id); };
  A.dupPlan = (el) => { const p = withIds(getPlan(el.dataset.p)); p.name += ' (copy)'; S.plans.push(p); save(); go('plan/' + p.id); };
  A.delPlan = (el) => { if (!confirm('Delete this plan? Your workout history is kept.')) return; S.plans = S.plans.filter((p) => p.id !== el.dataset.p); save(); go('plans'); };
  A.addDay = (el) => { const p = getPlan(el.dataset.p); p.days.push({ id: uid(), name: `Day ${p.days.length + 1}`, exercises: [] }); save(); render(true); };
  A.delDay = (el) => { if (!confirm('Delete this day?')) return; const p = getPlan(el.dataset.p); p.days = p.days.filter((d) => d.id !== el.dataset.d); save(); render(true); };
  A.moveDay = (el) => { const p = getPlan(el.dataset.p); move(p.days, p.days.findIndex((d) => d.id === el.dataset.d), +el.dataset.dir); save(); render(true); };
  A.planAddEx = (el) => openPicker({ mode: 'plan', p: el.dataset.p, d: el.dataset.d });
  A.delPlanEx = (el) => { const d = getDay(el.dataset.p, el.dataset.d); d.exercises = d.exercises.filter((c) => c.id !== el.dataset.c); save(); render(true); };
  A.movePlanEx = (el) => { const d = getDay(el.dataset.p, el.dataset.d); move(d.exercises, d.exercises.findIndex((c) => c.id === el.dataset.c), +el.dataset.dir); save(); render(true); };

  // library
  A.libCat = (el) => { libCat = el.dataset.c; render(true); };
  A.newCustom = () => customForm();
  A.delCustom = (el) => {
    if (!confirm('Delete this custom exercise? Logged history stays but will show a generic name.')) return;
    S.custom = S.custom.filter((e) => e.id !== el.dataset.id); exIndex = null; save(); go('library');
  };
  A.pickCat = (el) => { pick.cat = el.dataset.c; $('#pickChips').innerHTML = pickChips(); $('#pickList').innerHTML = pickList(); };
  A.pick = (el) => onPick(el.dataset.id);
  A.closeModal = closeModal;

  // history
  A.delSession = (el) => { if (!confirm('Delete this workout from history?')) return; S.sessions = S.sessions.filter((s) => s.id !== el.dataset.id); save(); go('history'); };
  A.repeatSession = (el) => {
    const s = S.sessions.find((x) => x.id === el.dataset.id);
    const day = s.planId && getPlan(s.planId) && getPlan(s.planId).days.find((d) => d.id === s.dayId);
    const cfgs = day ? day.exercises : s.exercises.map((e) => ({ ...defaultCfg(e.ex), sets: e.sets.length }));
    startWorkout(s.name, cfgs, s.planId, s.dayId);
  };

  // settings
  A.unit = (el) => { S.settings.unit = el.dataset.u; save(); render(true); };
  A.export = () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `forge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  A.reset = () => {
    if (!confirm('Erase ALL plans, history and settings on this device?')) return;
    if (!confirm('Really erase everything? This cannot be undone.')) return;
    S = DEFAULTS(); exIndex = null; save(); go('train');
  };

  // timer
  A.tmode = (el) => { T.mode = el.dataset.m; render(true); };
  A.swToggle = () => { const sw = T.sw; if (sw.running) { sw.acc += Date.now() - sw.start; sw.running = false; } else { sw.start = Date.now(); sw.running = true; } updateWakeLock(); render(true); };
  A.swLap = () => { const t = swElapsed(); const prevT = T.sw.laps[0] ? T.sw.laps[0].total : 0; T.sw.laps.unshift({ total: t, split: t - prevT }); render(true); };
  A.swReset = () => { T.sw = { running: false, start: 0, acc: 0, laps: [] }; updateWakeLock(); render(true); };
  A.cdSet = (el) => { T.cd = { dur: +el.dataset.s, running: false, end: 0, remain: +el.dataset.s }; render(true); };
  A.cdToggle = () => {
    const cd = T.cd;
    if (cd.running) { cd.remain = cdRemain(); cd.running = false; }
    else { if (cd.remain <= 0) cd.remain = cd.dur; cd.end = Date.now() + cd.remain * 1000; cd.running = true; }
    updateWakeLock(); render(true);
  };
  A.cdAdd = () => { if (T.cd.running) T.cd.end += 15000; else T.cd.remain += 15; tick(); };
  A.cdReset = () => { T.cd.running = false; T.cd.remain = T.cd.dur; updateWakeLock(); render(true); };
  A.ivPreset = (el) => { const [w, r, n] = el.dataset.v.split(',').map(Number); Object.assign(T.iv, { work: w, rest: r, rounds: n, running: false, phase: 'ready', round: 0 }); render(true); };
  A.ivToggle = () => {
    const iv = T.iv, now = Date.now();
    if (iv.running) { iv.remain = Math.max(0, (iv.end - now) / 1000); iv.running = false; }
    else if (iv.phase === 'ready' || iv.phase === 'done') {
      iv.round = 0; iv.running = true; iv.beeped = null;
      if (iv.prep > 0) { iv.phase = 'prep'; iv.end = now + iv.prep * 1000; } else { iv.phase = 'prep'; iv.end = now; }
    } else { iv.end = now + iv.remain * 1000; iv.running = true; }
    updateWakeLock(); render(true);
  };
  A.ivReset = () => { Object.assign(T.iv, { running: false, phase: 'ready', round: 0 }); updateWakeLock(); render(true); };

  document.addEventListener('pointerdown', unlockAudio, { passive: true });
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || el.disabled) {
      if (ev.target.id === 'modal') closeModal();
      return;
    }
    const fn = A[el.dataset.a];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });

  // field edits (no re-render while typing, so focus is kept)
  document.addEventListener('input', (ev) => {
    const el = ev.target, f = el.dataset.f;
    if (!f) return;
    if (f === 'set') {
      const e = S.active.exercises[+el.dataset.e];
      const s = e.sets[+el.dataset.s];
      s[el.dataset.k] = parseField(el.dataset.k, el.value); save();
      const pc = document.getElementById(`pace-${el.dataset.e}-${el.dataset.s}`);
      if (pc) pc.textContent = C.pace(exById(e.ex), s.distance, s.time);
    } else if (f === 'wname') { S.active.name = el.value; save(); }
    else if (f === 'exnote') { S.active.exercises[+el.dataset.e].notes = el.value; save(); }
    else if (f === 'libq') { libQ = el.value; $('#libList').innerHTML = libList(); }
    else if (f === 'pickq') { pick.q = el.value; $('#pickList').innerHTML = pickList(); }
    else if (f === 'planName') { getPlan(el.dataset.p).name = el.value; save(); }
    else if (f === 'dayName') { getDay(el.dataset.p, el.dataset.d).name = el.value; save(); }
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target, f = el.dataset.f;
    if (!f) return;
    if (f === 'cfg') {
      const c = getDay(el.dataset.p, el.dataset.d).exercises.find((x) => x.id === el.dataset.c);
      const v = el.value.trim();
      let val = null;
      if (v !== '') {
        if (el.dataset.kind === 'int') { val = parseInt(v, 10); if (isNaN(val)) val = null; }
        else if (el.dataset.kind === 'num') val = num(v);
        else if (el.dataset.kind === 'kg') { const n = num(v); val = n == null ? null : C.fromDisp(n, unit()); }
        else if (el.dataset.kind === 'time') val = C.parseTime(v);
      }
      if (el.dataset.k === 'sets') val = Math.min(MAX, Math.max(1, val || 1));
      c[el.dataset.k] = val;
      if (c.repMin != null && c.repMax != null && c.repMax < c.repMin) c.repMax = c.repMin;
      save();
      if (el.dataset.kind === 'time' && val != null) el.value = C.fmtTime(val);
    } else if (f === 'set') {
      // tidy the display (e.g. "130" -> "1:30") and refresh pace
      const ex = S.active.exercises[+el.dataset.e];
      const s = ex.sets[+el.dataset.s];
      if (el.dataset.k === 'time' && s.time != null) el.value = C.fmtTime(s.time);
    } else if (f === 'setting') {
      const k = el.dataset.k;
      if (el.type === 'checkbox') S.settings[k] = el.checked;
      else if (k === 'rest') { const t = C.parseTime(el.value); if (t != null) { S.settings.rest = t; el.value = C.fmtTime(t); } }
      save();
    } else if (f === 'cdCustom') {
      const t = C.parseTime(el.value);
      if (t) { const was = T.cd.running; T.cd = { dur: t, running: false, end: 0, remain: t }; el.value = C.fmtTime(t); if (was) render(true); else tick(); }
    } else if (f === 'iv') {
      const k = el.dataset.k;
      const v = k === 'rounds' ? parseInt(el.value, 10) : C.parseTime(el.value);
      const was = T.iv.running || T.iv.phase !== 'ready';
      if (v != null && !isNaN(v) && v >= 0) { T.iv[k] = k === 'rounds' ? Math.max(1, v) : v; Object.assign(T.iv, { running: false, phase: 'ready', round: 0 }); }
      el.value = k === 'rounds' ? T.iv.rounds : C.fmtTime(T.iv[k]);
      if (was) render(true); else tick(); // avoid re-rendering so the next field keeps focus
    } else if (f === 'import') {
      const file = el.files && el.files[0];
      if (!file) return;
      file.text().then((txt) => {
        const d = JSON.parse(txt);
        if (!d || !Array.isArray(d.sessions) || !Array.isArray(d.plans)) throw new Error('bad file');
        if (!confirm(`Import ${d.sessions.length} workouts and ${d.plans.length} plans? This replaces the data on this device.`)) return;
        S = normalise(d); exIndex = null; save(); toast('Backup imported'); go('train');
      }).catch(() => toast('That file is not a valid Forge backup'));
    }
  });
  document.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'customForm') return;
    ev.preventDefault();
    const fd = Object.fromEntries(new FormData(ev.target));
    const name = fd.name.trim();
    if (!name) return;
    const ex = { id: 'c-' + window.slugify(name) + '-' + uid().slice(0, 4), name, category: fd.category, equipment: fd.equipment, type: fd.type, custom: true };
    if (ex.type === 'cardio') { ex.dist = fd.dist; ex.pace = fd.pace; }
    if (ex.type === 'carry') ex.dist = 'm';
    S.custom.push(ex); exIndex = null; save();
    if (pick.ctx && route().name !== 'library') { onPick(ex.id); if (pick.ctx.mode === 'plan') closeModal(); }
    else { closeModal(); toast('Exercise created'); go('exercise/' + encodeURIComponent(ex.id)); }
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  // ================= toast / icons =================
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200);
  }
  const svg = (p) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    back: svg('<path d="M15 18l-6-6 6-6"/>'),
    dots: svg('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    x: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  };

  // ================= boot =================
  render();
  updateWakeLock();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.__forge = { get state() { return S; } }; // handy for debugging
})();
