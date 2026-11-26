// The store apps load js/native.js. Here Capacitor is simulated so we can check the bridge
// calls the right native features (notifications, keep-awake, scanner, share, storage…).
const { test, expect, state, addTemplate, startFirstDay, logSet, finish } = require('./fixtures');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const calls = (window.__capCalls = []);
    // simulated app-private files survive reloads (like real app storage)
    const files = (window.__capFiles = new Proxy(JSON.parse(sessionStorage.getItem('capFiles') || '{}'), { set(t, k, v) { t[k] = v; sessionStorage.setItem('capFiles', JSON.stringify(t)); return true; } }));
    const rec = (plugin, method, impl) => (arg) => { calls.push({ plugin, method, arg }); return Promise.resolve(impl ? impl(arg) : {}); };
    const listeners = (window.__capListeners = {});
    window.Capacitor = {
      isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => true,
      Plugins: {
        Filesystem: { writeFile: rec('Filesystem', 'writeFile', (a) => { files[a.path] = a.data; return { uri: 'file:///cache/' + a.path }; }),
          readFile: (a) => (files[a.path] != null ? Promise.resolve({ data: files[a.path] }) : Promise.reject(new Error('missing'))) },
        LocalNotifications: { checkPermissions: rec('LN', 'check', () => ({ display: 'granted' })), requestPermissions: rec('LN', 'request', () => ({ display: 'granted' })),
          schedule: rec('LN', 'schedule'), cancel: rec('LN', 'cancel') },
        KeepAwake: { keepAwake: rec('KeepAwake', 'keepAwake'), allowSleep: rec('KeepAwake', 'allowSleep') },
        Haptics: { impact: rec('Haptics', 'impact'), notification: rec('Haptics', 'notification') },
        BarcodeScanner: { isGoogleBarcodeScannerModuleAvailable: rec('BS', 'avail', () => ({ available: true })), installGoogleBarcodeScannerModule: rec('BS', 'install'),
          scan: rec('BS', 'scan', () => ({ barcodes: [{ rawValue: '5000159484695' }] })) },
        Share: { share: rec('Share', 'share') },
        App: { addListener: (ev, fn) => { listeners[ev] = fn; return Promise.resolve(); }, getInfo: rec('App', 'getInfo', () => ({ version: '1.0', build: '7' })), exitApp: rec('App', 'exitApp') },
        StatusBar: { setStyle: rec('StatusBar', 'setStyle'), setBackgroundColor: rec('StatusBar', 'setBackgroundColor') },
        Browser: { open: rec('Browser', 'open') },
      },
    };
  });
  // inject the bridge exactly as native/scripts/build-web.mjs does
  await page.route('**/index.html', async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace('<script src="js/main.js"></script>', '<script src="js/native.js"></script>\n  <script src="js/main.js"></script>');
    await route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html' } });
  });
});
const calls = (page, plugin, method) => page.evaluate(([p, m]) => window.__capCalls.filter((c) => c.plugin === p && (!m || c.method === m)), [plugin, method]);

test('rest timer schedules a notification, skipping cancels it; screen kept awake', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  await logSet(page, 0, 0, 60, 8);
  await expect.poll(async () => (await calls(page, 'LN', 'schedule')).length).toBe(1);
  const n = (await calls(page, 'LN', 'schedule'))[0].arg.notifications[0];
  expect(n.title).toBe('Rest over');
  expect(new Date(n.schedule.at).getTime()).toBeGreaterThan(Date.now() + 60_000);
  expect((await calls(page, 'KeepAwake', 'keepAwake')).length).toBeGreaterThan(0);
  await page.click('[data-a=restSkip]');
  await expect.poll(async () => (await calls(page, 'LN', 'cancel')).length).toBeGreaterThan(1);
  await logSet(page, 0, 1, 60, 8);
  await page.click('[data-a=restSkip]');
  for (let j = 2; j < 4; j++) await logSet(page, 0, j, 60, 8);
  await finish(page);
  await expect.poll(async () => (await calls(page, 'KeepAwake', 'allowSleep')).length).toBeGreaterThan(0);
});

test('data is mirrored to a file and restored if storage is cleared', async ({ page }) => {
  await addTemplate(page, 'Push / Pull / Legs');
  await startFirstDay(page);
  await logSet(page, 0, 0, 60, 8);
  await finish(page);
  await expect.poll(() => page.evaluate(() => (JSON.parse(window.__capFiles['forge-data.json'] || '{}').sessions || []).length)).toBe(1);
  // the OS wipes the WebView's storage; the app should restore from its private file
  await page.evaluate(() => localStorage.removeItem('forge.v1'));
  await page.goto('/index.html#/history');
  await expect.poll(async () => (await state(page)).sessions.length).toBe(1);
  expect((await state(page)).plans).toHaveLength(1);
});

test('native barcode scanner, share-sheet backup, version and links', async ({ page }) => {
  await page.goto('/index.html#/food');
  await page.click('[data-a=addFood][data-m=lunch]');
  await page.click('[data-a=addTab][data-v=scan]');
  await page.click('[data-a=nativeScan]');
  await expect(page.locator('#amtPreview')).toBeVisible();
  await page.click('[data-a=closeAdd]');
  await page.goto('/index.html#/settings');
  await expect(page.locator('[data-a=checkUpdate]')).toHaveCount(0);
  await page.click('[data-a=export]');
  await expect.poll(async () => (await calls(page, 'Share', 'share')).length).toBe(1);
  await page.goto('/index.html#/about');
  await expect(page.locator('main')).toContainText('1.0 (7)');
  await expect(page.locator('main')).toContainText('Capacitor');
  await page.click('a:has-text("Read the full privacy policy")');
  expect((await calls(page, 'Browser', 'open'))[0].arg.url).toContain('privacy.html');
});

test('haptics replace vibration, and the Android back button closes sheets', async ({ page }) => {
  await page.goto('/index.html#/timer');
  await page.click('[data-a=tmode][data-m=hyrox]');
  await page.click('[data-a=hyStart]'); await page.click('[data-a=hyMark]');
  expect((await calls(page, 'Haptics')).length).toBeGreaterThan(0);
  await page.goto('/index.html#/food');
  await page.click('[data-a=addFood][data-m=lunch]');
  await expect(page.locator('#modal')).toBeVisible();
  await page.evaluate(() => window.__capListeners.backButton());
  await expect(page.locator('#modal')).toBeHidden();
});
