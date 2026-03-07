// PEREKUP 2077 — Main v5.3.1 activities + wheel animation
import { toast, fmt } from './core/utils.js';
import { G, loadGlobalStats, updateGlobalStatsUI, APP_VERSION, BUILD_VERSION, loadPersistentState, persistGameState, getMissionStatus, claimMissionReward } from './core/state.js';
import { processRetentionLogin, maybePromptShortcut, maybePromptReview, getVipLabel } from './core/retention.js';
import { saveSnapshot, consumePendingRestore, softResetSession as snapshotSoftReset } from './core/snapshots.js';
import { openRepairModal, closeRepairModal, repairGame, autoRollbackOnBoot, isRepairModalOpen } from './core/repair.js';
import { wireTabs, toMenu as _toMenu, show } from './ui/screens.js';
import { startSixty, startRound, stopSixtyInterval, buy, haggle, skip, addExtraTime as addSixtyTime } from './modes/sixty.js';
import { startSim, refreshMarket, nextDayWithAd, sellFromModal, setSrvFromModal, closeCarModal, rewardDiagnoseCurrentCar, rewardRepairPart } from './modes/sim.js';
import { initUpdater, showPatchNotes, checkForUpdate, applyUpdate, resetAppCachesAndReload, toggleEmergencyMode, applyGamePatches } from './update/updater.js';
import { getCurrentWeeklyEvent, getVipDailyText, markWeeklySeen } from './core/growth.js';
import { 
  ensureMonetizationState, 
  // Кристаллы
  getCrystals, addCrystals, spendCrystals,
  // Daily login
  processDailyLogin, getLoginStreak, DAILY_REWARDS, grantStarterBonusIfNeeded,
  // Обычное колесо
  canSpinWheelFree, spinWheel, WHEEL_PRIZES, getFreeSpinsLeft, useFreeSpinBonus,
  // Премиум колесо
  canSpinPremiumWheel, spinPremiumWheel, PREMIUM_WHEEL_PRIZES, PREMIUM_SPIN_COST,
  // Бесплатная диагностика
  hasFreeDiagnostic, useFreeDiagnostic,
  // Легендарная машина
  hasLegendaryCarPending, claimLegendaryCar,
  // Удвоение
  setPendingDouble, getPendingDouble, claimDouble,
  // VIP
  isVipActive, getVipMinutesLeft, activateVip,
  // Энергия
  getEnergy, useEnergy, addEnergy,
  // Оффлайн
  calcOfflineEarnings, claimOffline,
  // Кредит
  canGetExtraTime, useExtraTime, resetExtraTime,
  canGetLoan, getLoan, repayLoan, getLoanInfo,
  // IAP
  IAP_PRODUCTS, applyIAP, getGarageCap
} from './core/monetization.js';

// ============ ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК (APK) ============
window.onerror = function(msg, url, line, col, error) {
  console.error("[GLOBAL ERROR]", msg, url, line);
  try { localStorage.setItem("lastError", JSON.stringify({msg, url, line, ts: Date.now()})); } catch(e) {}
  return false;
};
window.onunhandledrejection = function(e) {
  console.error("[UNHANDLED PROMISE]", e.reason);
};

// ============ БЕЗОПАСНЫЕ ОБЕРТКИ ДЛЯ APK ============
function safeCall(fn, fallback) {
  return function() {
    try { return fn.apply(this, arguments); }
    catch(e) { console.error("[SAFE]", e); return fallback; }
  };
}

let saleCounter = 0;
let sixtyRoundCounter = 0;
let fullAdCooldown = false;
let payments = null;
let productCatalog = [];
let paymentsStatus = { available: false, reason: 'not_init' };

function toMenu() { _toMenu(stopSixtyInterval); }
function showAbout() { show('about-screen'); }
function closeModalBtn() { const m = document.getElementById('car-modal'); if (m) m.classList.remove('active'); }
function ygGameplayStart() { try { window.ysdk?.features?.GameplayAPI?.start?.(); } catch (e) {} }
function ygGameplayStop() { try { window.ysdk?.features?.GameplayAPI?.stop?.(); } catch (e) {} }
function markGameReady() { try { window.ysdk?.features?.LoadingAPI?.ready?.(); } catch (e) { console.warn('[YG] ready failed', e); } }
function isNoAds() { return !!(G.entitlements && (G.entitlements.noAds || G.entitlements.vipDealer)); }

function modalRoot() { return document.getElementById('growth-modal'); }
function closeGrowthModal() { const el = modalRoot(); if (el) { el.classList.remove('active'); el.innerHTML = ''; } }
function showGrowthSheet(title, bodyHtml) {
  const el = modalRoot();
  if (!el) return;
  el.innerHTML = '<div class="growth-sheet"><div class="growth-head"><div class="growth-title">' + title + '</div><button class="growth-close" id="growth-close-btn">✕</button></div>' + bodyHtml + '</div>';
  el.classList.add('active');
  el.onclick = function(e) { if (e.target === el) closeGrowthModal(); };
  document.getElementById('growth-close-btn').onclick = closeGrowthModal;
}

async function showFullAd() {
  if (isNoAds()) return false;
  if (fullAdCooldown || !window.ysdk?.adv?.showFullscreenAdv) return false;
  fullAdCooldown = true;
  ygGameplayStop();
  return new Promise((resolve) => {
    window.ysdk.adv.showFullscreenAdv({ callbacks: {
      onClose: () => { fullAdCooldown = false; ygGameplayStart(); resolve(true); },
      onError: () => { fullAdCooldown = false; ygGameplayStart(); resolve(false); },
      onOffline: () => { fullAdCooldown = false; ygGameplayStart(); resolve(false); }
    }});
  });
}

async function showRewardedAd(type, onReward) {
  if (isNoAds()) { if (typeof onReward === 'function') onReward(); return true; }
  if (!window.ysdk?.adv?.showRewardedVideo) { if (typeof onReward === 'function') onReward(); return false; }
  ygGameplayStop();
  return new Promise((resolve) => {
    window.ysdk.adv.showRewardedVideo({ callbacks: {
      onRewarded: () => { if (typeof onReward === 'function') onReward(); },
      onClose: () => { ygGameplayStart(); resolve(true); },
      onError: () => { ygGameplayStart(); resolve(false); }
    }});
  });
}

function updateRetentionUI() {
  try {
    const streakEl = document.getElementById('ret-streak');
    const lotEl = document.getElementById('ret-lot');
    const vipEl = document.getElementById('ret-vip');
    if (streakEl) streakEl.textContent = String((G.retention && G.retention.streak) || 0);
    if (lotEl) lotEl.textContent = (G.retention && G.retention.dailyLotKey) ? 'ГОТОВ' : '—';
    if (vipEl) vipEl.textContent = getVipLabel();
    const bi = document.getElementById('build-info');
    if (bi) bi.textContent = 'v' + APP_VERSION;
  } catch (e) {}
}

function normalizeCatalogItem(raw) {
  if (!raw) return null;
  const priceText = raw.priceText || raw.price || raw.formattedPrice || raw.localizedPrice || 'Цена появится из Яндекс Игр';
  return {
    id: raw.id || raw.productID || raw.sku,
    title: raw.title || raw.name || raw.productTitle || 'Поддержка проекта',
    description: raw.description || raw.desc || '',
    price: priceText,
    priceText: priceText,
    priceValue: raw.priceValue || raw.priceAmount || raw.price || '',
    currencyCode: raw.currencyCode || raw.priceCurrencyCode || ''
  };
}

async function initPaymentsAndEntitlements() {
  paymentsStatus = { available: false, reason: 'sdk_unavailable' };
  productCatalog = [];
  if (!window.ysdk) return;
  try { payments = typeof window.ysdk.getPayments === 'function' ? await window.ysdk.getPayments() : window.ysdk.payments; }
  catch (e) { console.warn('[YG] payments init failed', e); paymentsStatus = { available: false, reason: 'init_failed' }; }
  if (!payments) return;
  try {
    if (typeof payments.getPurchases === 'function') {
      const purchases = await payments.getPurchases();
      (purchases || []).forEach(function(purchase) {
        const pid = purchase.productID || purchase.id;
        if (pid === 'no_ads_forever') G.entitlements.noAds = true;
        if (pid === 'vip_dealer') { G.entitlements.noAds = true; G.entitlements.vipDealer = true; }
      });
    }
    if (typeof payments.getCatalog === 'function') {
      const catalog = await payments.getCatalog();
      const rawProducts = (catalog && catalog.products) ? catalog.products : (Array.isArray(catalog) ? catalog : []);
      productCatalog = rawProducts.map(normalizeCatalogItem).filter(Boolean);
    }
    paymentsStatus = { available: !!payments && productCatalog.length > 0, reason: productCatalog.length > 0 ? 'ok' : 'catalog_empty' };
    updateRetentionUI();
    persistGameState('restore-purchases');
  } catch (e) { console.warn('[YG] payments restore/catalog failed', e); paymentsStatus = { available: false, reason: 'catalog_failed' }; }
}

function fallbackCatalog() {
  return [
    { id: 'no_ads_forever', title: 'ЧИСТАЯ ИГРА', description: 'Убирает рекламу и оставляет только игровой ритм', price: 'Цена в Яндекс Играх', priceText: 'Цена в Яндекс Играх' },
    { id: 'vip_dealer', title: 'РЕЖИМ КОМФОРТА', description: 'Без рекламы, +1 слот гаража и спокойный темп', price: 'Цена в Яндекс Играх', priceText: 'Цена в Яндекс Играх' }
  ];
}

function getSupportUnlockState() {
  var deals = (GS && GS.totalDeals) || 0;
  var rep = (G && G.rep) || 0;
  var day = (G && G.day) || 1;
  return {
    deals: deals,
    rep: rep,
    day: day,
    supportUnlocked: deals >= 5 || day >= 3 || rep >= 10,
    premiumUnlocked: deals >= 12 || day >= 5 || rep >= 25
  };
}

function renderSupportProgress(state, advanced) {
  var targetDeals = advanced ? 12 : 5;
  var targetDay = advanced ? 5 : 3;
  var targetRep = advanced ? 25 : 10;
  return '<div class="growth-meta">' +
    '<span class="growth-pill">Сделки: ' + state.deals + '/' + targetDeals + '</span>' +
    '<span class="growth-pill">День: ' + state.day + '/' + targetDay + '</span>' +
    '<span class="growth-pill">Репутация: ' + state.rep + '/' + targetRep + '</span>' +
  '</div>';
}

function openSupportLockedSheet(advanced) {
  var state = getSupportUnlockState();
  var title = advanced ? 'ДОП. ВОЗМОЖНОСТИ ОТКРОЮТСЯ ПОЗЖЕ' : 'РАЗДЕЛ ОТКРОЕТСЯ ПОЗЖЕ';
  var subtitle = advanced
    ? 'Сначала почувствуй темп игры: заработай репутацию, закрой несколько сделок и освой оба режима.'
    : 'Сейчас акцент на чистом прогрессе без давления. Освой рынок — и раздел с дополнительными возможностями появится сам.';
  var body = '<div class="growth-card">' +
    '<h3>Сначала — игра, потом опции комфорта</h3>' +
    '<p>' + subtitle + '</p>' +
    renderSupportProgress(state, advanced) +
    '<div class="growth-meta">' +
      '<span class="growth-pill">Бесплатное колесо доступно сразу</span>' +
      '<span class="growth-pill">Ежедневные бонусы уже работают</span>' +
      '<span class="growth-pill">Донат не нужен для старта</span>' +
    '</div>' +
    '<button class="mbtn" onclick="closeGrowthModal()">ПОНЯТНО</button>' +
  '</div>';
  showGrowthSheet(title, body);
}

async function buyProduct(productId) {
  if (!payments || typeof payments.purchase !== 'function' || !isProductConfiguredInYandex(productId)) { toast('🛒 Покупка доступна только через Яндекс Игры', 'error'); return false; }
  try {
    ygGameplayStop();
    const purchase = await payments.purchase({ id: productId });
    if (purchase && purchase.productID === 'no_ads_forever') G.entitlements.noAds = true;
    if (purchase && purchase.productID === 'vip_dealer') { G.entitlements.noAds = true; G.entitlements.vipDealer = true; G.rep += 10; }
    updateRetentionUI();
    await persistGameState('purchase-' + productId);
    closeGrowthModal();
    toast(productId === 'vip_dealer' ? '👑 Режим комфорта активирован!' : '🛡️ Игра теперь без рекламы!', 'success');
    return true;
  } catch (e) { console.warn('[YG] purchase failed', e); toast('⚠️ Покупка не завершена', 'error'); return false; }
  finally { ygGameplayStart(); }
}

function getProductById(id) {
  return (productCatalog || []).find(p => p.id === id) || fallbackCatalog().find(p => p.id === id);
}

function isProductConfiguredInYandex(id) {
  return !!((productCatalog || []).find(function(p) { return p.id === id; }));
}

function renderShopCard(id) {
  const p = getProductById(id) || { id, title: id, description: '', price: '—' };
  const owned = (id === 'no_ads_forever' && G.entitlements.noAds) || (id === 'vip_dealer' && G.entitlements.vipDealer);
  const configured = isProductConfiguredInYandex(id);
  const meta = id === 'vip_dealer'
    ? ['+1 слот гаража', 'VIP-статус', 'комфорт без рекламы']
    : ['без навязчивых пауз', 'спокойный ритм', 'чистый геймплей'];
  return '<div class="growth-card">' +
    '<h3>' + p.title + '</h3>' +
    '<p>' + (p.description || '') + '</p>' +
    '<div class="growth-meta">' + meta.map(x => '<span class="growth-pill">' + x + '</span>').join('') + '</div>' +
    '<div class="growth-meta"><span class="growth-pill">Цена: ' + (configured ? (p.priceText || p.price || '—') : 'из каталога Яндекс Игр') + '</span>' +
    '<span class="growth-pill">Статус: ' + (owned ? 'Куплено' : (configured ? 'Через Яндекс' : 'Нужно завести товар')) + '</span></div>' +
    '<div class="growth-meta"><span class="growth-pill">Оплата проходит через Яндекс Игры</span></div>' +
    '<button class="growth-action" ' + (owned ? 'disabled' : (configured ? 'data-buy="' + id + '"' : 'disabled')) + '>' + (owned ? 'УЖЕ АКТИВНО' : (configured ? 'ОПЛАТИТЬ ЧЕРЕЗ ЯНДЕКС' : 'ПОКА НЕДОСТУПНО')) + '</button>' +
  '</div>';
}


function renderMissionCard(m) {
  var progress = Math.min(m.progress, m.goal);
  var percent = Math.max(8, Math.min(100, Math.round((progress / Math.max(1, m.goal)) * 100)));
  var rewardBits = [];
  if (m.reward.crystals) rewardBits.push('💠 ' + m.reward.crystals);
  if (m.reward.money) rewardBits.push('💰 ' + fmt(m.reward.money));
  return '<div class="growth-card mission-card' + (m.complete ? ' complete' : '') + (m.claimed ? ' claimed' : '') + '">' +
    '<h3>' + m.title + '</h3>' +
    '<p>' + m.desc + '</p>' +
    '<div class="mission-progress"><div class="mission-progress-fill" style="width:' + percent + '%"></div></div>' +
    '<div class="growth-meta"><span class="growth-pill">Прогресс: ' + fmt(progress) + ' / ' + fmt(m.goal) + '</span><span class="growth-pill">Награда: ' + rewardBits.join(' • ') + '</span></div>' +
    (m.claimed ? '<button class="mbtn mbtn-disabled" disabled>УЖЕ ЗАБРАНО</button>' : (m.complete ? '<button class="mbtn mbtn-main" data-claim-mission="' + m.id + '">ЗАБРАТЬ</button>' : '<button class="mbtn mbtn-sec" disabled>В ПРОЦЕССЕ</button>')) +
  '</div>';
}

function openMissions() {
  var missions = getMissionStatus();
  var done = missions.filter(function(m) { return m.complete && !m.claimed; }).length;
  var weekly = getCurrentWeeklyEvent();
  var body = '<div class="about-hero-card modal-style-card">' +
    '<div class="about-hero-top"><div class="about-logo">🎯</div><div><div class="about-title">АКТИВНОСТИ</div><div class="about-subtitle">Миссии и событие недели теперь собраны в одном понятном разделе.</div></div></div>' +
    '<div class="about-chip-row"><span class="about-chip">Активно: ' + missions.length + '</span><span class="about-chip">К сбору: ' + done + '</span><span class="about-chip">Награды: ₽ и 💠</span></div>' +
  '</div>' +
  '<div class="about-sec about-news"><div class="about-sec-title">📅 СОБЫТИЕ НЕДЕЛИ</div><div class="about-news-card"><div class="about-news-title">' + weekly.title + '</div><div class="about-text">' + weekly.desc + '</div><div class="about-chip-row"><span class="about-chip">Множитель x' + weekly.mult + '</span><span class="about-chip">Цель: ' + weekly.target.join(', ') + '</span></div></div></div>' +
  '<div class="growth-grid missions-grid">' + missions.map(renderMissionCard).join('') + '</div>';
  showGrowthSheet('АКТИВНОСТИ', body);
  modalRoot().querySelectorAll('[data-claim-mission]').forEach(function(btn) {
    btn.onclick = function() {
      var reward = claimMissionReward(btn.dataset.claimMission);
      if (!reward) return toast('Сначала выполни миссию', 'error');
      var parts = [];
      if (reward.crystals) parts.push('💠 +' + reward.crystals);
      if (reward.money) parts.push('💰 +' + fmt(reward.money) + ' ₽');
      toast('🎯 Награда получена: ' + parts.join(' • '), 'success');
      markWeeklySeen();
      openMissions();
    };
  });
}

// ============ ПРОФИЛЬ ============
function openProfile() {
  var crystals = getCrystals();
  var streak = getLoginStreak();
  var vipLeft = getVipMinutesLeft();
  var vipText = vipLeft > 0 ? '👑 VIP: ' + vipLeft + ' мин' : getVipLabel();
  
  // Статистика из GS
  var totalDeals = GS.totalDeals || 0;
  var totalProfit = GS.totalProfit || 0;
  var bestScore = GS.bestScore || 0;
  var carsBought = G.buys || 0;
  var currentMoney = G.m || 0;
  var reputation = G.rep || 0;
  var garageCars = (G.gar && G.gar.length) || 0;
  var day = G.day || 1;
  
  var repRank = getRepRank(reputation);
  
  var body = '<div class="profile-hero">' +
    '<div class="profile-avatar">👤</div>' +
    '<div class="profile-info">' +
      '<div class="profile-name">ПЕРЕКУП</div>' +
      '<div class="profile-rank">' + repRank + '</div>' +
      '<div class="profile-vip">' + vipText + '</div>' +
    '</div>' +
  '</div>' +
  
  '<div class="profile-stats">' +
    '<div class="profile-stat"><div class="profile-stat-val">💰 ' + fmt(currentMoney) + '</div><div class="profile-stat-lbl">Баланс</div></div>' +
    '<div class="profile-stat"><div class="profile-stat-val">💠 ' + crystals + '</div><div class="profile-stat-lbl">Кристаллы</div></div>' +
    '<div class="profile-stat"><div class="profile-stat-val">😎 ' + reputation + '</div><div class="profile-stat-lbl">Репутация</div></div>' +
    '<div class="profile-stat"><div class="profile-stat-val">📅 ' + streak + '</div><div class="profile-stat-lbl">Дней подряд</div></div>' +
  '</div>' +
  
  '<div class="profile-section">' +
    '<div class="profile-section-title">📊 СТАТИСТИКА</div>' +
    '<div class="profile-stats-grid">' +
      '<div class="profile-stat-item"><span class="psi-icon">🤝</span><span class="psi-val">' + totalDeals + '</span><span class="psi-lbl">Сделок</span></div>' +
      '<div class="profile-stat-item"><span class="psi-icon">💵</span><span class="psi-val">' + fmt(totalProfit) + '</span><span class="psi-lbl">Заработано</span></div>' +
      '<div class="profile-stat-item"><span class="psi-icon">🚗</span><span class="psi-val">' + carsBought + '</span><span class="psi-lbl">Куплено авто</span></div>' +
      '<div class="profile-stat-item"><span class="psi-icon">🏆</span><span class="psi-val">' + fmt(bestScore) + '</span><span class="psi-lbl">Рекорд 60 сек</span></div>' +
      '<div class="profile-stat-item"><span class="psi-icon">🏠</span><span class="psi-val">' + garageCars + '</span><span class="psi-lbl">В гараже</span></div>' +
      '<div class="profile-stat-item"><span class="psi-icon">📆</span><span class="psi-val">' + day + '</span><span class="psi-lbl">День игры</span></div>' +
    '</div>' +
  '</div>' +
  
  '<div class="profile-section">' +
    '<div class="profile-section-title">🎯 БЫСТРЫЕ ДЕЙСТВИЯ</div>' +
    '<div class="profile-actions">' +
      '<button class="mbtn mbtn-sec" onclick="closeGrowthModal();setTimeout(openMissions,100);">🎯 Миссии</button>' +
      '<button class="mbtn mbtn-sec" onclick="closeGrowthModal();setTimeout(openLeaderboards,100);">🏆 Рейтинг</button>' +
      '<button class="mbtn mbtn-sec" onclick="manualSaveGame();toast(\'💾 Сохранено!\',\'success\');">💾 Сохранить</button>' +
    '</div>' +
  '</div>';
  
  showGrowthSheet('ПРОФИЛЬ', body);
}

function getRepRank(rep) {
  if (rep >= 120) return '🏆 ЛЕГЕНДА';
  if (rep >= 60) return '⭐ АВТОРИТЕТ';
  if (rep >= 20) return '✅ НАДЁЖНЫЙ';
  if (rep <= -60) return '💀 АФЕРИСТ';
  if (rep <= -20) return '⚠️ МУТНЫЙ';
  return '👤 НОВИЧОК';
}

function openActivities() {
  return openMissions();
}

function openVipShop() {
  var unlock = getSupportUnlockState();
  if (!unlock.supportUnlocked) return openSupportLockedSheet(false);
  var vipLeft = getVipMinutesLeft();
  var vipText = vipLeft > 0 ? 'Комфорт активен: ' + vipLeft + ' мин' : getVipLabel();
  var visibleProducts = IAP_PRODUCTS.filter(function(p) { return p.id === 'no_ads_forever' || p.id === 'vip_dealer'; });
  var paymentsPill = paymentsStatus.available ? 'Платёжный каталог Яндекса подключён' : 'Покупки появятся после настройки товаров в Яндекс Играх';
  var body = '<div class="about-hero-card modal-style-card">' +
    '<div class="about-hero-top"><div class="about-logo">🧩</div><div><div class="about-title">ДОПОЛНИТЕЛЬНО</div><div class="about-subtitle">Комфортные опции и экстренные инструменты собраны в одном разделе без перегруза меню.</div></div></div>' +
    '<div class="about-chip-row"><span class="about-chip">Гараж: ' + getGarageCap() + ' слотов</span><span class="about-chip">Статус: ' + vipText + '</span><span class="about-chip">Основа игры бесплатна</span></div>' +
  '</div>' +
  '<div class="about-sec about-news"><div class="about-sec-title">🧭 ОБЩАЯ ИНФОРМАЦИЯ</div><div class="about-news-card"><div class="about-news-title">Что уже доступно без оплаты</div><div class="about-text">Ежедневно начисляется 100 кристаллов, есть бесплатное колесо, реклама за дополнительные награды и обычный прогресс через сделки.</div><div class="about-chip-row"><span class="about-chip">' + paymentsPill + '</span><span class="about-chip">Оплата через Яндекс Игры</span></div></div></div>' +
  '<div class="about-sec about-news"><div class="about-sec-title">💵 ЭКСТРЕННЫЙ КРЕДИТ</div><div class="about-news-card"><div class="about-news-title">Быстрый кэш на просадке</div><div class="about-text">Если срочно нужны деньги на рынок или выкуп, можно взять безопасный кредит и вернуть его позже.</div><div class="about-chip-row"><span class="about-chip">50 000 ₽ сразу</span><span class="about-chip">Возврат: 60 000 ₽</span></div><div class="wheel-actions"><button class="mbtn mbtn-sec" onclick="openLoanModal()">ОТКРЫТЬ КРЕДИТ</button></div></div></div>' +
  '<div class="growth-grid">';

  visibleProducts.forEach(function(p) {
    body += renderShopCard(p.id);
  });

  body += '</div>';
  showGrowthSheet('ДОПОЛНИТЕЛЬНО', body);
  modalRoot().querySelectorAll('[data-buy]').forEach(function(btn) { btn.onclick = function() { buyProduct(btn.dataset.buy); }; });
}

// ============ КОЛЕСО УДАЧИ ============
// ============ ОБЫЧНОЕ КОЛЕСО ============
function openExtras() {
  var unlock = getSupportUnlockState();
  var vipLeft = getVipMinutesLeft();
  var vipText = vipLeft > 0 ? 'VIP: ' + vipLeft + ' мин' : getVipLabel();
  var loanInfo = getLoanInfo();
  
  var body = '<div class="about-hero-card modal-style-card">' +
    '<div class="about-hero-top"><div class="about-logo">🧩</div><div><div class="about-title">ДОПОЛНИТЕЛЬНО</div><div class="about-subtitle">Активности, магазин и сервисные инструменты</div></div></div>' +
  '</div>' +
  
  // Активности
  '<div class="extras-section">' +
    '<div class="extras-title">🎯 АКТИВНОСТИ</div>' +
    '<div class="extras-grid">' +
      '<button class="extras-btn" onclick="closeGrowthModal();setTimeout(openMissions,100);"><span>📋</span><span>Миссии</span></button>' +
      '<button class="extras-btn" onclick="closeGrowthModal();setTimeout(openWeeklyEvent,100);"><span>📅</span><span>Ивент недели</span></button>' +
      '<button class="extras-btn" onclick="closeGrowthModal();setTimeout(openLeaderboards,100);"><span>🏆</span><span>Рейтинг</span></button>' +
    '</div>' +
  '</div>' +
  
  // Магазин
  '<div class="extras-section">' +
    '<div class="extras-title">🛒 МАГАЗИН</div>' +
    '<div class="extras-grid">' +
      '<button class="extras-btn" onclick="closeGrowthModal();setTimeout(openVipShop,100);"><span>👑</span><span>VIP / Без рекламы</span></button>' +
      '<button class="extras-btn" onclick="closeGrowthModal();setTimeout(openLoanModal,100);"><span>💵</span><span>Кредит' + (loanInfo.hasLoan ? ' (активен)' : '') + '</span></button>' +
      '<button class="extras-btn" onclick="closeGrowthModal();setTimeout(openPremiumWheel,100);"><span>💎</span><span>Премиум колесо</span></button>' +
    '</div>' +
  '</div>' +
  
  // Сервис
  '<div class="extras-section">' +
    '<div class="extras-title">🛠️ СЕРВИС</div>' +
    '<div class="extras-grid">' +
      '<button class="extras-btn" onclick="manualSaveGame();toast(\'💾 Сохранено!\',\'success\');"><span>💾</span><span>Сохранить</span></button>' +
      '<button class="extras-btn" onclick="closeGrowthModal();setTimeout(repairGame,100);"><span>🔧</span><span>Починка</span></button>' +
      '<button class="extras-btn" onclick="closeGrowthModal();setTimeout(showPatchNotes,100);"><span>📝</span><span>Обновления</span></button>' +
    '</div>' +
  '</div>';
  
  showGrowthSheet('ДОПОЛНИТЕЛЬНО', body);
}

function openWheelOfFortune() {
  var crystals = getCrystals();
  var isFree = canSpinWheelFree();
  var freeSpins = getFreeSpinsLeft();
  
  var prizesHtml = WHEEL_PRIZES.map(function(p) {
    var highlight = p.type === 'free_spins' ? ' wheel-prize-highlight' : '';
    return '<div class="wheel-prize' + highlight + '"><span>' + p.icon + '</span><span>' + p.label + '</span></div>';
  }).join('');
  
  var spinBtn = '';
  if (freeSpins > 0) {
    spinBtn = '<button class="mbtn mbtn-main wheel-spin-btn" onclick="doSpinWheel(\'bonus\')">🎰 БОНУСНЫЙ (' + freeSpins + ')</button>';
  } else if (isFree) {
    spinBtn = '<button class="mbtn mbtn-main wheel-spin-btn" onclick="doSpinWheel(\'free\')">🎰 БЕСПЛАТНО</button>';
  } else {
    spinBtn = '<button class="mbtn mbtn-sec wheel-spin-btn" onclick="doSpinWheel(\'ad\')">📺 ЗА ВИДЕО</button>';
  }
  
  var body = '<div class="weekly-hero"><h3>🎰 ОБЫЧНОЕ КОЛЕСО</h3>' +
    '<div class="crystal-balance">💠 ' + crystals + ' кристаллов</div>' +
    (freeSpins > 0 ? '<div class="free-spins-badge">🎁 Бонусных: ' + freeSpins + '</div>' : '') +
    '</div>' +
    '<div class="wheel-container">' +
      '<div class="wheel-prizes">' + prizesHtml + '</div>' +
      '<div class="wheel-actions">' + spinBtn + '</div>' +
      '<div class="wheel-note">После первого бесплатного запуска обычное колесо переходит на равные шансы между призами.</div>' +
      (getSupportUnlockState().premiumUnlocked ? '<button class="mbtn mbtn-premium" onclick="openPremiumWheel()">👑 РЕДКИЕ НАХОДКИ (от 2000💠)</button>' : '<div class="wheel-note">Редкие награды откроются позже — сначала раскрутись на бесплатном прогрессе.</div>') +
    '</div>';
  showGrowthSheet('КОЛЕСО УДАЧИ', body);
}

function doSpinWheel(spinType) {
  if (spinType === 'ad') {
    showRewardedAd('wheel', function() {
      var prize = spinWheel('bonus');
      showWheelAnimation(prize, false);
    });
  } else if (spinType === 'bonus') {
    if (useFreeSpinBonus()) {
      var prize = spinWheel('ad');
      showWheelAnimation(prize, false);
    } else {
      toast('Нет бонусных спинов!', 'error');
    }
  } else {
    if (!canSpinWheelFree()) {
      toast('Бесплатное вращение уже использовано!', 'error');
      return;
    }
    var prize = spinWheel('free');
    showWheelAnimation(prize, false);
  }
}

// ============ ПРЕМИУМ КОЛЕСО ============
function openPremiumWheel() {
  var unlock = getSupportUnlockState();
  if (!unlock.premiumUnlocked) return openSupportLockedSheet(true);
  var crystals = getCrystals();
  var canSpin = canSpinPremiumWheel();
  
  var prizesHtml = PREMIUM_WHEEL_PRIZES.map(function(p) {
    var rarity = '';
    if (p.id === 'legendary_car') rarity = ' wheel-prize-legendary';
    else if (p.id === 'money_500k' || p.id === 'vip_3days' || p.id === 'garage_slot') rarity = ' wheel-prize-rare';
    return '<div class="wheel-prize' + rarity + '"><span>' + p.icon + '</span><span>' + p.label + '</span></div>';
  }).join('');
  
  var body = '<div class="weekly-hero premium-hero"><h3>👑 РЕДКИЕ НАХОДКИ</h3>' +
    '<div class="crystal-balance">💠 ' + crystals + ' кристаллов</div>' +
    '<div class="wheel-note">Опциональная вкладка для поздней игры: доступ открывается, когда ты сам накопишь 2000 кристаллов через игру и ежедневные входы.</div>' +
    '<p>Легендарные призы!</p>' +
    '</div>' +
    '<div class="wheel-container">' +
      '<div class="wheel-prizes premium-prizes">' + prizesHtml + '</div>' +
      '<div class="wheel-actions">' +
        (canSpin ? '<button class="mbtn mbtn-premium wheel-spin-btn" onclick="doPremiumSpin()">👑 КРУТИТЬ (2000💠)</button>' :
                   '<button class="mbtn mbtn-disabled wheel-spin-btn" disabled>Нужно 2000💠</button>') +
      '</div>' +
      '<button class="mbtn mbtn-sec" onclick="openWheelOfFortune()">🎰 ОБЫЧНОЕ КОЛЕСО</button>' +
    '</div>';
  showGrowthSheet('РЕДКИЕ НАХОДКИ', body);
}

function doPremiumSpin() {
  var prize = spinPremiumWheel();
  if (prize) {
    showWheelAnimation(prize, true);
  } else {
    toast('Нужно накопить 2000 кристаллов!', 'error');
  }
}

function showWheelAnimation(prize, isPremium) {
  var prizes = (isPremium ? PREMIUM_WHEEL_PRIZES : WHEEL_PRIZES).map(function(p) { return p.icon + ' ' + p.label; });
  var backAction = isPremium ? 'openPremiumWheel()' : 'openWheelOfFortune()';
  var body = '<div class="weekly-hero ' + (isPremium ? 'premium-hero' : '') + '"><h3>' + (isPremium ? '👑 РЕДКИЕ НАХОДКИ' : '🎰 ОБЫЧНОЕ КОЛЕСО') + '</h3><p>Прокрутка идёт — можешь дождаться результата или пропустить.</p></div>' +
    '<div class="growth-card" style="text-align:center">' +
      '<div id="wheel-spin-reel" style="font-size:28px;font-weight:800;padding:18px 12px;border:1px solid rgba(0,255,255,.35);border-radius:16px;min-height:74px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px rgba(0,255,255,.12) inset">🎰 Крутим...</div>' +
      '<div class="growth-meta"><span class="growth-pill">Скоро покажем результат</span><span class="growth-pill">Можно пропустить анимацию</span></div>' +
    '</div>' +
    '<div class="wheel-actions">' +
      '<button class="mbtn mbtn-main" id="wheel-skip-btn">⏭️ ПРОПУСТИТЬ</button>' +
      '<button class="mbtn" onclick="closeGrowthModal()">ЗАКРЫТЬ</button>' +
    '</div>';
  showGrowthSheet(isPremium ? 'ПРОКРУТКА НАХОДОК' : 'ПРОКРУТКА КОЛЕСА', body);
  var reel = document.getElementById('wheel-spin-reel');
  var skipBtn = document.getElementById('wheel-skip-btn');
  var ticks = 0;
  var totalTicks = isPremium ? 22 : 18;
  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    showWheelResult(prize, isPremium);
  }
  var timer = setInterval(function() {
    ticks += 1;
    if (reel) reel.textContent = prizes[ticks % prizes.length];
    if (ticks >= totalTicks) finish();
  }, isPremium ? 95 : 85);
  if (skipBtn) skipBtn.onclick = finish;
}

function showWheelResult(prize, isPremium) {
  var extraMsg = '';
  if (prize.type === 'legendary_car') {
    extraMsg = '<p class="legendary-note">🚗 Легендарная машина появится на рынке!</p>';
  }
  
  var body = '<div class="weekly-hero prize-result' + (isPremium ? ' premium-result' : '') + '">' +
    '<h3>' + prize.icon + '</h3><h2>' + prize.label + '</h2><p>Поздравляем!</p>' + extraMsg +
    '</div>' +
    '<div class="wheel-actions">' +
      '<button class="mbtn mbtn-sec" onclick="' + (isPremium ? 'openPremiumWheel()' : 'openWheelOfFortune()') + '">КРУТИТЬ ЕЩЁ</button>' +
      '<button class="mbtn" onclick="closeGrowthModal()">ЗАКРЫТЬ</button>' +
    '</div>';
  showGrowthSheet('🎉 РЕЗУЛЬТАТ', body);
  toast(prize.icon + ' ' + prize.label, 'success');
}

// ============ DAILY LOGIN БОНУС ============

function showStarterBonus(reward) {
  var moneyHtml = reward.money ? '<div class="daily-prize"><span>💰</span><span>+' + fmt(reward.money) + ' ₽</span></div>' : '';
  var body = '<div class="weekly-hero daily-hero"><h3>🎁 ДОБРО ПОЖАЛОВАТЬ</h3>' +
    '<div class="daily-streak">Стартовый подарок для нового профиля</div>' +
    '</div>' +
    '<div class="growth-card daily-reward">' +
      '<div class="daily-prize"><span>💠</span><span>+' + reward.crystals + ' кристаллов</span></div>' +
      moneyHtml +
      '<div class="growth-meta">' +
        '<span class="growth-pill">Ежедневный вход: +100 💠</span>' +
        '<span class="growth-pill">Редкие находки: от 2000 💠</span>' +
      '</div>' +
    '</div>' +
    '<div class="wheel-actions">' +
      '<button class="mbtn mbtn-main" onclick="closeGrowthModal()">ОТЛИЧНО</button>' +
    '</div>';
  showGrowthSheet('СТАРТОВЫЙ БОНУС', body);
}

function showDailyLoginReward(reward) {
  var body = '<div class="weekly-hero daily-hero"><h3>📅 ЕЖЕДНЕВНЫЙ БОНУС</h3>' +
    '<div class="daily-streak">День ' + reward.day + ' из 7</div>' +
    '</div>' +
    '<div class="growth-card daily-reward">' +
      '<div class="daily-prize"><span>💠</span><span>+' + reward.crystals + ' кристаллов</span></div>' +
      '<div class="daily-prize"><span>💰</span><span>+' + fmt(reward.money) + ' ₽</span></div>' +
    '</div>' +
    '<div class="daily-streak-bar">' + renderStreakBar(reward.day) + '</div>' +
    '<div class="wheel-actions">' +
      '<button class="mbtn mbtn-main" onclick="closeGrowthModal()">ЗАБРАТЬ!</button>' +
    '</div>';
  showGrowthSheet('ЕЖЕДНЕВНЫЙ БОНУС', body);
}

function renderStreakBar(currentDay) {
  var html = '';
  for (var i = 1; i <= 7; i++) {
    var state = i < currentDay ? 'done' : (i === currentDay ? 'current' : 'future');
    var reward = DAILY_REWARDS[i - 1];
    html += '<div class="streak-day ' + state + '">' +
      '<div class="streak-num">' + i + '</div>' +
      '<div class="streak-reward">💠' + reward.crystals + '</div>' +
    '</div>';
  }
  return html;
}

// ============ УДВОЕНИЕ ПРИБЫЛИ ============
function showDoubleProfitModal(profit, carName) {
  setPendingDouble(profit, carName);
  var body = '<div class="weekly-hero"><h3>💰 ПРОДАЖА ЗАВЕРШЕНА!</h3><p>' + carName + '</p></div>' +
    '<div class="growth-card double-card">' +
      '<div class="double-amount">Прибыль: <strong>+' + fmt(profit) + ' ₽</strong></div>' +
      '<div class="double-offer">Удвоить → <strong>+' + fmt(profit * 2) + ' ₽</strong></div>' +
    '</div>' +
    '<div class="double-actions">' +
      '<button class="mbtn mbtn-main" onclick="doClaimDouble(true)">📺 УДВОИТЬ ЗА ВИДЕО</button>' +
      '<button class="mbtn mbtn-sec" onclick="doClaimDouble(false)">Забрать +' + fmt(profit) + ' ₽</button>' +
    '</div>';
  showGrowthSheet('УДВОЕНИЕ', body);
}

function doClaimDouble(doubled) {
  if (doubled) {
    showRewardedAd('double', function() {
      var bonus = claimDouble(true);
      toast('💰 Прибыль удвоена! +' + fmt(bonus) + ' ₽', 'success');
      closeGrowthModal();
    });
  } else {
    claimDouble(false);
    closeGrowthModal();
  }
}

// ============ ОФФЛАЙН ДОХОД ============
function showOfflineEarnings() {
  var result = calcOfflineEarnings();
  if (!result) return false;
  
  var body = '<div class="weekly-hero"><h3>🌙 ПОКА ТЫ БЫЛ ОФФЛАЙН</h3><p>Твои машины "продавались"</p></div>' +
    '<div class="growth-card">' +
      '<div class="offline-time">Время оффлайн: ' + result.hours + ' ч</div>' +
      '<div class="offline-earned">Заработано: <strong>' + fmt(result.earnings) + ' ₽</strong></div>' +
    '</div>' +
    '<div class="double-actions">' +
      '<button class="mbtn mbtn-main" onclick="doClaimOffline(true)">📺 УДВОИТЬ → ' + fmt(result.earnings * 2) + ' ₽</button>' +
      '<button class="mbtn mbtn-sec" onclick="doClaimOffline(false)">Забрать ' + fmt(result.earnings) + ' ₽</button>' +
    '</div>';
  showGrowthSheet('ОФФЛАЙН ДОХОД', body);
  return true;
}

function doClaimOffline(doubled) {
  if (doubled) {
    showRewardedAd('offline', function() {
      var amount = claimOffline(true);
      toast('💰 Оффлайн доход удвоен! +' + fmt(amount) + ' ₽', 'success');
      closeGrowthModal();
    });
  } else {
    var amount = claimOffline(false);
    toast('💰 Оффлайн доход: +' + fmt(amount) + ' ₽', 'success');
    closeGrowthModal();
  }
}

// ============ ЭКСТРЕННЫЙ КРЕДИТ ============
function openLoanModal() {
  var info = getLoanInfo();
  var body;
  
  if (info.hasLoan) {
    body = '<div class="weekly-hero"><h3>💳 КРЕДИТ</h3><p>У тебя есть активный кредит</p></div>' +
      '<div class="growth-card">' +
        '<div class="loan-info">Сумма: ' + fmt(info.amount) + ' ₽</div>' +
        '<div class="loan-info">К погашению (+20%): <strong>' + fmt(info.repay) + ' ₽</strong></div>' +
      '</div>' +
      '<div class="double-actions">' +
        '<button class="mbtn mbtn-main" onclick="doRepayLoan()">💳 ПОГАСИТЬ ' + fmt(info.repay) + ' ₽</button>' +
        '<button class="mbtn" onclick="closeGrowthModal()">ЗАКРЫТЬ</button>' +
      '</div>';
  } else {
    body = '<div class="weekly-hero"><h3>💵 ЭКСТРЕННЫЙ КРЕДИТ</h3><p>Быстрые деньги когда нужно</p></div>' +
      '<div class="growth-card">' +
        '<div class="loan-info">Сумма: <strong>50 000 ₽</strong></div>' +
        '<div class="loan-info">Погашение: 60 000 ₽ (+20%)</div>' +
      '</div>' +
      '<div class="double-actions">' +
        '<button class="mbtn mbtn-main" onclick="doGetLoan()">📺 ВЗЯТЬ ЗА ВИДЕО</button>' +
        '<button class="mbtn" onclick="closeGrowthModal()">ОТМЕНА</button>' +
      '</div>';
  }
  showGrowthSheet('КРЕДИТ', body);
}

function doGetLoan() {
  showRewardedAd('loan', function() {
    getLoan();
    toast('💵 Кредит получен: +50 000 ₽', 'success');
    closeGrowthModal();
  });
}

function doRepayLoan() {
  if (repayLoan()) {
    toast('✅ Кредит погашен!', 'success');
    closeGrowthModal();
  } else {
    toast('❌ Недостаточно денег для погашения', 'error');
  }
}

// ============ +30 СЕКУНД (для 60 сек режима) ============
function doAddExtraTime() {
  if (!canGetExtraTime()) {
    toast('Лимит +30 сек исчерпан!', 'error');
    return;
  }
  showRewardedAd('extratime', function() {
    useExtraTime();
    if (typeof addSixtyTime === 'function') addSixtyTime(30);
    toast('⏱️ +30 секунд!', 'success');
  });
}

// ============ ЭНЕРГИЯ ============
function openEnergyModal() {
  var energy = getEnergy();
  var body = '<div class="weekly-hero"><h3>⚡ ЭНЕРГИЯ</h3><p>Нужна для действий</p></div>' +
    '<div class="growth-card">' +
      '<div class="energy-bar"><div class="energy-fill" style="width:' + (energy * 10) + '%"></div></div>' +
      '<div class="energy-text">' + energy + ' / 10</div>' +
    '</div>' +
    '<div class="double-actions">' +
      '<button class="mbtn mbtn-main" onclick="doAddEnergy()">📺 +5 ЭНЕРГИИ ЗА ВИДЕО</button>' +
      '<button class="mbtn" onclick="closeGrowthModal()">ЗАКРЫТЬ</button>' +
    '</div>';
  showGrowthSheet('ЭНЕРГИЯ', body);
}

function doAddEnergy() {
  showRewardedAd('energy', function() {
    addEnergy(5);
    toast('⚡ +5 энергии!', 'success');
    closeGrowthModal();
  });
}

async function fetchLeaderboard(name) {
  try {
    if (!window.ysdk?.leaderboards?.getEntries) return null;
    const entries = await window.ysdk.leaderboards.getEntries(name, { quantityTop: 10, includeUser: true });
    return entries;
  } catch (e) {
    console.warn('[YG] getEntries failed', name, e);
    return null;
  }
}

function renderLeaderboardBlock(title, data) {
  const rows = (((data && data.entries) || []).slice(0, 10)).map((entry, idx) => {
    const rank = (entry.rank != null ? entry.rank : idx + 1);
    const name = (entry.player && (entry.player.publicName || entry.player.name)) || 'Игрок';
    const score = entry.score != null ? fmt(entry.score) : '0';
    return '<div class="lb-row"><div class="lb-rank">#' + rank + '</div><div class="lb-name">' + name + '</div><div class="lb-score">' + score + '</div></div>';
  }).join('') || '<p>Пока нет данных или SDK недоступен.</p>';
  const current = data && data.userRank != null ? '<div class="growth-meta"><span class="growth-pill">Твой ранг: #' + data.userRank + '</span></div>' : '';
  return '<div class="growth-card"><h3>' + title + '</h3>' + current + rows + '</div>';
}

async function openLeaderboards() {
  showGrowthSheet('ЛИДЕРБОРДЫ', '<div class="growth-card"><p>Загружаю таблицы…</p></div>');
  const rich = await fetchLeaderboard('rich_dealer');
  const sale = await fetchLeaderboard('biggest_sale');
  const flip = await fetchLeaderboard('flip_60_best');
  const body = '<div class="growth-grid">' +
    renderLeaderboardBlock('Самый богатый перекуп', rich) +
    renderLeaderboardBlock('Самая дорогая продажа', sale) +
    renderLeaderboardBlock('Лучший флип за 60 сек', flip) +
  '</div>';
  showGrowthSheet('ЛИДЕРБОРДЫ', body);
}

async function openWeeklyEvent() {
  const weekly = getCurrentWeeklyEvent();
  const body = '<div class="weekly-hero"><h3>' + weekly.title + '</h3><p>' + weekly.desc + '</p></div>' +
    '<div class="growth-card"><h3>Бонус недели</h3><div class="growth-meta"><span class="growth-pill">Множитель: x' + weekly.mult + '</span><span class="growth-pill">Цель: ' + weekly.target.join(', ') + '</span></div><p>Покупай и продавай машины нужного класса в симуляторе — цены этой недели уже усиливаются автоматически.</p></div>';
  showGrowthSheet('АКТИВНОСТИ', body);
  await markWeeklySeen();
}

async function submitLeaderboard(name, score, extra) {
  try {
    if (!window.ysdk?.leaderboards?.setScore) return false;
    if (typeof window.ysdk.isAvailableMethod === 'function') {
      const ok = await window.ysdk.isAvailableMethod('leaderboards.setScore');
      if (!ok) return false;
    }
    await window.ysdk.leaderboards.setScore(name, Math.max(0, Math.floor(score)), extra || '');
    return true;
  } catch (e) { console.warn('[YG] leaderboard failed', name, e); return false; }
}

function trackSuccessfulSale(profit, carName) {
  saleCounter += 1;
  if (profit > 0) {
    G.meta.lastBigProfit = Math.max(G.meta.lastBigProfit || 0, profit);
    submitLeaderboard('rich_dealer', G.m, 'cash');
    submitLeaderboard('biggest_sale', profit, 'sale');
    if (profit >= 100000) setTimeout(function() { maybePromptReview('big-profit'); }, 400);
    
    // Показываем удвоение при прибыли >10k
    if (profit >= 10000 && !isNoAds()) {
      setTimeout(function() { showDoubleProfitModal(profit, carName || 'Машина'); }, 500);
    }
  }
  persistGameState('sale-counter');
  if (saleCounter >= 10) { saleCounter = 0; setTimeout(function() { showFullAd(); }, 250); }
}

function onSixtyRoundCompleted(roundResult) {
  persistGameState('sixty-round-end');
  sixtyRoundCounter += 1;
  var profit = 0;
  var details = null;
  if (typeof roundResult === 'number') profit = roundResult;
  else if (roundResult && typeof roundResult === 'object') {
    profit = Number(roundResult.profit) || 0;
    details = roundResult;
  }
  if (!G.stats || typeof G.stats !== 'object') G.stats = { fastestDeals: 0, maxCombo: 0, scamsDodged: 0, sixtyBestProfit: 0 };
  if (details) {
    G.stats.fastestDeals = Math.max(G.stats.fastestDeals || 0, details.fastestDeals || 0);
    G.stats.maxCombo = Math.max(G.stats.maxCombo || 0, details.maxCombo || 0);
    G.stats.scamsDodged = Math.max(G.stats.scamsDodged || 0, details.scamsDodged || 0);
  }
  if (profit > 0) {
    G.meta.bestFlipProfit = Math.max(G.meta.bestFlipProfit || 0, profit);
    G.stats.sixtyBestProfit = Math.max(G.stats.sixtyBestProfit || 0, profit);
    submitLeaderboard('flip_60_best', G.meta.bestFlipProfit, '60s');
  }
  if (sixtyRoundCounter >= 3) { sixtyRoundCounter = 0; setTimeout(() => { showFullAd(); }, 350); }
}

async function boot() {
  console.log('🚗 ПЕРЕКУП 2077 v' + APP_VERSION + ' build ' + BUILD_VERSION);
  if (window.yandexSDKInitPromise) { try { await window.yandexSDKInitPromise; } catch (e) { console.warn('[YG] SDK promise rejected', e); } }

  Object.assign(window, {
    startSixty, startSim, startRound, toMenu, showAbout,
    repairGame, openRepairModal, closeRepairModal, isRepairModalOpen,
    buy, haggle, skip, refreshMarket, nextDayWithAd, sellFromModal, setSrvFromModal,
    closeCarModal, closeModalBtn, showPatchNotes, checkForUpdate, applyUpdate,
    resetAppCachesAndReload, toggleEmergencyMode, softResetSession: snapshotSoftReset,
    showFullAd, showRewardedAd, ygGameplayStart, ygGameplayStop,
    rewardDiagnoseCurrentCar, rewardRepairPart, trackSuccessfulSale, onSixtyRoundCompleted,
    persistGameState, openVipShop, openMissions, openActivities, openExtras, openLeaderboards, openWeeklyEvent, closeGrowthModal,
    // Профиль и навигация
    openProfile, showEventNotification, showExtrasPrompt, openExternal,
    // Монетизация v5.1 - два колеса
    openWheelOfFortune, doSpinWheel, openPremiumWheel, doPremiumSpin,
    showDoubleProfitModal, doClaimDouble, showStarterBonus, showDailyLoginReward,
    showOfflineEarnings, doClaimOffline, openLoanModal, doGetLoan, doRepayLoan,
    doAddExtraTime, openEnergyModal, doAddEnergy,
    getCrystals, GS, // Для отображения в UI
    manualSaveGame: async function() {
      try {
        const btn = document.querySelector('.mbtn-save');
        if (btn) { btn.disabled = true; btn.textContent = '💾 Сохраняю...'; }
        const result = await persistGameState('manual-save');
        await saveSnapshot('manual');
        toast(result ? '✅ Прогресс сохранён!' : '⚠️ Ошибка сохранения', result ? 'success' : 'error');
        if (btn) btn.textContent = result ? '✅ СОХРАНЕНО!' : '❌ ОШИБКА';
        setTimeout(function() { if (btn) { btn.disabled = false; btn.textContent = '💾 СОХРАНИТЬ ПРОГРЕСС'; } }, 2000);
      } catch (e) { console.error('[SAVE] manual:', e); toast('⚠️ Ошибка сохранения', 'error'); }
    },
    closeTopModal: function() {
      try {
        if (window.isRepairModalOpen && window.isRepairModalOpen()) { window.closeRepairModal(); return true; }
        const gm = document.getElementById('growth-modal');
        if (gm && gm.classList.contains('active')) { closeGrowthModal(); return true; }
        const cm = document.getElementById('car-modal');
        if (cm && cm.classList.contains('active') && typeof window.closeModalBtn === 'function') { window.closeModalBtn(); return true; }
      } catch (e) {}
      return false;
    }
  });

  let loginResult = { messages: [] };
  try {
    loadGlobalStats();
    await loadPersistentState();
    ensureMonetizationState(); // Инициализируем монетизацию
    loginResult = processRetentionLogin();
    updateGlobalStatsUI();
    updateRetentionUI();
  } catch (e) { console.error('[BOOT] stats/state:', e); }

  try { wireTabs(); } catch (e) { console.error('[BOOT] wireTabs:', e); }
  try { await consumePendingRestore(); } catch (e) { console.warn('[BOOT] consumePendingRestore:', e); }
  try { await autoRollbackOnBoot(); } catch (e) { console.warn('[BOOT] autoRollbackOnBoot:', e); }
  try { const patchCount = await applyGamePatches(); if (patchCount > 0) toast('🧩 Патчей: ' + patchCount, 'success'); } catch (e) { console.warn('[BOOT] applyGamePatches:', e); }
  try { initUpdater(); } catch (e) { console.warn('[BOOT] initUpdater:', e); }
  try { await initPaymentsAndEntitlements(); } catch (e) { console.warn('[BOOT] payments:', e); }
  try { await saveSnapshot('boot'); } catch (e) { console.warn('[BOOT] saveSnapshot:', e); }
  try { await persistGameState('boot'); } catch (e) { console.warn('[BOOT] persist:', e); }
  try {
    setTimeout(function() {
      const messages = loginResult.messages || [];
      messages.forEach((m, i) => setTimeout(() => toast(m, 'success'), 150 * (i + 1)));
      
      var starterReward = grantStarterBonusIfNeeded();
      var dailyReward = processDailyLogin();
      
      setTimeout(function() {
        if (starterReward) {
          showStarterBonus(starterReward);
          if (dailyReward) {
            setTimeout(function() { showDailyLoginReward(dailyReward); }, 450);
          } else {
            setTimeout(function() { showEventNotification(); }, 450);
          }
        } else if (dailyReward) {
          showDailyLoginReward(dailyReward);
          setTimeout(function() { showEventNotification(); }, 1500);
        } else {
          showEventNotification();
        }
      }, 500 + messages.length * 150);
      
      maybePromptShortcut();
      markGameReady();
      ygGameplayStart();
    }, 250);
  } catch (e) { console.warn('[BOOT] retention:', e); }
}

// Уведомление о ивенте
function showEventNotification() {
  var weekly = getCurrentWeeklyEvent();
  if (!weekly) return;
  
  // Проверяем, показывали ли уже сегодня
  var today = getTodayKey();
  var lastShown = localStorage.getItem('eventNotifShown') || '';
  if (lastShown === today) return;
  
  localStorage.setItem('eventNotifShown', today);
  
  var body = '<div class="event-notif-hero">' +
    '<div class="event-notif-badge">' + weekly.badge + '</div>' +
    '<div class="event-notif-title">' + weekly.title + '</div>' +
    '<div class="event-notif-desc">' + weekly.desc + '</div>' +
    '<div class="event-notif-mult">Бонус: x' + weekly.mult + '</div>' +
  '</div>' +
  '<div class="event-notif-actions">' +
    '<button class="mbtn mbtn-main" onclick="openMissions();closeGrowthModal();">🎯 МИССИИ И ИВЕНТЫ</button>' +
    '<button class="mbtn mbtn-sec" onclick="closeGrowthModal()">Позже</button>' +
  '</div>';
  
  showGrowthSheet('🎉 АКТИВНЫЙ ИВЕНТ!', body);
}

// Предложение после игры
function showExtrasPrompt() {
  var body = '<div class="extras-prompt">' +
    '<div class="extras-prompt-icon">🧩</div>' +
    '<div class="extras-prompt-title">Загляни в ДОПОЛНИТЕЛЬНО!</div>' +
    '<div class="extras-prompt-desc">Миссии, магазин, рейтинг и другие возможности</div>' +
  '</div>' +
  '<div class="extras-prompt-actions">' +
    '<button class="mbtn mbtn-main" onclick="openExtras();closeGrowthModal();">ОТКРЫТЬ</button>' +
    '<button class="mbtn mbtn-sec" onclick="closeGrowthModal()">Позже</button>' +
  '</div>';
  
  showGrowthSheet('ДОПОЛНИТЕЛЬНО', body);
}

// Открыть внешнюю ссылку
function openExternal(url) {
  if (window.ysdk && window.ysdk.features && window.ysdk.features.openURL) {
    try {
      window.ysdk.features.openURL(url);
    } catch (e) {
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}

// ============ АВТОСОХРАНЕНИЕ ПРИ ВЫХОДЕ ============
var saveDebounce = null;
function debouncedSave() {
  if (saveDebounce) clearTimeout(saveDebounce);
  saveDebounce = setTimeout(function() {
    persistGameState('auto');
  }, 2000);
}

// Сохранение при скрытии страницы (переключение вкладки, сворачивание)
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    persistGameState('visibility-hidden');
    saveSnapshot('visibility');
  }
});

// Сохранение перед закрытием
window.addEventListener('beforeunload', function() {
  persistGameState('beforeunload');
});

// Сохранение при pagehide (iOS Safari)
window.addEventListener('pagehide', function() {
  persistGameState('pagehide');
});

// Периодическое автосохранение каждые 60 сек
setInterval(function() {
  if (document.visibilityState === 'visible') {
    persistGameState('interval-60s');
  }
}, 60000);

boot();
