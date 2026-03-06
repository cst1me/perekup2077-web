// PEREKUP 2077 — Main v3.1.3
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

  // КРИТИЧНО: Сначала регистрируем ВСЕ функции в window
  Object.assign(window, {
    startSixty: startSixty,
    startSim: startSim,
    toMenu: toMenu,
    showAbout: showAbout,
    repairGame: repairGame,
    openRepairModal: openRepairModal,
    closeRepairModal: closeRepairModal,
    startRound: startRound,
    buy: buy,
    haggle: haggle,
    skip: skip,
    refreshMarket: refreshMarket,
    sellFromModal: sellFromModal,
    setSrvFromModal: setSrvFromModal,
    closeCarModal: closeCarModal,
    closeModalBtn: closeModalBtn,
    showPatchNotes: showPatchNotes,
    checkForUpdate: checkForUpdate,
    applyUpdate: applyUpdate,
    resetAppCachesAndReload: resetAppCachesAndReload,
    toggleEmergencyMode: toggleEmergencyMode
  });

  try {
    loadGlobalStats();
    updateGlobalStatsUI();
    wireTabs();
  } catch(e) { console.error('[BOOT] Basic:', e); }

  try {
    await consumePendingRestore();
    await autoRollbackOnBoot();
  } catch(e) { console.error('[BOOT] Restore:', e); }

  try {
    var patchCount = await applyGamePatches();
    if (patchCount > 0) toast('🧩 Патчей: ' + patchCount, 'success');
  } catch(e) { console.error('[BOOT] Patches:', e); }

  try {
    initUpdater();
    await saveSnapshot('boot');
  } catch(e) { console.error('[BOOT] Updater:', e); }

  try {
    var el = document.getElementById('build-info');
    if (el) {
      var c = (COMMIT_HASH && COMMIT_HASH !== '__COMMIT__') ? COMMIT_HASH.slice(0, 7) : 'local';
      el.textContent = 'v' + APP_VERSION + ' • build ' + BUILD_VERSION + ' • ' + c;
    }
  } catch(e) {}

  window.addEventListener('error', function(e) {
    console.error('[ERR]', e.error || e.message || e);
  });

  console.log('🚗 Ready!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { boot(); });
} else {
  boot();
}
