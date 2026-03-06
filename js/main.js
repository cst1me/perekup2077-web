// PEREKUP 2077 — Main v3.1.1 stable-max
import { toast } from './core/utils.js';
import { loadGlobalStats, updateGlobalStatsUI, APP_VERSION, BUILD_VERSION, COMMIT_HASH } from './core/state.js';
import { saveSnapshot, consumePendingRestore } from './core/snapshots.js';
import { openRepairModal, closeRepairModal, repairGame, autoRollbackOnBoot } from './core/repair.js';
import { wireTabs, toMenu as _toMenu, show } from './ui/screens.js';
import { startSixty, startRound, stopSixtyInterval, buy, haggle, skip } from './modes/sixty.js';
import { startSim, refreshMarket, sellFromModal, setSrvFromModal, closeCarModal } from './modes/sim.js';
import { initUpdater, showPatchNotes, checkForUpdate, applyUpdate, resetAppCachesAndReload, toggleEmergencyMode, applyGamePatches } from './update/updater.js';

function toMenu() { _toMenu(stopSixtyInterval); }
function showAbout() { show('about-screen'); }

function closeModalBtn() {
  var m = document.getElementById('car-modal');
  if (m) m.classList.remove('active');
}

async function boot() {
  console.log('🚗 ПЕРЕКУП 2077 v' + APP_VERSION + ' build ' + BUILD_VERSION);

  try {
    loadGlobalStats();
    await consumePendingRestore();
    await autoRollbackOnBoot();
    var patchCount = await applyGamePatches();
    updateGlobalStatsUI();
    wireTabs();
    initUpdater();

    var el = document.getElementById('build-info');
    if (el) {
      var c = (COMMIT_HASH && COMMIT_HASH !== '__COMMIT__') ? COMMIT_HASH.slice(0, 7) : 'local';
      el.textContent = 'v' + APP_VERSION + ' • build ' + BUILD_VERSION + ' • ' + c;
    }

    await saveSnapshot('boot');
    if (patchCount > 0) toast('🧩 Применено патчей: ' + patchCount, 'success');
  } catch(e) {
    console.error('[BOOT]', e);
  }

  Object.assign(window, {
    startSixty, startSim, toMenu, showAbout,
    repairGame, openRepairModal, closeRepairModal,
    startRound, buy, haggle, skip,
    refreshMarket, sellFromModal, setSrvFromModal, closeCarModal, closeModalBtn,
    showPatchNotes, checkForUpdate, applyUpdate,
    resetAppCachesAndReload, toggleEmergencyMode,
    closeTopModal: function() {
      try {
        if (window.isRepairModalOpen && window.isRepairModalOpen()) { window.closeRepairModal(); return true; }
        var cm = document.getElementById('car-modal');
        if (cm && cm.classList.contains('active') && typeof window.closeModalBtn === 'function') { window.closeModalBtn(); return true; }
      } catch(e) {}
      return false;
    }
  });

  window.addEventListener('error', function(e) {
    console.error('[ERR]', e.error || e.message || e);
    toast('Ошибка — F12 для деталей', 'error');
  });

  document.addEventListener('visibilitychange', function() {
    try {
      if (!document.hidden && typeof window.checkForUpdate === 'function') {
        setTimeout(function() { window.checkForUpdate(false); }, 250);
      }
    } catch (e) {}
  });

  console.log('🚗 Ready!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { boot(); });
} else {
  boot();
}
