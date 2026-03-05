// PEREKUP 2077 — state management
import { fmt, getTodayKey } from './utils.js';

export var APP_VERSION = '3.0.5';

export var GS = {
  totalDeals: 0,
  totalProfit: 0,
  bestScore: 0,
  achievements: {}
};

export function loadGlobalStats() {
  try {
    var d = JSON.parse(localStorage.getItem('globalStats') || '{}');
    GS.totalDeals = d.totalDeals || 0;
    GS.totalProfit = d.totalProfit || 0;
    GS.bestScore = d.bestScore || 0;
    GS.achievements = d.achievements || {};
  } catch(e) {}
}

export function saveGlobalStats() {
  try { localStorage.setItem('globalStats', JSON.stringify(GS)); } catch(e) {}
}

export function updateGlobalStatsUI() {
  var de = document.getElementById('g-deals');
  var pr = document.getElementById('g-profit');
  var be = document.getElementById('g-best');
  if (de) de.textContent = GS.totalDeals;
  if (pr) pr.textContent = fmt(GS.totalProfit);
  if (be) be.textContent = fmt(GS.bestScore);
}

// 60-sec state
export var S = {
  t: 600, m: 0, d: 0, cur: null, best: parseInt(localStorage.getItem('pb')) || 0, iv: null,
  combo: 0, maxCombo: 0, comboTimer: 0, offerTime: 0, haggling: false, lives: 5, endReason: '',
  buys: 0, speedDeals: 0
};

// Simulator state
export var G = {
  m: 500000, rep: 0, day: 1, gar: [], mkt: [],
  sk: { торговля: { l: 1, x: 0 }, механика: { l: 1, x: 0 }, хитрость: { l: 1, x: 0 }, вождение: { l: 1, x: 0 } },
  taxi: null, buys: 0,
  mods: { srvDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1 },
  lastEvent: null
};

export function resetSKeepBuys() {
  var keepBuys = S.buys || 0;
  S.t = 600; S.m = 0; S.d = 0; S.cur = null; S.iv = null;
  S.combo = 0; S.maxCombo = 0; S.comboTimer = 3; S.offerTime = 0;
  S.haggling = false; S.lives = 5; S.endReason = '';
  S.buys = keepBuys; S.speedDeals = 0;
  return S;
}

export function totalBuys() { return (S.buys || 0) + (G.buys || 0); }

export function hiddenLevel() {
  var b = totalBuys();
  return Math.min(4, 1 + Math.floor(b / 10));
}

export function loadTaxiDaily() {
  try {
    var d = JSON.parse(localStorage.getItem('taxiDaily') || '{}');
    return d.date === getTodayKey() ? (d.used || 0) : 0;
  } catch(e) { return 0; }
}

export function saveTaxiDaily(used) {
  localStorage.setItem('taxiDaily', JSON.stringify({ date: getTodayKey(), used: used }));
}

export function taxiUseOne() {
  var u = loadTaxiDaily() + 1;
  saveTaxiDaily(u);
  return u;
}

export function setPB(val) {
  try { localStorage.setItem('pb', String(val)); } catch(e) {}
}

// Achievements
export var ACHIEVEMENTS = [
  { id: 'first_deal', name: 'Первая сделка', desc: 'Заверши первую сделку', icon: '🎯', check: function() { return GS.totalDeals >= 1; } },
  { id: 'deals_10', name: 'Бывалый', desc: '10 сделок', icon: '📈', check: function() { return GS.totalDeals >= 10; } },
  { id: 'deals_50', name: 'Профи', desc: '50 сделок', icon: '💼', check: function() { return GS.totalDeals >= 50; } },
  { id: 'deals_100', name: 'Легенда', desc: '100 сделок', icon: '👑', check: function() { return GS.totalDeals >= 100; } },
  { id: 'profit_100k', name: 'Сотка', desc: '100K за раунд', icon: '💰', check: function() { return false; } },
  { id: 'profit_500k', name: 'Полмиллиона', desc: '500K за раунд', icon: '💎', check: function() { return false; } },
  { id: 'combo_5', name: 'Комбо мастер', desc: 'x3 комбо', icon: '🔥', check: function() { return false; } },
  { id: 'combo_7', name: 'Комбо бог', desc: 'x4 комбо', icon: '⚡', check: function() { return false; } },
  { id: 'scam_dodge', name: 'Чутьё', desc: 'Избеги кидалу', icon: '🕵️', check: function() { return false; } },
  { id: 'legendary', name: 'Золотая жила', desc: 'Купи легендарку', icon: '💎', check: function() { return false; } },
  { id: 'speed_demon', name: 'Молния', desc: '5 сделок за 1.5 сек', icon: '⚡', check: function() { return false; } }
];

export function checkAchievements(unlockFn) {
  ACHIEVEMENTS.forEach(function(a) {
    if (!GS.achievements[a.id] && a.check()) unlockFn(a);
  });
}

export function showAchievement(a) {
  var el = document.getElementById('achievement');
  if (!el) return;
  document.getElementById('ach-icon').textContent = a.icon;
  document.getElementById('ach-text').textContent = a.name;
  document.getElementById('ach-desc').textContent = a.desc;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 3000);
}
