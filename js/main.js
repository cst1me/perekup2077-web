// PEREKUP 2077 — main entry (no bundler)
import { toast } from './core/utils.js';
import { loadGlobalStats, updateGlobalStatsUI } from './core/state.js';
import { wireTabs, toMenu as _toMenu } from './ui/screens.js';
import { openModal, closeModal as _closeModal } from './ui/modal.js';

import { startSixty, startRound, stopSixtyInterval } from './modes/sixty.js';
import { startSim, refreshMarket, sellFromModal, setSrvFromModal } from './modes/sim.js';

import { initSteamUpdate, openUpdateMenu, openIntegrityMenu, showPatchNotes, checkForUpdate, applyUpdate, verifyIntegrity } from './update/updater.js';

function closeModal(e){
  if(e && e.stopPropagation) e.stopPropagation();
  _closeModal();
}

function toMenu(){
  _toMenu(stopSixtyInterval);
}

function showAbout(){
  openModal('ПЕРЕКУП 2077', `
    <div class="muted">PWA-игра с режимом <b>60 секунд</b> и симулятором.</div>
    <div style="height:10px"></div>
    <div>Советы:</div>
    <ul>
      <li>Сделки подряд → комбо-множитель</li>
      <li>Быстрые сделки → speed bonus</li>
      <li>Торг тратит попытки ❤️</li>
    </ul>
  `);
}

function boot(){
  loadGlobalStats();
  updateGlobalStatsUI();
  wireTabs();

  // init updater (SW)
  initSteamUpdate();

  // close modal on background click
  const m = document.getElementById('modal');
  if(m){
    m.addEventListener('click', (e)=>{
      if(e.target === m) closeModal(e);
    });
  }

  // expose for inline onclick
  Object.assign(window, {
    startSixty, startRound, toMenu, startSim,
    openUpdateMenu, openIntegrityMenu, showPatchNotes, checkForUpdate, applyUpdate, verifyIntegrity,
    closeModal, refreshMarket, sellFromModal, setSrvFromModal,
    showAbout
  });

  // basic safety
  window.addEventListener('error', (e)=>{
    console.error(e.error || e.message);
    toast('Ошибка в игре — проверь консоль', 'error');
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
