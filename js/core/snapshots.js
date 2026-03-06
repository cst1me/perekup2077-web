// PEREKUP 2077 — Shadow Save / Snapshot System (IndexedDB)
// Production-ready: schema migrations + two-phase commit (temp slot)
// Stores last 3 validated restore points: AutoSave_1..3

import {
  G, GS,
  APP_VERSION, BUILD_VERSION, COMMIT_HASH,
  validateG, validateGS,
  replaceG, replaceGS,
  defaultG,
  saveGlobalStats
} from './state.js';
import { toast } from './utils.js';

var DB_NAME = 'perekup2077';
var DB_VERSION = 1;
var STORE = 'snapshots';
var KEYS = ['AutoSave_1', 'AutoSave_2', 'AutoSave_3'];
var SAVE_SCHEMA_VERSION = 309;
var TMP_KEY_PREFIX = 'perekup_tmp_';
var PENDING_RESTORE_KEY = 'perekup_pending_restore';

var REASON_LABELS = {
  'boot': 'Загрузочный снимок',
  'sim:before_buy': 'Перед покупкой авто',
  'sim:before_sell': 'Перед продажей авто',
  'sim:before_next_day': 'Перед переходом дня',
  'repair:manual': 'Ручной сейв перед починкой',
  'auto': 'Автосейв'
};

function deepClone(obj) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(obj);
  } catch(e) {}
  return JSON.parse(JSON.stringify(obj));
}

function openDb() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function() {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error || new Error('IndexedDB open error')); };
  });
}

function idbGet(key) {
  return openDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(STORE, 'readonly');
      var st = tx.objectStore(STORE);
      var req = st.get(key);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { reject(req.error || new Error('IndexedDB get error')); };
      tx.oncomplete = function() { db.close(); };
    });
  });
}

function idbSet(key, val) {
  return openDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      var st = tx.objectStore(STORE);
      st.put(val, key);
      tx.oncomplete = function() { db.close(); resolve(true); };
      tx.onerror = function() { db.close(); reject(tx.error || new Error('IndexedDB set error')); };
    });
  });
}

function idbDel(key) {
  return openDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      var st = tx.objectStore(STORE);
      st.delete(key);
      tx.oncomplete = function() { db.close(); resolve(true); };
      tx.onerror = function() { db.close(); reject(tx.error || new Error('IndexedDB del error')); };
    });
  });
}

function nowIso() {
  return new Date().toISOString();
}

function isPlainObject(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

function mergeDefaults(base, defaults) {
  if (!isPlainObject(defaults)) return base;
  if (!isPlainObject(base)) base = {};

  Object.keys(defaults).forEach(function(k) {
    var dv = defaults[k];
    var bv = base[k];

    if (bv === undefined) {
      base[k] = deepClone(dv);
      return;
    }

    if (isPlainObject(dv) && isPlainObject(bv)) {
      mergeDefaults(bv, dv);
    }
  });

  return base;
}

export function migrate(data, targetVersion) {
  var tv = parseInt(targetVersion, 10) || SAVE_SCHEMA_VERSION;
  if (!data || typeof data !== 'object') return null;

  var out = data;
  if (!out.schemaVersion) out.schemaVersion = out.schemaVersion || 0;
  if (!out.G || typeof out.G !== 'object') out.G = {};
  if (!out.GS || typeof out.GS !== 'object') out.GS = {};

  out.G = mergeDefaults(out.G, defaultG());
  out.G = migrateState(out.G);
  out.GS = mergeDefaults(out.GS, {
    totalDeals: 0,
    totalProfit: 0,
    bestScore: 0,
    achievements: {}
  });

  out.schemaVersion = tv;
  return out;
}

export function migrateState(Gin) {
  var g = (Gin && typeof Gin === 'object') ? Gin : {};

  mergeDefaults(g, defaultG());

  if (typeof g.day !== 'number' || !isFinite(g.day)) g.day = 1;
  if (typeof g.m !== 'number' || !isFinite(g.m)) g.m = 0;
  if (typeof g.rep !== 'number' || !isFinite(g.rep)) g.rep = 0;
  if (!g.meta || typeof g.meta !== 'object') g.meta = {};
  if (typeof g.meta.lastPatchId !== 'number' || !isFinite(g.meta.lastPatchId)) g.meta.lastPatchId = 0;
  if (!g.ui || typeof g.ui !== 'object') g.ui = {};
  if (!g.services || typeof g.services !== 'object') g.services = {};
  if (!Array.isArray(g.gar)) g.gar = [];
  if (!Array.isArray(g.mkt)) g.mkt = [];

  return g;
}

function validateSnapshotPayload(payload) {
  if (!payload || typeof payload !== 'object') return { ok: false, err: 'payload' };

  var mig = migrate(payload, SAVE_SCHEMA_VERSION);
  if (!mig) return { ok: false, err: 'migrate' };

  var vg = validateG(mig.G);
  if (!vg.ok) return { ok: false, err: 'G: ' + vg.err };
  var vgs = validateGS(mig.GS);
  if (!vgs.ok) return { ok: false, err: 'GS: ' + vgs.err };
  return { ok: true };
}

async function twoPhaseSet(mainKey, payload) {
  var tempKey = TMP_KEY_PREFIX + mainKey;
  await idbSet(tempKey, payload);

  var readBack = await idbGet(tempKey);
  var v = validateSnapshotPayload(readBack);
  if (!v.ok) {
    try { await idbDel(tempKey); } catch(e) {}
    throw new Error('twoPhase: invalid temp payload: ' + v.err);
  }

  await idbSet(mainKey, readBack);
  try { await idbDel(tempKey); } catch(e) {}
  return true;
}

function reasonLabel(code) {
  return REASON_LABELS[code] || code || 'Автосейв';
}

export async function saveSnapshot(reason) {
  try {
    var code = reason || 'auto';
    var payload = {
      ts: nowIso(),
      reason: code,
      reasonLabel: reasonLabel(code),
      appVersion: APP_VERSION,
      build: BUILD_VERSION,
      commit: COMMIT_HASH,
      schemaVersion: SAVE_SCHEMA_VERSION,
      preview: {
        day: (G && typeof G.day === 'number') ? G.day : null,
        money: (G && typeof G.m === 'number') ? G.m : null
      },
      G: deepClone(G),
      GS: deepClone(GS)
    };

    var v = validateSnapshotPayload(payload);
    if (!v.ok) return false;

    var a1 = await idbGet(KEYS[0]);
    var a2 = await idbGet(KEYS[1]);
    if (a2) await twoPhaseSet(KEYS[2], a2);
    if (a1) await twoPhaseSet(KEYS[1], a1);
    await twoPhaseSet(KEYS[0], payload);

    return true;
  } catch(e) {
    return false;
  }
}

export async function listSnapshots() {
  var out = [];
  for (var i = 0; i < KEYS.length; i++) {
    try {
      var p = await idbGet(KEYS[i]);
      if (p) {
        var mp = migrate(p, SAVE_SCHEMA_VERSION);
        var v = validateSnapshotPayload(mp);
        out.push({ key: KEYS[i], index: i + 1, payload: mp, valid: v.ok, err: v.ok ? null : v.err });
      } else {
        out.push({ key: KEYS[i], index: i + 1, payload: null, valid: false, err: 'empty' });
      }
    } catch(e) {
      out.push({ key: KEYS[i], index: i + 1, payload: null, valid: false, err: 'idb error' });
    }
  }
  return out;
}

async function applyPayload(payload) {
  payload = migrate(payload, SAVE_SCHEMA_VERSION);
  var v = validateSnapshotPayload(payload);
  if (!v.ok) return { ok: false, err: v.err };

  replaceG(payload.G);
  replaceGS(payload.GS);
  saveGlobalStats();
  return { ok: true };
}

export async function restoreFromBackup(index) {
  try {
    var idx = Math.max(1, Math.min(3, parseInt(index, 10) || 1));
    var key = KEYS[idx - 1];
    var payload = await idbGet(key);
    var res = await applyPayload(payload);
    if (!res.ok) {
      toast('⛔ Бэкап битый: ' + res.err, 'error');
      return false;
    }

    localStorage.setItem(PENDING_RESTORE_KEY, key);
    toast('🧬 Восстановлено: AutoSave_' + idx, 'success');
    setTimeout(function() { location.reload(); }, 250);
    return true;
  } catch(e) {
    toast('❌ Ошибка восстановления', 'error');
    return false;
  }
}

export async function consumePendingRestore() {
  try {
    var key = localStorage.getItem(PENDING_RESTORE_KEY);
    if (!key) return false;
    localStorage.removeItem(PENDING_RESTORE_KEY);
    var payload = await idbGet(key);
    var res = await applyPayload(payload);
    return !!res.ok;
  } catch(e) {
    try { localStorage.removeItem(PENDING_RESTORE_KEY); } catch(err) {}
    return false;
  }
}

export async function softResetSession() {
  try {
    replaceG(defaultG());
    saveGlobalStats();
    toast('🧼 Сессия сброшена (прогресс сохранён)', 'success');
    setTimeout(function() { location.reload(); }, 250);
    return true;
  } catch(e) {
    toast('❌ Ошибка сброса', 'error');
    return false;
  }
}

export function validateCurrentState() {
  var vg = validateG(G);
  if (!vg.ok) return { ok: false, err: 'G: ' + vg.err };
  var vgs = validateGS(GS);
  if (!vgs.ok) return { ok: false, err: 'GS: ' + vgs.err };
  return { ok: true };
}

export async function nukeSnapshots() {
  try {
    await Promise.all(KEYS.map(function(k) { return idbDel(k); }));
    return true;
  } catch(e) { return false; }
}
