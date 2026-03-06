// PEREKUP 2077 — State v3.0.8
import { fmt, getTodayKey } from './utils.js';

export var APP_VERSION = '3.1.3';
export var BUILD_VERSION = '313';
export var COMMIT_HASH = '__COMMIT__';

export var GS = { totalDeals: 0, totalProfit: 0, bestScore: 0, achievements: {} };

export function loadGlobalStats() {
  try {
    var d = JSON.parse(localStorage.getItem('globalStats') || '{}');
    GS.totalDeals = parseInt(d.totalDeals, 10) || 0;
    GS.totalProfit = parseInt(d.totalProfit, 10) || 0;
    GS.bestScore = parseInt(d.bestScore, 10) || 0;
    GS.achievements = d.achievements || {};
  } catch(e) { console.warn('loadGlobalStats error:', e); }
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
try { S.best = parseInt(localStorage.getItem('pb'), 10) || 0; } catch(e) { S.best = 0; }

export var G = {
  m: 500000, rep: 0, day: 1, gar: [], mkt: [],
  sk: { торговля: { l: 1, x: 0 }, механика: { l: 1, x: 0 }, хитрость: { l: 1, x: 0 }, вождение: { l: 1, x: 0 } },
  taxi: null, buys: 0,
  mods: { srvDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1, sellMult: 1, bodyDiscount: 0 },
  lastEvent: null
};

export function defaultG() {
  return {
    m: 500000, rep: 0, day: 1, gar: [], mkt: [],
    sk: { торговля: { l: 1, x: 0 }, механика: { l: 1, x: 0 }, хитрость: { l: 1, x: 0 }, вождение: { l: 1, x: 0 } },
    taxi: null, buys: 0,
    mods: { srvDiscount: 0, bodyDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1, sellMult: 1 },
    lastEvent: null
  };
}

function isFiniteNum(x) {
  return typeof x === 'number' && isFinite(x) && !isNaN(x);
}

export function validateGS(obj) {
  try {
    if (!obj || typeof obj !== 'object') return { ok: false, err: 'GS: not an object' };
    if (!Number.isInteger(obj.totalDeals) || obj.totalDeals < 0) return { ok: false, err: 'GS.totalDeals' };
    if (!isFiniteNum(obj.totalProfit)) return { ok: false, err: 'GS.totalProfit' };
    if (!isFiniteNum(obj.bestScore) || obj.bestScore < 0) return { ok: false, err: 'GS.bestScore' };
    if (!obj.achievements || typeof obj.achievements !== 'object') return { ok: false, err: 'GS.achievements' };
    return { ok: true };
  } catch(e) {
    return { ok: false, err: 'GS: exception' };
  }
}

export function validateG(obj) {
  try {
    if (!obj || typeof obj !== 'object') return { ok: false, err: 'G: not an object' };
    if (!isFiniteNum(obj.m) || obj.m < -1e12 || obj.m > 1e12) return { ok: false, err: 'G.m' };
    if (!Number.isInteger(obj.day) || obj.day < 1 || obj.day > 1000000) return { ok: false, err: 'G.day' };
    if (!Number.isInteger(obj.rep) || obj.rep < -100000 || obj.rep > 1000000) return { ok: false, err: 'G.rep' };
    if (!Array.isArray(obj.gar) || !Array.isArray(obj.mkt)) return { ok: false, err: 'G.gar/G.mkt' };
    if (!obj.sk || typeof obj.sk !== 'object') return { ok: false, err: 'G.sk' };
    ['торговля', 'механика', 'хитрость', 'вождение'].forEach(function(k) {
      if (!obj.sk[k] || typeof obj.sk[k] !== 'object') throw new Error('G.sk.' + k);
      if (!Number.isInteger(obj.sk[k].l) || obj.sk[k].l < 1 || obj.sk[k].l > 99) throw new Error('G.sk.' + k + '.l');
      if (!Number.isInteger(obj.sk[k].x) || obj.sk[k].x < 0 || obj.sk[k].x > 999999) throw new Error('G.sk.' + k + '.x');
    });
    if (!obj.mods || typeof obj.mods !== 'object') return { ok: false, err: 'G.mods' };
    return { ok: true };
  } catch(e) {
    return { ok: false, err: e && e.message ? e.message : 'G: exception' };
  }
}

function replaceObjectInPlace(target, src) {
  Object.keys(target).forEach(function(k) { delete target[k]; });
  Object.keys(src).forEach(function(k) { target[k] = src[k]; });
}

export function replaceG(newG) {
  replaceObjectInPlace(G, newG);
}

export function replaceGS(newGS) {
  replaceObjectInPlace(GS, newGS);
}

export function resetSKeepBuys() {
  var b = S.buys || 0;
  S.t = 600; S.m = 0; S.d = 0; S.cur = null; S.iv = null;
  S.combo = 0; S.maxCombo = 0; S.comboTimer = 3; S.offerTime = 0;
  S.haggling = false; S.lives = 5; S.endReason = ''; S.buys = b; S.speedDeals = 0;
  return S;
}

export function totalBuys() { return (S.buys || 0) + (G.buys || 0); }
export function hiddenLevel() { return Math.min(4, 1 + Math.floor(totalBuys() / 10)); }


export function getRepTier(rep) {
  rep = Number(rep) || 0;
  if (rep >= 160) return { key: 'elite', label: 'ЭЛИТА', market: 'Премиум поток', condBonus: 12, buyMult: 0.94, rareChance: 0.18, riskBias: -0.06 };
  if (rep >= 80) return { key: 'dealer', label: 'ДИЛЕР', market: 'Сильные лоты', condBonus: 8, buyMult: 0.97, rareChance: 0.10, riskBias: -0.03 };
  if (rep >= 25) return { key: 'street', label: 'УЛИЦА', market: 'Уверенный поток', condBonus: 4, buyMult: 0.99, rareChance: 0.06, riskBias: -0.01 };
  if (rep <= -20) return { key: 'shady', label: 'ТЕНЕВОЙ', market: 'Серый риск', condBonus: -8, buyMult: 0.96, rareChance: 0.03, riskBias: 0.08 };
  return { key: 'rookie', label: 'НОВИЧОК', market: 'Стандарт', condBonus: 0, buyMult: 1.0, rareChance: 0.04, riskBias: 0.00 };
}

export function loadTaxiDaily() {
  try {
    var d = JSON.parse(localStorage.getItem('taxiDaily') || '{}');
    return d.date === getTodayKey() ? (parseInt(d.used, 10) || 0) : 0;
  } catch(e) { return 0; }
}

export function saveTaxiDaily(u) {
  try { localStorage.setItem('taxiDaily', JSON.stringify({ date: getTodayKey(), used: u })); } catch(e) {}
}

export function taxiUseOne() { var u = loadTaxiDaily() + 1; saveTaxiDaily(u); return u; }
export function setPB(v) { try { localStorage.setItem('pb', String(v)); S.best = v; } catch(e) {} }

export var ACHIEVEMENTS = [
  { id: 'first_deal', name: 'Первая сделка', desc: 'Заверши первую сделку', icon: '🎯', check: function() { return GS.totalDeals >= 1; } },
  { id: 'deals_10', name: 'Бывалый', desc: '10 сделок', icon: '📈', check: function() { return GS.totalDeals >= 10; } },
  { id: 'deals_50', name: 'Профи', desc: '50 сделок', icon: '💼', check: function() { return GS.totalDeals >= 50; } },
  { id: 'deals_100', name: 'Легенда', desc: '100 сделок', icon: '👑', check: function() { return GS.totalDeals >= 100; } },
  { id: 'profit_100k', name: 'Сотка', desc: '100K за раунд', icon: '💰' },
  { id: 'profit_500k', name: 'Полмиллиона', desc: '500K за раунд', icon: '💎' },
  { id: 'combo_5', name: 'Комбо мастер', desc: 'x3 комбо', icon: '🔥' },
  { id: 'scam_dodge', name: 'Чутьё', desc: 'Избеги кидалу', icon: '🕵️' },
  { id: 'legendary', name: 'Золотая жила', desc: 'Купи легендарку', icon: '💎' }
];

export function checkAchievements(fn) {
  ACHIEVEMENTS.forEach(function(a) { if (a.check && !GS.achievements[a.id] && a.check()) fn(a); });
}

export function showAchievement(a) {
  try {
    var el = document.getElementById('achievement');
    if (!el) return;
    document.getElementById('ach-icon').textContent = a.icon || '🏆';
    document.getElementById('ach-text').textContent = a.name || 'Достижение';
    document.getElementById('ach-desc').textContent = a.desc || '';
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 3000);
  } catch(e) {}
}
