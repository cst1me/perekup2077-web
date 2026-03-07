// PEREKUP 2077 — State v4.5.1 Growth Max
import { fmt, getTodayKey, toast } from './utils.js';

export var APP_VERSION = '5.4.5';
export var BUILD_VERSION = 545;
export var COMMIT_HASH = '__COMMIT__';
const SAVE_KEY = 'p2077_yandex_save_v1';
const BONUS_KEY = 'p2077_daily_bonus';

// Безопасный localStorage для APK/WebView
var safeStorage = {
  getItem: function(key) {
    try { return localStorage.getItem(key); }
    catch(e) { console.warn('[STORAGE] get error:', key); return null; }
  },
  setItem: function(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch(e) { console.warn('[STORAGE] set error:', key); return false; }
  },
  removeItem: function(key) {
    try { localStorage.removeItem(key); }
    catch(e) { console.warn('[STORAGE] remove error:', key); }
  }
};

function defaultSkills() {
  return { торговля: { l: 1, x: 0 }, механика: { l: 1, x: 0 }, хитрость: { l: 1, x: 0 }, вождение: { l: 1, x: 0 } };
}

export function defaultG() {
  return {
    m: 500000, rep: 0, day: 1, gar: [], mkt: [],
    sk: defaultSkills(),
    taxi: null, buys: 0,
    mods: { srvDiscount: 0, bodyDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1, sellMult: 1 },
    taxiProg: { lvl: 1, xp: 0, totalDone: 0 },
    lastEvent: null,
    heat: 0,
    marketTrend: null,
    blackMarket: null,
    retention: {
      lastLoginDay: '',
      streak: 0,
      comebackDaysMissed: 0,
      dailyLotKey: '',
      dailyClaimed: false,
      shortcutPromptShown: false,
      reviewPromptShown: false
    },
    meta: { sessions: 0, totalPlaySeconds: 0, bestFlipProfit: 0, lastBigProfit: 0 },
    entitlements: { noAds: false, vipDealer: false },
    liveops: { weeklyEventKey: '', weeklyEventId: '', lastWeeklySeen: '' },
    stats: { fastestDeals: 0, maxCombo: 0, scamsDodged: 0, sixtyBestProfit: 0 },
    missions: { claimed: {} }
  };
}

export var GS = { totalDeals: 0, totalProfit: 0, bestScore: 0, achievements: {} };
export var S = {
  t: 600, m: 0, d: 0, cur: null, best: 0, iv: null,
  combo: 0, maxCombo: 0, comboTimer: 0, offerTime: 0,
  haggling: false, lives: 5, endReason: '', buys: 0, speedDeals: 0
};
try { S.best = parseInt(localStorage.getItem('pb'), 10) || 0; } catch(e) { S.best = 0; }
export var G = defaultG();

function ensureGSShape(obj) {
  obj = obj && typeof obj === 'object' ? obj : {};
  return {
    totalDeals: parseInt(obj.totalDeals, 10) || 0,
    totalProfit: Number(obj.totalProfit) || 0,
    bestScore: parseInt(obj.bestScore, 10) || 0,
    achievements: obj.achievements && typeof obj.achievements === 'object' ? obj.achievements : {}
  };
}

function ensureGShape(obj) {
  var d = defaultG();
  obj = obj && typeof obj === 'object' ? obj : {};
  d.m = Number.isFinite(obj.m) ? obj.m : d.m;
  d.rep = Number.isInteger(obj.rep) ? obj.rep : d.rep;
  d.day = Number.isInteger(obj.day) && obj.day > 0 ? obj.day : d.day;
  d.gar = Array.isArray(obj.gar) ? obj.gar : [];
  d.mkt = Array.isArray(obj.mkt) ? obj.mkt : [];
  d.sk = obj.sk && typeof obj.sk === 'object' ? obj.sk : defaultSkills();
  ['торговля', 'механика', 'хитрость', 'вождение'].forEach(function(k) {
    if (!d.sk[k] || typeof d.sk[k] !== 'object') d.sk[k] = { l: 1, x: 0 };
    d.sk[k].l = Number.isInteger(d.sk[k].l) && d.sk[k].l > 0 ? d.sk[k].l : 1;
    d.sk[k].x = Number.isInteger(d.sk[k].x) && d.sk[k].x >= 0 ? d.sk[k].x : 0;
  });
  d.taxi = obj.taxi && typeof obj.taxi === 'object' ? obj.taxi : null;
  d.buys = Number.isInteger(obj.buys) && obj.buys >= 0 ? obj.buys : 0;
  d.mods = Object.assign({}, d.mods, obj.mods && typeof obj.mods === 'object' ? obj.mods : {});
  d.taxiProg = obj.taxiProg && typeof obj.taxiProg === 'object' ? obj.taxiProg : { lvl: 1, xp: 0, totalDone: 0 };
  d.taxiProg.lvl = Number.isInteger(d.taxiProg.lvl) && d.taxiProg.lvl > 0 ? d.taxiProg.lvl : 1;
  d.taxiProg.xp = Number.isInteger(d.taxiProg.xp) && d.taxiProg.xp >= 0 ? d.taxiProg.xp : 0;
  d.taxiProg.totalDone = Number.isInteger(d.taxiProg.totalDone) && d.taxiProg.totalDone >= 0 ? d.taxiProg.totalDone : 0;
  d.lastEvent = obj.lastEvent || null;
  d.heat = Number.isInteger(obj.heat) ? obj.heat : 0;
  d.marketTrend = obj.marketTrend && typeof obj.marketTrend === 'object' ? obj.marketTrend : null;
  d.blackMarket = obj.blackMarket && typeof obj.blackMarket === 'object' ? obj.blackMarket : null;
  d.retention = obj.retention && typeof obj.retention === 'object' ? Object.assign({}, d.retention, obj.retention) : d.retention;
  d.meta = obj.meta && typeof obj.meta === 'object' ? Object.assign({}, d.meta, obj.meta) : d.meta;
  d.entitlements = obj.entitlements && typeof obj.entitlements === 'object' ? Object.assign({}, d.entitlements, obj.entitlements) : d.entitlements;
  d.liveops = obj.liveops && typeof obj.liveops === 'object' ? Object.assign({}, d.liveops, obj.liveops) : d.liveops;
  d.stats = obj.stats && typeof obj.stats === 'object' ? Object.assign({}, d.stats, obj.stats) : d.stats;
  d.missions = obj.missions && typeof obj.missions === 'object' ? Object.assign({}, d.missions, obj.missions) : d.missions;
  if (!d.missions.claimed || typeof d.missions.claimed !== 'object') d.missions.claimed = {};
  return d;
}

export function loadGlobalStats() {
  try { replaceGS(JSON.parse(localStorage.getItem('globalStats') || '{}')); }
  catch(e) { console.warn('loadGlobalStats error:', e); replaceGS({}); }
}

export function saveGlobalStats() {
  try { localStorage.setItem('globalStats', JSON.stringify(ensureGSShape(GS))); } catch(e) {}
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
  replaceObjectInPlace(G, ensureGShape(newG));
  if (typeof window !== 'undefined') window.G = G;
}

export function replaceGS(newGS) {
  replaceObjectInPlace(GS, ensureGSShape(newGS));
  if (typeof window !== 'undefined') window.GS = GS;
}

function currentPayload(reason) {
  return {
    version: 1,
    ts: Date.now(),
    reason: reason || 'manual',
    G: ensureGShape(G),
    GS: ensureGSShape(GS),
    pb: S.best || 0
  };
}

function applyPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  replaceG(payload.G || defaultG());
  replaceGS(payload.GS || {});
  if (payload.pb != null) setPB(parseInt(payload.pb, 10) || 0);
  saveGlobalStats();
  return true;
}

export async function loadPersistentState() {
  var localPayload = null;
  try { localPayload = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) {}

  var cloudPayload = null;
  try {
    if (window.ysdk && typeof window.ysdk.getPlayer === 'function') {
      var player = await window.ysdk.getPlayer({ scopes: false });
      if (player && typeof player.getData === 'function') {
        var data = await player.getData([SAVE_KEY]);
        cloudPayload = data && data[SAVE_KEY] ? data[SAVE_KEY] : null;
      }
    }
  } catch (e) {
    console.warn('[YG] load cloud fallback:', e);
  }

  var chosen = null;
  var source = 'new';
  if (cloudPayload && localPayload) {
    chosen = (cloudPayload.ts || 0) >= (localPayload.ts || 0) ? cloudPayload : localPayload;
    source = (cloudPayload.ts || 0) >= (localPayload.ts || 0) ? 'cloud' : 'local';
  } else if (cloudPayload) {
    chosen = cloudPayload;
    source = 'cloud';
  } else if (localPayload) {
    chosen = localPayload;
    source = 'local';
  }

  if (chosen) {
    applyPayload(chosen);
    // Уведомление о загрузке
    setTimeout(function() {
      var sourceText = source === 'cloud' ? '☁️ облака' : '💾 локального';
      if (typeof toast === 'function') toast('📂 Прогресс загружен из ' + sourceText, 'success');
    }, 500);
  } else {
    replaceG(defaultG());
    replaceGS({});
  }
  
  updateGlobalStatsUI();
  return chosen;
}

export async function persistGameState(reason) {
  try {
    var payload = currentPayload(reason);
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    saveGlobalStats();
    if (window.ysdk && typeof window.ysdk.getPlayer === 'function') {
      try {
        var player = await window.ysdk.getPlayer({ scopes: false });
        if (player && typeof player.setData === 'function') await player.setData({ [SAVE_KEY]: payload }, true);
      } catch (e) {
        console.warn('[YG] save cloud fallback:', e);
      }
    }
    return true;
  } catch (e) {
    console.warn('[SAVE]', e);
    return false;
  }
}

export function grantDailyBonus() {
  try {
    var today = getTodayKey();
    if ((localStorage.getItem(BONUS_KEY) || '') === today) return false;
    G.m += 1000;
    localStorage.setItem(BONUS_KEY, today);
    toast('🎁 Ежедневный бонус: +1 000$', 'success');
    persistGameState('daily-bonus');
    return true;
  } catch (e) {
    console.warn('[BONUS]', e);
    return false;
  }
}

export function resetSKeepBuys() {
  var b = S.buys || 0;
  Object.assign(S, {
    t: 600, m: 0, d: 0, cur: null, iv: null,
    combo: 0, maxCombo: 0, comboTimer: 3, offerTime: 0,
    haggling: false, lives: 5, endReason: '', buys: b, speedDeals: 0,
    phase: 'warmup', inspected: false, inspectResult: '', inspectLock: false,
    dodgeChain: 0, nextProfitMult: 1, fastDecisionChain: 0, insuranceUsed: false,
    boosts: null, vipBuyerSpawned: false, finalRushTriggered: false,
    fastestDeals: 0, scamsDodged: 0, decisions: 0
  });
  return S;
}

export function totalBuys() { return (S.buys || 0) + (G.buys || 0); }
export function hiddenLevel() { return getHiddenDifficultyProfile().level; }

export var MISSION_LIST = [
  { id: 'deals_3', title: 'Первые сделки', desc: 'Заверши 3 продажи в симуляторе', metric: 'totalDeals', goal: 3, reward: { crystals: 120, money: 15000 } },
  { id: 'rep_20', title: 'Имя на рынке', desc: 'Накопи 20 репутации', metric: 'rep', goal: 20, reward: { crystals: 150, money: 25000 } },
  { id: 'profit_250k', title: 'Разогрев капитала', desc: 'Заработай суммарно 250 000 ₽ прибыли', metric: 'totalProfit', goal: 250000, reward: { crystals: 200, money: 40000 } },
  { id: 'sixty_120k', title: 'Турбо-дилер', desc: 'Покажи 120 000 ₽ прибыли в режиме 60 секунд', metric: 'sixtyBestProfit', goal: 120000, reward: { crystals: 180, money: 0 } },
  { id: 'garage_3', title: 'Свой автопарк', desc: 'Держи 3 машины одновременно в гараже', metric: 'garageCount', goal: 3, reward: { crystals: 140, money: 20000 } }
];

function ensureMissionShape() {
  if (!G.missions || typeof G.missions !== 'object') G.missions = { claimed: {} };
  if (!G.missions.claimed || typeof G.missions.claimed !== 'object') G.missions.claimed = {};
  return G.missions;
}

function readMissionMetric(metric) {
  if (metric === 'totalDeals') return GS.totalDeals || 0;
  if (metric === 'rep') return G.rep || 0;
  if (metric === 'totalProfit') return Math.max(0, Math.round(GS.totalProfit || 0));
  if (metric === 'sixtyBestProfit') return (G.stats && G.stats.sixtyBestProfit) || 0;
  if (metric === 'garageCount') return Array.isArray(G.gar) ? G.gar.length : 0;
  return 0;
}

export function getMissionStatus() {
  ensureMissionShape();
  return MISSION_LIST.map(function(m) {
    var progress = readMissionMetric(m.metric);
    var complete = progress >= m.goal;
    var claimed = !!G.missions.claimed[m.id];
    return Object.assign({}, m, { progress: progress, complete: complete, claimed: claimed });
  });
}

export function claimMissionReward(id) {
  ensureMissionShape();
  var mission = getMissionStatus().find(function(m) { return m.id === id; });
  if (!mission || !mission.complete || mission.claimed) return null;
  G.missions.claimed[id] = true;
  if (mission.reward.money) G.m += mission.reward.money;
  if (mission.reward.crystals) {
    if (!G.monetization || typeof G.monetization !== 'object') G.monetization = {};
    G.monetization.crystals = (G.monetization.crystals || 0) + mission.reward.crystals;
  }
  persistGameState('mission-' + id);
  return mission.reward;
}

export function getHiddenDifficultyProfile() {
  var score = 0;
  score += Math.floor((GS.totalDeals || 0) / 4);
  score += Math.floor(Math.max(0, G.rep || 0) / 12);
  score += Math.floor(Math.max(0, G.day - 1) / 3);
  score += Math.floor(Math.max(0, G.buys || 0) / 5);
  score += Math.floor((((G.stats && G.stats.sixtyBestProfit) || 0)) / 90000);
  var level = Math.min(6, 1 + Math.floor(score / 2));
  return {
    score: score,
    level: level,
    simDamageBonus: Math.max(0, level - 1) * 0.02,
    simPricePressure: Math.max(0, level - 1) * 0.03,
    sixtyScamBonus: Math.max(0, level - 1) * 0.015,
    sixtyHardSellerBonus: Math.max(0, level - 1) * 0.03
  };
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

if (typeof window !== 'undefined') {
  window.G = G;
  window.GS = GS;
}
