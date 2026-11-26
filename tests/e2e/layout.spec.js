// No screen may scroll sideways at common phone widths, in light or dark mode.
const { test, expect } = require('./fixtures');

const ROUTES = ['train', 'plans', 'library', 'food', 'targets', 'mealplan', 'shopping', 'myfoods', 'progress', 'body', 'records', 'history', 'timer', 'settings', 'exercise/back-squat'];

for (const width of [320, 375, 412]) {
  for (const scheme of ['light', 'dark']) {
    test(`no horizontal overflow at ${width}px (${scheme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme: scheme });
      for (const r of ROUTES) {
        await page.goto('/index.html#/' + r);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        expect(over, `#/${r} overflows`).toBeLessThanOrEqual(0);
      }
    });
  }
}
