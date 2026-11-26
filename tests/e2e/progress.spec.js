const { test, expect, state, addTemplate, startFirstDay, logSet, finish } = require('./fixtures');

// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test('progress photos are stored and compared', async ({ page }) => {
  await page.goto('/index.html#/body');
  for (let i = 0; i < 2; i++) {
    await page.setInputFiles('[data-f=photoAdd]', { name: 'p.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.locator('.pthumb')).toHaveCount(i + 1);
  }
  await expect(page.locator('.pthumb img[src^="blob:"]')).toHaveCount(2);
  await page.click('[data-a=photoCompare]');
  await page.locator('[data-a=cmpPick]').nth(0).click(); await page.locator('[data-a=cmpPick]').nth(1).click();
  await expect(page.locator('.cmp img[src^="blob:"]')).toHaveCount(2);
});

test('overview, records and achievements after a workout', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  for (let j = 0; j < 4; j++) await logSet(page, 0, j, 100, 5);
  await finish(page);
  await page.goto('/index.html#/progress');
  await expect(page.locator('.hm-grid i')).toHaveCount(126);
  await expect(page.locator('.mmap svg')).toHaveCount(2);
  await expect(page.locator('.ach.got')).not.toHaveCount(0);
  await page.goto('/index.html#/records');
  await expect(page.locator('main')).toContainText('Barbell Bench Press');
});

test('HYROX race mode saves splits with division loads', async ({ page }) => {
  await page.goto('/index.html#/timer');
  await page.click('[data-a=tmode][data-m=hyrox]');
  await page.selectOption('[data-f=hyroxDiv]', 'Open Women');
  await page.click('[data-a=hyStart]');
  for (let i = 0; i < 16; i++) await page.click('[data-a=hyMark]');
  await page.click('[data-a=hySave]');
  const race = (await state(page)).sessions.find((s) => s.hyrox);
  expect(race.exercises).toHaveLength(16);
  expect(race.exercises[3].sets[0].weight).toBe(102);
});

test('interval timer runs through phases', async ({ page }) => {
  await page.goto('/index.html#/timer');
  await page.click('[data-a=tmode][data-m=interval]');
  await page.fill('[data-f=iv][data-k=prep]', '1'); await page.locator('[data-f=iv][data-k=prep]').blur();
  await page.click('[data-a=ivToggle]');
  await expect(page.locator('[data-tick=ivPhase]')).toHaveText('WORK', { timeout: 4000 });
});

test('exercise page shows the wger demo and credit', async ({ page }) => {
  await page.goto('/index.html#/exercise/barbell-bench-press');
  await expect(page.locator('.demo-vid')).toHaveAttribute('src', /videos\/exercises\/.+\.mp4/);
  await expect(page.locator('.demo-imgs img').first()).toBeVisible();
  await expect(page.locator('.credit')).toContainText('wger');
});
