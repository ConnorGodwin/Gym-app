const { test, expect, state } = require('./fixtures');

test('height in ft & in and weight in st & lb on Targets', async ({ page }) => {
  await page.goto('/index.html#/targets');
  await page.click('[data-a=setUnit][data-k=heightUnit][data-v=ftin]');
  await page.click('[data-a=setUnit][data-k=bodyUnit][data-v=st]');
  await page.fill('[data-f=profHeight] [name=h_ft]', '5'); await page.fill('[data-f=profHeight] [name=h_in]', '11');
  await page.locator('[data-f=profHeight] [name=h_in]').dispatchEvent('change');
  await page.fill('[data-f=profWeight] [name=w_st]', '13'); await page.fill('[data-f=profWeight] [name=w_lb]', '3');
  await page.locator('[data-f=profWeight] [name=w_lb]').dispatchEvent('change');
  const pr = (await state(page)).nutrition.profile;
  expect(pr.heightCm).toBeCloseTo(180.3, 0);
  expect(pr.weightKg).toBeCloseTo(83.9, 0);
  await page.click('[data-a=useCalc]');
  expect((await state(page)).nutrition.targets.kcal).toBeGreaterThan(2000);
});

test('weigh-ins and measurements in imperial units', async ({ page }) => {
  await page.goto('/index.html#/body');
  await page.click('[data-a=setUnit][data-k=bodyUnit][data-v=st]');
  await page.fill('#weightForm [name=w_st]', '13'); await page.fill('#weightForm [name=w_lb]', '1.5');
  await page.click('#weightForm button');
  expect((await state(page)).weights[0].kg).toBeCloseTo(83.23, 1);
  await expect(page.locator('main')).toContainText('13 st 2 lb');
  await page.click('[data-a=setUnit][data-k=bodyUnit][data-v=kg]');
  await expect(page.locator('.stats').first()).toContainText('83.2 kg');
  await page.click('[data-a=setUnit][data-k=lengthUnit][data-v=in]');
  await page.click('[data-a=measureForm]'); await page.fill('#measureForm [name=waist]', '34'); await page.click('#measureForm button.primary');
  expect((await state(page)).measures[0].waist).toBeCloseTo(86.36, 2);
});
