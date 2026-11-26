const { test, expect, state } = require('./fixtures');

test('every template day can be started, logged and finished', async ({ page }) => {
  test.setTimeout(240_000);
  const n = await page.goto('/index.html#/plans').then(() => page.evaluate(() => window.PLAN_TEMPLATES.length));
  let done = 0;
  for (let i = 0; i < n; i++) {
    await page.goto('/index.html#/plans');
    await page.click('[data-a=tplGroup][data-v=All]');
    await page.click(`[data-a=addTemplate][data-i="${i}"]`);
    const days = await page.locator('.day [data-a=startDay]').count();
    for (let d = 0; d < days; d++) {
      await page.locator('.day [data-a=startDay]').nth(d).click();
      await page.locator('[data-a=toggleSet]').first().click();
      await page.click('[data-a=finishWorkout]');
      await page.waitForURL(/#\/session\//);
      done++;
      await page.goto('/index.html#/plans'); await page.locator('.list-item').last().click();
    }
  }
  expect((await state(page)).sessions).toHaveLength(done);
});

test('template category chips filter the list', async ({ page }) => {
  await page.goto('/index.html#/plans');
  await page.click('[data-a=tplGroup][data-v="Team sports"]');
  await expect(page.locator('[data-a=addTemplate]')).toHaveCount(3);
});
