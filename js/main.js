// PEREKUP 2077 — main entry v3.0.5
import { toast } from './core/utils.js';
import { loadGlobalStats, updateGlobalStatsUI } from './core/state.js';
import { wireTabs, toMenu as _toMenu, show } from './ui/screens.js';
import { startSixty, startRound, stopSixtyInterval, buy, haggle, skip } from './modes/sixty.js';
import { startSim, refreshMarket, sellFromModal, setSrvFromModal, closeCarModal } from './modes/sim.js';
import { initUpdater, showPatchNotes, checkForUpdate, applyUpdate, resetAppCachesAndReload } from './update/updater.js';

function toMenu() {
  _toMenu(stopSixtyInterval);
}

function showAbout() {
  show('about-screen');
}

function boot() {
  console.log('🚗 ПЕРЕКУП 2077 v3.0.5 loading...');
  
  loadGlobalStats();
  updateGlobalStatsUI();
  wireTabs();
  initUpdater();

  // Expose ALL functions for onclick handlers
  Object.assign(window, {
    // Menu
    startSixty, startSim, toMenu, showAbout,
    // 60 seconds
    startRound, buy, haggle, skip,
    // Simulator  
    refreshMarket, sellFromModal, setSrvFromModal, closeCarModal,
    // Updates
    showPatchNotes, checkForUpdate, applyUpdate, resetAppCachesAndReload
  });

  window.addEventListener('error', function(e) {
    console.error('Error:', e.error || e.message);
    toast('Ошибка — F12 для деталей', 'error');
  });

  console.log('🚗 ПЕРЕКУП 2077 ready!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
