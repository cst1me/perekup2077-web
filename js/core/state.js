// PEREKUP 2077 — State v4.0.0
import { fmt, getTodayKey } from './utils.js';

export var APP_VERSION = '4.0.4';
export var BUILD_VERSION = 404;
export var COMMIT_HASH = '__COMMIT__';

function defaultMeta() {
  return {
    intuitionXp: 0,
    mechanicXp: 0,
    psychologyXp: 0,
    analyticsXp: 0,
    streetRep: 0,
    sellerLore: {},
    runs60: 0,
    bestStreak: 0
  };
}

export var GS = {
  totalDeals: 0,
  totalProfit: 0,
  bestScore: 0,
  achievements: {},
  meta: defaultMeta()
};

function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

export function ensureMeta() {
  if (!isObj(GS.meta)) GS.meta = defaultMeta();
  var base = defaultMeta();
  Object.keys(base).forEach(function(k) {
    if (GS.meta[k] === undefined) GS.meta[k] = base[k];
  });
  if (!isObj(GS.meta.sellerLore)) GS.meta.sellerLore = {};
  return GS.meta;
}

export function metaLevel(key) {
  ensureMeta();
  var xp = Number(GS.meta[key + 'Xp'] || 0);
  return Math.max(1, Math.min(5, 1 + Math.floor(Math.sqrt(xp / 3))));
}

export function addMetaProgress(key, amount) {
  ensureMeta();
  var k = key + 'Xp';
  GS.meta[k] = Math.max(0, Number(GS.meta[k] || 0) + (amount || 0));
}

export function adjustStreetRep(delta) {
  ensureMeta();
  GS.meta.streetRep = Math.max(-20, Math.min(20, Number(GS.meta.streetRep || 0) + (delta || 0)));
}

export function noteSellerMemory(signature, outcome) {
  ensureMeta();
  if (!signature) return;
  var lore = GS.meta.sellerLore;
  var row = lore[signature] || { seen: 0, good: 0, bad: 0, skips: 0 };
  row.seen += 1;
  if (outcome === 'good') row.good += 1;
  else if (outcome === 'bad') row.bad += 1;
  else if (outcome === 'skip') row.skips += 1;
  lore[signature] = row;

  // keep memory compact
  var keys = Object.keys(lore);
  if (keys.length > 24) {
    keys.sort(function(a, b) { return (lore[a].seen || 0) - (lore[b].seen || 0); });
    while (keys.length > 24) {
      var victim = keys.shift();
      delete lore[victim];
    }
  }
}

export function loadGlobalStats() {
  try {
    var d = JSON.parse(localStorage.getItem('globalStats') || '{}');
    GS.totalDeals = Number.isFinite(d.totalDeals) ? d.totalDeals : 0;
    GS.totalProfit = Number.isFinite(d.totalProfit) ? d.totalProfit : 0;
    GS.bestScore = Number.isFinite(d.bestScore) ? d.bestScore : 0;
    GS.achievements = (d && typeof d.achievements === 'object') ? d.achievements : {};
    GS.meta = (d && typeof d.meta === 'object') ? d.meta : defaultMeta();
    ensureMeta();
  } catch(e) {
    GS.totalDeals = 0;
    GS.totalProfit = 0;
    GS.bestScore = 0;
    GS.achievements = {};
    GS.meta = defaultMeta();
  }
}

export function saveGlobalStats() {
  ensureMeta();
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
  t: 600,
  m: 0,
  d: 0,
  cur: null,
  best: 0,
  iv: null,
  combo: 0,
  maxCombo: 0,
  comboTimer: 0,
  offerTime: 0,
  haggling: false,
  lives: 5,
  endReason: '',
  buys: 0,
  speedDeals: 0,
  truthfulReads: 0,
  marketEvent: null
};

try { S.best = parseInt(localStorage.getItem('pb'), 10) || 0; } catch(e) {}

export function defaultG() {
  return {
    m: 500000,
    rep: 0,
    day: 1,
    gar: [],
    mkt: [],
    sk: {
      торговля: { l: 1, x: 0 },
      механика: { l: 1, x: 0 },
      хитрость: { l: 1, x: 0 },
      вождение: { l: 1, x: 0 }
    },
    taxi: null,
    buys: 0,
    mods: {
      srvDiscount: 0,
      apMult: 1,
      taxiMult: 1,
      upkeepMult: 1,
      sellMult: 1,
      bodyDiscount: 0
    },
    lastEvent: null,
    schemaVersion: 403
  };
}

export var G = defaultG();

export function replaceG(next) {
  var fresh = defaultG();
  Object.keys(G).forEach(function(k) { delete G[k]; });
  Object.keys(fresh).forEach(function(k) { G[k] = fresh[k]; });
  if (next && typeof next === 'object') {
    Object.keys(next).forEach(function(k) { G[k] = next[k]; });
  }
}

export function replaceGS(next) {
  GS.totalDeals = 0;
  GS.totalProfit = 0;
  GS.bestScore = 0;
  GS.achievements = {};
  GS.meta = defaultMeta();
  if (next && typeof next === 'object') {
    GS.totalDeals = Number.isFinite(next.totalDeals) ? next.totalDeals : 0;
    GS.totalProfit = Number.isFinite(next.totalProfit) ? next.totalProfit : 0;
    GS.bestScore = Number.isFinite(next.bestScore) ? next.bestScore : 0;
    GS.achievements = (next.achievements && typeof next.achievements === 'object') ? next.achievements : {};
    GS.meta = (next.meta && typeof next.meta === 'object') ? next.meta : defaultMeta();
  }
  ensureMeta();
}

export function validateGS(x) {
  if (!isObj(x)) return { ok: false, err: 'global stats not object' };
  if (!Number.isFinite(x.totalDeals) || x.totalDeals < 0) return { ok: false, err: 'bad totalDeals' };
  if (!Number.isFinite(x.totalProfit)) return { ok: false, err: 'bad totalProfit' };
  if (!Number.isFinite(x.bestScore) || x.bestScore < 0) return { ok: false, err: 'bad bestScore' };
  if (!isObj(x.achievements)) return { ok: false, err: 'bad achievements' };
  if (x.meta !== undefined && !isObj(x.meta)) return { ok: false, err: 'bad meta' };
  return { ok: true };
}

export function validateG(x) {
  if (!isObj(x)) return { ok: false, err: 'state not object' };
  if (!Number.isFinite(x.m)) return { ok: false, err: 'bad money' };
  if (!Number.isFinite(x.rep)) return { ok: false, err: 'bad rep' };
  if (!Number.isFinite(x.day) || x.day < 1) return { ok: false, err: 'bad day' };
  if (!Array.isArray(x.gar)) return { ok: false, err: 'garage not array' };
  if (!Array.isArray(x.mkt)) return { ok: false, err: 'market not array' };
  if (!isObj(x.sk)) return { ok: false, err: 'skills not object' };
  if (!isObj(x.mods)) return { ok: false, err: 'mods not object' };
  return { ok: true };
}

export function resetSKeepBuys() {
  var b = S.buys || 0;
  S.t = 600;
  S.m = 0;
  S.d = 0;
  S.cur = null;
  S.iv = null;
  S.combo = 0;
  S.maxCombo = 0;
  S.comboTimer = 3;
  S.offerTime = 0;
  S.haggling = false;
  S.lives = 5;
  S.endReason = '';
  S.buys = b;
  S.speedDeals = 0;
  S.truthfulReads = 0;
  S.marketEvent = null;
  return S;
}

export function totalBuys() { return (S.buys || 0) + (G.buys || 0); }
export function hiddenLevel() { return Math.min(5, 1 + Math.floor(totalBuys() / 10)); }

export function loadTaxiDaily() {
  try {
    var d = JSON.parse(localStorage.getItem('taxiDaily') || '{}');
    return d.date === getTodayKey() ? (d.used || 0) : 0;
  } catch(e) { return 0; }
}

export function saveTaxiDaily(u) {
  try { localStorage.setItem('taxiDaily', JSON.stringify({ date: getTodayKey(), used: u })); } catch(e) {}
}

export function taxiUseOne() {
  var u = loadTaxiDaily() + 1;
  saveTaxiDaily(u);
  return u;
}

export function setPB(v) {
  try {
    localStorage.setItem('pb', String(v));
    S.best = v;
  } catch(e) {}
}

export var ACHIEVEMENTS = [
  { id: 'first_deal', name: 'Первая сделка', desc: 'Первая сделка', icon: '🎯', check: function() { return GS.totalDeals >= 1; } },
  { id: 'deals_10', name: 'Бывалый', desc: '10 сделок', icon: '📈', check: function() { return GS.totalDeals >= 10; } },
  { id: 'deals_50', name: 'Профи', desc: '50 сделок', icon: '💼', check: function() { return GS.totalDeals >= 50; } },
  { id: 'deals_100', name: 'Легенда', desc: '100 сделок', icon: '👑', check: function() { return GS.totalDeals >= 100; } },
  { id: 'profit_100k', name: 'Сотка', desc: '100 000 ₽ за раунд', icon: '💸', check: function() { return false; } },
  { id: 'profit_500k', name: 'Пол-ляма', desc: '500 000 ₽ за раунд', icon: '🚀', check: function() { return false; } },
  { id: 'combo_5', name: 'Серия', desc: 'Комбо x3+', icon: '🔥', check: function() { return false; } },
  { id: 'combo_7', name: 'Огненный трейдер', desc: 'Комбо x4+', icon: '⚡', check: function() { return false; } },
  { id: 'legendary', name: 'Легендарка', desc: 'Куплена легендарная машина', icon: '💎', check: function() { return false; } },
  { id: 'speed_demon', name: 'Спидранер', desc: '5 быстрых сделок подряд', icon: '🏎️', check: function() { return false; } },
  { id: 'scam_dodge', name: 'Чутьё', desc: 'Пропущен явный кидала', icon: '🕵️', check: function() { return false; } },
  { id: 'mind_reader', name: 'Читатель людей', desc: 'Угадал 5 мутных сделок', icon: '🧠', check: function() { return false; } }
];

export function checkAchievements(fn) {
  ACHIEVEMENTS.forEach(function(a) {
    if (a.check && !GS.achievements[a.id] && a.check()) fn(a);
  });
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
