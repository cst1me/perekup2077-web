// PEREKUP 2077 — State v3.0.7
import { fmt, getTodayKey } from './utils.js';

export var APP_VERSION = '3.0.7';
export var BUILD_VERSION = '307';

export var GS = { totalDeals: 0, totalProfit: 0, bestScore: 0, achievements: {} };

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
  try {
    var de = document.getElementById('g-deals');
    var pr = document.getElementById('g-profit');
    var be = document.getElementById('g-best');
    if (de) de.textContent = GS.totalDeals;
    if (pr) pr.textContent = fmt(GS.totalProfit);
    if (be) be.textContent = fmt(GS.bestScore);
  } catch(e) {}
}

export var S = {
  t: 600, m: 0, d: 0, cur: null, best: 0, iv: null,
  combo: 0, maxCombo: 0, comboTimer: 0, offerTime: 0,
  haggling: false, lives: 5, endReason: '', buys: 0, speedDeals: 0
};
try { S.best = parseInt(localStorage.getItem('pb'), 10) || 0; } catch(e) {}

export var G = {
  m: 500000, rep: 0, day: 1, gar: [], mkt: [],
  sk: { торговля: { l: 1, x: 0 }, механика: { l: 1, x: 0 }, хитрость: { l: 1, x: 0 }, вождение: { l: 1, x: 0 } },
  taxi: null, buys: 0,
  mods: { srvDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1, sellMult: 1, bodyDiscount: 0 },
  lastEvent: null
};

export function resetSKeepBuys() {
  var b = S.buys || 0;
  S.t = 600; S.m = 0; S.d = 0; S.cur = null; S.iv = null;
  S.combo = 0; S.maxCombo = 0; S.comboTimer = 3; S.offerTime = 0;
  S.haggling = false; S.lives = 5; S.endReason = ''; S.buys = b; S.speedDeals = 0;
  return S;
}

export function totalBuys() { return (S.buys || 0) + (G.buys || 0); }
export function hiddenLevel() { return Math.min(4, 1 + Math.floor(totalBuys() / 10)); }

export function loadTaxiDaily() {
  try {
    var d = JSON.parse(localStorage.getItem('taxiDaily') || '{}');
    return d.date === getTodayKey() ? (d.used || 0) : 0;
  } catch(e) { return 0; }
}

export function saveTaxiDaily(u) {
  try { localStorage.setItem('taxiDaily', JSON.stringify({ date: getTodayKey(), used: u })); } catch(e) {}
}

export function taxiUseOne() { var u = loadTaxiDaily() + 1; saveTaxiDaily(u); return u; }
export function setPB(v) { try { localStorage.setItem('pb', String(v)); S.best = v; } catch(e) {} }

export var ACHIEVEMENTS = [
  { id: 'first_deal', name: 'Первая сделка', desc: 'Первая сделка', icon: '🎯', check: function() { return GS.totalDeals >= 1; } },
  { id: 'deals_10', name: 'Бывалый', desc: '10 сделок', icon: '📈', check: function() { return GS.totalDeals >= 10; } },
  { id: 'deals_50', name: 'Профи', desc: '50 сделок', icon: '💼', check: function() { return GS.totalDeals >= 50; } },
  { id: 'deals_100', name: 'Легенда', desc: '100 сделок', icon: '👑', check: function() { return GS.totalDeals >= 100; } }
];

export function checkAchievements(fn) {
  ACHIEVEMENTS.forEach(function(a) { if (a.check && !GS.achievements[a.id] && a.check()) fn(a); });
}

export function showAchievement(a) {
  try {
    var el = document.getElementById('achievement');
    if (!el) return;
    document.getElementById('ach-icon').textContent = a.icon;
    document.getElementById('ach-text').textContent = a.name;
    document.getElementById('ach-desc').textContent = a.desc;
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 3000);
  } catch(e) {}
}
