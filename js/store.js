/* Forge data layer.
 *
 * Everything the app saves goes through this file, so a cloud database can be added later
 * without touching the screens:
 *   - Data lives in named collections (arrays of records). Every record has a unique `id`
 *     and an `updatedAt` timestamp (ms), set by Store.touch(). Deleting a record leaves a
 *     tombstone in `tombstones`, so a sync service can propagate deletes.
 *   - The storage backend is an adapter with load()/save(). Today it is localStorage; a
 *     sync adapter (e.g. Supabase/Firebase) can implement the same two calls and push the
 *     records changed since its last sync (`updatedAt > lastSyncedAt`).
 *   - `v` is the schema version; MIGRATIONS upgrade older saves and imported backups.
 *   - Large binary data (progress photos) lives in IndexedDB via Store.photos, keyed by the
 *     same record id as its metadata in the `photos` collection.
 */
(function () {
  'use strict';
  const KEY = 'forge.v1';
  const SCHEMA = 2;

  // Collections that hold records (arrays of {id, updatedAt, ...}).
  const COLLECTIONS = ['custom', 'plans', 'sessions', 'foods', 'recipes', 'meals', 'foodLog', 'waterLog', 'mealPlan', 'weights', 'measures', 'photos'];

  const DEFAULTS = () => ({
    v: SCHEMA,
    settings: {
      unit: 'kg', rest: 90, autoRest: true, sound: true, vibrate: true, theme: 'system', accent: 'lime',
      barKg: null, // null = 20 kg / 45 lb by unit
      foodRegion: 'uk',
    },
    nutrition: {
      profile: { sex: 'male', age: 30, heightCm: 178, activity: 1.55, goal: 0, proteinPerKg: 2, trainingBonus: 0 },
      targets: null, // {kcal, p, c, f} – null until set up
      waterMl: 2500,
    },
    shopping: { checked: {}, extra: [] },
    achievements: {},
    tombstones: [],
    active: null,
    ...Object.fromEntries(COLLECTIONS.map((c) => [c, []])),
  });

  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const now = () => Date.now();

  // ---------- migrations ----------
  const MIGRATIONS = {
    // v1 -> v2: new collections, ids/updatedAt on existing records
    2: (d) => {
      const t = now();
      ['custom', 'plans', 'sessions'].forEach((c) => (d[c] || []).forEach((r) => { if (!r.id) r.id = uid(); if (!r.updatedAt) r.updatedAt = r.end || t; }));
      return d;
    },
  };
  function migrate(d) {
    let v = d.v || 1;
    while (v < SCHEMA) { v++; if (MIGRATIONS[v]) d = MIGRATIONS[v](d) || d; d.v = v; }
    return d;
  }
  function normalise(d) {
    const base = DEFAULTS();
    d = migrate({ ...d });
    const out = {
      ...base, ...d,
      settings: { ...base.settings, ...(d.settings || {}) },
      nutrition: { ...base.nutrition, ...(d.nutrition || {}), profile: { ...base.nutrition.profile, ...((d.nutrition || {}).profile || {}) } },
      shopping: { ...base.shopping, ...(d.shopping || {}) },
    };
    COLLECTIONS.forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    if (!out.achievements || typeof out.achievements !== 'object') out.achievements = {};
    if (!Array.isArray(out.tombstones)) out.tombstones = [];
    out.sessions.sort((a, b) => b.start - a.start);
    out.v = SCHEMA;
    return out;
  }

  // ---------- adapters ----------
  const LocalAdapter = {
    load() { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; },
    save(data) { localStorage.setItem(KEY, JSON.stringify(data)); },
  };
  let adapter = LocalAdapter;

  // ---------- IndexedDB for photos ----------
  let dbp = null;
  function idb() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('forge-files', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  const tx = (mode, fn) => idb().then((db) => new Promise((res, rej) => {
    const t = db.transaction('photos', mode); const st = t.objectStore('photos');
    const out = fn(st);
    t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
    t.onerror = () => rej(t.error);
  }));
  const photos = {
    put: (id, blob) => tx('readwrite', (st) => st.put(blob, id)),
    get: (id) => tx('readonly', (st) => st.get(id)),
    del: (id) => tx('readwrite', (st) => st.delete(id)),
  };

  window.Store = {
    SCHEMA, COLLECTIONS, DEFAULTS, uid, migrate, normalise, photos,
    useAdapter(a) { adapter = a; },
    load() {
      try { const d = adapter.load(); if (d && typeof d === 'object') return normalise(d); } catch (e) { /* fall through */ }
      return DEFAULTS();
    },
    save(data) { adapter.save(data); },
    // stamp a record as created/changed
    touch(rec) { if (!rec.id) rec.id = uid(); rec.updatedAt = now(); return rec; },
    // remove a record from a collection and leave a tombstone for future sync
    remove(S, coll, id) {
      const before = S[coll].length;
      S[coll] = S[coll].filter((r) => r.id !== id);
      if (S[coll].length !== before) S.tombstones.push({ coll, id, at: now() });
      if (S.tombstones.length > 2000) S.tombstones = S.tombstones.slice(-2000);
    },
    // ask the browser not to evict our data under storage pressure (Android/Chrome, installed iOS apps)
    persist() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ } },
  };
})();
