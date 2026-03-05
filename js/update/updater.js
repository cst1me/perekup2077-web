// PEREKUP 2077 — Update System v3.0.5
import { toast } from '../core/utils.js';
import { APP_VERSION } from '../core/state.js';
import { show } from '../ui/screens.js';

var MANIFEST_URL = 'https://raw.githubusercontent.com/cst1me/perekup2077-web/main/manifest.json';
var LS_BUILD_KEY = 'app_build';
var LS_APK_SKIP = 'apk_update_skip';
var manifestCache = null;

// Определяем запущено ли в APK/TWA
function isRunningInApp() {
  // TWA
  if (document.referrer.includes('android-app://')) return true;
  // WebView
  if (navigator.userAgent.includes('wv')) return true;
  // Standalone PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Проверка на fullscreen без браузерного UI
  if (window.navigator.standalone === true) return true;
  return false;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchManifest() {
  var res = await fetch(MANIFEST_URL + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('manifest fetch failed');
  return await res.json();
}

function setPatchStatus(text, type) {
  var el = document.getElementById('pn-status');
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'ok' ? '#00ff88' : type === 'warn' ? '#ffd700' : type === 'err' ? '#ff2d2d' : 'rgba(255,255,255,0.75)';
}

function showUpdateBtn(show) {
  var btn = document.getElementById('pn-update-btn');
  if (btn) btn.style.display = show ? 'inline-block' : 'none';
}

// ========== APK UPDATE POPUP ==========
function showApkUpdatePopup(newVersion, downloadUrl) {
  // Проверяем не пропустил ли пользователь эту версию
  var skipped = localStorage.getItem(LS_APK_SKIP);
  if (skipped === newVersion) return;

  // Создаём попап
  var popup = document.createElement('div');
  popup.id = 'apk-update-popup';
  popup.innerHTML = 
    '<div class="apk-popup-overlay">' +
      '<div class="apk-popup-card">' +
        '<div class="apk-popup-icon">🚀</div>' +
        '<div class="apk-popup-title">Доступно обновление!</div>' +
        '<div class="apk-popup-ver">Версия ' + escapeHtml(newVersion) + '</div>' +
        '<div class="apk-popup-desc">Новая версия игры доступна для скачивания. Рекомендуем обновить для лучшего опыта!</div>' +
        '<div class="apk-popup-btns">' +
          '<button class="apk-btn-update" onclick="downloadApkUpdate()">⬇️ Скачать</button>' +
          '<button class="apk-btn-later" onclick="skipApkUpdate(\'' + escapeHtml(newVersion) + '\')">Позже</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  
  document.body.appendChild(popup);
  
  // Сохраняем URL для скачивания
  window._apkDownloadUrl = downloadUrl;
}

function downloadApkUpdate() {
  var url = window._apkDownloadUrl || 'https://cst1me.itch.io/perekup2077';
  window.open(url, '_blank');
  closeApkPopup();
}

function skipApkUpdate(version) {
  localStorage.setItem(LS_APK_SKIP, version);
  closeApkPopup();
}

function closeApkPopup() {
  var popup = document.getElementById('apk-update-popup');
  if (popup) popup.remove();
}

// ========== INIT ==========
export function initUpdater() {
  registerSW();
  
  // Проверяем обновления через 2 секунды после загрузки
  setTimeout(function() { 
    checkForUpdate(false); 
    checkApkUpdate();
  }, 2000);
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
  } catch(e) { console.log('SW registration failed:', e); }
}

// Проверка обновления APK
async function checkApkUpdate() {
  if (!isRunningInApp()) return; // Только для APK/PWA
  
  try {
    var manifest = await fetchManifest();
    var currentBuild = parseInt(localStorage.getItem(LS_BUILD_KEY) || '0', 10);
    var serverBuild = parseInt(manifest.build || 0, 10);
    
    // Если на сервере есть apk_version и она новее
    if (manifest.apk_version && manifest.apk_download) {
      var installedApk = localStorage.getItem('installed_apk_version') || '0';
      if (manifest.apk_version !== installedApk) {
        showApkUpdatePopup(manifest.apk_version, manifest.apk_download);
      }
    }
  } catch(e) {
    console.log('APK update check failed:', e);
  }
}

export function showPatchNotes() {
  show('patch-screen');
  renderPatchNotes();
  checkForUpdate(false);
}

function renderPatchNotes() {
  try {
    var b = localStorage.getItem(LS_BUILD_KEY) || '';
    var pnBuild = document.getElementById('pn-build');
    var pnVer = document.getElementById('pn-ver');
    if (pnBuild) pnBuild.textContent = b || '—';
    if (pnVer) pnVer.textContent = APP_VERSION;
  } catch(e) {}
}

export async function checkForUpdate(showToasts) {
  try {
    setPatchStatus('Проверяю обновление…');
    manifestCache = await fetchManifest();

    var pnTitle = document.getElementById('pn-title');
    var pnNotes = document.getElementById('pn-notes');
    var pnBuild = document.getElementById('pn-build');
    var pnVer = document.getElementById('pn-ver');

    if (pnTitle) pnTitle.textContent = manifestCache.title || 'Обновления';
    if (pnBuild) pnBuild.textContent = String(manifestCache.build || '—');
    if (pnVer) pnVer.textContent = String(manifestCache.version || APP_VERSION);

    if (pnNotes) {
      var notes = manifestCache.notes || [];
      pnNotes.innerHTML = (notes.length ? notes : ['Нет заметок']).map(function(n) {
        return '<div class="changelog-item">• ' + escapeHtml(n) + '</div>';
      }).join('');
    }

    var installedBuild = parseInt(localStorage.getItem(LS_BUILD_KEY) || '0', 10) || 0;
    var newBuild = parseInt(String(manifestCache.build || 0), 10) || 0;

    if (newBuild > installedBuild) {
      showUpdateBtn(true);
      setPatchStatus('🔄 Доступно: build ' + newBuild + ' (у тебя: ' + (installedBuild || 'нет') + ')', 'warn');
      if (showToasts) toast('🔄 Доступно обновление!', 'success');
    } else {
      showUpdateBtn(false);
      setPatchStatus('✅ Актуальная версия (build ' + (installedBuild || newBuild) + ')', 'ok');
      if (showToasts) toast('✅ Версия актуальна', 'success');
    }
  } catch(e) {
    showUpdateBtn(false);
    setPatchStatus('❌ Ошибка проверки (нет сети?)', 'err');
    if (showToasts) toast('⚠️ Ошибка проверки', 'error');
  }
}

export async function applyUpdate() {
  try {
    if (!manifestCache) manifestCache = await fetchManifest();

    var installedBuild = parseInt(localStorage.getItem(LS_BUILD_KEY) || '0', 10) || 0;
    var newBuild = parseInt(String(manifestCache.build || 0), 10) || 0;

    if (!(newBuild > installedBuild)) {
      toast('✅ Уже актуально', 'success');
      showUpdateBtn(false);
      return;
    }

    var btn = document.getElementById('pn-update-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⬇️ Скачиваю…'; }

    setPatchStatus('Скачиваю обновление…', 'warn');

    // Очищаем кеши
    if (window.caches) {
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }

    // Удаляем SW
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function(r) { return r.unregister(); }));
    }

    // Сохраняем версию
    localStorage.setItem(LS_BUILD_KEY, String(newBuild));

    setPatchStatus('✅ Готово! Перезагружаю…', 'ok');
    toast('🚀 Обновление установлено!', 'success');

    setTimeout(function() { location.reload(true); }, 500);
  } catch(e) {
    var btn = document.getElementById('pn-update-btn');
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ Обновить'; }
    setPatchStatus('❌ Ошибка: ' + String(e.message || e), 'err');
    toast('❌ Ошибка обновления', 'error');
  }
}

export async function resetAppCachesAndReload() {
  try {
    toast('🧹 Очищаю кеш…', 'success');
    
    if (window.caches) {
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }

    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function(r) { return r.unregister(); }));
    }

    localStorage.removeItem(LS_BUILD_KEY);
    localStorage.removeItem(LS_APK_SKIP);
  } catch(e) {
    console.warn(e);
  }

  location.href = './?fix=' + Date.now();
}

// Expose for onclick
if (typeof window !== 'undefined') {
  window.downloadApkUpdate = downloadApkUpdate;
  window.skipApkUpdate = skipApkUpdate;
  window.closeApkPopup = closeApkPopup;
}
