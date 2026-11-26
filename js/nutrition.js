/* Nutrition: food diary, food search (Open Food Facts), barcode scanning, quick add, custom foods,
 * recipes, saved meals, targets (TDEE + adaptive), water, weekly meal plan and shopping list. */
(function () {
  'use strict';
  const F = window.Forge;
  const { esc, HOOKS, A, VIEWS, ICON } = F;
  const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snacks', 'Snacks']];
  const mealName = (m) => (MEALS.find((x) => x[0] === m) || [m, m])[1];
  const r0 = (v) => Math.round(v || 0);
  const r1 = (v) => Math.round((v || 0) * 10) / 10;
  const S = () => F.S;
  const today = () => F.dateKey(Date.now());
  let foodDate = today();
  let planDow = new Date().getDay();

  // ---------- macro maths ----------
  // foods store values per 100 g; entries store their own computed totals so history never changes
  const gramsOf = (food, qty, qtyUnit) => (qtyUnit === 'serving' ? qty * (food.servingG || 100) : qty);
  function macrosForFood(food, qty, qtyUnit) {
    const k = gramsOf(food, qty, qtyUnit) / 100;
    return { kcal: (food.kcal || 0) * k, p: (food.p || 0) * k, c: (food.c || 0) * k, f: (food.f || 0) * k };
  }
  function recipeTotals(rec) {
    const t = { kcal: 0, p: 0, c: 0, f: 0, grams: 0 };
    rec.items.forEach((it) => { const m = macrosForFood(it, it.grams, 'g'); t.kcal += m.kcal; t.p += m.p; t.c += m.c; t.f += m.f; t.grams += it.grams; });
    return t;
  }
  function recipePerServing(rec) { const t = recipeTotals(rec), n = rec.servings || 1; return { kcal: t.kcal / n, p: t.p / n, c: t.c / n, f: t.f / n }; }
  const sum = (items) => items.reduce((a, e) => ({ kcal: a.kcal + (e.kcal || 0), p: a.p + (e.p || 0), c: a.c + (e.c || 0), f: a.f + (e.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
  const dayEntries = (date) => S().foodLog.filter((e) => e.date === date);
  const fmtQty = (e) => (e.kind === 'quick' ? '' : e.qtyUnit === 'serving' ? `${r1(e.qty)} serving${e.qty === 1 ? '' : 's'}` : `${r0(e.qty)} g`);

  // ---------- targets ----------
  const ACTIVITY = [[1.2, 'Sedentary (desk job, little exercise)'], [1.375, 'Light (1–3 sessions/week)'], [1.55, 'Moderate (3–5 sessions/week)'], [1.725, 'Very active (6–7 sessions/week)'], [1.9, 'Athlete (twice a day / physical job)']];
  const GOALS = [[-0.75, 'Lose 0.75 kg/week'], [-0.5, 'Lose 0.5 kg/week'], [-0.25, 'Lose 0.25 kg/week'], [0, 'Maintain'], [0.25, 'Gain 0.25 kg/week'], [0.5, 'Gain 0.5 kg/week']];
  const latestWeight = () => { const w = S().weights.slice().sort((a, b) => b.date.localeCompare(a.date))[0]; return w ? w.kg : null; };
  function calcTargets(pr, kg) {
    const bmr = 10 * kg + 6.25 * pr.heightCm - 5 * pr.age + (pr.sex === 'female' ? -161 : 5); // Mifflin-St Jeor
    const tdee = bmr * pr.activity;
    const kcal = Math.max(1200, tdee + (pr.goal * 7700) / 7);
    const p = pr.proteinPerKg * kg;
    const f = (kcal * 0.25) / 9;
    const c = Math.max(0, (kcal - p * 4 - f * 9) / 4);
    return { bmr: r0(bmr), tdee: r0(tdee), kcal: r0(kcal / 10) * 10, p: r0(p), c: r0(c), f: r0(f) };
  }
  // targets for a given day (training-day bonus if a workout was logged that day)
  function targetsFor(date) {
    const t = S().nutrition.targets;
    if (!t) return null;
    const bonus = +S().nutrition.profile.trainingBonus || 0;
    const trained = bonus && S().sessions.some((s) => F.dateKey(s.start) === date);
    return trained ? { ...t, kcal: t.kcal + bonus, c: t.c + bonus / 4, trained: true } : t;
  }
  F.nutritionTargetsFor = targetsFor;

  // Adaptive check-in: estimate real maintenance from intake vs weight trend over the last 21 days
  function adaptive() {
    const n = S().nutrition;
    if (!n.targets) return null;
    const from = F.dateKey(F.addDays(F.startOfDay(Date.now()), -21));
    const days = {};
    S().foodLog.forEach((e) => { if (e.date >= from && e.date < today()) days[e.date] = (days[e.date] || 0) + e.kcal; });
    const logged = Object.values(days).filter((k) => k > 600);
    const ws = S().weights.filter((w) => w.date >= from).sort((a, b) => a.date.localeCompare(b.date));
    if (logged.length < 10 || ws.length < 4) return null;
    const xs = ws.map((w) => F.fromKey(w.date) / F.DAY), ys = ws.map((w) => w.kg);
    if (xs[xs.length - 1] - xs[0] < 12) return null;
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0); // kg/day
    const intake = logged.reduce((a, b) => a + b, 0) / logged.length;
    const tdee = intake - slope * 7700;
    const suggest = Math.round((tdee + (n.profile.goal * 7700) / 7) / 10) * 10;
    return { tdee: r0(tdee), intake: r0(intake), kgPerWeek: slope * 7, suggest, days: logged.length, current: n.targets.kcal };
  }
  F.nutritionAdaptive = adaptive;

  // ---------- views ----------
  function ring(eaten, target) {
    const R = 52, Cc = 2 * Math.PI * R, pct = target ? Math.min(1, eaten / target) : 0, over = target && eaten > target;
    return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${r0(eaten)} of ${r0(target)} kcal">
      <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
      ${pct > 0 ? `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${over ? 'var(--warn)' : 'var(--accent)'}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${(pct * Cc).toFixed(1)} ${Cc.toFixed(1)}" transform="rotate(-90 60 60)"/>` : ''}
      <text x="60" y="56" text-anchor="middle" class="ring-num">${target ? Math.abs(r0(target - eaten)).toLocaleString() : r0(eaten).toLocaleString()}</text>
      <text x="60" y="76" text-anchor="middle" class="ring-lbl">${target ? (over ? 'kcal over' : 'kcal left') : 'kcal eaten'}</text></svg>`;
  }
  const bar = (label, v, t, unitS = 'g') => `<div class="mbar"><div class="row between small"><span>${label}</span><span>${r0(v)}${t ? ` / ${r0(t)}` : ''} ${unitS}</span></div>
    <div class="track"><div style="width:${t ? Math.min(100, (100 * v) / t) : 0}%"></div></div></div>`;

  function dateLabel(d) {
    const t = today();
    if (d === t) return 'Today';
    if (d === F.dateKey(F.addDays(F.startOfDay(Date.now()), -1))) return 'Yesterday';
    if (d === F.dateKey(F.addDays(F.startOfDay(Date.now()), 1))) return 'Tomorrow';
    return F.fmtDate(F.fromKey(d), { weekday: 'short', day: 'numeric', month: 'short' });
  }

  VIEWS.food = () => {
    const n = S().nutrition, t = targetsFor(foodDate);
    const entries = dayEntries(foodDate), tot = sum(entries);
    const water = S().waterLog.filter((w) => w.date === foodDate).reduce((a, w) => a + w.ml, 0);
    const ad = foodDate === today() && adaptive();
    const showAd = ad && Math.abs(ad.suggest - ad.current) >= 100 && n.adaptDismissed !== F.dateKey(F.mondayOf(Date.now()));
    const dow = new Date(F.fromKey(foodDate)).getDay();
    const planned = S().mealPlan.filter((p) => p.dow === dow);
    const plannedK = sum(planned).kcal;
    return `
      <header class="top"><h1>Food</h1><a class="btn small" href="#/targets">Targets</a></header>
      <div class="datenav"><button class="icon-btn" data-a="fdDay" data-v="-1" aria-label="Previous day">‹</button><b>${dateLabel(foodDate)}</b><button class="icon-btn" data-a="fdDay" data-v="1" aria-label="Next day">›</button></div>
      <div class="card food-sum">
        ${ring(tot.kcal, t && t.kcal)}
        <div class="grow">
          <div class="small muted">${t ? `${r0(tot.kcal).toLocaleString()} eaten of ${t.kcal.toLocaleString()} kcal${t.trained ? ' · training day' : ''}` : `${r0(tot.kcal).toLocaleString()} kcal · <a class="link" href="#/targets">set targets</a>`}</div>
          ${bar('Protein', tot.p, t && t.p)}${bar('Carbs', tot.c, t && t.c)}${bar('Fat', tot.f, t && t.f)}
        </div>
      </div>
      ${showAd ? `<div class="card adapt"><b>Weekly check-in</b>
        <p class="small">Over the last ${ad.days} logged days you ate about <b>${ad.intake.toLocaleString()} kcal</b> and your weight changed <b>${F.fmtBWDelta(ad.kgPerWeek)}/week</b>, so your real maintenance is about <b>${ad.tdee.toLocaleString()} kcal</b>.</p>
        <p class="small">Suggested target for your goal: <b>${ad.suggest.toLocaleString()} kcal</b> (currently ${ad.current.toLocaleString()}).</p>
        <div class="row gap"><button class="btn small primary" data-a="adaptApply" data-v="${ad.suggest}">Use ${ad.suggest.toLocaleString()} kcal</button><button class="btn small" data-a="adaptDismiss">Not now</button></div></div>` : ''}
      ${planned.length && !entries.length ? `<div class="card row between"><div><b>Meal plan for ${F.DOW[dow]}</b><div class="small muted">${planned.length} items · ${r0(plannedK).toLocaleString()} kcal</div></div><button class="btn small primary" data-a="logPlan">Log all</button></div>` : ''}
      ${MEALS.map(([m, label]) => {
        const es = entries.filter((e) => e.meal === m), mt = sum(es);
        return `<div class="card meal">
          <div class="row between"><h3>${label}</h3><span class="row"><span class="muted small">${r0(mt.kcal)} kcal</span><button class="icon-btn" data-a="mealMenu" data-m="${m}" aria-label="${label} options">${ICON.dots}</button></span></div>
          ${es.map((e) => `<div class="fentry"><button class="grow plainbtn" data-a="editEntry" data-id="${e.id}"><div>${esc(e.name)}</div><div class="muted small">${esc(fmtQty(e))}${fmtQty(e) ? ' · ' : ''}P ${r0(e.p)} · C ${r0(e.c)} · F ${r0(e.f)}</div></button><span class="kc">${r0(e.kcal)}</span></div>`).join('')}
          <button class="btn small addfood" data-a="addFood" data-m="${m}">＋ Add food</button>
        </div>`;
      }).join('')}
      <div class="card water">
        <div class="row between"><h3>💧 Water</h3><span class="small"><b>${(water / 1000).toFixed(2)}</b> / ${(n.waterMl / 1000).toFixed(1)} L</span></div>
        <div class="track"><div style="width:${Math.min(100, (100 * water) / n.waterMl)}%"></div></div>
        <div class="row gap"><button class="chip" data-a="water" data-v="250">+250 ml</button><button class="chip" data-a="water" data-v="500">+500 ml</button><button class="chip" data-a="water" data-v="750">+750 ml</button><button class="chip" data-a="waterUndo" ${water ? '' : 'disabled'}>Undo</button></div>
      </div>
      ${!entries.length ? `<button class="btn block" data-a="copyDay">Copy everything from the previous day</button>` : ''}
      <div class="linkgrid">
        <a class="card" href="#/mealplan"><b>Meal plan</b><span class="muted small">Plan your week</span></a>
        <a class="card" href="#/shopping"><b>Shopping list</b><span class="muted small">From your meal plan</span></a>
        <a class="card" href="#/myfoods"><b>My foods</b><span class="muted small">Foods, recipes, meals</span></a>
        <a class="card" href="#/targets"><b>Targets</b><span class="muted small">Calories & macros</span></a>
      </div>`;
  };

  // tapping the Food tab always returns to today
  document.addEventListener('click', (ev) => {
    if (!(ev.target.closest && ev.target.closest('#nav a[data-tab="food"]'))) return;
    const was = foodDate; foodDate = today();
    if (F.route().name === 'food' && was !== foodDate) F.render();
  }, true);
  A.fdDay = (el) => { foodDate = F.dateKey(F.addDays(F.fromKey(foodDate), +el.dataset.v)); F.render(); };
  A.water = (el) => { S().waterLog.push(Store.touch({ date: foodDate, ml: +el.dataset.v })); F.save(); F.render(true); afterLog(); };
  A.waterUndo = () => { const w = S().waterLog.filter((x) => x.date === foodDate).pop(); if (w) { Store.remove(S(), 'waterLog', w.id); F.save(); F.render(true); } };
  A.adaptApply = (el) => {
    const n = S().nutrition, kcal = +el.dataset.v, t = n.targets;
    const c = Math.max(0, (kcal - t.p * 4 - t.f * 9) / 4);
    n.targets = { ...t, kcal, c: r0(c) }; n.adaptDismissed = F.dateKey(F.mondayOf(Date.now()));
    F.save(); F.toast('Target updated'); F.render(true);
  };
  A.adaptDismiss = () => { S().nutrition.adaptDismissed = F.dateKey(F.mondayOf(Date.now())); F.save(); F.render(true); };

  function copyEntries(fromDate, toDate, meal) {
    const src = dayEntries(fromDate).filter((e) => !meal || e.meal === meal);
    src.forEach((e) => { const { id, updatedAt, ...rest } = e; S().foodLog.push(Store.touch({ ...rest, date: toDate })); });
    return src.length;
  }
  A.copyDay = () => {
    const prev = F.dateKey(F.addDays(F.fromKey(foodDate), -1));
    const n = copyEntries(prev, foodDate);
    if (!n) { F.toast('Nothing logged the day before'); return; }
    F.save(); F.toast(`Copied ${n} item${n > 1 ? 's' : ''}`); F.render(true); afterLog();
  };
  A.mealMenu = (el) => {
    const m = el.dataset.m;
    F.showModal(`<h2>${mealName(m)}</h2><div class="menu">
      <button class="btn block" data-a="copyMeal" data-m="${m}">Copy ${mealName(m).toLowerCase()} from the previous day</button>
      <button class="btn block" data-a="saveMeal" data-m="${m}" ${dayEntries(foodDate).some((e) => e.meal === m) ? '' : 'disabled'}>Save as a meal to reuse</button>
      <button class="btn block danger-ghost" data-a="clearMeal" data-m="${m}" ${dayEntries(foodDate).some((e) => e.meal === m) ? '' : 'disabled'}>Clear ${mealName(m).toLowerCase()}</button>
      <button class="btn block" data-a="closeModal">Close</button></div>`);
  };
  A.copyMeal = (el) => {
    const n = copyEntries(F.dateKey(F.addDays(F.fromKey(foodDate), -1)), foodDate, el.dataset.m);
    F.closeModal(); F.save(); F.toast(n ? `Copied ${n} item${n > 1 ? 's' : ''}` : 'Nothing logged for that meal the day before'); F.render(true);
  };
  A.saveMeal = (el) => {
    const name = prompt('Name this meal', `My ${mealName(el.dataset.m).toLowerCase()}`);
    if (!name) return;
    const items = dayEntries(foodDate).filter((e) => e.meal === el.dataset.m).map(({ id, date, meal, updatedAt, ...rest }) => rest);
    S().meals.push(Store.touch({ name: name.trim(), items }));
    F.save(); F.closeModal(); F.toast('Meal saved – find it under “Mine” when adding food');
  };
  A.clearMeal = (el) => {
    if (!confirm(`Clear ${mealName(el.dataset.m).toLowerCase()}?`)) return;
    dayEntries(foodDate).filter((e) => e.meal === el.dataset.m).forEach((e) => Store.remove(S(), 'foodLog', e.id));
    F.save(); F.closeModal(); F.render(true);
  };
  A.logPlan = () => {
    const dow = new Date(F.fromKey(foodDate)).getDay();
    S().mealPlan.filter((p) => p.dow === dow).forEach((p) => { const { id, updatedAt, dow: _d, ...rest } = p; S().foodLog.push(Store.touch({ ...rest, date: foodDate })); });
    F.save(); F.toast('Meal plan logged'); F.render(true); afterLog();
  };

  // ---------- add food sheet ----------
  // ctx: {to:'diary', meal} | {to:'plan', dow, meal} | {to:'recipe', id}
  let add = { ctx: null, tab: 'search', q: '', results: null, loading: false, err: '' };
  function openAdd(ctx, tab) {
    add = { ctx, tab: tab || (S().foods.length ? 'mine' : 'search'), q: '', results: null, loading: false, err: '' };
    if (ctx.to === 'recipe' && add.tab === 'quick') add.tab = 'search';
    sheet();
  }
  const tabsFor = () => [['search', 'Search'], ['scan', 'Scan'], ...(add.ctx.to === 'recipe' ? [] : [['quick', 'Quick add']]), ['mine', 'Mine']];
  function sheet() {
    const title = add.ctx.to === 'recipe' ? 'Add ingredient' : `Add to ${mealName(add.ctx.meal)}`;
    let body = '';
    if (add.tab === 'search') {
      body = `<form id="foodSearch" class="searchrow"><input class="search" type="search" name="q" value="${esc(add.q)}" placeholder="e.g. beef mince, greek yogurt" enterkeyhint="search" autocomplete="off"><button class="btn primary">Search</button></form>
        <div class="region"><span class="muted small">Products from</span>${[['uk', 'UK'], ['world', 'Worldwide']].map(([v, l]) => `<button class="chip ${(S().settings.foodRegion === 'world' ? 'world' : 'uk') === v ? 'on' : ''}" data-a="foodRegion" data-v="${v}">${l}</button>`).join('')}</div>
        <div id="foodResults">${resultsHtml()}</div>`;
    } else if (add.tab === 'scan') {
      body = `<div class="scanbox"><video id="scanVideo" playsinline muted></video><div class="scanline"></div></div>
        <p class="muted small center" id="scanMsg">Point the camera at a barcode</p>
        <form id="barcodeForm" class="row gap nowrap"><input class="grow" name="code" inputmode="numeric" placeholder="Or type the barcode number"><button class="btn">Look up</button></form>`;
    } else if (add.tab === 'quick') {
      body = `<form id="quickAdd" class="form">
        <label>Name (optional)<input name="name" placeholder="e.g. Restaurant lunch"></label>
        <div class="grid2"><label>Calories (kcal)<input name="kcal" inputmode="decimal" required></label><label>Protein (g)<input name="p" inputmode="decimal"></label>
        <label>Carbs (g)<input name="c" inputmode="decimal"></label><label>Fat (g)<input name="f" inputmode="decimal"></label></div>
        <button class="btn block primary">Add</button></form>`;
    } else {
      const recent = S().foods.slice().sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
      body = `
        ${add.ctx.to !== 'recipe' && S().meals.length ? `<div class="label-sm">Saved meals</div>${S().meals.map((m) => `<button class="list-item plain" data-a="pickMeal" data-id="${m.id}"><div><div>${esc(m.name)}</div><div class="muted small">${m.items.length} items · ${r0(sum(m.items).kcal)} kcal</div></div><span class="plus">＋</span></button>`).join('')}` : ''}
        ${add.ctx.to !== 'recipe' && S().recipes.length ? `<div class="label-sm">Recipes</div>${S().recipes.map((r) => `<button class="list-item plain" data-a="pickRecipe" data-id="${r.id}"><div><div>${esc(r.name)}</div><div class="muted small">${r0(recipePerServing(r).kcal)} kcal per serving</div></div><span class="plus">＋</span></button>`).join('')}` : ''}
        <div class="label-sm">Recent & my foods</div>
        ${recent.length ? recent.slice(0, 60).map(foodRow).join('') : '<p class="muted small">Foods you add will appear here.</p>'}
        <button class="btn block" data-a="newFood">＋ Create a food</button>`;
    }
    F.showModal(`${F.sheetHead(title, { close: 'closeAdd' })}
      <div class="seg wide">${tabsFor().map(([k, l]) => `<button class="${add.tab === k ? 'on' : ''}" data-a="addTab" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="addbody">${body}</div>`);
    if (add.tab === 'scan') startScan();
  }
  const foodRow = (f) => `<button class="list-item plain" data-a="pickFood" data-id="${esc(f.id)}"><div><div>${esc(f.name)}${f.brand ? ` <span class="muted small">${esc(f.brand)}</span>` : ''}</div><div class="muted small">${r0(f.kcal)} kcal · P ${r1(f.p)} · C ${r1(f.c)} · F ${r1(f.f)} per 100 g</div></div><span class="plus">＋</span></button>`;
  // results: [{code, name, brand, food, state: 'ok' | 'loading' | 'none'}]
  function resultsHtml() {
    if (add.loading) return '<p class="muted center pad">Searching…</p>';
    if (!add.results) return add.err ? `<p class="muted">${esc(add.err)}</p>` : '<p class="muted small">Search millions of products from Open Food Facts, or create your own food under “Mine”.</p>';
    const list = add.results.filter((r) => r.state !== 'none');
    if (!list.length) return add.err ? `<p class="muted">${esc(add.err)}</p>` : '<p class="muted">No matches. Try fewer or different words, switch to Worldwide, or create the food under “Mine”.</p>';
    return list.map((r) => {
      const i = add.results.indexOf(r);
      const head = `<div>${esc(r.name)}${r.brand ? ` <span class="muted small">${esc(r.brand)}</span>` : ''}</div>`;
      if (r.state === 'loading') return `<div class="list-item plain loadrow"><div>${head}<div class="muted small">Loading nutrition…</div></div></div>`;
      const f = r.food;
      return `<button class="list-item plain" data-a="pickResult" data-i="${i}"><div>${head}<div class="muted small">${r0(f.kcal)} kcal · P ${r1(f.p)} · C ${r1(f.c)} · F ${r1(f.f)} per 100 g${f.incomplete ? ' · <span class="warn-t">incomplete data</span>' : ''}</div></div><span class="plus">＋</span></button>`;
    }).join('') + (add.err ? `<p class="muted small">${esc(add.err)}</p>` : '');
  }
  A.addFood = (el) => openAdd({ to: 'diary', meal: el.dataset.m });
  A.addTab = (el) => { stopScan(); add.tab = el.dataset.v; sheet(); };
  A.closeAdd = () => { stopScan(); F.closeModal(); };
  A.foodRegion = (el) => {
    S().settings.foodRegion = el.dataset.v; F.save();
    document.querySelectorAll('[data-a="foodRegion"]').forEach((b) => b.classList.toggle('on', b === el));
    if (add.q) HOOKS.submit.foodSearch(null, { q: add.q });
  };

  // ---------- Open Food Facts ----------
  // Search uses the fast search service (names + barcodes), then nutrition comes from the reliable
  // product endpoint. The old cgi/search.pl is only a fallback: it is often overloaded (503).
  const OFF_FIELDS = 'code,product_name,product_name_en,brands,nutriments,serving_quantity,serving_size';
  const productCache = {};
  function timeoutFetch(url, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    return fetch(url, { signal: ctl.signal }).finally(() => clearTimeout(t));
  }
  const prettyBrand = (b) => {
    const v = Array.isArray(b) ? b[0] : String(b || '').split(',')[0];
    return String(v || '').replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  };
  function fromOFF(p) {
    const n = p.nutriments || {};
    let kcal = n['energy-kcal_100g'];
    if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
    const name = (p.product_name_en || p.product_name || '').trim();
    if (!name || kcal == null || isNaN(+kcal)) return null;
    const sq = parseFloat(p.serving_quantity);
    return {
      id: 'off-' + p.code, name, brand: prettyBrand(p.brands), barcode: p.code, source: 'off',
      kcal: +kcal || 0, p: +n.proteins_100g || 0, c: +n.carbohydrates_100g || 0, f: +n.fat_100g || 0,
      ...([n.proteins_100g, n.carbohydrates_100g, n.fat_100g].some((v) => v == null || v === '') ? { incomplete: true } : {}),
      ...(sq > 0 ? { servingG: sq, servingLabel: p.serving_size || `${sq} g` } : {}),
    };
  }
  async function offProduct(code) {
    if (code in productCache) return productCache[code];
    const res = await timeoutFetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, 10000);
    if (res.status === 404) return (productCache[code] = null);
    if (!res.ok) throw new Error('Lookup failed');
    const d = await res.json();
    return (productCache[code] = d.status === 1 && d.product ? fromOFF({ code, ...d.product }) : null);
  }
  // fast name search → [{code, name, brand}]
  async function offFind(q, world) {
    const clean = q.replace(/[:"()[\]{}^~*?\\/+!&|<>=-]/g, ' ').replace(/\s+/g, ' ').trim();
    const query = clean + (world ? '' : ' countries:"en:united-kingdom"');
    const res = await timeoutFetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=20&langs=en&fields=code,product_name,product_name_en,brands`, 10000);
    if (!res.ok) throw new Error('search ' + res.status);
    const d = await res.json();
    if (!Array.isArray(d.hits)) throw new Error('search format');
    return d.hits.filter((h) => h.code && (h.product_name_en || h.product_name))
      .map((h) => ({ code: h.code, name: (h.product_name_en || h.product_name).trim(), brand: prettyBrand(h.brands) }));
  }
  // old full-text search (includes nutrition) – fallback only
  async function offLegacy(q, world) {
    const res = await timeoutFetch(`https://${world ? 'world' : 'uk'}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${OFF_FIELDS}`, 15000);
    if (!res.ok) throw new Error('legacy ' + res.status);
    const d = await res.json();
    return (d.products || []).map(fromOFF).filter(Boolean);
  }
  async function offBarcode(code) { return offProduct(code); }

  const renderResults = (seq) => { if (seq !== add.seq) return; const box = $('#foodResults'); if (box) box.innerHTML = resultsHtml(); };
  HOOKS.submit.foodSearch = async (form, fd) => {
    const q = (fd.q || '').trim();
    if (!q) return;
    add.q = q;
    const seq = add.seq = (add.seq || 0) + 1;
    const world = S().settings.foodRegion === 'world';
    // your own and previously used foods match instantly
    const words = q.toLowerCase().split(/\s+/);
    const local = S().foods.filter((f) => words.every((w) => `${f.name} ${f.brand || ''}`.toLowerCase().includes(w)))
      .map((f) => ({ code: f.barcode || f.id, name: f.name, brand: f.brand, food: f, state: 'ok' }));
    add.loading = true; add.err = ''; add.results = null;
    renderResults(seq);
    if (navigator.onLine === false) {
      add.loading = false; add.results = local;
      add.err = 'You’re offline. Search needs a connection; your saved foods are under “Mine”.';
      renderResults(seq); return;
    }
    let hits = null;
    try {
      hits = await offFind(q, world);
      if (!hits.length && !world) hits = await offFind(q, true); // nothing UK-specific: widen automatically
    } catch (e) { hits = null; }
    if (seq !== add.seq) return;
    if (hits) {
      const seen = new Set(local.map((r) => r.code));
      add.results = local.concat(hits.filter((h) => !seen.has(h.code)).map((h) => ({ ...h, food: null, state: 'loading' })));
      add.loading = false;
      renderResults(seq);
      // fetch nutrition, 5 at a time, updating the list as each arrives
      const queue = add.results.filter((r) => r.state === 'loading');
      let failed = 0;
      const worker = async () => {
        while (queue.length) {
          const r = queue.shift();
          try { const f = await offProduct(r.code); r.food = f; r.state = f ? 'ok' : 'none'; if (f) { r.name = f.name; r.brand = f.brand || r.brand; } }
          catch (e) { r.state = 'none'; failed++; }
          renderResults(seq);
        }
      };
      await Promise.all([1, 2, 3, 4, 5].map(worker));
      if (seq !== add.seq) return;
      // products with missing macros go below complete ones
      add.results = add.results.filter((r) => !(r.food && r.food.incomplete)).concat(add.results.filter((r) => r.food && r.food.incomplete));
      if (failed && !add.results.some((r) => r.state === 'ok')) add.err = 'The food database is busy right now. Try again in a moment.';
      renderResults(seq);
      return;
    }
    // fast search unavailable – try the old search
    try {
      const foods = await offLegacy(q, world);
      if (seq !== add.seq) return;
      const seen = new Set(local.map((r) => r.code));
      add.results = local.concat(foods.filter((f) => !seen.has(f.barcode)).map((f) => ({ code: f.barcode, name: f.name, brand: f.brand, food: f, state: 'ok' })));
    } catch (e) {
      if (seq !== add.seq) return;
      add.results = local;
      add.err = 'Couldn’t reach the food database (it may be busy). Try again in a moment, scan the barcode, or create the food under “Mine”.';
    }
    add.loading = false;
    renderResults(seq);
  };
  const $ = (s) => document.querySelector(s);
  async function lookupBarcode(code) {
    code = String(code).replace(/\D/g, '');
    if (code.length < 6) { F.toast('That barcode looks too short'); return; }
    const known = S().foods.find((f) => f.barcode === code);
    if (known) { stopScan(); amountSheet(known); return; }
    const msg = $('#scanMsg'); if (msg) msg.textContent = `Looking up ${code}…`;
    try {
      const f = await offBarcode(code);
      if (f) { stopScan(); amountSheet(f); return; }
      stopScan();
      if (confirm(`Barcode ${code} isn't in the database yet. Create it as your own food?`)) foodForm({ barcode: code });
    } catch (e) { F.toast('Couldn’t reach the food database'); if (msg) msg.textContent = 'Point the camera at a barcode'; }
  }
  HOOKS.submit.barcodeForm = (form, fd) => lookupBarcode(fd.code || '');

  // ---------- barcode scanner ----------
  let scan = null;
  async function startScan() {
    const video = $('#scanVideo'), msg = $('#scanMsg');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { if (msg) msg.textContent = 'Camera not available here – type the barcode instead.'; return; }
    const token = {}; scan = token;
    try {
      if ('BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats()).includes('ean_13')) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (scan !== token) { stream.getTracks().forEach((t) => t.stop()); return; }
        token.stream = stream; video.srcObject = stream; await video.play();
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const loop = async () => {
          if (scan !== token) return;
          try { const r = await det.detect(video); if (r.length) { F.buzz(60); lookupBarcode(r[0].rawValue); return; } } catch (e) { /* keep trying */ }
          token.timer = setTimeout(loop, 250);
        };
        loop();
      } else {
        if (msg) msg.textContent = 'Starting camera…';
        await loadScript('js/vendor/zxing.min.js');
        if (scan !== token) return;
        const reader = new window.ZXing.BrowserMultiFormatReader();
        token.reader = reader;
        await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, (res) => {
          if (res && scan === token) { F.buzz(60); lookupBarcode(res.getText()); }
        });
        if (msg) msg.textContent = 'Point the camera at a barcode';
      }
    } catch (e) {
      if (msg) msg.textContent = 'Couldn’t open the camera. Allow camera access, or type the barcode below.';
    }
  }
  function stopScan() {
    const t = scan; scan = null;
    if (!t) return;
    clearTimeout(t.timer);
    if (t.stream) t.stream.getTracks().forEach((x) => x.stop());
    if (t.reader) try { t.reader.reset(); } catch (e) { /* ignore */ }
    const v = $('#scanVideo'); if (v && v.srcObject) { v.srcObject.getTracks().forEach((x) => x.stop()); v.srcObject = null; }
  }
  const scripts = {};
  const loadScript = (src) => scripts[src] || (scripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));
  // stop the camera whenever the sheet closes
  new MutationObserver(() => { if ($('#modal').hidden || !$('#scanVideo')) stopScan(); }).observe(document.getElementById('modal'), { attributes: true, childList: true });

  // ---------- picking + amount ----------
  A.pickResult = (el) => { const r = add.results[+el.dataset.i]; if (r && r.food) amountSheet(r.food); };
  A.pickFood = (el) => amountSheet(S().foods.find((f) => f.id === el.dataset.id));
  A.pickRecipe = (el) => amountSheet(S().recipes.find((r) => r.id === el.dataset.id), true);
  A.pickMeal = (el) => {
    const m = S().meals.find((x) => x.id === el.dataset.id);
    m.items.forEach((it) => addItem({ ...it }));
    F.closeModal(); F.save(); F.toast(`Added ${m.name}`); F.render(true); afterLog();
  };
  let pending = null;
  function amountSheet(food, isRecipe) {
    if (!food) return;
    const hasServing = isRecipe || food.servingG;
    const unit0 = isRecipe ? 'serving' : food.servingG ? 'serving' : 'g';
    pending = { food, isRecipe, qtyUnit: unit0, qty: unit0 === 'serving' ? 1 : 100 };
    F.showModal(`${F.sheetHead(esc(food.name), { back: 'backAdd', close: 'closeAdd' })}
      ${food.brand ? `<div class="muted small">${esc(food.brand)}</div>` : ''}
      <div class="row gap nowrap amount">
        <input id="amtQty" data-f="amt" inputmode="decimal" value="${pending.qty}">
        ${isRecipe ? '<span class="pill">serving(s)</span>' : `<select data-f="amtUnit">${hasServing ? `<option value="serving">serving${food.servingLabel ? ` (${esc(food.servingLabel)})` : ''}</option>` : ''}<option value="g" ${unit0 === 'g' ? 'selected' : ''}>grams</option></select>`}
      </div>
      ${add.ctx.to === 'diary' || add.ctx.to === 'plan' ? `<div class="seg wide">${MEALS.map(([m, l]) => `<button class="${add.ctx.meal === m ? 'on' : ''}" data-a="amtMeal" data-v="${m}">${l}</button>`).join('')}</div>` : ''}
      <div class="card" id="amtPreview"></div>
      ${isRecipe ? '' : `<p class="muted small">Per 100 g: ${r0(food.kcal)} kcal · P ${r1(food.p)} · C ${r1(food.c)} · F ${r1(food.f)}${food.source === 'off' ? ' · data: Open Food Facts' : ''}</p>`}
      <button class="btn block primary" data-a="amtAdd">Add</button>`);
    previewAmt();
  }
  function pendingMacros() {
    const { food, isRecipe, qty, qtyUnit } = pending;
    if (isRecipe) { const ps = recipePerServing(food); return { kcal: ps.kcal * qty, p: ps.p * qty, c: ps.c * qty, f: ps.f * qty }; }
    return macrosForFood(food, qty, qtyUnit);
  }
  function previewAmt() {
    const m = pendingMacros(), el = $('#amtPreview');
    if (el) el.innerHTML = `<div class="macro4"><div><b>${r0(m.kcal)}</b><span>kcal</span></div><div><b>${r1(m.p)}</b><span>protein</span></div><div><b>${r1(m.c)}</b><span>carbs</span></div><div><b>${r1(m.f)}</b><span>fat</span></div></div>`;
  }
  HOOKS.input.amt = (el) => { pending.qty = F.num(el.value) || 0; previewAmt(); };
  HOOKS.change.amtUnit = (el) => { pending.qtyUnit = el.value; pending.qty = el.value === 'serving' ? 1 : (pending.food.servingG || 100); $('#amtQty').value = r1(pending.qty); previewAmt(); };
  A.amtMeal = (el) => { add.ctx.meal = el.dataset.v; document.querySelectorAll('[data-a="amtMeal"]').forEach((b) => b.classList.toggle('on', b === el)); };
  A.backAdd = () => sheet();
  A.amtAdd = () => {
    const { food, isRecipe, qty, qtyUnit } = pending;
    if (!qty) { F.toast('Enter an amount'); return; }
    if (add.ctx.to === 'recipe') {
      const rec = S().recipes.find((r) => r.id === add.ctx.id);
      const saved = rememberFood(food);
      rec.items.push({ foodId: saved.id, name: saved.name, grams: gramsOf(saved, qty, qtyUnit), kcal: saved.kcal, p: saved.p, c: saved.c, f: saved.f });
      Store.touch(rec); F.save(); F.closeModal(); F.render(true); return;
    }
    const m = pendingMacros();
    let item;
    if (isRecipe) item = { kind: 'recipe', ref: food.id, name: food.name, qty, qtyUnit: 'serving', ...m };
    else { const saved = rememberFood(food); item = { kind: 'food', ref: saved.id, name: saved.name + (saved.brand ? ` (${saved.brand})` : ''), qty, qtyUnit, ...m }; }
    addItem(item);
    F.save(); F.closeModal(); F.toast(`Added to ${mealName(add.ctx.meal).toLowerCase()}`); F.render(true); afterLog();
  };
  function addItem(item) {
    const it = { ...item, kcal: r1(item.kcal), p: r1(item.p), c: r1(item.c), f: r1(item.f) };
    if (add.ctx.to === 'plan') S().mealPlan.push(Store.touch({ ...it, dow: add.ctx.dow, meal: add.ctx.meal }));
    else S().foodLog.push(Store.touch({ ...it, date: foodDate, meal: add.ctx.meal }));
  }
  // keep foods the user has used so they appear under "Mine" and work offline
  function rememberFood(food) {
    let f = S().foods.find((x) => x.id === food.id);
    if (!f) { f = { ...food }; S().foods.push(f); }
    f.lastUsed = Date.now(); Store.touch(f);
    return f;
  }
  HOOKS.submit.quickAdd = (form, fd) => {
    const kcal = F.num(fd.kcal);
    if (kcal == null) return;
    addItem({ kind: 'quick', name: (fd.name || '').trim() || 'Quick add', kcal, p: F.num(fd.p) || 0, c: F.num(fd.c) || 0, f: F.num(fd.f) || 0 });
    F.save(); F.closeModal(); F.toast('Added'); F.render(true); afterLog();
  };

  // edit / delete an entry
  A.editEntry = (el) => {
    const e = S().foodLog.find((x) => x.id === el.dataset.id) || S().mealPlan.find((x) => x.id === el.dataset.id);
    if (!e) return;
    const coll = S().foodLog.includes(e) ? 'foodLog' : 'mealPlan';
    F.showModal(`<h2>${esc(e.name)}</h2>
      ${e.kind === 'quick' ? `<p class="muted small">${r0(e.kcal)} kcal · P ${r0(e.p)} · C ${r0(e.c)} · F ${r0(e.f)}</p>` : `
      <div class="row gap nowrap amount"><input data-f="editQty" data-id="${e.id}" data-coll="${coll}" inputmode="decimal" value="${r1(e.qty)}"><span class="pill">${e.qtyUnit === 'serving' ? 'serving(s)' : 'grams'}</span></div>`}
      <div class="seg wide">${MEALS.map(([m, l]) => `<button class="${e.meal === m ? 'on' : ''}" data-a="entryMeal" data-id="${e.id}" data-coll="${coll}" data-v="${m}">${l}</button>`).join('')}</div>
      <div class="row gap"><button class="btn grow danger-ghost" data-a="delEntry" data-id="${e.id}" data-coll="${coll}">Delete</button><button class="btn grow primary" data-a="closeModal">Done</button></div>`);
  };
  HOOKS.change.editQty = (el) => {
    const e = S()[el.dataset.coll].find((x) => x.id === el.dataset.id), q = F.num(el.value);
    if (!q || !e.qty) return;
    const k = q / e.qty;
    Object.assign(e, { qty: q, kcal: r1(e.kcal * k), p: r1(e.p * k), c: r1(e.c * k), f: r1(e.f * k) });
    Store.touch(e); F.save(); F.render(true);
  };
  A.entryMeal = (el) => { const e = S()[el.dataset.coll].find((x) => x.id === el.dataset.id); e.meal = el.dataset.v; Store.touch(e); F.save(); F.closeModal(); F.render(true); };
  A.delEntry = (el) => { Store.remove(S(), el.dataset.coll, el.dataset.id); F.save(); F.closeModal(); F.render(true); };

  // ---------- custom foods ----------
  function foodForm(pre) {
    pre = pre || {};
    const v = (k) => (pre[k] != null ? esc(pre[k]) : '');
    F.showModal(`<h2>${pre.id ? 'Edit food' : 'Create a food'}</h2>
      <form id="foodForm" class="form">
        <input type="hidden" name="fid" value="${v('id')}"><input type="hidden" name="barcode" value="${v('barcode')}">
        <label>Name<input name="name" required value="${v('name')}" placeholder="e.g. Homemade granola"></label>
        <label>Brand (optional)<input name="brand" value="${v('brand')}"></label>
        <div class="label-sm">Nutrition per 100 g</div>
        <div class="grid2"><label>Calories (kcal)<input name="kcal" inputmode="decimal" required value="${v('kcal')}"></label><label>Protein (g)<input name="p" inputmode="decimal" value="${v('p')}"></label>
        <label>Carbs (g)<input name="c" inputmode="decimal" value="${v('c')}"></label><label>Fat (g)<input name="f" inputmode="decimal" value="${v('f')}"></label></div>
        <label>Serving size in grams (optional)<input name="servingG" inputmode="decimal" value="${v('servingG')}" placeholder="e.g. 45"></label>
        <p class="muted small">Only have values per serving? Enter the serving size, then multiply each value by 100 ÷ serving grams.</p>
        <div class="row gap"><button type="button" class="btn grow" data-a="closeModal">Cancel</button><button class="btn grow primary">Save</button></div>
      </form>`);
  }
  A.newFood = () => foodForm();
  HOOKS.submit.foodForm = (form, fd) => {
    const rec = fd.fid ? S().foods.find((f) => f.id === fd.fid) : { id: 'my-' + F.uid(), source: 'custom', custom: true };
    Object.assign(rec, { name: fd.name.trim(), brand: (fd.brand || '').trim(), kcal: F.num(fd.kcal) || 0, p: F.num(fd.p) || 0, c: F.num(fd.c) || 0, f: F.num(fd.f) || 0, lastUsed: Date.now() });
    if (fd.barcode) rec.barcode = fd.barcode;
    const sg = F.num(fd.servingG); if (sg) { rec.servingG = sg; rec.servingLabel = `${sg} g`; } else { delete rec.servingG; delete rec.servingLabel; }
    if (!fd.fid) S().foods.push(rec);
    Store.touch(rec); F.save();
    if (add.ctx) amountSheet(rec); else { F.closeModal(); F.render(true); }
  };

  // ---------- My foods / recipes / meals ----------
  VIEWS.myfoods = () => `
    <header class="top"><a class="icon-btn" href="#/food" aria-label="Back">${ICON.back}</a><h1>My foods</h1></header>
    <h2>Recipes</h2>
    <p class="muted small">Build a recipe from ingredients; it works out the calories and macros per serving.</p>
    ${S().recipes.map((r) => `<a class="card list-item" href="#/recipe/${r.id}"><div><b>${esc(r.name)}</b><div class="muted small">${r.items.length} ingredients · ${r.servings} servings · ${r0(recipePerServing(r).kcal)} kcal/serving</div></div><span class="chev">›</span></a>`).join('')}
    <button class="btn block" data-a="newRecipe">＋ New recipe</button>
    <h2>Saved meals</h2>
    ${S().meals.length ? S().meals.map((m) => `<div class="card row between"><div><b>${esc(m.name)}</b><div class="muted small">${m.items.map((i) => esc(i.name)).join(', ')}</div></div><button class="icon-btn" data-a="delSavedMeal" data-id="${m.id}" aria-label="Delete">${ICON.trash}</button></div>`).join('') : '<p class="muted small">Save any meal from your diary (⋯ next to the meal) to add it again in one tap.</p>'}
    <h2>Foods</h2>
    <button class="btn block" data-a="newFoodPage">＋ Create a food</button>
    ${S().foods.slice().sort((a, b) => a.name.localeCompare(b.name)).map((f) => `<div class="list-item plain"><button class="grow plainbtn" data-a="editFood" data-id="${esc(f.id)}"><div>${esc(f.name)}${f.brand ? ` <span class="muted small">${esc(f.brand)}</span>` : ''}</div><div class="muted small">${r0(f.kcal)} kcal/100 g${f.custom ? ' · yours' : ''}</div></button><button class="icon-btn" data-a="delFood" data-id="${esc(f.id)}" aria-label="Delete">${ICON.trash}</button></div>`).join('')}`;
  A.newFoodPage = () => { add.ctx = null; foodForm(); };
  A.editFood = (el) => { add.ctx = null; foodForm(S().foods.find((f) => f.id === el.dataset.id)); };
  A.delFood = (el) => { if (confirm('Remove this food from your list? Logged entries stay.')) { Store.remove(S(), 'foods', el.dataset.id); F.save(); F.render(true); } };
  A.delSavedMeal = (el) => { if (confirm('Delete this saved meal?')) { Store.remove(S(), 'meals', el.dataset.id); F.save(); F.render(true); } };
  A.newRecipe = () => { const r = Store.touch({ name: 'New recipe', servings: 4, items: [] }); S().recipes.push(r); F.save(); F.go('recipe/' + r.id); };

  VIEWS.recipe = (id) => {
    const r = S().recipes.find((x) => x.id === id);
    if (!r) return '<header class="top"><h1>Recipe not found</h1></header>';
    const t = recipeTotals(r), ps = recipePerServing(r);
    return `
      <header class="top"><a class="icon-btn" href="#/myfoods" aria-label="Back">${ICON.back}</a><input class="title-input grow" data-f="recName" data-id="${r.id}" value="${esc(r.name)}" aria-label="Recipe name"></header>
      <div class="card"><label class="toggle"><span>Servings</span><input class="short" data-f="recServ" data-id="${r.id}" inputmode="numeric" value="${r.servings}"></label>
        <div class="macro4"><div><b>${r0(ps.kcal)}</b><span>kcal/serving</span></div><div><b>${r1(ps.p)}</b><span>protein</span></div><div><b>${r1(ps.c)}</b><span>carbs</span></div><div><b>${r1(ps.f)}</b><span>fat</span></div></div>
        <p class="muted small center">Whole recipe: ${r0(t.kcal)} kcal · ${r0(t.grams)} g</p></div>
      <h2>Ingredients</h2>
      ${r.items.map((it, i) => `<div class="list-item plain"><div class="grow">${esc(it.name)}<div class="muted small">${r0(macrosForFood(it, it.grams, 'g').kcal)} kcal</div></div>
        <input class="short" data-f="recGrams" data-id="${r.id}" data-i="${i}" inputmode="decimal" value="${r0(it.grams)}" aria-label="grams"><span class="muted small">g</span>
        <button class="icon-btn" data-a="recDel" data-id="${r.id}" data-i="${i}" aria-label="Remove">${ICON.x}</button></div>`).join('') || '<p class="muted small">No ingredients yet.</p>'}
      <button class="btn block" data-a="recAdd" data-id="${r.id}">＋ Add ingredient</button>
      <button class="btn block danger-ghost" data-a="recDelete" data-id="${r.id}">Delete recipe</button>`;
  };
  const rec = (id) => S().recipes.find((x) => x.id === id);
  HOOKS.input.recName = (el) => { Store.touch(Object.assign(rec(el.dataset.id), { name: el.value })); F.save(); };
  HOOKS.change.recServ = (el) => { const n = parseInt(el.value, 10); if (n > 0) { Store.touch(Object.assign(rec(el.dataset.id), { servings: n })); F.save(); F.render(true); } };
  HOOKS.change.recGrams = (el) => { const r = rec(el.dataset.id), g = F.num(el.value); if (g != null) { r.items[+el.dataset.i].grams = g; Store.touch(r); F.save(); F.render(true); } };
  A.recDel = (el) => { const r = rec(el.dataset.id); r.items.splice(+el.dataset.i, 1); Store.touch(r); F.save(); F.render(true); };
  A.recAdd = (el) => openAdd({ to: 'recipe', id: el.dataset.id }, 'search');
  A.recDelete = (el) => { if (confirm('Delete this recipe?')) { Store.remove(S(), 'recipes', el.dataset.id); F.save(); F.go('myfoods'); } };

  // ---------- targets ----------
  VIEWS.targets = () => {
    const n = S().nutrition, pr = n.profile, kg = latestWeight() || n.profile.weightKg || 75;
    const calc = calcTargets(pr, kg), t = n.targets;
    const opt = (arr, v) => arr.map(([val, l]) => `<option value="${val}" ${+v === +val ? 'selected' : ''}>${l}</option>`).join('');
    const pf = (k, label, val, extra = '') => `<label class="toggle"><span>${label}</span><input class="short" data-f="prof" data-k="${k}" inputmode="decimal" value="${val}" ${extra}></label>`;
    return `
      <header class="top"><a class="icon-btn" href="#/food" aria-label="Back">${ICON.back}</a><h1>Targets</h1></header>
      <div class="card">
        <h3>About you</h3>
        <label class="toggle"><span>Sex (for the BMR formula)</span><select data-f="prof" data-k="sex"><option value="male" ${pr.sex === 'male' ? 'selected' : ''}>Male</option><option value="female" ${pr.sex === 'female' ? 'selected' : ''}>Female</option></select></label>
        ${pf('age', 'Age', pr.age)}
        <div class="toggle col"><div class="row between"><span>Height</span>${F.unitSeg('heightUnit', F.htUnit(), [['cm', 'cm'], ['ftin', 'ft & in']])}</div>
          <div class="unitin" data-f="profHeight">${F.heightInputs('h', pr.heightCm)}</div></div>
        <div class="toggle col"><div class="row between"><span>Weight</span>${F.unitSeg('bodyUnit', F.bwUnit(), [['kg', 'kg'], ['lb', 'lb'], ['st', 'st & lb']])}</div>
          ${latestWeight() ? `<div class="row between"><b>${F.fmtBW(kg)}</b><a class="link small" href="#/body">from your weigh-ins · update</a></div>` : `<div class="unitin" data-f="profWeight">${F.bwInputs('w', kg)}</div>`}</div>
        <label class="toggle col"><span>Activity</span><select data-f="prof" data-k="activity">${opt(ACTIVITY, pr.activity)}</select></label>
        <label class="toggle col"><span>Goal</span><select data-f="prof" data-k="goal">${opt(GOALS, pr.goal)}</select></label>
        ${pf('proteinPerKg', 'Protein (g per kg bodyweight)', pr.proteinPerKg)}
        ${pf('trainingBonus', 'Extra kcal on training days', pr.trainingBonus)}
      </div>
      <div class="card"><div id="calcCard">${calcCard(calc)}</div><button class="btn block primary" data-a="useCalc">Use these targets</button></div>
      <div class="card">
        <h3>Your targets</h3>
        ${t ? '' : '<p class="muted small">Not set yet. Use the calculated targets above, or type your own.</p>'}
        ${[['kcal', 'Calories (kcal)'], ['p', 'Protein (g)'], ['c', 'Carbs (g)'], ['f', 'Fat (g)']].map(([k, l]) => `<label class="toggle"><span>${l}</span><input class="short" data-f="tgt" data-k="${k}" inputmode="numeric" value="${t ? t[k] : ''}"></label>`).join('')}
        <label class="toggle"><span>Water (L)</span><input class="short" data-f="waterT" inputmode="decimal" value="${(n.waterMl / 1000).toFixed(1)}"></label>
      </div>
      <p class="muted small">Calculated with the Mifflin-St Jeor formula. After two to three weeks of logging food and weighing in, the Food tab shows a weekly check-in with your real maintenance calories.</p>`;
  };
  const calcCard = (calc) => `
        <div class="row between"><span class="muted small">BMR ${calc.bmr.toLocaleString()} · maintenance ≈ ${calc.tdee.toLocaleString()} kcal</span></div>
        <div class="macro4"><div><b>${calc.kcal.toLocaleString()}</b><span>kcal</span></div><div><b>${calc.p}</b><span>protein g</span></div><div><b>${calc.c}</b><span>carbs g</span></div><div><b>${calc.f}</b><span>fat g</span></div></div>`;
  // refresh only the calculated numbers, so typing in the next box isn't interrupted
  const refreshCalc = () => { const el = document.getElementById('calcCard'); const n = S().nutrition; if (el) el.innerHTML = calcCard(calcTargets(n.profile, latestWeight() || n.profile.weightKg || 75)); };
  HOOKS.change.prof = (el) => {
    const pr = S().nutrition.profile, k = el.dataset.k;
    if (k === 'sex') pr.sex = el.value;
    else { const n = F.num(el.value); if (n != null) pr[k] = n; }
    F.save(); refreshCalc();
  };
  // height / weight boxes: read every box in the group whenever one changes
  document.addEventListener('change', (ev) => {
    const box = ev.target.closest && ev.target.closest('[data-f="profHeight"], [data-f="profWeight"]');
    if (!box) return;
    const pr = S().nutrition.profile, get = F.fieldsIn(box);
    if (box.dataset.f === 'profHeight') { const cm = F.parseHeight(get, 'h'); if (cm && cm > 90 && cm < 250) pr.heightCm = Math.round(cm * 10) / 10; }
    else { const kg = F.parseBW(get, 'w'); if (kg && kg > 25 && kg < 350) pr.weightKg = kg; }
    F.save(); refreshCalc();
  });
  A.useCalc = () => {
    const n = S().nutrition, c = calcTargets(n.profile, latestWeight() || n.profile.weightKg || 75);
    n.targets = { kcal: c.kcal, p: c.p, c: c.c, f: c.f }; F.save(); F.toast('Targets set'); F.render(true);
  };
  HOOKS.change.tgt = (el) => {
    const n = S().nutrition, v = F.num(el.value);
    n.targets = n.targets || { kcal: 2000, p: 150, c: 200, f: 65 };
    if (v != null) n.targets[el.dataset.k] = Math.round(v);
    F.save();
  };
  HOOKS.change.waterT = (el) => { const v = F.num(el.value); if (v) { S().nutrition.waterMl = Math.round(v * 1000); F.save(); } };

  // ---------- meal plan ----------
  const PLAN_ORDER = [1, 2, 3, 4, 5, 6, 0];
  VIEWS.mealplan = () => {
    const items = S().mealPlan.filter((p) => p.dow === planDow), tot = sum(items);
    return `
      <header class="top"><a class="icon-btn" href="#/food" aria-label="Back">${ICON.back}</a><h1>Meal plan</h1><a class="btn small" href="#/shopping">Shopping list</a></header>
      <div class="chips">${PLAN_ORDER.map((d) => `<button class="chip ${planDow === d ? 'on' : ''}" data-a="planDow" data-v="${d}">${F.DOW[d]}${S().mealPlan.some((p) => p.dow === d) ? ' •' : ''}</button>`).join('')}</div>
      <div class="card"><div class="macro4"><div><b>${r0(tot.kcal).toLocaleString()}</b><span>kcal</span></div><div><b>${r0(tot.p)}</b><span>protein</span></div><div><b>${r0(tot.c)}</b><span>carbs</span></div><div><b>${r0(tot.f)}</b><span>fat</span></div></div></div>
      ${MEALS.map(([m, label]) => {
        const es = items.filter((e) => e.meal === m);
        return `<div class="card meal"><div class="row between"><h3>${label}</h3><span class="muted small">${r0(sum(es).kcal)} kcal</span></div>
          ${es.map((e) => `<div class="fentry"><button class="grow plainbtn" data-a="editEntry" data-id="${e.id}"><div>${esc(e.name)}</div><div class="muted small">${esc(fmtQty(e))}</div></button><span class="kc">${r0(e.kcal)}</span></div>`).join('')}
          <button class="btn small addfood" data-a="planAdd" data-m="${m}">＋ Add</button></div>`;
      }).join('')}
      <button class="btn block" data-a="planCopyDay" ${items.length ? '' : 'disabled'}>Copy ${F.DOW[planDow]} to every day</button>
      <p class="muted small">On the Food tab, each day's plan shows a “Log all” button until you log something.</p>`;
  };
  A.planDow = (el) => { planDow = +el.dataset.v; F.render(true); };
  A.planAdd = (el) => openAdd({ to: 'plan', dow: planDow, meal: el.dataset.m });
  A.planCopyDay = () => {
    if (!confirm(`Replace every other day's plan with ${F.DOW[planDow]}'s?`)) return;
    const src = S().mealPlan.filter((p) => p.dow === planDow);
    S().mealPlan.filter((p) => p.dow !== planDow).forEach((p) => Store.remove(S(), 'mealPlan', p.id));
    PLAN_ORDER.filter((d) => d !== planDow).forEach((d) => src.forEach(({ id, updatedAt, ...rest }) => S().mealPlan.push(Store.touch({ ...rest, dow: d }))));
    F.save(); F.toast('Copied to the whole week'); F.render(true);
  };

  // ---------- shopping list ----------
  function shoppingItems() {
    const out = {};
    const addG = (name, grams, key) => { const k = key || name.toLowerCase(); out[k] = out[k] || { name, grams: 0, count: 0 }; out[k].grams += grams; };
    S().mealPlan.forEach((p) => {
      if (p.kind === 'food') {
        const f = S().foods.find((x) => x.id === p.ref);
        if (!f) return;
        if (p.qtyUnit === 'serving' && !f.servingG) { const k = f.id; out[k] = out[k] || { name: f.name, grams: 0, count: 0 }; out[k].count += p.qty; }
        else addG(f.name, gramsOf(f, p.qty, p.qtyUnit), f.id);
      } else if (p.kind === 'recipe') {
        const r = S().recipes.find((x) => x.id === p.ref);
        if (!r) return;
        r.items.forEach((it) => addG(it.name, (it.grams * p.qty) / (r.servings || 1), it.foodId));
      }
    });
    return Object.entries(out).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => a.name.localeCompare(b.name));
  }
  const fmtGrams = (g) => (g >= 1000 ? `${r1(g / 1000)} kg` : `${r0(g)} g`);
  VIEWS.shopping = () => {
    const sh = S().shopping, items = shoppingItems();
    const row = (key, label, sub) => `<label class="shop ${sh.checked[key] ? 'got' : ''}"><input type="checkbox" data-f="shopTick" data-k="${esc(key)}" ${sh.checked[key] ? 'checked' : ''}><span class="grow">${esc(label)}</span><span class="muted small">${sub}</span></label>`;
    return `
      <header class="top"><a class="icon-btn" href="#/mealplan" aria-label="Back">${ICON.back}</a><h1>Shopping list</h1></header>
      <p class="muted small">Everything in your weekly meal plan, with recipes split into their ingredients.</p>
      <div class="card">${items.length ? items.map((it) => row(it.key, it.name, [it.grams ? fmtGrams(it.grams) : '', it.count ? `${r1(it.count)} serving${it.count === 1 ? '' : 's'}` : ''].filter(Boolean).join(' + '))).join('') : '<p class="muted small">Your meal plan is empty. Add meals on the Meal plan page.</p>'}</div>
      <h2>Extras</h2>
      <div class="card">${sh.extra.map((x) => row('x:' + x, x, '')).join('')}
        <form id="shopExtra" class="row gap nowrap"><input class="grow" name="item" placeholder="Add an item, e.g. washing-up liquid"><button class="btn">Add</button></form></div>
      <button class="btn block" data-a="shopClear">Clear ticked items</button>`;
  };
  HOOKS.change.shopTick = (el) => { const sh = S().shopping; if (el.checked) sh.checked[el.dataset.k] = true; else delete sh.checked[el.dataset.k]; F.save(); el.closest('.shop').classList.toggle('got', el.checked); };
  HOOKS.submit.shopExtra = (form, fd) => { const v = (fd.item || '').trim(); if (v) { S().shopping.extra.push(v); F.save(); F.render(true); } };
  A.shopClear = () => { const sh = S().shopping; sh.extra = sh.extra.filter((x) => !sh.checked['x:' + x]); sh.checked = {}; F.save(); F.render(true); };

  // achievements and streaks look at the diary after anything is logged
  function afterLog() { HOOKS.afterSave.forEach((f) => f('food')); }
})();
