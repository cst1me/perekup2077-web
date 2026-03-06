// PEREKUP 2077 — Updater v3.0.8
import { toast } from '../core/utils.js';
import { APP_VERSION, BUILD_VERSION } from '../core/state.js';
import { show } from '../ui/screens.js';

var VERSION_URL = 'https://raw.githubusercontent.com/cst1me/perekup2077-web/main/version.json';
var LS_BUILD = 'app_build';
var EMERGENCY_KEY = 'p2077_emergency_off';

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
  if (notes && data.changelog) {
    notes.innerHTML = data.changelog.map(function(c) {
      return '<div style="padding:4px 0;">• ' + c + '</div>';
    }).join('');
  }
}

function setUpdateBtn(visible) {
  var btn = document.getElementById('pn-update-btn');
  if (btn) btn.style.display = visible ? 'inline-block' : 'none';
}

async function registerSW() {
  try {
    await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
  } catch(e) {
    console.log('[SW] Skip:', e && e.message ? e.message : e);
  }
}

export function initUpdater() {
  if ('serviceWorker' in navigator && !isInApk() && !isEmergencyMode()) {
    registerSW();
  }
  setTimeout(function() { checkForUpdate(false); }, 2000);
}

export function showPatchNotes() {
  show('patch-screen');
  checkForUpdate(false);
}

export async function checkForUpdate(showToast) {
  try {
    setPatchStatus(isEmergencyMode() ? '🛑 Аварийный режим: кеш/SW отключены' : 'Проверяю...');

    var res = await fetch(VERSION_URL + '?_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();

    setPatchNotes(data);

    var serverBuild = parseInt(data.version || data.build, 10) || 0;
    var localBuild = parseInt(localStorage.getItem(LS_BUILD) || BUILD_VERSION, 10);

    if (serverBuild > localBuild) {
      setPatchStatus('🔄 Доступно: v' + (data.versionName || serverBuild), 'warn');
      setUpdateBtn(true);
      if (showToast) toast('🔄 Есть обновление!', 'success');
      window._updateData = data;
    } else {
      localStorage.setItem(LS_BUILD, String(BUILD_VERSION));
      setPatchStatus(isEmergencyMode() ? '🛑 Аварийный режим включён • версия актуальна' : '✅ Актуальная версия', 'ok');
      setUpdateBtn(false);
      if (showToast) toast('✅ Актуально', 'success');
    }
  } catch(e) {
    console.warn('[UPDATE]', e);
    setPatchStatus('⚠️ Нет связи', 'err');
    setUpdateBtn(false);
    if (showToast) toast('⚠️ Ошибка', 'error');
  }
}

export async function applyUpdate() {
  var btn = document.getElementById('pn-update-btn');

  try {
    if (isInApk()) {
      toast('📱 APK обновится автоматически при перезапуске', 'success');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Обновляю...'; }
    setPatchStatus('Очищаю кеш...', 'warn');

    if (window.nukeAllCaches) await window.nukeAllCaches();

    var data = window._updateData || {};
    localStorage.setItem(LS_BUILD, String(data.version || data.build || BUILD_VERSION));

    setPatchStatus('✅ Перезагружаю...', 'ok');
    toast('🚀 Обновлено!', 'success');
    setTimeout(function() { location.href = './index.html?v=' + Date.now(); }, 500);
  } catch(e) {
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

    if (window.nukeAllCaches) {
      await window.nukeAllCaches();
    }

    localStorage.clear();
    if (globalStats) localStorage.setItem('globalStats', globalStats);
    if (pb) localStorage.setItem('pb', pb);
  } catch(e) {
    console.log('Reset error:', e);
  }

  setTimeout(function() {
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
  } catch(e) {
    console.log('Emergency toggle error:', e);
  }

  setTimeout(function() {
    location.href = './index.html' + (isEmergencyMode() ? '?safe=1&' : '?') + 't=' + Date.now();
  }, 250);
}
