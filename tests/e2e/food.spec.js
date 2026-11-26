const { test, expect, state } = require('./fixtures');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html#/targets');
  await page.click('[data-a=useCalc]');
});

test('search (UK by default), pick a serving, log it', async ({ page, offCalls }) => {
  await page.goto('/index.html#/food');
  await page.click('[data-a=addFood][data-m=breakfast]');
  await page.click('[data-a=addTab][data-v=search]');
  await page.fill('#foodSearch input[name=q]', 'yogurt');
  await page.click('#foodSearch button');
  await expect(page.locator('[data-a=pickResult]')).toHaveCount(2); // the product without calories is dropped
  expect(offCalls.some((u) => u.startsWith('https://search.openfoodfacts.org/search') && decodeURIComponent(u).includes('en:united-kingdom'))).toBe(true);
  await page.locator('[data-a=pickResult]').first().click();
  await expect(page.locator('#amtPreview')).toContainText('146');
  await page.click('[data-a=amtAdd]');
  await expect(page.locator('.meal').first()).toContainText('Greek Style Yogurt');
});

test('barcode: known product, and an unknown one becomes a custom food', async ({ page }) => {
  await page.goto('/index.html#/food');
  await page.click('[data-a=addFood][data-m=lunch]'); await page.click('[data-a=addTab][data-v=scan]');
  await page.fill('#barcodeForm input', '5000159484695'); await page.click('#barcodeForm button');
  await expect(page.locator('#amtPreview')).toBeVisible();
  await page.click('[data-a=amtAdd]');
  await page.click('[data-a=addFood][data-m=snacks]'); await page.click('[data-a=addTab][data-v=scan]');
  await page.fill('#barcodeForm input', '9999999999999'); await page.click('#barcodeForm button');
  await expect(page.locator('#foodForm')).toBeVisible();
  await page.fill('#foodForm [name=name]', 'Protein bar'); await page.fill('#foodForm [name=kcal]', '380'); await page.fill('#foodForm [name=servingG]', '60');
  await page.click('#foodForm button.primary');
  await page.click('[data-a=amtAdd]');
  const S = await state(page);
  expect(S.foodLog).toHaveLength(2);
  expect(S.foods.find((f) => f.name === 'Protein bar').barcode).toBe('9999999999999');
});

test('quick add, water, save a meal and copy a day', async ({ page }) => {
  await page.goto('/index.html#/food');
  await page.click('[data-a=addFood][data-m=dinner]'); await page.click('[data-a=addTab][data-v=quick]');
  await page.fill('#quickAdd [name=kcal]', '650'); await page.click('#quickAdd button');
  await page.click('[data-a=water][data-v="500"]');
  await expect(page.locator('.water')).toContainText('0.50');
  await page.locator('.meal').nth(2).locator('[data-a=mealMenu]').click(); await page.click('[data-a=saveMeal]');
  expect((await state(page)).meals).toHaveLength(1);
  await page.click('[data-a=fdDay][data-v="1"]'); await page.click('[data-a=copyDay]');
  expect((await state(page)).foodLog).toHaveLength(2);
});

test('recipe, meal plan, shopping list and "Log all"', async ({ page }) => {
  await page.evaluate(() => { window.__forge.state.foods.push(Store.touch({ id: 'my-oats', name: 'Oats', kcal: 375, p: 11, c: 60, f: 8, source: 'custom', custom: true })); window.Forge.save(); });
  await page.goto('/index.html#/myfoods'); await page.click('[data-a=newRecipe]');
  await page.click('[data-a=recAdd]'); await page.click('[data-a=addTab][data-v=mine]');
  await page.click('[data-a=pickFood]'); await page.selectOption('[data-f=amtUnit]', 'g').catch(() => {});
  await page.fill('#amtQty', '400'); await page.dispatchEvent('#amtQty', 'input'); await page.click('[data-a=amtAdd]');
  expect((await state(page)).recipes[0].items).toHaveLength(1);
  await page.goto('/index.html#/mealplan');
  await page.click('[data-a=planAdd][data-m=breakfast]'); await page.click('[data-a=addTab][data-v=mine]');
  await page.click('[data-a=pickRecipe]'); await page.click('[data-a=amtAdd]');
  await page.click('[data-a=planCopyDay]');
  await page.goto('/index.html#/shopping');
  await expect(page.locator('main')).toContainText('Oats');
  await page.goto('/index.html#/food');
  await page.click('[data-a=logPlan]');
  expect((await state(page)).foodLog.length).toBeGreaterThan(0);
});

test('adaptive check-in after three weeks of data', async ({ page }) => {
  await page.evaluate(() => {
    const S = window.__forge.state, F = window.Forge;
    for (let i = 21; i >= 1; i--) {
      const d = F.dateKey(Date.now() - i * 864e5);
      S.weights.push(Store.touch({ date: d, kg: 85 - (21 - i) * 0.05 }));
      S.foodLog.push(Store.touch({ date: d, meal: 'dinner', kind: 'quick', name: 'x', kcal: 2300, p: 150, c: 250, f: 70 }));
    }
    S.nutrition.targets.kcal = 2400; F.save();
  });
  await page.click('#nav a[data-tab=food]');
  await expect(page.locator('.adapt')).toContainText('maintenance');
});
