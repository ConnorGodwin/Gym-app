const { test, expect, state, addTemplate, startFirstDay, logSet, finish } = require('./fixtures');

test('log a workout, then get a progression suggestion next time', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  for (let j = 0; j < 4; j++) await logSet(page, 0, j, 60, 8);
  await finish(page);
  await page.goto('/index.html#/plans'); await page.locator('.list-item').first().click(); await startFirstDay(page);
  await expect(page.locator('#ex-0 .last')).toContainText('60 kg × 8, 8, 8, 8');
  await expect(page.locator('#ex-0 .sugg')).toContainText('62.5 kg');
  await expect(page.locator('#ex-0 input[data-s="0"][data-k=weight]')).toHaveValue('62.5');
});

test('warm-ups, RPE, set types, plate calculator and supersets', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  for (let j = 0; j < 4; j++) { await page.fill(`#ex-0 input[data-s="${j}"][data-k=weight]`, '100'); await page.fill(`#ex-0 input[data-s="${j}"][data-k=reps]`, '8'); }
  await page.click('#ex-0 [data-a=warmups]');
  await expect(page.locator('#ex-0 .setno').first()).toHaveText('W');
  await expect(page.locator('#ex-0 .muted.small.grow.right')).toHaveText('4/5 sets');
  const first = (await page.locator('#ex-0 .setno').allInnerTexts()).indexOf('1');
  await page.locator('#ex-0 .setno').nth(first).click();
  await page.click('[data-a=setRpe][data-v="8"]'); await page.click('#modal [data-a=closeModal]');
  await expect(page.locator('#ex-0 .setno').nth(first)).toContainText('@8');
  await page.click('#ex-0 [data-a=plates]');
  await expect(page.locator('#plateOut')).toContainText('25 + 15');
  await page.click('#modal [data-a=closeModal]');
  await page.locator('#ex-3 [data-a=exMenu]').click(); await page.click('[data-a=exSS]');
  await expect(page.locator('.ss-tag')).toHaveCount(2);
  await logSet(page, 3, 0, 10, 12);
  await expect(page.locator('#restbar')).toBeHidden();
  await logSet(page, 4, 0, 20, 12);
  await expect(page.locator('#restbar')).toBeVisible();
  const n = await page.locator('#ex-0 [data-a=toggleSet]').count();
  for (let j = 0; j < n; j++) await page.locator('#ex-0 [data-a=toggleSet]').nth(j).click();
  await finish(page);
  const S = await state(page);
  const bench = S.sessions[0].exercises.find((e) => e.ex === 'barbell-bench-press');
  expect(bench.sets.some((s) => s.type === 'w')).toBe(true);
  expect(bench.sets.some((s) => s.rpe === 8)).toBe(true);
  expect(S.sessions[0].exercises.find((e) => e.ex === 'cable-lateral-raise').ss).toBeTruthy();
});

test('deload week is lighter with one set fewer', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  for (let j = 0; j < 4; j++) await logSet(page, 0, j, 100, 8);
  await finish(page);
  await page.evaluate(() => { const p = window.__forge.state.plans[0]; p.deloadEvery = 4; p.cycleStart = Date.now() - 3 * 7 * 864e5; window.Forge.save(); });
  await page.goto('/index.html#/plans'); await page.locator('.list-item').first().click(); await startFirstDay(page);
  await expect(page.locator('.deload-banner')).toBeVisible();
  await expect(page.locator('#ex-0 [data-a=toggleSet]')).toHaveCount(3);
  await expect(page.locator('#ex-0 input[data-k=weight]').first()).toHaveValue('92.5');
});

test('edit a saved workout', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  for (let j = 0; j < 4; j++) await logSet(page, 0, j, 60, 8);
  await page.click('[data-a=restSkip]');
  await finish(page);
  const id = (await state(page)).sessions[0].id;
  await page.click('[data-a=editSession]');
  await expect(page.locator('.edit-head')).toBeVisible();
  await expect(page.locator('#ex-0 .check.on')).toHaveCount(4);
  await page.fill('#ex-0 input[data-s="1"][data-k=weight]', '62.5');
  await page.click('#ex-0 [data-a=toggleSet][data-s="3"]');
  await page.fill('[data-f=wdur]', '75'); await page.locator('[data-f=wdur]').dispatchEvent('change');
  await expect(page.locator('#restbar')).toBeHidden();
  await finish(page);
  const S = await state(page);
  expect(S.sessions).toHaveLength(1);
  const s = S.sessions.find((x) => x.id === id);
  expect(s.exercises[0].sets.map((x) => x.weight)).toEqual([60, 62.5, 60]);
  expect(Math.round((s.end - s.start) / 60000)).toBe(75);
});

test('cancel an edit keeps the original', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  await logSet(page, 0, 0, 60, 8);
  await finish(page);
  await page.click('[data-a=editSession]');
  await page.fill('#ex-0 input[data-s="0"][data-k=weight]', '999');
  await page.click('[data-a=cancelWorkout]');
  expect((await state(page)).sessions[0].exercises[0].sets[0].weight).toBe(60);
});

test('log a past workout; history and suggestions respect its date', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  for (let j = 0; j < 4; j++) await logSet(page, 0, j, 60, 8);
  await finish(page);
  await page.goto('/index.html#/history');
  await page.click('[data-a=backfill]');
  const fiveDaysAgo = await page.evaluate(() => { const d = new Date(Date.now() - 5 * 864e5); const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T18:00`; });
  await page.fill('#backfillForm [name=start]', fiveDaysAgo);
  await page.selectOption('#backfillForm [name=from]', { index: 1 });
  await page.click('#backfillForm button');
  await expect(page.locator('#ex-0 .last')).toContainText('No previous');
  await logSet(page, 0, 0, 55, 8);
  await finish(page);
  const S = await state(page);
  expect(S.sessions).toHaveLength(2);
  expect(S.sessions[1].exercises[0].sets[0].weight).toBe(55); // sorted newest first
});

test('starting or editing is blocked while another workout is open', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  await logSet(page, 0, 0, 60, 8);
  await finish(page);
  const id = (await state(page)).sessions[0].id;
  await page.goto('/index.html#/train'); await page.click('[data-a=startEmpty]');
  await page.goto('/index.html#/session/' + id); await page.click('[data-a=editSession]');
  await expect(page.locator('#toast')).toContainText('Finish or discard');
});
