// PEREKUP 2077 — Economy & Support System v5.3.1
// Кристаллы теперь копятся через игру и ежедневный вход, без прямой покупки валюты
import { G, persistGameState } from './state.js';
import { fmt, getTodayKey } from './utils.js';

// ============ ОБЫЧНОЕ КОЛЕСО (за рекламу) ============
export const WHEEL_PRIZES = [
  { id: 'free_spins', label: '+2 спина', icon: '🎰', value: 2, type: 'free_spins', weight: 400 },
  { id: 'money_5k', label: '5 000 ₽', icon: '💰', value: 5000, type: 'money', weight: 25 },
  { id: 'money_10k', label: '10 000 ₽', icon: '💵', value: 10000, type: 'money', weight: 20 },
  { id: 'money_20k', label: '20 000 ₽', icon: '💎', value: 20000, type: 'money', weight: 12 },
  { id: 'money_50k', label: '50 000 ₽', icon: '🤑', value: 50000, type: 'money', weight: 5 },
  { id: 'rep_5', label: '+5 репутации', icon: '⭐', value: 5, type: 'rep', weight: 15 },
  { id: 'rep_10', label: '+10 репутации', icon: '🌟', value: 10, type: 'rep', weight: 8 },
  { id: 'crystals_5', label: '+5 кристаллов', icon: '💠', value: 5, type: 'crystals', weight: 10 },
  { id: 'energy_5', label: '+5 энергии', icon: '⚡', value: 5, type: 'energy', weight: 5 }
];

// ============ ПРЕМИУМ КОЛЕСО (за кристаллы) ============
export const PREMIUM_WHEEL_PRIZES = [
  { id: 'money_100k', label: '100 000 ₽', icon: '💰', value: 100000, type: 'money', weight: 30 },
  { id: 'money_250k', label: '250 000 ₽', icon: '💵', value: 250000, type: 'money', weight: 20 },
  { id: 'money_500k', label: '500 000 ₽', icon: '💎', value: 500000, type: 'money', weight: 8 },
  { id: 'vip_day', label: 'VIP 1 день', icon: '👑', value: 1440, type: 'vip_minutes', weight: 15 },
  { id: 'vip_3days', label: 'VIP 3 дня', icon: '👑', value: 4320, type: 'vip_minutes', weight: 5 },
  { id: 'free_diag', label: 'Бесплатная диагностика', icon: '🔍', value: 1, type: 'free_diag', weight: 20 },
  { id: 'garage_slot', label: '+1 слот гаража', icon: '🏠', value: 1, type: 'garage_slot', weight: 3 },
  { id: 'legendary_car', label: 'Легендарная машина', icon: '🚗', value: 1, type: 'legendary_car', weight: 2 },
  { id: 'crystals_20', label: '+20 кристаллов', icon: '💠', value: 20, type: 'crystals', weight: 12 },
  { id: 'rep_25', label: '+25 репутации', icon: '🌟', value: 25, type: 'rep', weight: 10 }
];

// Стоимость премиум спина
export const PREMIUM_SPIN_COST = 2000;

function weightedRandom(items) {
  var total = items.reduce(function(s, i) { return s + (i.weight || 1); }, 0);
  var r = Math.random() * total;
  for (var i = 0; i < items.length; i++) {
    r -= (items[i].weight || 1);
    if (r <= 0) return items[i];
  }
  return items[0];
}

function equalRandom(items) {
  if (!items || !items.length) return null;
  return items[Math.floor(Math.random() * items.length)] || items[0];
}

// ============ СОСТОЯНИЕ МОНЕТИЗАЦИИ ============
export function ensureMonetizationState() {
  if (!G.monetization) {
    G.monetization = {
      // Кристаллы (премиум валюта)
      crystals: 0,
      
      // Обычное колесо
      lastWheelSpin: '',
      wheelSpinsToday: 0,
      freeSpinsLeft: 0,
      
      // Премиум колесо
      premiumSpinsToday: 0,
      freeDiagnostics: 0,
      equalWheelOddsUnlocked: false,
      
      // Daily login бонусы
      lastLoginDay: '',
      loginStreak: 0,
      starterBonusClaimed: false,
      
      // VIP
      vipUntil: 0,
      
      // Энергия
      energy: 10,
      maxEnergy: 10,
      lastEnergyRegen: Date.now(),
      
      // Удвоение прибыли
      pendingDoubleProfit: null,
      
      // Оффлайн
      lastOfflineCheck: Date.now(),
      
      // Кредит
      hasLoan: false,
      loanAmount: 0,
      
      // +30 сек
      extraTimeUsed: 0
    };
  }
  return G.monetization;
}

// ============ КРИСТАЛЛЫ (премиум валюта) ============
export function getCrystals() {
  return ensureMonetizationState().crystals || 0;
}

export function addCrystals(amount) {
  var m = ensureMonetizationState();
  m.crystals = (m.crystals || 0) + amount;
  persistGameState('add-crystals');
  return m.crystals;
}

export function spendCrystals(amount) {
  var m = ensureMonetizationState();
  if ((m.crystals || 0) < amount) return false;
  m.crystals -= amount;
  persistGameState('spend-crystals');
  return true;
}

// ============ DAILY LOGIN БОНУСЫ ============
export const DAILY_REWARDS = [
  { day: 1, crystals: 100, money: 10000, label: 'День 1' },
  { day: 2, crystals: 100, money: 15000, label: 'День 2' },
  { day: 3, crystals: 100, money: 20000, label: 'День 3' },
  { day: 4, crystals: 100, money: 25000, label: 'День 4' },
  { day: 5, crystals: 100, money: 30000, label: 'День 5' },
  { day: 6, crystals: 100, money: 40000, label: 'День 6' },
  { day: 7, crystals: 100, money: 100000, label: 'День 7' }
];

export const STARTER_BONUS = { crystals: 300, money: 0, label: 'Стартовый подарок' };

export function grantStarterBonusIfNeeded() {
  var m = ensureMonetizationState();
  if (m.starterBonusClaimed) return null;
  m.starterBonusClaimed = true;
  m.crystals = (m.crystals || 0) + STARTER_BONUS.crystals;
  if (STARTER_BONUS.money) G.m += STARTER_BONUS.money;
  persistGameState('starter-bonus');
  return {
    crystals: STARTER_BONUS.crystals,
    money: STARTER_BONUS.money || 0,
    label: STARTER_BONUS.label
  };
}

export function processDailyLogin() {
  var m = ensureMonetizationState();
  var today = getTodayKey();
  
  if (m.lastLoginDay === today) {
    return null; // Уже получил сегодня
  }
  
  // Проверяем стрик
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayKey = yesterday.toISOString().split('T')[0];
  
  if (m.lastLoginDay === yesterdayKey) {
    m.loginStreak = Math.min(7, (m.loginStreak || 0) + 1);
  } else if (m.lastLoginDay) {
    m.loginStreak = 1; // Стрик сброшен
  } else {
    m.loginStreak = 1; // Первый вход
  }
  
  m.lastLoginDay = today;
  
  var reward = DAILY_REWARDS[Math.min(m.loginStreak - 1, 6)];
  
  // Начисляем награды
  m.crystals = (m.crystals || 0) + reward.crystals;
  G.m += reward.money;
  
  persistGameState('daily-login');
  
  return {
    day: m.loginStreak,
    crystals: reward.crystals,
    money: reward.money,
    label: reward.label
  };
}

export function getLoginStreak() {
  return ensureMonetizationState().loginStreak || 0;
}

// ============ ОБЫЧНОЕ КОЛЕСО ============
export function canSpinWheelFree() {
  var m = ensureMonetizationState();
  var today = getTodayKey();
  if (m.lastWheelSpin !== today) return true;
  return m.wheelSpinsToday === 0;
}

export function getFreeSpinsLeft() {
  return ensureMonetizationState().freeSpinsLeft || 0;
}

export function useFreeSpinBonus() {
  var m = ensureMonetizationState();
  if ((m.freeSpinsLeft || 0) > 0) {
    m.freeSpinsLeft--;
    return true;
  }
  return false;
}

export function spinWheel(spinType) {
  var m = ensureMonetizationState();
  var today = getTodayKey();
  if (m.lastWheelSpin !== today) {
    m.lastWheelSpin = today;
    m.wheelSpinsToday = 0;
  }
  m.wheelSpinsToday++;
  var firstFreeSpin = spinType === 'free' && !m.equalWheelOddsUnlocked;
  var prize = firstFreeSpin ? weightedRandom(WHEEL_PRIZES) : equalRandom(WHEEL_PRIZES);
  if (firstFreeSpin) m.equalWheelOddsUnlocked = true;
  applyPrize(prize);
  persistGameState('wheel-spin');
  return prize;
}

// ============ ПРЕМИУМ КОЛЕСО ============
export function canSpinPremiumWheel() {
  var m = ensureMonetizationState();
  return (m.crystals || 0) >= PREMIUM_SPIN_COST;
}

export function spinPremiumWheel() {
  var m = ensureMonetizationState();
  if (!spendCrystals(PREMIUM_SPIN_COST)) return null;
  
  m.premiumSpinsToday = (m.premiumSpinsToday || 0) + 1;
  var prize = weightedRandom(PREMIUM_WHEEL_PRIZES);
  applyPremiumPrize(prize);
  persistGameState('premium-spin');
  return prize;
}

function applyPrize(prize) {
  var m = ensureMonetizationState();
  switch (prize.type) {
    case 'money': G.m += prize.value; break;
    case 'rep': G.rep += prize.value; break;
    case 'crystals': m.crystals = (m.crystals || 0) + prize.value; break;
    case 'vip_minutes': m.vipUntil = Math.max(m.vipUntil || 0, Date.now()) + prize.value * 60000; break;
    case 'energy': m.energy = Math.min((m.maxEnergy || 10) + 5, (m.energy || 0) + prize.value); break;
    case 'free_spins': m.freeSpinsLeft = (m.freeSpinsLeft || 0) + prize.value; break;
  }
}

function applyPremiumPrize(prize) {
  var m = ensureMonetizationState();
  switch (prize.type) {
    case 'money': G.m += prize.value; break;
    case 'rep': G.rep += prize.value; break;
    case 'crystals': m.crystals = (m.crystals || 0) + prize.value; break;
    case 'vip_minutes': m.vipUntil = Math.max(m.vipUntil || 0, Date.now()) + prize.value * 60000; break;
    case 'free_diag': m.freeDiagnostics = (m.freeDiagnostics || 0) + prize.value; break;
    case 'garage_slot': G.extraGarageSlots = (G.extraGarageSlots || 0) + prize.value; break;
    case 'legendary_car': m.legendaryCarPending = true; break;
  }
}

// ============ БЕСПЛАТНАЯ ДИАГНОСТИКА ============
export function hasFreeDiagnostic() {
  return (ensureMonetizationState().freeDiagnostics || 0) > 0;
}

export function useFreeDiagnostic() {
  var m = ensureMonetizationState();
  if ((m.freeDiagnostics || 0) > 0) {
    m.freeDiagnostics--;
    persistGameState('use-free-diag');
    return true;
  }
  return false;
}

// ============ ЛЕГЕНДАРНАЯ МАШИНА ============
export function hasLegendaryCarPending() {
  return ensureMonetizationState().legendaryCarPending || false;
}

export function claimLegendaryCar() {
  var m = ensureMonetizationState();
  if (m.legendaryCarPending) {
    m.legendaryCarPending = false;
    persistGameState('claim-legendary');
    return true;
  }
  return false;
}

// ============ VIP ============
export function isVipActive() {
  var m = ensureMonetizationState();
  return (m.vipUntil || 0) > Date.now() || !!(G.entitlements && G.entitlements.vipDealer);
}

export function getVipMinutesLeft() {
  var m = ensureMonetizationState();
  if ((m.vipUntil || 0) <= Date.now()) return 0;
  return Math.ceil((m.vipUntil - Date.now()) / 60000);
}

export function activateVip(minutes) {
  var m = ensureMonetizationState();
  m.vipUntil = Math.max(m.vipUntil || 0, Date.now()) + minutes * 60000;
  persistGameState('vip-activate');
}

// ============ ЭНЕРГИЯ ============
function regenEnergy() {
  var m = ensureMonetizationState();
  var now = Date.now();
  var elapsed = now - (m.lastEnergyRegen || now);
  var regenRate = 10 * 60 * 1000; // 1 за 10 мин
  var gained = Math.floor(elapsed / regenRate);
  if (gained > 0) {
    m.energy = Math.min(m.maxEnergy || 10, (m.energy || 0) + gained);
    m.lastEnergyRegen = now - (elapsed % regenRate);
  }
}

export function getEnergy() {
  regenEnergy();
  return ensureMonetizationState().energy || 0;
}

export function useEnergy(amount) {
  if (isVipActive()) return true;
  var m = ensureMonetizationState();
  regenEnergy();
  if ((m.energy || 0) < amount) return false;
  m.energy -= amount;
  persistGameState('use-energy');
  return true;
}

export function addEnergy(amount) {
  var m = ensureMonetizationState();
  m.energy = Math.min((m.maxEnergy || 10) + 10, (m.energy || 0) + amount);
  persistGameState('add-energy');
}

// ============ УДВОЕНИЕ ПРИБЫЛИ ============
export function setPendingDouble(profit, carName) {
  var m = ensureMonetizationState();
  m.pendingDoubleProfit = { profit: profit, carName: carName, ts: Date.now() };
}

export function getPendingDouble() {
  return ensureMonetizationState().pendingDoubleProfit;
}

export function claimDouble(doubled) {
  var m = ensureMonetizationState();
  var pending = m.pendingDoubleProfit;
  if (!pending) return 0;
  var bonus = doubled ? pending.profit : 0;
  if (doubled) G.m += pending.profit;
  m.pendingDoubleProfit = null;
  persistGameState('double-profit');
  return bonus;
}

// ============ ОФФЛАЙН ДОХОД ============
export function calcOfflineEarnings() {
  var m = ensureMonetizationState();
  var now = Date.now();
  var last = m.lastOfflineCheck || now;
  var elapsed = now - last;
  if (elapsed < 3 * 60 * 1000) { m.lastOfflineCheck = now; return null; }
  var hours = Math.min(8, elapsed / 3600000);
  var repMult = 1 + Math.max(0, G.rep || 0) / 100;
  var vipMult = isVipActive() ? 2 : 1;
  var earnings = Math.round(hours * 2000 * repMult * vipMult);
  var crystalBonus = Math.floor(hours / 2); // 1 кристалл за 2 часа
  m.lastOfflineCheck = now;
  if (earnings > 500) return { earnings: earnings, crystals: crystalBonus, hours: Math.round(hours * 10) / 10 };
  return null;
}

export function claimOffline(doubled) {
  var result = calcOfflineEarnings();
  if (!result) return { money: 0, crystals: 0 };
  var amount = doubled ? result.earnings * 2 : result.earnings;
  var crystals = doubled ? result.crystals * 2 : result.crystals;
  G.m += amount;
  addCrystals(crystals);
  persistGameState('offline-claim');
  return { money: amount, crystals: crystals };
}

// ============ КРЕДИТ ============
export function canGetLoan() {
  return !ensureMonetizationState().hasLoan;
}

export function getLoan() {
  var m = ensureMonetizationState();
  if (m.hasLoan) return false;
  G.m += 50000;
  m.hasLoan = true;
  m.loanAmount = 50000;
  persistGameState('get-loan');
  return true;
}

export function repayLoan() {
  var m = ensureMonetizationState();
  if (!m.hasLoan) return true;
  var repay = Math.round((m.loanAmount || 50000) * 1.2);
  if (G.m < repay) return false;
  G.m -= repay;
  m.hasLoan = false;
  m.loanAmount = 0;
  persistGameState('repay-loan');
  return true;
}

export function getLoanInfo() {
  var m = ensureMonetizationState();
  return { hasLoan: m.hasLoan || false, amount: m.loanAmount || 0, repay: Math.round((m.loanAmount || 0) * 1.2) };
}

// ============ +30 СЕК ============
export function canGetExtraTime() {
  return (ensureMonetizationState().extraTimeUsed || 0) < 2;
}

export function useExtraTime() {
  ensureMonetizationState().extraTimeUsed = (ensureMonetizationState().extraTimeUsed || 0) + 1;
}

export function resetExtraTime() {
  ensureMonetizationState().extraTimeUsed = 0;
}

// ============ IAP ============
export var IAP_PRODUCTS = [
  { id: 'no_ads_forever', name: 'Чистая игра', desc: 'Комфорт без рекламы', price: 'Цена в Яндекс Играх', icon: '🛡️' },
  { id: 'vip_dealer', name: 'Режим комфорта', desc: 'Без рекламы + мягкие бонусы', price: 'Цена в Яндекс Играх', icon: '👑' }
];

export function applyIAP(productId) {
  var m = ensureMonetizationState();
  switch (productId) {
    case 'no_ads_forever': G.entitlements.noAds = true; break;
    case 'vip_dealer': G.entitlements.noAds = true; G.entitlements.vipDealer = true; G.rep += 10; break;
  }
  persistGameState('iap-' + productId);
}

export function getGarageCap() {
  var base = 6;
  var vip = (G.entitlements && G.entitlements.vipDealer) ? 2 : 0;
  var extra = G.extraGarageSlots || 0;
  return base + vip + extra;
}
