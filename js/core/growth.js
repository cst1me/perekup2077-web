import { G, persistGameState } from './state.js';
import { getTodayKey } from './utils.js';

export const WEEKLY_EVENTS = [
  { key: 'jdm_night', title: 'JDM NIGHT', desc: 'Спорт и уличные купе в моде. Маржа выше.', target: ['sportkupe'], mult: 1.18, badge: 'WEEKLY BOOST' },
  { key: 'family_week', title: 'FAMILY WEEK', desc: 'Седаны и комфортные тачки уходят быстрее.', target: ['sedan-komfort','sedan-ekonom','biznes-sedan'], mult: 1.12, badge: 'WEEKLY BOOST' },
  { key: 'taxi_crash', title: 'TAXI FLEET CRASH', desc: 'Таксопарк срочно скупает бюджетные машины.', target: ['taksi-sedan','gorodskoy-kompakt','hetchbek-narodnyy'], mult: 1.15, badge: 'MARKET RUSH' },
  { key: 'luxury_week', title: 'LUXURY WEEK', desc: 'Премиум и кроссоверы стоят дороже обычного.', target: ['premium-sedan','lyuks-krossover'], mult: 1.16, badge: 'VIP MARKET' },
  { key: 'classic_fair', title: 'CLASSIC FAIR', desc: 'Классика стала коллекционной целью.', target: ['klassika-2107'], mult: 1.2, badge: 'COLLECTOR BONUS' }
];

function weekKeyFromDate(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return date.getUTCFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

export function ensureGrowthState() {
  if (!G.liveops || typeof G.liveops !== 'object') G.liveops = {};
  if (!G.liveops.weeklyEventKey) G.liveops.weeklyEventKey = '';
  if (!G.liveops.weeklyEventId) G.liveops.weeklyEventId = '';
  return G.liveops;
}

export function getCurrentWeeklyEvent() {
  const liveops = ensureGrowthState();
  const now = new Date();
  const wk = weekKeyFromDate(now);
  if (liveops.weeklyEventKey !== wk || !liveops.weeklyEventId) {
    let hash = 0;
    for (let i = 0; i < wk.length; i++) hash = (hash + wk.charCodeAt(i) * (i + 1)) % WEEKLY_EVENTS.length;
    liveops.weeklyEventKey = wk;
    liveops.weeklyEventId = WEEKLY_EVENTS[hash].key;
  }
  return WEEKLY_EVENTS.find((e) => e.key === liveops.weeklyEventId) || WEEKLY_EVENTS[0];
}

export function getWeeklyEventMult(carId) {
  const event = getCurrentWeeklyEvent();
  return event && event.target && event.target.indexOf(carId) >= 0 ? (event.mult || 1) : 1;
}

export function getGarageCap() {
  return 6 + ((G.entitlements && G.entitlements.vipDealer) ? 1 : 0);
}

export function getVipDailyText() {
  return (G.entitlements && G.entitlements.vipDealer) ? 'VIP-игрок получает +1 слот и премиум-лот недели.' : 'VIP даёт отключение рекламы, +1 слот и премиум-комфорт.';
}

export async function markWeeklySeen() {
  ensureGrowthState();
  G.liveops.lastWeeklySeen = getTodayKey();
  try { await persistGameState('weekly-seen'); } catch (e) {}
}
