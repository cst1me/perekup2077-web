// PEREKUP 2077 — Main v3.0.8
import { toast } from './core/utils.js';
import { loadGlobalStats, updateGlobalStatsUI, APP_VERSION, BUILD_VERSION } from './core/state.js';
import { wireTabs, toMenu as _toMenu, show } from './ui/screens.js';
import { startSixty, startRound, stopSixtyInterval, buy, haggle, skip } from './modes/sixty.js';
import { startSim, refreshMarket, sellFromModal, setSrvFromModal, closeCarModal } from './modes/sim.js';
import { initUpdater, showPatchNotes, checkForUpdate, applyUpdate } from './update/updater.js';

function toMenu() { _toMenu(stopSixtyInterval); }
function showAbout() { show('about-screen'); }

// SAFE REPAIR - сохраняет прогресс, не крашится
function repairGame() {
  toast('🔧 Диагностика...', 'success');
  
  setTimeout(function() {
    try {
      // 1. Сохраняем важные данные
      var savedData = null;
      try {
        var gs = JSON.parse(localStorage.getItem('globalStats') || '{}');
        savedData = {
          achievements: gs.achievements || {},
          bestScore: gs.bestScore || 0,
          totalDeals: gs.totalDeals || 0,
          totalProfit: gs.totalProfit || 0
        };
      } catch(e) {}
      
      var pb = localStorage.getItem('pb');
      
      // 2. Очищаем кеши
      if (window.nukeAllCaches) {
        window.nukeAllCaches();
      }
      
      // 3. Сбрасываем localStorage но сохраняем прогресс
      localStorage.clear();
      if (pb) localStorage.setItem('pb', pb);
      if (savedData) localStorage.setItem('globalStats', JSON.stringify(savedData));
      
      toast('🔄 Перезагрузка...', 'success');
      setTimeout(function() {
        location.href = './index.html?fixed=' + Date.now();
      }, 800);
    } catch(e) {
      console.error('[REPAIR]', e);
      toast('⚠️ ' + e.message, 'error');
      setTimeout(function() { location.reload(true); }, 1500);
    }
  }, 300);
}

function closeModalBtn() {
  var m = document.getElementById('car-modal');
  if (m) m.classList.remove('active');
}

function boot() {
  console.log('🚗 ПЕРЕКУП 2077 v' + APP_VERSION + ' build ' + BUILD_VERSION);
  
  try {
    loadGlobalStats();
    updateGlobalStatsUI();
    wireTabs();
    initUpdater();
  } catch(e) { console.error('[BOOT]', e); }

  // Expose functions for onclick
  Object.assign(window, {
    startSixty, startSim, toMenu, showAbout, repairGame,
    startRound, buy, haggle, skip,
    refreshMarket, sellFromModal, setSrvFromModal, closeCarModal, closeModalBtn,
    showPatchNotes, checkForUpdate, applyUpdate
  });

  window.addEventListener('error', function(e) { console.error('[ERR]', e); });
  console.log('🚗 Ready!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
