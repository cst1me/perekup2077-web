// PEREKUP 2077 — shared state, persistence, achievements
import { fmt, getTodayKey } from './utils.js';

export const APP_VERSION = '3.0.3';

export const GS = {
  totalDeals: 0,
  totalProfit: 0,
  bestScore: 0,
  achievements: {}
};

export function loadGlobalStats() {
  try {
    const d = JSON.parse(localStorage.getItem('globalStats') || '{}');
    GS.totalDeals = d.totalDeals || 0;
    GS.totalProfit = d.totalProfit || 0;
    GS.bestScore = d.bestScore || 0;
    GS.achievements = d.achievements || {};
  } catch {}
}

export function saveGlobalStats() {
  try {
    localStorage.setItem('globalStats', JSON.stringify(GS));
  } catch {}
}

export function updateGlobalStatsUI() {
  const de = document.getElementById('g-deals');
  const pr = document.getElementById('g-profit');
  const be = document.getElementById('g-best');
  if (de) de.textContent = GS.totalDeals;
  if (pr) pr.textContent = fmt(GS.totalProfit);
  if (be) be.textContent = fmt(GS.bestScore);
}

// 60-sec state (S) and simulator state (G)
export let S = {
  t: 600, m: 0, d: 0, cur: null, best: +localStorage.getItem('pb') || 0, iv: null,
  combo: 0, maxCombo: 0, comboTimer: 0, offerTime: 0, haggling: false, lives: 5, endReason: '',
  buys: 0, speedDeals: 0
};

export let G = {
  m: 500000, rep: 0, day: 1, gar: [], mkt: [],
  sk: { торговля: { l: 1, x: 0 }, механика: { l: 1, x: 0 }, хитрость: { l: 1, x: 0 }, вождение: { l: 1, x: 0 } },
  taxi: null, buys: 0,
  mods: { srvDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1 },
  lastEvent: null
};

export function resetSKeepBuys() {
  const keepBuys = S.buys || 0;
  S = { t: 600, m: 0, d: 0, cur: null, best: S.best, iv: null, combo: 0, maxCombo: 0, comboTimer: 3, offerTime: 0, haggling: false, lives: 5, endReason: '', buys: keepBuys, speedDeals: 0 };
  return S;
}

export function totalBuys() { return (S.buys || 0) + (G.buys || 0); }

// Hidden difficulty: 0–9:1, 10–19:2, 20–29:3, 30+:4
export function hiddenLevel() {
  const b = totalBuys();
  return Math.min(4, 1 + Math.floor(b / 10));
}

// Taxi daily persistence (local day)
export function loadTaxiDaily() {
  try {
    const d = JSON.parse(localStorage.getItem('taxiDaily') || '{}');
    return d.date === getTodayKey() ? (d.used || 0) : 0;
  } catch {
    return 0;
  }
}
export function saveTaxiDaily(used) { localStorage.setItem('taxiDaily', JSON.stringify({ date: getTodayKey(), used })); }
export function taxiUseOne() { const u = loadTaxiDaily() + 1; saveTaxiDaily(u); return u; }

export function setPB(val) {
  try { localStorage.setItem('pb', String(val)); } catch {}
}

// Achievements
export const ACHIEVEMENTS = [
  { id: 'first_deal', name: 'Первая сделка', desc: 'Заверши первую сделку', icon: '🎯', check: () => GS.totalDeals >= 1 },
  { id: 'deals_10', name: 'Бывалый', desc: '10 сделок', icon: '📈', check: () => GS.totalDeals >= 10 },
  { id: 'deals_50', name: 'Профи', desc: '50 сделок', icon: '💼', check: () => GS.totalDeals >= 50 },
  { id: 'deals_100', name: 'Легенда', desc: '100 сделок', icon: '👑', check: () => GS.totalDeals >= 100 },

  // runtime triggers are fired manually (combo/legend/scam/speed)
  { id: 'profit_100k', name: 'Сотка', desc: 'Заработай 100K за раунд', icon: '💰', check: () => false },
  { id: 'profit_500k', name: 'Полмиллиона', desc: 'Заработай 500K за раунд', icon: '💎', check: () => false },
  { id: 'combo_5', name: 'Комбо мастер', desc: 'Достигни x3 комбо', icon: '🔥', check: () => false },
  { id: 'combo_7', name: 'Комбо бог', desc: 'Достигни x4 комбо', icon: '⚡', check: () => false },
  { id: 'scam_dodge', name: 'Чутьё', desc: 'Избеги кидалу', icon: '🕵️', check: () => false },
  { id: 'legendary', name: 'Золотая жила', desc: 'Купи легендарку', icon: '💎', check: () => false },
  { id: 'speed_demon', name: 'Молния', desc: '5 сделок за 1.5 сек', icon: '⚡', check: () => false }
];

export function checkAchievements(unlockAchievement) {
  ACHIEVEMENTS.forEach((a) => {
    if (!GS.achievements[a.id] && a.check()) unlockAchievement(a);
  });
}

export function showAchievement(a) {
  const el = document.getElementById('achievement');
  if (!el) return;
  document.getElementById('ach-icon').textContent = a.icon;
  document.getElementById('ach-text').textContent = a.name;
  document.getElementById('ach-desc').textContent = a.desc;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}
