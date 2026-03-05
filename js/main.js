// PEREKUP 2077 — main entry (no bundler)
import { toast } from './core/utils.js';
import { loadGlobalStats, updateGlobalStatsUI } from './core/state.js';
import { wireTabs, toMenu as _toMenu, show } from './ui/screens.js';

import { startSixty, startRound, stopSixtyInterval } from './modes/sixty.js';
import { startSim, refreshMarket, sellFromModal, setSrvFromModal } from './modes/sim.js';

import { initSteamUpdate, openUpdateMenu, openIntegrityMenu, showPatchNotes, checkForUpdate, applyUpdate, verifyIntegrity, resetAppCachesAndReload } from './update/updater.js';

function toMenu(){
  _toMenu(stopSixtyInterval);
}

function showAbout(){
  show('about-screen');
}

function boot(){
  loadGlobalStats();
  updateGlobalStatsUI();
  wireTabs();

  // init updater (SW)
  initSteamUpdate();

  // expose for inline onclick
  Object.assign(window, {
    startSixty, startRound, toMenu, startSim,
    openUpdateMenu, openIntegrityMenu, showPatchNotes, checkForUpdate, applyUpdate, verifyIntegrity,
    refreshMarket, sellFromModal, setSrvFromModal,
    showAbout, resetAppCachesAndReload
  });

  // basic safety
  window.addEventListener('error', (e)=>{
    console.error(e.error || e.message);
    toast('Ошибка в игре — проверь консоль', 'error');
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
