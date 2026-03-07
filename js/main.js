// PEREKUP 2077 — Main v4.1.1 Yandex Deluxe
import { toast } from './core/utils.js';
import { loadGlobalStats, updateGlobalStatsUI, APP_VERSION, BUILD_VERSION, COMMIT_HASH, loadPersistentState, persistGameState, grantDailyBonus } from './core/state.js';
import { saveSnapshot, consumePendingRestore, softResetSession as snapshotSoftReset } from './core/snapshots.js';
import { openRepairModal, closeRepairModal, repairGame, autoRollbackOnBoot, isRepairModalOpen } from './core/repair.js';
import { wireTabs, toMenu as _toMenu, show } from './ui/screens.js';
import { startSixty, startRound, stopSixtyInterval, buy, haggle, skip } from './modes/sixty.js';
import { startSim, refreshMarket, nextDayWithAd, sellFromModal, setSrvFromModal, closeCarModal, rewardDiagnoseCurrentCar, rewardRepairPart } from './modes/sim.js';
import { initUpdater, showPatchNotes, checkForUpdate, applyUpdate, resetAppCachesAndReload, toggleEmergencyMode, applyGamePatches } from './update/updater.js';

let saleCounter = 0;
let sixtyRoundCounter = 0;
let fullAdCooldown = false;

function toMenu() { _toMenu(stopSixtyInterval); }
function showAbout() { show('about-screen'); }

function closeModalBtn() {
  var m = document.getElementById('car-modal');
  if (m) m.classList.remove('active');
}

function markGameReady() {
  try { window.ysdk?.features?.LoadingAPI?.ready?.(); } catch (e) { console.warn('[YG] ready failed', e); }
}
function ygGameplayStart() { try { window.ysdk?.features?.GameplayAPI?.start?.(); } catch (e) {} }
function ygGameplayStop() { try { window.ysdk?.features?.GameplayAPI?.stop?.(); } catch (e) {} }

async function showFullAd() {
  if (fullAdCooldown || !window.ysdk?.adv?.showFullscreenAdv) return false;
  fullAdCooldown = true;
  ygGameplayStop();
  return new Promise((resolve) => {
    window.ysdk.adv.showFullscreenAdv({
      callbacks: {
        onClose: () => { fullAdCooldown = false; ygGameplayStart(); resolve(true); },
        onError: () => { fullAdCooldown = false; ygGameplayStart(); resolve(false); },
        onOffline: () => { fullAdCooldown = false; ygGameplayStart(); resolve(false); }
      }
    });
  });
}

async function showRewardedAd(type, onReward) {
  if (!window.ysdk?.adv?.showRewardedVideo) {
    if (typeof onReward === 'function') onReward();
    return false;
  }
  ygGameplayStop();
  return new Promise((resolve) => {
    window.ysdk.adv.showRewardedVideo({
      callbacks: {
        onRewarded: () => { if (typeof onReward === 'function') onReward(); },
        onClose: () => { ygGameplayStart(); resolve(true); },
        onError: () => { ygGameplayStart(); resolve(false); }
      }
    });
  });
}

function trackSuccessfulSale() {
  saleCounter += 1;
  persistGameState('sale-counter');
  if (saleCounter >= 10) {
    saleCounter = 0;
    setTimeout(function(){ showFullAd(); }, 250);
  }
}

function onSixtyRoundCompleted() {
  persistGameState('sixty-round-end');
  sixtyRoundCounter += 1;
  if (sixtyRoundCounter >= 3) {
    sixtyRoundCounter = 0;
    setTimeout(function(){ showFullAd(); }, 350);
  }
}

async function boot() {
  console.log('🚗 ПЕРЕКУП 2077 v' + APP_VERSION + ' build ' + BUILD_VERSION);
  if (window.yandexSDKInitPromise) {
    try { await window.yandexSDKInitPromise; } catch (e) { console.warn('[YG] SDK promise rejected', e); }
  }

  Object.assign(window, {
    startSixty, startSim, startRound, toMenu, showAbout,
    repairGame, openRepairModal, closeRepairModal, isRepairModalOpen,
    buy, haggle, skip, refreshMarket, nextDayWithAd, sellFromModal, setSrvFromModal,
    closeCarModal, closeModalBtn, showPatchNotes, checkForUpdate, applyUpdate,
    resetAppCachesAndReload, toggleEmergencyMode, softResetSession: snapshotSoftReset,
    showFullAd, showRewardedAd, ygGameplayStart, ygGameplayStop,
    rewardDiagnoseCurrentCar, rewardRepairPart, trackSuccessfulSale, onSixtyRoundCompleted,
    persistGameState,
    closeTopModal: function() {
      try {
        if (window.isRepairModalOpen && window.isRepairModalOpen()) { window.closeRepairModal(); return true; }
        var cm = document.getElementById('car-modal');
        if (cm && cm.classList.contains('active') && typeof window.closeModalBtn === 'function') { window.closeModalBtn(); return true; }
      } catch(e) {}
      return false;
    }
  });

  try {
    loadGlobalStats();
    await loadPersistentState();
    updateGlobalStatsUI();
  } catch (e) { console.error('[BOOT] stats/state:', e); }

  try { wireTabs(); } catch (e) { console.error('[BOOT] wireTabs:', e); }
  try { await consumePendingRestore(); } catch (e) { console.warn('[BOOT] consumePendingRestore:', e); }
  try { await autoRollbackOnBoot(); } catch (e) { console.warn('[BOOT] autoRollbackOnBoot:', e); }
  try { var patchCount = await applyGamePatches(); if (patchCount > 0) toast('🧩 Патчей: ' + patchCount, 'success'); } catch (e) { console.warn('[BOOT] applyGamePatches:', e); }
  try { initUpdater(); } catch (e) { console.warn('[BOOT] initUpdater:', e); }
  try { grantDailyBonus(); } catch (e) { console.warn('[BOOT] daily bonus:', e); }
  try { await saveSnapshot('boot'); } catch (e) { console.warn('[BOOT] saveSnapshot:', e); }
  try { await persistGameState('boot'); } catch (e) { console.warn('[BOOT] persist:', e); }

  try {
    var c = (COMMIT_HASH && COMMIT_HASH !== '__COMMIT__') ? COMMIT_HASH.slice(0, 7) : 'local';
    var buildLine = 'v' + APP_VERSION + ' • build ' + BUILD_VERSION + ' • ' + c;
    var el = document.getElementById('build-info');
    if (el) el.textContent = buildLine;
    var sub = document.querySelector('.menu-sub');
    if (sub) sub.textContent = 'v' + APP_VERSION;
  } catch (e) {}

  document.addEventListener('visibilitychange', function() { if (document.hidden) persistGameState('hidden'); });
  window.addEventListener('beforeunload', function() { persistGameState('beforeunload'); });
  setInterval(function(){ persistGameState('autosave'); }, 30000);

  markGameReady();
  ygGameplayStart();
  console.log('🚗 Ready!');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { boot(); });
else boot();
