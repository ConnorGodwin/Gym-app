// Unit tests for the pure maths in js/progression.js (no browser needed).
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../js/progression.js');

const bench = { name: 'Barbell Bench Press', category: 'Chest', equipment: 'Barbell', type: 'strength' };
const squat = { name: 'Back Squat', category: 'Quads', equipment: 'Barbell', type: 'strength' };
const run = { name: 'Easy Run', type: 'cardio', dist: 'km', pace: 'run' };
const sets = (w, ...reps) => ({ sets: reps.map((r) => ({ weight: w, reps: r })) });
const range = { sets: 3, repMin: 8, repMax: 12 };

test('first session asks for a sensible starting weight', () => {
  const o = C.suggest(bench, [], range, 'kg');
  assert.equal(o.kind, 'first');
  assert.equal(o.sets.length, 3);
});

test('top of the rep range on every set adds weight and resets reps', () => {
  const o = C.suggest(bench, [sets(60, 12, 12, 12)], range, 'kg');
  assert.equal(o.kind, 'up');
  assert.equal(o.sets[0].weight, 62.5);
  assert.equal(o.sets[0].reps, 8);
});

test('lower-body barbell lifts jump 5 kg', () => {
  const o = C.suggest(squat, [sets(100, 8, 8, 8)], { sets: 3, repMin: 6, repMax: 8 }, 'kg');
  assert.equal(o.sets[0].weight, 105);
});

test('inside the range: same weight, one more rep', () => {
  const o = C.suggest(bench, [sets(60, 10, 9, 9)], range, 'kg');
  assert.equal(o.kind, 'reps');
  assert.deepEqual(o.sets.map((s) => s.reps), [11, 10, 10]);
  assert.equal(o.sets[0].weight, 60);
});

test('missing the bottom twice in a row deloads about 10%', () => {
  const o = C.suggest(squat, [sets(100, 6, 5, 4), sets(100, 6, 5, 5)], { sets: 3, repMin: 6, repMax: 8 }, 'kg');
  assert.equal(o.kind, 'deload');
  assert.equal(o.sets[0].weight, 90);
});

test('no rep range: linear progression keeps the same reps', () => {
  const o = C.suggest(bench, [sets(80, 5, 5, 5)], {}, 'kg');
  assert.equal(o.kind, 'up');
  assert.deepEqual(o.sets.map((s) => [s.weight, s.reps]), [[82.5, 5], [82.5, 5], [82.5, 5]]);
});

test('RPE: near-max sets hold the weight, easy sets jump double', () => {
  const h = (rpe) => [{ sets: [12, 12, 12].map((r) => ({ weight: 60, reps: r, rpe })) }];
  assert.equal(C.suggest(bench, h(10), range, 'kg').kind, 'hold');
  assert.equal(C.suggest(bench, h(8), range, 'kg').sets[0].weight, 62.5);
  assert.equal(C.suggest(bench, h(6.5), range, 'kg').sets[0].weight, 65);
});

test('cardio: go 5% longer, or ~2% faster over a fixed distance', () => {
  const longer = C.suggest(run, [{ sets: [{ distance: 5, time: 1500 }] }], {}, 'kg');
  assert.equal(longer.kind, 'longer');
  assert.equal(longer.sets[0].distance, 5.3);
  const faster = C.suggest(run, [{ sets: [{ distance: 5, time: 1500 }] }], { distance: 5 }, 'kg');
  assert.equal(faster.kind, 'faster');
  assert.equal(faster.sets[0].time, 1470);
});

test('deload removes a set and lightens the load', () => {
  const sg = C.suggest(bench, [sets(60, 12, 12, 12)], range, 'kg');
  const d = C.deload(bench, sg, 'kg');
  assert.equal(d.sets.length, 2);
  assert.ok(d.sets[0].weight < sg.sets[0].weight);
});

test('warm-up ramp and plate maths', () => {
  assert.deepEqual(C.warmups(bench, 100, 'kg', 20).map((s) => s.weight), [20, 50, 70, 85]);
  assert.deepEqual(C.plates(102.5, 20, 'kg').perSide, [25, 15, 1.25]);
  assert.deepEqual(C.plates(C.fromDisp(225, 'lb'), C.fromDisp(45, 'lb'), 'lb').perSide, [45, 45]);
  assert.ok(C.plates(10, 20, 'kg').under);
});

test('time parsing accepts phone-keypad formats', () => {
  assert.equal(C.parseTime('130'), 90);
  assert.equal(C.parseTime('25:00'), 1500);
  assert.equal(C.parseTime('2500'), 1500);
  assert.equal(C.parseTime('45'), 45);
  assert.equal(C.parseTime('1.30'), 90);
  assert.equal(C.fmtTime(3725), '1:02:05');
  assert.equal(C.pace(run, 5, 1500), '5:00 /km');
});
