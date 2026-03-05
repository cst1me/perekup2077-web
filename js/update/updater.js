// PEREKUP 2077 — Update System v3.0.5
import { toast } from '../core/utils.js';
import { APP_VERSION } from '../core/state.js';
import { show } from '../ui/screens.js';

var MANIFEST_URL = 'https://raw.githubusercontent.com/cst1me/perekup2077-web/main/manifest.json';
var LS_BUILD_KEY = 'app_build';
var manifestCache = null;

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchManifest() {
  try {
    var res = await fetch(MANIFEST_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch(e) {
    console.log('Manifest fetch error:', e);
    return null;
  }
}

function setPatchStatus(text, type) {
  var el = document.getElementById('pn-status');
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'ok' ? '#00ff88' : type === 'warn' ? '#ffd700' : type === 'err' ? '#ff2d2d' : 'rgba(255,255,255,0.75)';
}

function showUpdateBtn(doShow) {
  var btn = document.getElementById('pn-update-btn');
  if (btn) btn.style.display = doShow ? 'inline-block' : 'none';
}

export function initUpdater() {
  // Регистрируем SW только если доступен и не в APK
  if ('serviceWorker' in navigator && !isInApk()) {
    registerSW();
  }
  setTimeout(function() { checkForUpdate(false); }, 2000);
}

function isInApk() {
  // Определяем APK/WebView
  if (typeof window.__APK_PACKAGE_OK !== 'undefined') return true;
  if (navigator.userAgent.includes('wv')) return true;
  if (document.referrer.includes('android-app://')) return true;
  return false;
}

async function registerSW() {
  try {
    await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
  } catch(e) { 
    console.log('SW registration skipped:', e); 
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
    setPatchStatus('Проверяю...');
    manifestCache = await fetchManifest();
    
    if (!manifestCache) {
      setPatchStatus('Нет связи с сервером', 'err');
      showUpdateBtn(false);
      return;
    }

    var pnTitle = document.getElementById('pn-title');
    var pnNotes = document.getElementById('pn-notes');
    var pnBuild = document.getElementById('pn-build');
    var pnVer = document.getElementById('pn-ver');

    if (pnTitle) pnTitle.textContent = manifestCache.title || 'Обновления';
    if (pnBuild) pnBuild.textContent = String(manifestCache.build || manifestCache.version || '—');
    if (pnVer) pnVer.textContent = String(manifestCache.versionName || APP_VERSION);

    if (pnNotes) {
      var notes = manifestCache.notes || [];
      pnNotes.innerHTML = (notes.length ? notes : ['Нет заметок']).map(function(n) {
        return '<div class="changelog-item">• ' + escapeHtml(n) + '</div>';
      }).join('');
    }

    var installedBuild = parseInt(localStorage.getItem(LS_BUILD_KEY) || '0', 10) || 0;
    var serverBuild = parseInt(manifestCache.build || manifestCache.version || 0, 10) || 0;

    if (serverBuild > installedBuild) {
      showUpdateBtn(true);
      setPatchStatus('🔄 Доступно: v' + serverBuild + ' (у тебя: ' + (installedBuild || 'нет') + ')', 'warn');
      if (showToasts) toast('🔄 Есть обновление!', 'success');
    } else {
      showUpdateBtn(false);
      localStorage.setItem(LS_BUILD_KEY, String(serverBuild));
      setPatchStatus('✅ Версия актуальна (v' + serverBuild + ')', 'ok');
      if (showToasts) toast('✅ Актуально', 'success');
    }
  } catch(e) {
    showUpdateBtn(false);
    setPatchStatus('Ошибка проверки', 'err');
  }
}

export async function applyUpdate() {
  // В APK обновление происходит автоматически через MainActivity
  if (isInApk()) {
    toast('📱 APK обновится автоматически при перезапуске', 'success');
    return;
  }

  try {
    if (!manifestCache) manifestCache = await fetchManifest();
    if (!manifestCache) {
      toast('Нет связи', 'error');
      return;
    }

    var btn = document.getElementById('pn-update-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⬇️ Обновляю...'; }

    setPatchStatus('Обновляю...', 'warn');

    // Очищаем кеши браузера
    if (window.caches) {
      try {
        var keys = await caches.keys();
        await Promise.all(keys.map(function(k) { return caches.delete(k); }));
      } catch(e) {}
    }

    // Удаляем SW
    if (navigator.serviceWorker) {
      try {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function(r) { return r.unregister(); }));
      } catch(e) {}
    }

    var serverBuild = manifestCache.build || manifestCache.version || 305;
    localStorage.setItem(LS_BUILD_KEY, String(serverBuild));

    setPatchStatus('✅ Готово! Перезагружаю...', 'ok');
    toast('🚀 Обновлено!', 'success');

    setTimeout(function() { location.reload(true); }, 500);
  } catch(e) {
    var btn = document.getElementById('pn-update-btn');
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ Обновить'; }
    setPatchStatus('Ошибка', 'err');
    toast('❌ Ошибка', 'error');
  }
}

export async function resetAppCachesAndReload() {
  toast('🧹 Очищаю...', 'success');
  
  try {
    // Очищаем localStorage кроме важных данных
    var globalStats = localStorage.getItem('globalStats');
    var pb = localStorage.getItem('pb');
    
    // Очищаем кеши
    if (window.caches) {
      try {
        var keys = await caches.keys();
        await Promise.all(keys.map(function(k) { return caches.delete(k); }));
      } catch(e) { console.log('Cache clear error:', e); }
    }

    // Удаляем SW (только если не в APK)
    if (!isInApk() && navigator.serviceWorker) {
      try {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function(r) { return r.unregister(); }));
      } catch(e) { console.log('SW unregister error:', e); }
    }

    localStorage.removeItem(LS_BUILD_KEY);
    
    // Восстанавливаем прогресс
    if (globalStats) localStorage.setItem('globalStats', globalStats);
    if (pb) localStorage.setItem('pb', pb);
    
  } catch(e) {
    console.log('Reset error:', e);
  }

  // Перезагрузка
  setTimeout(function() {
    location.href = './index.html?reset=' + Date.now();
  }, 300);
}
