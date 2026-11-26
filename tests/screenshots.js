// Generates store screenshots with realistic sample data.
// Run from tests/:  node screenshots.js   (serves the app itself on port 4174)
// Output: store/screenshots/android-*.png (1080×1920) and iphone-*.png (1290×2796)
const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store', 'screenshots');
const URL = 'http://127.0.0.1:4174/index.html';

function seed() {
  const S = window.__forge.state, F = window.Forge, day = 864e5, now = Date.now();
  const pl = S.plans[0];
  pl.schedule = { 1: pl.days[0].id, 3: pl.days[1].id, 5: pl.days[2].id };
  const mk = (dAgo, w, i) => Store.touch({ id: 's' + dAgo, name: `Push / Pull / Legs – ${pl.days[i].name}`, planId: pl.id, dayId: pl.days[i].id,
    start: now - dAgo * day, end: now - dAgo * day + 62 * 60e3, prs: [],
    exercises: [
      { ex: 'barbell-bench-press', sets: [{ weight: 40, reps: 10, type: 'w' }, ...[8, 8, 8, 7].map((r) => ({ weight: w, reps: r, rpe: 8 }))] },
      { ex: 'back-squat', sets: [6, 6, 5].map((r) => ({ weight: w * 1.35, reps: r })) },
      { ex: 'pull-up', sets: [10, 9, 8].map((r) => ({ reps: r })) },
      { ex: 'dumbbell-lateral-raise', sets: [15, 14, 12].map((r) => ({ weight: 10, reps: r })) },
      { ex: 'easy-run', sets: [{ distance: 5, time: 1620 - dAgo * 4 }] }] });
  S.sessions = [];
  // three sessions this week and the week before, then every 2–3 days back to ~4 months
  const days = [1, 2, 3, 5, 7, 9];
  for (let i = 11; i < 120; i += days.length % 3 === 2 ? 3 : 2) days.push(i);
  days.forEach((d, k) => S.sessions.push(mk(d, 82.5 - d * 0.12, (days.length - k) % 3)));
  for (let i = 45; i >= 0; i--) {
    const d = F.dateKey(now - i * day);
    S.weights.push(Store.touch({ date: d, kg: 82.6 - (45 - i) * 0.035 + Math.sin(i * 1.7) * 0.35 }));
    if (i > 0) [['breakfast', 'Porridge with berries', 420, 18, 62, 10], ['lunch', 'Chicken & rice bowl', 640, 48, 70, 14], ['dinner', 'Salmon, potatoes & greens', 720, 46, 60, 28], ['snacks', 'Greek yogurt & honey', 210, 15, 24, 6]]
      .forEach(([meal, name, kcal, p, c, f]) => S.foodLog.push(Store.touch({ date: d, meal, kind: 'quick', name, kcal, p, c, f })));
  }
  const t = F.dateKey(now);
  [['breakfast', 'Porridge Oats (Oaty)', 80, 'g', 300, 9, 48, 6], ['breakfast', 'Blueberries', 100, 'g', 57, 1, 14, 0], ['breakfast', 'Semi Skimmed Milk', 200, 'g', 94, 7, 10, 3],
   ['lunch', 'Chicken Breast Fillets (Aldi)', 150, 'g', 159, 36, 1, 2], ['lunch', 'Basmati Rice', 180, 'g', 234, 5, 51, 1], ['snacks', 'Protein Bar', 1, 'serving', 228, 20, 22, 8]]
    .forEach(([meal, name, qty, qtyUnit, kcal, p, c, f]) => S.foodLog.push(Store.touch({ date: t, meal, kind: 'food', name, qty, qtyUnit, kcal, p, c, f })));
  S.waterLog.push(Store.touch({ date: t, ml: 1500 }));
  S.nutrition.targets = { kcal: 2450, p: 170, c: 260, f: 75 };
  S.measures.push(Store.touch({ date: F.dateKey(now - 42 * day), waist: 88, chest: 102, arm: 37, bf: 18.5 }), Store.touch({ date: t, waist: 85.5, chest: 103, arm: 38, bf: 16.8 }));
  S.achievements = {};
  // a HYROX race in progress with realistic splits (runs ~4:30, stations 3–7 min)
  const splits = [272, 250, 281, 205, 279, 310];
  let t0 = now - splits.reduce((a, b) => a + b, 0) * 1000 - 95e3;
  S.race = { division: 'Open Men', start: t0, marks: splits.map((x) => (t0 += x * 1000)), done: false };
  F.save();
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '4174', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  const targets = [
    ['android', { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
    ['iphone', { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ];
  try {
    for (const [name, opts] of targets) {
      const ctx = await browser.newContext({ ...opts, colorScheme: 'dark', serviceWorkers: 'block' });
      const page = await ctx.newPage();
      page.on('dialog', (d) => d.accept());
      await page.goto(URL + '#/plans');
      await page.click('[data-a=addTemplate][data-i="0"]');
      await page.evaluate(seed);
      await page.addStyleTag({ content: '#toast{display:none!important}' });
      const shot = async (n, route, prep) => {
        await page.goto(URL + '#/' + route); await page.waitForTimeout(250);
        await page.addStyleTag({ content: '#toast{display:none!important}' });
        if (prep) await prep();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT, `${name}-${n}.png`) });
      };
      await shot('1-train', 'train');
      await shot('2-workout', 'train', async () => { await page.click('.upnext [data-a=startDay], [data-a=startDay] >> nth=0'); await page.waitForSelector('#ex-0'); });
      await page.goto(URL + '#/workout'); await page.click('[data-a=cancelWorkout]');
      await shot('3-exercise', 'exercise/barbell-bench-press', async () => page.evaluate(() => document.querySelector('.howto').scrollIntoView()));
      await shot('4-food', 'food');
      await shot('5-progress', 'progress');
      await shot('6-body', 'body');
      await shot('7-plans', 'plans', async () => { await page.click('[data-a=tplGroup][data-v="Team sports"]'); });
      await shot('8-hyrox', 'timer', async () => { await page.click('[data-a=tmode][data-m=hyrox]'); });
      await ctx.close();
      console.log('screenshots written for', name);
    }
  } finally { await browser.close(); server.kill(); }
})();
