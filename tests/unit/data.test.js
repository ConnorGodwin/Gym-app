// Checks the bundled data: exercise library, plan templates, how-to cues and demos all fit together.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.window = {};
const root = path.join(__dirname, '..', '..');
['exercises', 'templates', 'howto', 'demos'].forEach((f) => require(path.join(root, 'js', f + '.js')));
const { EXERCISES, PLAN_TEMPLATES, HOWTO, DEMOS } = global.window;
const ex = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

test('exercise ids are unique', () => {
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
});

test('every template references real exercises with valid settings', () => {
  for (const t of PLAN_TEMPLATES) {
    assert.ok(t.group, `${t.name} has a group`);
    for (const d of t.days) for (const c of d.exercises) {
      const e = ex[c.ex];
      assert.ok(e, `${t.name}: unknown exercise ${c.ex}`);
      assert.ok(c.sets >= 1 && c.sets <= 5, `${t.name}: ${c.ex} has 1–5 sets`);
      if (e.type === 'timed') assert.ok(c.time > 0, `${t.name}: ${c.ex} needs a time`);
    }
  }
});

test('how-to cues and demos point at real exercises and files', () => {
  for (const id of Object.keys(HOWTO)) assert.ok(ex[id], `cue for unknown exercise ${id}`);
  for (const [id, d] of Object.entries(DEMOS)) {
    assert.ok(ex[id], `demo for unknown exercise ${id}`);
    (d.i || []).forEach((i) => assert.ok(fs.existsSync(path.join(root, 'images/exercises', `${i}.webp`)), `missing image ${i}`));
    if (d.v) assert.ok(fs.existsSync(path.join(root, 'videos/exercises', `${d.v}.mp4`)), `missing video ${d.v}`);
    assert.ok(d.c, `demo ${id} has a credit`);
  }
});

test('service worker precaches files that exist', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const files = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter(Boolean);
  for (const f of files) assert.ok(fs.existsSync(path.join(root, f)), `sw.js lists missing file ${f}`);
});
