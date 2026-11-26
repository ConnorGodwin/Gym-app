/* Native bridge for the Android / iOS apps (Capacitor). Only loaded inside the store apps:
 * native/scripts/build-web.mjs adds it to index.html. On the website it does nothing.
 *
 * - Data: mirrored to a file in the app's private storage, restored if the WebView's storage is ever cleared.
 * - Rest timer and countdown: a local notification fires when they end, even with the phone locked.
 * - Keep the screen awake during workouts and timers; haptics; native barcode scanner (Android, ML Kit);
 *   backups through the share sheet; status bar colours; Android back button; links in an in-app browser.
 */
(function () {
  'use strict';
  const Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
  const F = window.Forge;
  const P = Cap.Plugins;
  const has = (name) => Cap.isPluginAvailable(name) && P[name];
  const KEY = 'forge.v1';
  const FILE = 'forge-data.json';
  document.documentElement.classList.add('native', 'native-' + Cap.getPlatform());

  // ---------- data: mirror to a file, restore if WebView storage was cleared ----------
  if (has('Filesystem')) {
    const fs = P.Filesystem;
    let pending = null, timer = null;
    const flush = async () => {
      clearTimeout(timer); timer = null;
      if (pending == null) return;
      const data = pending; pending = null;
      try { await fs.writeFile({ path: FILE, directory: 'DATA', data, encoding: 'utf8' }); } catch (e) { /* retried on next save */ }
    };
    Store.useAdapter({
      load() { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; },
      save(d) {
        const raw = JSON.stringify(d);
        localStorage.setItem(KEY, raw);
        pending = raw; clearTimeout(timer); timer = setTimeout(flush, 800);
      },
    });
    if (has('App')) P.App.addListener('pause', flush);
    // Restore once if storage came back empty but the file exists (e.g. the OS cleared WebView data)
    (async () => {
      try {
        const local = localStorage.getItem(KEY);
        const file = await fs.readFile({ path: FILE, directory: 'DATA', encoding: 'utf8' }).then((r) => r.data).catch(() => null);
        if (!local && file && !sessionStorage.getItem('forge.restored')) {
          sessionStorage.setItem('forge.restored', '1');
          localStorage.setItem(KEY, file);
          location.reload();
        } else if (local && !file) {
          pending = local; flush(); // first run of the app version: create the file
        }
      } catch (e) { /* keep running on local storage */ }
    })();
  }

  // ---------- notifications when a rest timer or countdown ends ----------
  if (has('LocalNotifications')) {
    const LN = P.LocalNotifications;
    const ids = { rest: 101, cd: 102 };
    const scheduled = { rest: 0, cd: 0 };
    let permission = null;
    const ensurePermission = async () => {
      if (permission != null) return permission;
      try {
        let st = await LN.checkPermissions();
        if (st.display !== 'granted') st = await LN.requestPermissions();
        permission = st.display === 'granted';
      } catch (e) { permission = false; }
      return permission;
    };
    const sync = async (key, end, title, body) => {
      if ((scheduled[key] || 0) === (end || 0)) return;
      scheduled[key] = end || 0;
      try { await LN.cancel({ notifications: [{ id: ids[key] }] }); } catch (e) { /* none pending */ }
      if (!end || end - Date.now() < 3000) return;
      if (!(await ensurePermission())) return;
      try {
        await LN.schedule({ notifications: [{ id: ids[key], title, body, schedule: { at: new Date(end), allowWhileIdle: true } }] });
      } catch (e) { /* ignore */ }
    };
    F.HOOKS.tick.push(() => {
      const S = F.S, r = S.active && !S.active.mode && S.active.rest;
      sync('rest', r ? r.end : 0, 'Rest over', 'Time for your next set 💪');
      const cd = F.T.cd;
      sync('cd', cd.running ? cd.end : 0, 'Countdown finished', 'Your timer is done.');
    });
  }

  // ---------- keep the screen on during workouts and timers ----------
  if (has('KeepAwake')) {
    let awake = null;
    F.nativeAwake = (want) => {
      if (want === awake) return;
      awake = want;
      (want ? P.KeepAwake.keepAwake() : P.KeepAwake.allowSleep()).catch(() => {});
    };
    F.HOOKS.tick.push(() => F.nativeAwake(F.wantAwake()));
  }

  // ---------- haptics ----------
  if (has('Haptics')) {
    F.nativeBuzz = (pattern) => {
      const long = Array.isArray(pattern) ? pattern.length > 1 : pattern > 150;
      if (long) P.Haptics.notification({ type: 'SUCCESS' }).catch(() => {});
      else P.Haptics.impact({ style: 'MEDIUM' }).catch(() => {});
    };
  }

  // ---------- barcode scanner (Android: Google ML Kit; iPhone uses the built-in web scanner) ----------
  if (has('BarcodeScanner') && Cap.getPlatform() === 'android') {
    const BS = P.BarcodeScanner;
    F.nativeScan = async () => {
      try {
        const avail = await BS.isGoogleBarcodeScannerModuleAvailable();
        if (!avail.available) {
          F.toast('Setting up the scanner… try again in a few seconds');
          await BS.installGoogleBarcodeScannerModule();
          return null;
        }
      } catch (e) { /* older Play services: let scan() report it */ }
      const res = await BS.scan({ formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E'] });
      const b = res && res.barcodes && res.barcodes[0];
      return b ? b.rawValue || b.displayValue : null;
    };
  }

  // ---------- backups via the share sheet ----------
  if (has('Filesystem') && has('Share')) {
    F.nativeExport = async (json, name) => {
      try {
        const w = await P.Filesystem.writeFile({ path: name, directory: 'CACHE', data: json, encoding: 'utf8' });
        await P.Share.share({ title: 'Forge backup', text: 'Forge backup file', files: [w.uri], dialogTitle: 'Save your Forge backup' });
      } catch (e) { if (!/cancel/i.test(String(e && e.message))) F.toast('Couldn’t export the backup'); }
    };
  }

  // ---------- version on the About / Settings screens ----------
  if (has('App')) P.App.getInfo().then((i) => F.setAppVersion(`${i.version} (${i.build})`)).catch(() => {});

  // ---------- status bar follows the theme ----------
  if (has('StatusBar')) {
    const meta = document.querySelector('meta[name="theme-color"]');
    const apply = () => {
      const bg = (meta && meta.content) || '#0f1115';
      const dark = parseInt(bg.slice(1, 3), 16) < 128;
      P.StatusBar.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
      if (Cap.getPlatform() === 'android') P.StatusBar.setBackgroundColor({ color: bg }).catch(() => {});
    };
    if (meta) new MutationObserver(apply).observe(meta, { attributes: true, attributeFilter: ['content'] });
    setTimeout(apply, 0);
  }

  // ---------- Android back button: close sheets, go back, then leave the app ----------
  if (has('App') && Cap.getPlatform() === 'android') {
    P.App.addListener('backButton', () => {
      const modal = document.getElementById('modal');
      if (modal && !modal.hidden) { F.closeModal(); return; }
      const r = F.route().name;
      if (r === 'train' || r === '') P.App.exitApp();
      else history.length > 1 ? history.back() : F.go('train');
    });
  }

  // ---------- open external links in an in-app browser ----------
  if (has('Browser')) {
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest && ev.target.closest('a[href^="http"]');
      if (!a) return;
      ev.preventDefault();
      P.Browser.open({ url: a.href }).catch(() => {});
    }, true);
  }
})();
