// PEREKUP 2077 — Updater v3.1.1 stable-max
import { toast } from '../core/utils.js';
import { APP_VERSION, BUILD_VERSION, G } from '../core/state.js';
import { show } from '../ui/screens.js';
import { saveSnapshot } from '../core/snapshots.js';
import { getPatchFunction } from './patches.js';

var LS_BUILD = 'app_build';
var EMERGENCY_KEY = 'p2077_emergency_off';
var PATCH_META_KEY = 'p2077_patch_meta';
var REMOTE_CACHE_KEY = 'p2077_remote_version_cache';
var PATCH_CACHE_KEY = 'p2077_patch_manifest_cache';
var REMOTE_CHECK_META_KEY = 'p2077_remote_check_meta';
var DEFAULT_REMOTE = {
  version: parseInt(BUILD_VERSION, 10) || 311,
  build: parseInt(BUILD_VERSION, 10) || 311,
  versionName: APP_VERSION,
  min_supported: 308,
  forceUpdateBelow: 308,
  patch_api: './patches/patches.json',
  apk_url: '',
  web_url: './',
  changelog: ['Локальная встроенная конфигурация обновлений'],
  notes: 'Игра использует встроенную конфигурацию, если GitHub временно недоступен.'
};

function bust(url) {
  return url + (url.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now();
}

function dedupe(list) {
  var seen = new Set();
  return list.filter(function (item) {
    if (!item || seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function guessBasePath() {
  try {
    var path = location.pathname || '/';
    if (/\/index\.html$/i.test(path)) path = path.replace(/index\.html$/i, '');
    if (!path.endsWith('/')) path += '/';
    return path;
  } catch (e) {
    return '/';
  }
}

function makeCandidates(file) {
  var base = guessBasePath();
  var clean = file.replace(/^\.?\//, '');
  var first = base + clean;
  var rootUrl = '/' + clean;
  var currentDir = './' + clean;
  var absolute = location.origin + base + clean;
  return dedupe([currentDir, first, absolute, rootUrl]);
}

function safeParse(raw, fallback) {
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

function saveJsonCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}

function readJsonCache(key) {
  return safeParse(localStorage.getItem(key) || '', null);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, ms || 3500);
    })
  ]);
}

async function fetchJsonWithFallback(candidates, cacheKey, embeddedFallback) {
  var lastError = null;
  for (var i = 0; i < candidates.length; i++) {
    var url = candidates[i];
    try {
      var res = await withTimeout(fetch(bust(url), { cache: 'no-store' }), 3500);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' @ ' + url);
      var data = await res.json();
      data.__source = url;
      saveJsonCache(cacheKey, data);
      try { localStorage.setItem(REMOTE_CHECK_META_KEY, JSON.stringify({ ok: true, at: Date.now(), source: url })); } catch (e) {}
      return { ok: true, data: data, source: url, fromCache: false, fromEmbedded: false };
    } catch (e) {
      lastError = e;
    }
  }

  var cached = readJsonCache(cacheKey);
  if (cached) {
    try { localStorage.setItem(REMOTE_CHECK_META_KEY, JSON.stringify({ ok: false, at: Date.now(), source: cached.__source || 'local-cache' })); } catch (e) {}
    return { ok: true, data: cached, source: cached.__source || 'local-cache', fromCache: true, fromEmbedded: false };
  }

  if (embeddedFallback) {
    return { ok: true, data: embeddedFallback, source: 'embedded-default', fromCache: false, fromEmbedded: true };
  }

  return { ok: false, error: lastError || new Error('No candidates') };
}

function getVersionCandidates() {
  return makeCandidates('version.json');
}

function getPatchCandidates() {
  return makeCandidates('patches/patches.json');
}

function isInApk() {
  if (typeof window.isInApk === 'function') return !!window.isInApk();
  return !!window.isInApk;
}

function isEmergencyMode() {
  if (typeof window.isEmergencyMode === 'function') return !!window.isEmergencyMode();
  return localStorage.getItem(EMERGENCY_KEY) === '1';
}

function setPatchStatus(text, type) {
  var status = document.getElementById('pn-status');
  if (!status) return;
  status.textContent = text;
  status.style.color = type === 'ok' ? '#00ff88' : type === 'warn' ? '#ffd700' : type === 'err' ? '#ff6666' : '#aaa';
}

function setPatchNotes(data) {
  var notes = document.getElementById('pn-notes');
  var buildEl = document.getElementById('pn-build');
  var verEl = document.getElementById('pn-ver');
  var titleEl = document.getElementById('pn-title');
  if (buildEl) buildEl.textContent = String(data.build || data.version || BUILD_VERSION);
  if (verEl) verEl.textContent = String(data.versionName || APP_VERSION);
  if (titleEl) titleEl.textContent = String(data.versionName || 'v' + APP_VERSION);
  if (notes) {
    var lines = Array.isArray(data.changelog) ? data.changelog : [data.notes || 'Локальная версия без заметок'];
    notes.innerHTML = lines.map(function (c) { return '<div style="padding:4px 0;">• ' + c + '</div>'; }).join('');
  }
}

function setUpdateBtn(visible) {
  var btn = document.getElementById('pn-update-btn');
  if (btn) btn.style.display = visible ? 'inline-block' : 'none';
}

function readPatchMeta() {
  try {
    var raw = JSON.parse(localStorage.getItem(PATCH_META_KEY) || '{}');
    if (typeof raw.lastPatchId !== 'number' || !isFinite(raw.lastPatchId)) raw.lastPatchId = 0;
    return raw;
  } catch (e) {
    return { lastPatchId: 0 };
  }
}

function writePatchMeta(meta) {
  try { localStorage.setItem(PATCH_META_KEY, JSON.stringify(meta || { lastPatchId: 0 })); } catch (e) {}
}

function getCurrentWebUrl() {
  var href = location.href.replace(/[?#].*$/, '');
  if (/\/index\.html$/i.test(href)) return href;
  if (!href.endsWith('/')) href += '/';
  return href;
}

async function registerSW() {
  try {
    var swUrl = './sw.js?v=' + BUILD_VERSION;
    var reg = await navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' });
    if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          location.reload();
        }
      });
    });
    return reg;
  } catch (e) {
    console.log('[SW] Skip:', e && e.message ? e.message : e);
    return null;
  }
}

function updateLiveNetworkBadge() {
  var online = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
  var meta = readJsonCache(REMOTE_CHECK_META_KEY);
  if (!online) {
    setPatchStatus('📦 Оффлайн-режим: сеть недоступна, используется локальная конфигурация', 'warn');
    return;
  }
  if (meta && meta.ok) {
    setPatchStatus('✅ Связь есть • сервер обновлений доступен', 'ok');
    return;
  }
  if (meta && !meta.ok) {
    setPatchStatus('📦 Сервер обновлений недоступен, игра работает в локальном режиме', 'warn');
    return;
  }
  setPatchStatus('Готов к проверке', '');
}

export function initUpdater() {
  if ('serviceWorker' in navigator && !isEmergencyMode()) registerSW();
  if (!localStorage.getItem(LS_BUILD)) localStorage.setItem(LS_BUILD, String(BUILD_VERSION));
  window.addEventListener('online', function () {
    updateLiveNetworkBadge();
    setTimeout(function () { checkForUpdate(false); }, 300);
  });
  window.addEventListener('offline', updateLiveNetworkBadge);
  setTimeout(function () {
    updateLiveNetworkBadge();
    checkForUpdate(false);
  }, 800);
}

export function showPatchNotes() {
  show('patch-screen');
  updateLiveNetworkBadge();
  checkForUpdate(false);
}

export async function checkForUpdate(showToast) {
  try {
    setPatchStatus(isEmergencyMode() ? '🛑 Аварийный режим: кеш/SW отключены' : 'Проверяю обновления...');
    var result = await fetchJsonWithFallback(getVersionCandidates(), REMOTE_CACHE_KEY, DEFAULT_REMOTE);
    if (!result.ok || !result.data) throw result.error || new Error('version unavailable');

    var data = result.data;
    setPatchNotes(data);

    var serverBuild = parseInt(data.version || data.build, 10) || DEFAULT_REMOTE.version;
    var localBuild = parseInt(localStorage.getItem(LS_BUILD) || BUILD_VERSION, 10);
    var forceFloor = parseInt(data.min_supported || data.forceUpdateBelow || 0, 10) || 0;

    if (forceFloor && localBuild < forceFloor) {
      setPatchStatus('🚨 Требуется критическое обновление', 'err');
      setUpdateBtn(true);
      window._updateData = data;
      if (showToast) toast('🚨 Нужна новая версия', 'error');
      return;
    }

    if (serverBuild > localBuild) {
      setPatchStatus('🔄 Доступно обновление: v' + (data.versionName || serverBuild), 'warn');
      setUpdateBtn(true);
      window._updateData = data;
      if (showToast) toast('🔄 Есть обновление!', 'success');
      return;
    }

    localStorage.setItem(LS_BUILD, String(BUILD_VERSION));
    setUpdateBtn(false);

    if (result.fromEmbedded) {
      setPatchStatus('📦 Локальный режим: используется встроенная конфигурация обновлений', 'warn');
      if (showToast) toast('📦 Локальный режим', 'success');
    } else if (result.fromCache) {
      setPatchStatus('📦 Сервер временно недоступен, используется локальный кеш', 'warn');
      if (showToast) toast('📦 Локальный кеш', 'success');
    } else {
      setPatchStatus(isEmergencyMode() ? '🛑 Аварийный режим включён • версия актуальна' : '✅ Связь есть • версия актуальна', 'ok');
      if (showToast) toast('✅ Актуально', 'success');
    }
  } catch (e) {
    console.warn('[UPDATE]', e);
    setUpdateBtn(false);
    setPatchNotes(DEFAULT_REMOTE);
    setPatchStatus('📦 Игра работает локально: конфиг обновлений недоступен', 'warn');
    if (showToast) toast('📦 Локальный режим', 'success');
  }
}

export async function applyUpdate() {
  var btn = document.getElementById('pn-update-btn');

  try {
    var data = window._updateData || readJsonCache(REMOTE_CACHE_KEY) || DEFAULT_REMOTE;
    var apkUrl = data.apk_url || data.apkUrl || '';
    var webUrl = data.web_url || getCurrentWebUrl();

    if (isInApk() && apkUrl) {
      try {
        var intentUrl = 'intent://' + String(apkUrl).replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
        location.href = intentUrl;
        setTimeout(function () { try { window.open(apkUrl, '_blank'); } catch (e) {} location.href = apkUrl; }, 800);
      } catch (e) {
        try { window.open(apkUrl, '_blank'); } catch (err) {}
        location.href = apkUrl;
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Обновляю...'; }
    setPatchStatus('Очищаю кеш и перезагружаю...', 'warn');

    if (window.nukeAllCaches) await window.nukeAllCaches();

    localStorage.setItem(LS_BUILD, String(data.version || data.build || BUILD_VERSION));
    setPatchStatus('✅ Перезапуск...', 'ok');
    toast('🚀 Обновлено!', 'success');
    setTimeout(function () {
      location.href = webUrl + (webUrl.indexOf('?') === -1 ? '?' : '&') + 'clean=' + Date.now();
    }, 300);
  } catch (e) {
    console.warn('[UPDATE]', e);
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ Обновить'; }
    setPatchStatus('❌ Ошибка обновления', 'err');
    toast('❌ Ошибка', 'error');
  }
}

export async function resetAppCachesAndReload() {
  toast('🧹 Очищаю...', 'success');
  try {
    var globalStats = localStorage.getItem('globalStats');
    var pb = localStorage.getItem('pb');
    var patchMeta = localStorage.getItem(PATCH_META_KEY);
    var remoteCache = localStorage.getItem(REMOTE_CACHE_KEY);
    var patchCache = localStorage.getItem(PATCH_CACHE_KEY);

    if (window.nukeAllCaches) await window.nukeAllCaches();

    localStorage.clear();
    if (globalStats) localStorage.setItem('globalStats', globalStats);
    if (pb) localStorage.setItem('pb', pb);
    if (patchMeta) localStorage.setItem(PATCH_META_KEY, patchMeta);
    if (remoteCache) localStorage.setItem(REMOTE_CACHE_KEY, remoteCache);
    if (patchCache) localStorage.setItem(PATCH_CACHE_KEY, patchCache);
  } catch (e) {
    console.log('Reset error:', e);
  }

  setTimeout(function () {
    location.href = './index.html?reset=' + Date.now();
  }, 300);
}

export async function toggleEmergencyMode() {
  try {
    var next = !isEmergencyMode();
    if (next) {
      localStorage.setItem(EMERGENCY_KEY, '1');
      toast('🛑 Аварийный режим включён', 'error');
    } else {
      localStorage.removeItem(EMERGENCY_KEY);
      toast('✅ Аварийный режим выключен', 'success');
    }
    if (window.nukeAllCaches) await window.nukeAllCaches();
  } catch (e) {
    console.log('Emergency toggle error:', e);
  }

  setTimeout(function () {
    location.href = './index.html' + (isEmergencyMode() ? '?safe=1&' : '?') + 't=' + Date.now();
  }, 250);
}

export async function applyGamePatches() {
  try {
    var defaultManifest = { latest: 0, patches: [] };
    var result = await fetchJsonWithFallback(getPatchCandidates(), PATCH_CACHE_KEY, defaultManifest);
    if (!result.ok || !result.data) throw result.error || new Error('patch manifest unavailable');
    var manifest = result.data;
    if (!manifest || !Array.isArray(manifest.patches)) return 0;

    if (!G.meta || typeof G.meta !== 'object') G.meta = {};
    if (typeof G.meta.lastPatchId !== 'number' || !isFinite(G.meta.lastPatchId)) G.meta.lastPatchId = 0;

    var meta = readPatchMeta();
    var currentPatchId = Math.max(meta.lastPatchId || 0, G.meta.lastPatchId || 0);
    var pending = manifest.patches.filter(function (patch) { return patch.id > currentPatchId; }).sort(function (a, b) { return a.id - b.id; });

    for (var i = 0; i < pending.length; i++) {
      var patch = pending[i];
      var fn = getPatchFunction(patch.run);
      if (!fn) {
        console.warn('[PATCH] missing fn', patch.run);
        continue;
      }
      await saveSnapshot('before_patch_' + patch.id);
      fn(G);
      G.meta.lastPatchId = patch.id;
      meta.lastPatchId = patch.id;
      writePatchMeta(meta);
    }

    return pending.length;
  } catch (e) {
    console.warn('[PATCH]', e);
    return 0;
  }
}
