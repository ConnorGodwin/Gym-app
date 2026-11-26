/* Body tracking: bodyweight with trend, measurements and progress photos (stored in IndexedDB). */
(function () {
  'use strict';
  const F = window.Forge;
  const { esc, HOOKS, A, VIEWS, ICON } = F;
  const S = () => F.S;
  const { lenUnit, toLen, fromLen } = F;
  const r1 = (v) => Math.round(v * 10) / 10;
  const MEASURES = [['waist', 'Waist'], ['chest', 'Chest'], ['hips', 'Hips'], ['arm', 'Arm'], ['thigh', 'Thigh'], ['neck', 'Neck'], ['bf', 'Body fat %']];

  const sortedWeights = () => S().weights.slice().sort((a, b) => a.date.localeCompare(b.date));
  // 7-day moving average (by calendar date) for each weigh-in
  function trend(ws) {
    return ws.map((w) => {
      const t = F.fromKey(w.date);
      const win = ws.filter((x) => { const d = F.fromKey(x.date); return d <= t && d > t - 7 * F.DAY; });
      return { date: w.date, kg: w.kg, avg: win.reduce((a, x) => a + x.kg, 0) / win.length };
    });
  }
  F.weightTrend = () => trend(sortedWeights());

  function weightChart(pts) {
    if (pts.length < 2) return '';
    const Wd = 320, H = 130, P = 10;
    const t0 = F.fromKey(pts[0].date), t1 = F.fromKey(pts[pts.length - 1].date);
    const vals = pts.flatMap((p) => [p.kg, p.avg]);
    const min = Math.min(...vals), max = Math.max(...vals);
    const x = (d) => P + ((F.fromKey(d) - t0) / ((t1 - t0) || 1)) * (Wd - 2 * P);
    const y = (v) => H - P - ((v - min) / ((max - min) || 1)) * (H - 2 * P);
    return `<svg viewBox="0 0 ${Wd} ${H}" class="wchart" role="img" aria-label="Weight trend">
      ${pts.map((p) => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.5" fill="var(--muted)" opacity=".6"/>`).join('')}
      <polyline points="${pts.map((p) => `${x(p.date).toFixed(1)},${y(p.avg).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
      <div class="row between small muted"><span>${F.fmtDate(t0)}</span><span>● daily · <span style="color:var(--accent)">━</span> 7-day average</span><span>${F.fmtDate(t1)}</span></div>`;
  }

  VIEWS.body = () => {
    const tr = F.weightTrend();
    const last = tr[tr.length - 1];
    const monthAgo = F.dateKey(F.addDays(Date.now(), -30));
    const old = tr.filter((p) => p.date <= monthAgo).pop() || tr[0];
    const wkAgo = tr.filter((p) => p.date <= F.dateKey(F.addDays(Date.now(), -7))).pop();
    const rate = last && wkAgo ? last.avg - wkAgo.avg : null;
    const recent = tr.filter((p) => p.date >= F.dateKey(F.addDays(Date.now(), -120)));
    const ms = S().measures.slice().sort((a, b) => a.date.localeCompare(b.date));
    const firstM = (k) => (ms.find((m) => m[k] != null) || {})[k];
    const lastM = (k) => (ms.slice().reverse().find((m) => m[k] != null) || {})[k];
    const photos = S().photos.slice().sort((a, b) => b.date.localeCompare(a.date));
    setTimeout(loadThumbs, 0);
    return `
      <header class="top"><h1>Progress</h1><a class="icon-btn" href="#/settings" aria-label="Settings">${ICON.gear}</a></header>
      ${F.progressTabs('body')}
      <h2>Bodyweight</h2>
      <div class="card">
        <div class="row between"><span class="muted small">Units</span>${F.unitSeg('bodyUnit', F.bwUnit(), [['kg', 'kg'], ['lb', 'lb'], ['st', 'st & lb']])}</div>
        ${last ? `<div class="stats"><div><b>${F.fmtBW(last.avg)}</b><span>7-day average</span></div>
          <div><b>${rate == null ? '–' : F.fmtBWDelta(rate)}</b><span>last 7 days</span></div>
          <div><b>${old && old !== last ? F.fmtBWDelta(last.avg - old.avg) : '–'}</b><span>last 30 days</span></div></div>` : '<p class="muted small">Weigh in first thing in the morning, a few times a week. The 7-day average smooths out daily water swings.</p>'}
        ${weightChart(recent)}
        <form id="weightForm" class="row gap nowrap">
          <input type="date" name="date" value="${F.dateKey(Date.now())}" max="${F.dateKey(Date.now())}">
          ${F.bwInputs('w', null)}
          <button class="btn primary">Log</button>
        </form>
        ${tr.slice(-5).reverse().map((p) => { const rec = S().weights.find((w) => w.date === p.date); return `<div class="row between list-item plain"><span>${F.fmtDate(F.fromKey(p.date), { weekday: 'short', day: 'numeric', month: 'short' })}</span><span>${F.fmtBW(p.kg)}</span><button class="icon-btn" data-a="delWeight" data-id="${rec.id}" aria-label="Delete">${ICON.x}</button></div>`; }).join('')}
      </div>
      <h2>Measurements</h2>
      <div class="card">
        ${ms.length ? `<div class="mgrid">${MEASURES.filter(([k]) => lastM(k) != null).map(([k, l]) => {
          const a = firstM(k), b = lastM(k), d = b - a;
          const fmt = (v) => (k === 'bf' ? `${r1(v)}%` : `${r1(toLen(v))} ${lenUnit()}`);
          return `<div><span class="muted small">${l}</span><b>${fmt(b)}</b>${ms.length > 1 && d ? `<span class="small ${d < 0 ? 'good' : 'muted'}">${d > 0 ? '+' : '−'}${k === 'bf' ? r1(Math.abs(d)) + '%' : r1(toLen(Math.abs(d))) + ' ' + lenUnit()}</span>` : ''}</div>`;
        }).join('')}</div><p class="muted small">Change since ${F.fmtDate(F.fromKey(ms[0].date))}. Last measured ${F.fmtDate(F.fromKey(ms[ms.length - 1].date))}.</p>` : '<p class="muted small">Measure every 2–4 weeks, same time of day, tape snug but not tight.</p>'}
        <div class="row between"><span class="muted small">Units</span>${F.unitSeg('lengthUnit', lenUnit(), [['cm', 'cm'], ['in', 'in']])}</div>
        <button class="btn block" data-a="measureForm">＋ Add measurements</button>
      </div>
      <h2>Progress photos</h2>
      <div class="card">
        <p class="muted small">Photos stay on this phone only (not in backups). Same spot, lighting and time of day makes changes easier to see.</p>
        <div class="row gap"><label class="btn grow primary">＋ Add photo<input type="file" accept="image/*" data-f="photoAdd" hidden></label>
          <button class="btn grow" data-a="photoCompare" ${photos.length > 1 ? '' : 'disabled'}>Compare</button></div>
        <div class="pgrid">${photos.map((p) => `<button class="pthumb" data-a="photoView" data-id="${p.id}"><img data-photo="${p.id}" alt="Progress photo ${esc(p.date)}"><span>${F.fmtDate(F.fromKey(p.date))}${p.pose ? ' · ' + esc(p.pose) : ''}</span></button>`).join('')}</div>
      </div>`;
  };

  // ---------- weight ----------
  HOOKS.submit.weightForm = (form, fd) => {
    const kg = F.parseBW((k) => fd[k], 'w');
    if (!kg || kg < 25 || kg > 350) { F.toast('Enter a valid weight'); return; }
    const date = fd.date || F.dateKey(Date.now());
    const ex = S().weights.find((w) => w.date === date);
    if (ex) { ex.kg = kg; Store.touch(ex); } else S().weights.push(Store.touch({ date, kg }));
    F.save(); F.toast('Weight logged'); F.render(true);
    HOOKS.afterSave.forEach((f) => f('weight'));
  };
  A.delWeight = (el) => { Store.remove(S(), 'weights', el.dataset.id); F.save(); F.render(true); };

  // ---------- measurements ----------
  A.measureForm = () => {
    F.showModal(`<h2>Measurements</h2><form id="measureForm" class="form">
      <label>Date<input type="date" name="date" value="${F.dateKey(Date.now())}" max="${F.dateKey(Date.now())}"></label>
      <div class="grid2">${MEASURES.map(([k, l]) => `<label>${l}${k === 'bf' ? '' : ` (${lenUnit()})`}<input name="${k}" inputmode="decimal"></label>`).join('')}</div>
      <p class="muted small">Fill in any you measured; leave the rest blank.</p>
      <div class="row gap"><button type="button" class="btn grow" data-a="closeModal">Cancel</button><button class="btn grow primary">Save</button></div></form>`);
  };
  HOOKS.submit.measureForm = (form, fd) => {
    const rec = { date: fd.date || F.dateKey(Date.now()) };
    let any = false;
    MEASURES.forEach(([k]) => { const v = F.num(fd[k]); if (v != null) { rec[k] = k === 'bf' ? v : fromLen(v); any = true; } });
    if (!any) { F.toast('Enter at least one measurement'); return; }
    S().measures.push(Store.touch(rec)); F.save(); F.closeModal(); F.render(true);
  };

  // ---------- photos ----------
  const urls = {};
  async function loadThumbs() {
    for (const img of document.querySelectorAll('img[data-photo]')) {
      const id = img.dataset.photo;
      if (!urls[id]) { try { const b = await Store.photos.get(id); if (b) urls[id] = URL.createObjectURL(b); } catch (e) { /* ignore */ } }
      if (urls[id]) img.src = urls[id];
    }
  }
  async function shrink(file) {
    const max = 1400;
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
    const w = src.width, h = src.height, k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
  }
  HOOKS.change.photoAdd = async (el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    try {
      const blob = await shrink(file);
      const pose = prompt('Pose (optional): front, side or back', 'front') || '';
      const meta = Store.touch({ date: F.dateKey(Date.now()), pose: pose.trim().toLowerCase().slice(0, 12) });
      await Store.photos.put(meta.id, blob);
      S().photos.push(meta); F.save(); F.toast('Photo saved'); F.render(true);
      HOOKS.afterSave.forEach((f) => f('photo'));
    } catch (e) { F.toast('Couldn’t save that photo'); }
  };
  A.photoView = async (el) => {
    const p = S().photos.find((x) => x.id === el.dataset.id);
    F.showModal(`${F.sheetHead(F.fmtDate(F.fromKey(p.date), { day: 'numeric', month: 'short', year: 'numeric' }) + (p.pose ? ' · ' + esc(p.pose) : ''))}
      <img class="pfull" data-photo="${p.id}" alt="Progress photo">
      <button class="btn block danger-ghost" data-a="photoDel" data-id="${p.id}">Delete photo</button>`);
    loadThumbs();
  };
  A.photoDel = async (el) => {
    if (!confirm('Delete this photo?')) return;
    try { await Store.photos.del(el.dataset.id); } catch (e) { /* ignore */ }
    Store.remove(S(), 'photos', el.dataset.id); F.save(); F.closeModal(); F.render(true);
  };
  let cmp = [];
  A.photoCompare = () => {
    cmp = [];
    const photos = S().photos.slice().sort((a, b) => a.date.localeCompare(b.date));
    F.showModal(`${F.sheetHead('Pick two photos')}
      <div class="pgrid">${photos.map((p) => `<button class="pthumb" data-a="cmpPick" data-id="${p.id}"><img data-photo="${p.id}" alt=""><span>${F.fmtDate(F.fromKey(p.date))}${p.pose ? ' · ' + esc(p.pose) : ''}</span></button>`).join('')}</div>`);
    loadThumbs();
  };
  A.cmpPick = (el) => {
    if (cmp.includes(el.dataset.id)) return;
    cmp.push(el.dataset.id); el.classList.add('sel');
    if (cmp.length < 2) return;
    const [a, b] = cmp.map((id) => S().photos.find((p) => p.id === id)).sort((x, y) => x.date.localeCompare(y.date));
    const days = Math.round((F.fromKey(b.date) - F.fromKey(a.date)) / F.DAY);
    F.showModal(`${F.sheetHead(`${days} days apart`)}
      <div class="cmp"><figure><img data-photo="${a.id}" alt=""><figcaption>${F.fmtDate(F.fromKey(a.date))}</figcaption></figure><figure><img data-photo="${b.id}" alt=""><figcaption>${F.fmtDate(F.fromKey(b.date))}</figcaption></figure></div>`);
    loadThumbs();
  };
})();
