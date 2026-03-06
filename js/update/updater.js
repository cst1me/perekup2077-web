// PEREKUP 2077 — Updater v3.0.7
import { toast } from '../core/utils.js';
import { APP_VERSION, BUILD_VERSION } from '../core/state.js';
import { show } from '../ui/screens.js';

var VERSION_URL = 'https://raw.githubusercontent.com/cst1me/perekup2077-web/main/version.json';
var LS_BUILD = 'app_build';

export function initUpdater() {
  // Register SW only in browser (not APK)
  if ('serviceWorker' in navigator && !window.isInApk()) {
    navigator.serviceWorker.register('./sw.js').catch(function(e) {
      console.log('[SW] Registration skipped:', e);
    });
  }
  setTimeout(function() { checkForUpdate(false); }, 2000);
}

export function showPatchNotes() {
  show('patch-screen');
  checkForUpdate(false);
}

export async function checkForUpdate(showToast) {
  var status = document.getElementById('pn-status');
  var notes = document.getElementById('pn-notes');
  var btn = document.getElementById('pn-update-btn');
  
  try {
    if (status) status.textContent = 'Проверяю...';
    
    var res = await fetch(VERSION_URL + '?_=' + Date.now(), { cache: 'no-store' });
    var data = await res.json();
    
    var serverBuild = parseInt(data.version || data.build, 10) || 0;
    var localBuild = parseInt(localStorage.getItem(LS_BUILD) || BUILD_VERSION, 10);
    
    // Show changelog
    if (notes && data.changelog) {
      notes.innerHTML = data.changelog.map(function(c) {
        return '<div style="padding:4px 0;">• ' + c + '</div>';
      }).join('');
    }
    
    if (serverBuild > localBuild) {
      if (status) status.textContent = '🔄 Доступно: v' + (data.versionName || serverBuild);
      if (status) status.style.color = '#ffd700';
      if (btn) btn.style.display = 'inline-block';
      if (showToast) toast('🔄 Есть обновление!', 'success');
      window._updateData = data;
    } else {
      localStorage.setItem(LS_BUILD, String(BUILD_VERSION));
      if (status) status.textContent = '✅ Актуальная версия';
      if (status) status.style.color = '#00ff88';
      if (btn) btn.style.display = 'none';
      if (showToast) toast('✅ Актуально', 'success');
    }
  } catch(e) {
    if (status) status.textContent = '⚠️ Ошибка проверки';
    if (status) status.style.color = '#ff6666';
    if (showToast) toast('⚠️ Нет связи', 'error');
  }
}

export async function applyUpdate() {
  var btn = document.getElementById('pn-update-btn');
  var status = document.getElementById('pn-status');
  
  try {
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Обновляю...'; }
    if (status) status.textContent = 'Очищаю кеш...';
    
    // Nuke caches
    if (window.nukeAllCaches) {
      await window.nukeAllCaches();
    }
    
    // Save new build
    var data = window._updateData || {};
    localStorage.setItem(LS_BUILD, String(data.version || data.build || BUILD_VERSION));
    
    if (status) status.textContent = '✅ Перезагружаю...';
    toast('🚀 Обновлено!', 'success');
    
    setTimeout(function() {
      location.href = './index.html?v=' + Date.now();
    }, 500);
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ Обновить'; }
    toast('❌ Ошибка', 'error');
  }
}
