/* Pure helpers: formatting, unit conversion and the next-session suggestion engine.
 * Weights are stored in kg internally. Distances are stored in the exercise's own unit (km or m). */
(function (root) {
  const MAX_SETS = 5;
  const LB = 2.20462;

  const round = (v, step) => Math.round(v / step) * step;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v);

  // ---------- units ----------
  const toDisp = (kg, unit) => (kg == null ? null : unit === 'lb' ? round(kg * LB, 0.5) : round(kg, 0.25));
  const fromDisp = (v, unit) => (v == null ? null : unit === 'lb' ? v / LB : v);
  const fmtW = (kg, unit) => {
    if (kg == null) return '';
    const v = toDisp(kg, unit);
    return `${+v.toFixed(2)}`;
  };

  // ---------- time ----------
  function parseTime(str) {
    if (str == null || str === '') return null;
    if (typeof str === 'number') return str;
    str = String(str).trim();
    let parts;
    if (/[:.,]/.test(str)) parts = str.split(/[:.,]/);
    else if (/^\d{3,6}$/.test(str)) parts = splitDigits(str);
    else parts = [str];
    parts = parts.map((p) => parseFloat(p));
    if (parts.some(isNaN)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  // "130" -> 1:30, "2500" -> 25:00, "12530" -> 1:25:30 (handy on numeric keypads with no ':')
  function splitDigits(d) {
    const out = [];
    while (d.length > 2) { out.unshift(d.slice(-2)); d = d.slice(0, -2); }
    out.unshift(d);
    return out;
  }
  function fmtTime(sec, forceH) {
    if (sec == null || isNaN(sec)) return '';
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const ss = String(s).padStart(2, '0');
    if (h || forceH) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
    return `${m}:${ss}`;
  }

  // ---------- pace ----------
  // returns a human string for a distance (in ex.dist units) and time (s)
  function pace(ex, distance, time) {
    if (!distance || !time) return '';
    const meters = ex.dist === 'km' ? distance * 1000 : distance;
    switch (ex.pace) {
      case 'speed': return `${(meters / 1000 / (time / 3600)).toFixed(1)} km/h`;
      case 'split': return `${fmtTime(time / (meters / 500))} /500m`;
      case 'swim': return `${fmtTime(time / (meters / 100))} /100m`;
      default: return `${fmtTime(time / (meters / 1000))} /km`;
    }
  }

  const e1rm = (w, r) => (w && r ? (r === 1 ? w : w * (1 + r / 30)) : 0);

  // ---------- increments (in display unit) ----------
  const LOWER = ['Quads', 'Hamstrings', 'Glutes', 'Calves'];
  function increment(ex, unit) {
    const lb = unit === 'lb';
    const lower = LOWER.includes(ex.category) || /deadlift|rack pull|hip thrust/i.test(ex.name);
    switch (ex.equipment) {
      case 'Barbell': case 'Trap Bar': case 'Smith Machine':
        if (ex.category === 'Olympic') return lb ? 5 : 2.5;
        return lower ? (lb ? 10 : 5) : (lb ? 5 : 2.5);
      case 'Dumbbell': return lb ? 5 : 2;
      case 'Kettlebell': return lb ? 10 : 4;
      case 'Machine': case 'Cable': return lower ? (lb ? 10 : 5) : (lb ? 5 : 2.5);
      case 'Sled': return lb ? 20 : 10;
      case 'Sandbag': return lb ? 10 : 5;
      case 'Medicine Ball': return lb ? 2 : 1;
      case 'Band': return 0;
      default: return lb ? 5 : 2.5;
    }
  }

  // Standard rep brackets used when the plan has no rep range
  function bracket(reps) {
    if (reps <= 5) return [3, 5];
    if (reps <= 8) return [6, 8];
    if (reps <= 12) return [8, 12];
    if (reps <= 15) return [12, 15];
    if (reps <= 20) return [15, 20];
    return [reps, reps + 5];
  }

  const SET_FIELDS = {
    strength: ['weight', 'reps'],
    bodyweight: ['reps', 'weight'],
    timed: ['time', 'weight'],
    cardio: ['distance', 'time'],
    carry: ['distance', 'weight', 'time'],
    reps_time: ['reps', 'weight', 'time'],
  };

  /**
   * Suggest the next session for an exercise.
   * @param ex       exercise definition
   * @param history  previous performances, newest first: [{date, sets:[{weight,reps,time,distance}]}] (completed sets only)
   * @param cfg      plan config {sets, repMin, repMax, weight, time, distance}
   * @param unit     'kg' | 'lb'
   * @returns {sets:[...], reason:string, kind:'first'|'up'|'reps'|'repeat'|'deload'|'faster'|'longer'|'hold'}
   */
  function suggest(ex, history, cfg, unit) {
    cfg = cfg || {};
    history = (history || []).filter((h) => h.sets && h.sets.length);
    const last = history[0];
    const prev = history[1];
    const n = clamp(cfg.sets || (last && last.sets.length) || 3, 1, MAX_SETS);
    const fill = (fn) => Array.from({ length: n }, (_, i) => fn(i));
    const lastSet = (i) => (last ? last.sets[Math.min(i, last.sets.length - 1)] : {});
    const inc = increment(ex, unit);
    const addW = (kg, d) => {
      if (kg == null && !d) return kg;
      const v = Math.max(0, round((toDisp(kg || 0, unit) || 0) + d, unit === 'lb' ? 1 : 0.5));
      return fromDisp(v, unit);
    };

    // ---------- reps-based (strength, bodyweight) ----------
    if (ex.type === 'strength' || ex.type === 'bodyweight') {
      if (!last) {
        const reps = cfg.repMin || cfg.repMax || 10;
        const hi = cfg.repMax || reps;
        return {
          kind: 'first',
          sets: fill(() => ({ weight: cfg.weight != null ? cfg.weight : null, reps })),
          reason: ex.type === 'strength'
            ? `First time: pick a weight you could lift for about ${hi + 2} reps, so you finish each set with 1–2 reps left.`
            : 'First time: do quality reps and stop 1–2 reps before failure.',
        };
      }
      const sets = last.sets.filter((s) => num(s.reps) != null);
      const minReps = Math.min(...sets.map((s) => +s.reps));
      const [bMin, bMax] = bracket(minReps);
      const repMin = cfg.repMin || bMin;
      const repMax = Math.max(cfg.repMax || bMax, repMin);
      const topW = Math.max(0, ...sets.map((s) => +s.weight || 0));
      const top = sets.filter((s) => (+s.weight || 0) === topW);
      const allTop = top.length > 0 && top.every((s) => +s.reps >= repMax);
      const allMin = sets.every((s) => +s.reps >= repMin);
      if (sets.length < n && allMin) {
        return {
          kind: 'repeat',
          sets: fill((i) => ({ weight: lastSet(i).weight != null ? +lastSet(i).weight : null, reps: Math.max(repMin, +lastSet(i).reps || repMin) })),
          reason: `You did ${sets.length} of ${n} sets last time. Same weight; get all ${n} sets in before adding load.`,
        };
      }
      const missed = (h) => h && h.sets.some((s) => num(s.reps) != null && +s.reps < repMin);
      const prevTop = prev ? Math.max(0, ...prev.sets.map((s) => +s.weight || 0)) : 0;

      // effort (RPE) on the top sets, if logged
      const rpes = top.map((s) => +s.rpe).filter((r) => r > 0);
      const rpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
      if (allTop && inc > 0 && rpe != null && rpe >= 9.5) {
        return {
          kind: 'hold',
          sets: fill((i) => ({ weight: lastSet(i).weight != null ? +lastSet(i).weight : null, reps: +lastSet(i).reps || repMax })),
          reason: `You hit the reps but they were near-max (RPE ${+rpe.toFixed(1)}). Repeat this weight until it feels like RPE 9 or less, then add weight.`,
        };
      }
      if (allTop && inc > 0) {
        const bw = ex.type === 'bodyweight';
        const jump = rpe != null && rpe <= 7 ? inc * 2 : inc;
        const hasRange = cfg.repMin != null || cfg.repMax != null;
        // with a plan rep range, drop back to the bottom of it; without one, keep the same reps (linear progression)
        const upReps = (i) => (hasRange ? repMin : +lastSet(i).reps || repMin);
        return {
          kind: 'up',
          sets: fill((i) => ({ weight: addW(+lastSet(i).weight || 0, jump), reps: upReps(i) })),
          reason: jump > inc ? `That felt easy (RPE ${+rpe.toFixed(1)}). Take a bigger jump: add ${jump} ${unit}${hasRange ? ` and start at ${repMin} reps` : ''}.` : bw
            ? `You hit ${repMax}+ reps on every set. Add ${jump} ${unit} (vest/belt) or move to a harder variation${hasRange ? `, and start back at ${repMin} reps` : ''}.`
            : hasRange ? `You hit ${repMax}+ reps on every set. Add ${inc} ${unit} and build back up from ${repMin} reps.`
              : `You hit all your reps. Add ${inc} ${unit} and repeat the same reps.`,
        };
      }
      if (allTop) {
        return {
          kind: 'reps',
          sets: fill((i) => ({ weight: lastSet(i).weight != null ? +lastSet(i).weight : null, reps: (+lastSet(i).reps || repMax) + 1 })),
          reason: 'Top of the range on every set. Go for one more rep per set, or add a set.',
        };
      }
      if (allMin) {
        return {
          kind: 'reps',
          sets: fill((i) => ({ weight: lastSet(i).weight != null ? +lastSet(i).weight : null, reps: Math.min(repMax, (+lastSet(i).reps || repMin) + 1) })),
          reason: `Same weight. Aim for +1 rep per set until you hit ${repMax} on every set, then add weight.`,
        };
      }
      if (missed(last) && missed(prev) && prevTop >= topW && topW > 0) {
        const d = -Math.max(inc, round((toDisp(topW, unit) || 0) * 0.1, inc || 0.5));
        return {
          kind: 'deload',
          sets: fill((i) => ({ weight: addW(+lastSet(i).weight || 0, d), reps: repMin })),
          reason: `Missed ${repMin} reps two sessions in a row. Drop about 10% and build back up; you'll pass this weight within a few weeks.`,
        };
      }
      return {
        kind: 'repeat',
        sets: fill((i) => ({ weight: lastSet(i).weight != null ? +lastSet(i).weight : null, reps: repMin })),
        reason: `Keep the same weight and get ${repMin} reps on every set before adding weight.`,
      };
    }

    // ---------- timed holds ----------
    if (ex.type === 'timed') {
      if (!last) {
        return { kind: 'first', sets: fill(() => ({ time: cfg.time || 30, weight: cfg.weight != null ? cfg.weight : null })),
          reason: 'First time: pick a duration you can finish with good form.' };
      }
      const target = cfg.time || Math.max(...last.sets.map((s) => +s.time || 0));
      const hit = last.sets.every((s) => (+s.time || 0) >= target);
      if (hit) {
        return {
          kind: 'up',
          sets: fill((i) => {
            const t = +lastSet(i).time || target;
            return { time: t + (t >= 120 ? Math.max(10, round(t * 0.08, 5)) : 5), weight: lastSet(i).weight != null ? +lastSet(i).weight : null };
          }),
          reason: 'You completed every set. Add a few seconds per set.',
        };
      }
      return { kind: 'repeat', sets: fill(() => ({ time: target, weight: lastSet(0).weight != null ? +lastSet(0).weight : null })),
        reason: `Repeat ${fmtTime(target)} until you can hold it for every set.` };
    }

    // ---------- cardio (distance + time) ----------
    if (ex.type === 'cardio') {
      const dStep = ex.dist === 'km' ? 0.1 : 10;
      if (!last) {
        return { kind: 'first', sets: fill(() => ({ distance: cfg.distance || null, time: cfg.time || null })),
          reason: 'First time: settle into a pace you can hold and record distance and time. Next session gets a pace target.' };
      }
      const fixed = !!cfg.distance;
      const ls0 = last.sets[0] || {};
      const shortOf = fixed && last.sets.some((s) => (+s.distance || 0) < cfg.distance);
      const prevD = prev ? prev.sets.reduce((a, s) => a + (+s.distance || 0), 0) : null;
      const lastD = last.sets.reduce((a, s) => a + (+s.distance || 0), 0);
      const justWentLonger = prevD != null && lastD > prevD * 1.02;

      if (fixed || justWentLonger || shortOf) {
        return {
          kind: shortOf ? 'repeat' : 'faster',
          sets: fill((i) => {
            const s = lastSet(i);
            const d = fixed ? cfg.distance : +s.distance || null;
            const t = +s.time ? Math.round(+s.time * (shortOf ? 1 : 0.98) * (d && +s.distance ? d / +s.distance : 1)) : null;
            return { distance: d, time: t };
          }),
          reason: shortOf
            ? 'Finish the full distance on every rep first, at the same pace as last time.'
            : `Same distance, about 2% faster${+ls0.time && +ls0.distance ? ` (aim ${pace(ex, +ls0.distance, +ls0.time * 0.98)})` : ''}.`,
        };
      }
      return {
        kind: 'longer',
        sets: fill((i) => {
          const s = lastSet(i);
          const d = +s.distance ? round(+s.distance * 1.05, dStep) : null;
          const t = d && +s.time ? Math.round((+s.time / +s.distance) * d) : null;
          return { distance: d ? +d.toFixed(2) : null, time: t };
        }),
        reason: 'Go about 5% further at the same pace. Next time, hold the distance and push the pace.',
      };
    }

    // ---------- carries / sleds ----------
    if (ex.type === 'carry') {
      if (!last) {
        return { kind: 'first', sets: fill(() => ({ distance: cfg.distance || null, weight: cfg.weight != null ? cfg.weight : null, time: null })),
          reason: 'First time: choose a load you can move the full distance without stopping.' };
      }
      const prevTopW = prev ? Math.max(0, ...prev.sets.map((s) => +s.weight || 0)) : null;
      const topW = Math.max(0, ...last.sets.map((s) => +s.weight || 0));
      const done = last.sets.every((s) => !cfg.distance || (+s.distance || 0) >= cfg.distance);
      if (!done) {
        return { kind: 'repeat', sets: fill((i) => ({ ...lastSet(i), distance: cfg.distance })),
          reason: 'Cover the full distance on every set before adding load.' };
      }
      if (prevTopW != null && topW > prevTopW && last.sets.some((s) => +s.time)) {
        return { kind: 'faster', sets: fill((i) => ({ ...lastSet(i), time: +lastSet(i).time ? Math.round(+lastSet(i).time * 0.97) : null })),
          reason: 'New load last time. Keep it and move about 3% faster.' };
      }
      return { kind: 'up', sets: fill((i) => ({ ...lastSet(i), distance: cfg.distance || lastSet(i).distance, weight: addW(+lastSet(i).weight || 0, inc) })),
        reason: `You covered the full distance on every set. Add ${inc} ${unit}.` };
    }

    // ---------- reps for time ----------
    if (ex.type === 'reps_time') {
      if (!last) {
        return { kind: 'first', sets: fill(() => ({ reps: cfg.repMin || cfg.repMax || 50, weight: cfg.weight != null ? cfg.weight : null, time: null })),
          reason: 'First time: set a benchmark time.' };
      }
      return { kind: 'faster', sets: fill((i) => {
        const s = lastSet(i);
        return { reps: s.reps, weight: s.weight, time: +s.time ? Math.round(+s.time * 0.97) : null };
      }), reason: 'Same reps and load, about 3% faster. Try bigger unbroken sets.' };
    }

    return { kind: 'repeat', sets: fill((i) => ({ ...lastSet(i) })), reason: '' };
  }

  // Deload week: about 10% lighter and one set fewer (cardio: 20% shorter / easier)
  function deload(ex, sg, unit) {
    const sets = sg.sets.slice(0, Math.max(1, sg.sets.length - 1)).map((s) => {
      const o = { ...s };
      if (o.weight) o.weight = fromDisp(round((toDisp(o.weight, unit) || 0) * 0.9, unit === 'lb' ? 5 : 2.5), unit);
      if (ex.type === 'cardio' && o.distance) { o.distance = +(o.distance * 0.8).toFixed(2); if (o.time) o.time = Math.round(o.time * 0.8 * 1.03); }
      if (ex.type === 'timed' && o.time) o.time = Math.round(o.time * 0.8);
      return o;
    });
    return { kind: 'deload', sets, reason: 'Deload week: lighter and one set fewer so you recover. Normal progression resumes next week.' };
  }

  // Warm-up ramp towards a working weight (kg). Returns sets in kg.
  function warmups(ex, workKg, unit, barKg) {
    const step = unit === 'lb' ? 5 : 2.5;
    const W = toDisp(workKg, unit), bar = ex.equipment === 'Barbell' || ex.equipment === 'Smith Machine' || ex.equipment === 'Trap Bar' ? toDisp(barKg, unit) : 0;
    const ramp = [[0, 10], [0.5, 5], [0.7, 3], [0.85, 1]];
    const out = [];
    for (const [pct, reps] of ramp) {
      let w = pct === 0 ? bar : Math.max(bar, round(W * pct, step));
      if (pct === 0 && (!bar || W < bar * 1.6)) continue;
      if (w >= W || (out.length && toDisp(out[out.length - 1].weight, unit) >= w)) continue;
      if (W - w < step) continue;
      out.push({ weight: fromDisp(w, unit), reps });
    }
    return out;
  }

  // Plates per side for a total weight (kg in, plates in display unit)
  function plates(totalKg, barKg, unit) {
    if (totalKg == null || isNaN(totalKg)) return null;
    const total = toDisp(totalKg, unit), bar = toDisp(barKg, unit);
    if (total < bar) return { under: true };
    const set = unit === 'lb' ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
    let side = (total - bar) / 2;
    const perSide = [];
    for (const p of set) while (side >= p - 1e-6) { perSide.push(p); side -= p; }
    return { perSide, left: side * 2 };
  }

  const Core = { deload, warmups, plates, MAX_SETS, SET_FIELDS, toDisp, fromDisp, fmtW, parseTime, fmtTime, pace, e1rm, increment, bracket, suggest, num };
  root.Core = Core;
  if (typeof module !== 'undefined') module.exports = Core;
})(typeof window !== 'undefined' ? window : globalThis);
