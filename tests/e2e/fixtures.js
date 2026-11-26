// Shared test setup: every test fails on a JavaScript error, dialogs are accepted,
// and Open Food Facts is replaced with fixed responses so tests never depend on the network.
const base = require('@playwright/test');

const OFF_PRODUCTS = [
  { code: '5000159484695', product_name: 'Greek Style Yogurt', brands: 'Brand A', serving_quantity: 150, serving_size: '150 g', nutriments: { 'energy-kcal_100g': 97, proteins_100g: 9, carbohydrates_100g: 4, fat_100g: 5 } },
  { code: '123', product_name: 'No Calories Listed', nutriments: {} },
  { code: '5010029000000', product_name: 'Porridge Oats', brands: 'Oaty', nutriments: { energy_100g: 1569, proteins_100g: 11, carbohydrates_100g: 60, fat_100g: 8 } },
];

const test = base.test.extend({
  offCalls: async ({}, use) => { await use([]); },
  page: async ({ page, offCalls }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? (d.message().startsWith('Name') ? 'Usual breakfast' : 'front') : undefined));
    await page.route(/openfoodfacts\.org/, (route) => {
      const url = route.request().url(); offCalls.push(url);
      if (url.startsWith('https://search.openfoodfacts.org/search')) {
        return route.fulfill({ json: { hits: OFF_PRODUCTS.map((p) => ({ code: p.code, product_name: p.product_name, brands: ['xx:' + (p.brands || 'x').toLowerCase()] })) } });
      }
      const m = url.match(/api\/v2\/product\/(\d+)/);
      if (m) { const p = OFF_PRODUCTS.find((x) => x.code === m[1]); return p ? route.fulfill({ json: { status: 1, product: p } }) : route.fulfill({ status: 404, json: { status: 0 } }); }
      return route.fulfill({ status: 503, body: 'busy' });
    });
    await use(page);
    base.expect(errors, 'JavaScript errors on the page').toEqual([]);
  },
});

const state = (page) => page.evaluate(() => window.__forge.state);
const addTemplate = async (page, name) => {
  await page.goto('/index.html#/plans');
  const i = await page.evaluate((n) => window.PLAN_TEMPLATES.findIndex((t) => t.name === n), name);
  await page.click(`[data-a=addTemplate][data-i="${i}"]`);
};
const startFirstDay = async (page) => { await page.locator('.day [data-a=startDay]').first().click(); await page.waitForSelector('#ex-0'); };
const logSet = async (page, card, set, weight, reps) => {
  if (weight != null) await page.fill(`#ex-${card} input[data-s="${set}"][data-k=weight]`, String(weight));
  if (reps != null) await page.fill(`#ex-${card} input[data-s="${set}"][data-k=reps]`, String(reps));
  await page.click(`#ex-${card} [data-a=toggleSet][data-s="${set}"]`);
};
const finish = async (page) => { await page.click('[data-a=finishWorkout]'); await page.waitForURL(/#\/session\//); };

module.exports = { test, expect: base.expect, state, addTemplate, startFirstDay, logSet, finish };
