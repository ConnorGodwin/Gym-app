const { test, expect, state } = require('./fixtures');

const ROUTES = ['train', 'plans', 'library', 'food', 'targets', 'mealplan', 'shopping', 'myfoods', 'progress', 'body', 'records', 'history', 'timer', 'settings', 'exercise/barbell-bench-press'];

test('every screen renders', async ({ page }) => {
  for (const r of ROUTES) {
    await page.goto('/index.html#/' + r);
    await expect(page.locator('main h1')).toBeVisible();
  }
});

test('an old (v1) save is migrated to the current schema', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.setItem('forge.v1', JSON.stringify({ v: 1, settings: { unit: 'kg' }, custom: [], plans: [], sessions: [{ id: 'x', name: 'Old', start: Date.now() - 864e5, end: Date.now() - 864e5 + 3600e3, exercises: [{ ex: 'back-squat', sets: [{ weight: 100, reps: 5 }] }] }], active: null })));
  await page.reload();
  const S = await state(page);
  expect(S.v).toBe(2);
  expect(S.sessions[0].updatedAt).toBeTruthy();
  expect(Array.isArray(S.foodLog)).toBe(true);
});

test('theme and accent colour switch', async ({ page }) => {
  await page.goto('/index.html#/settings');
  await page.click('[data-a=theme][data-v=dark]');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.click('[data-a=accent][data-v=violet]');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe('#c084fc');
});
