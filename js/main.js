// PEREKUP 2077 — Main v4.0.4 ONCLICK FIX
import { toast } from './core/utils.js';
import { loadGlobalStats, updateGlobalStatsUI, APP_VERSION, BUILD_VERSION, COMMIT_HASH } from './core/state.js';
import { preloadConfigs } from './core/config.js';
import { saveSnapshot, consumePendingRestore } from './core/snapshots.js';
import { openRepairModal, closeRepairModal, repairGame, autoRollbackOnBoot, isRepairModalOpen } from './core/repair.js';
import { wireTabs, toMenu as _toMenu, show } from './ui/screens.js';
import { startSixty, startRound, stopSixtyInterval, buy, haggle, skip, inspect } from './modes/sixty.js';
import { startSim, refreshMarket, sellFromModal, setSrvFromModal, closeCarModal } from './modes/sim.js';
import { initUpdater, showPatchNotes, checkForUpdate, applyUpdate, resetAppCachesAndReload, toggleEmergencyMode, applyGamePatches } from './update/updater.js';

function toMenu() { _toMenu(stopSixtyInterval); }
function showAbout() { show('about-screen'); }

function closeModalBtn() {
  var m = document.getElementById('car-modal');
  if (m) m.classList.remove('active');
}

function softResetSession() {
  try {
    localStorage.removeItem('selectedSrvCarId');
    sessionStorage.clear();
    location.reload();
  } catch (e) {
    console.error('[SOFT RESET]', e);
    location.reload();
  }
}

// Перезаписываем fallback-стабы полными версиями
function exposeGlobals() {
  Object.assign(window, {
    startSixty: startSixty,
    startSim: startSim,
    startRound: startRound,
    toMenu: toMenu,
    showAbout: showAbout,
    repairGame: repairGame,
    openRepairModal: openRepairModal,
    closeRepairModal: closeRepairModal,
    isRepairModalOpen: isRepairModalOpen,
    buy: buy,
    haggle: haggle,
    skip: skip,
    inspect: inspect,
    refreshMarket: refreshMarket,
    sellFromModal: sellFromModal,
    setSrvFromModal: setSrvFromModal,
    closeCarModal: closeCarModal,
    closeModalBtn: closeModalBtn,
    showPatchNotes: showPatchNotes,
    checkForUpdate: checkForUpdate,
    applyUpdate: applyUpdate,
    resetAppCachesAndReload: resetAppCachesAndReload,
    toggleEmergencyMode: toggleEmergencyMode,
    softResetSession: softResetSession
  });
  console.log('[MAIN] ✅ Globals exposed (overwriting fallbacks)');
}

async function boot() {
  console.log('🚗 ПЕРЕКУП 2077 v' + APP_VERSION + ' build ' + BUILD_VERSION);

  // Сразу регистрируем полные версии функций
  exposeGlobals();

  try {
    loadGlobalStats();
    updateGlobalStatsUI();
  } catch (e) {
    console.error('[BOOT] stats init:', e);
  }

  try {
    wireTabs();
  } catch (e) {
    console.error('[BOOT] wireTabs:', e);
  }

  try {
    await preloadConfigs();
  } catch (e) {
    console.warn('[BOOT] preloadConfigs:', e);
  }

  try {
    await consumePendingRestore();
  } catch (e) {
    console.warn('[BOOT] consumePendingRestore:', e);
  }

  try {
    await autoRollbackOnBoot();
  } catch (e) {
    console.warn('[BOOT] autoRollbackOnBoot:', e);
  }

  try {
    var patchCount = await applyGamePatches();
    if (patchCount > 0) toast('🧩 Патчей: ' + patchCount, 'success');
  } catch (e) {
    console.warn('[BOOT] applyGamePatches:', e);
  }

  try {
    initUpdater();
  } catch (e) {
    console.warn('[BOOT] initUpdater:', e);
  }

  try {
    await saveSnapshot('boot');
  } catch (e) {
    console.warn('[BOOT] saveSnapshot:', e);
  }

  try {
    var c = (COMMIT_HASH && COMMIT_HASH !== '__COMMIT__') ? COMMIT_HASH.slice(0, 7) : 'local';
    var buildLine = 'v' + APP_VERSION + ' • build ' + BUILD_VERSION + ' • ' + c;
    var el = document.getElementById('build-info');
    if (el) el.textContent = buildLine;
    var sub = document.querySelector('.menu-sub');
    if (sub) sub.textContent = 'v' + APP_VERSION;
    var aboutTitle = document.getElementById('pn-title');
    if (aboutTitle) aboutTitle.textContent = 'v' + APP_VERSION;
    var aboutVer = document.getElementById('pn-ver');
    if (aboutVer) aboutVer.textContent = APP_VERSION;
    var aboutBuild = document.getElementById('pn-build');
    if (aboutBuild) aboutBuild.textContent = BUILD_VERSION;
  } catch (e) {
    console.warn('[BOOT] build info:', e);
  }

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
