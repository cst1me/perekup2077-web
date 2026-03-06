// PEREKUP 2077 — Simulator mode v3.0.5
import { fmt, rnd, pick, clamp, toast, vibrate, enterFullscreen } from '../core/utils.js';
import { cars, comments, names, avas, srvs, locs, DAILY_EVENTS, TAXI_DAILY_LIMIT, DAMAGE_PARTS, SERVICE_CATS } from '../core/data.js';
import { G, GS, saveGlobalStats, loadTaxiDaily, taxiUseOne, hiddenLevel, checkAchievements, showAchievement, getRepTier } from '../core/state.js';
import { saveSnapshot } from '../core/snapshots.js';
import { show } from '../ui/screens.js';

var selectedSrvCarId = localStorage.getItem('selectedSrvCarId') || '';
var modalCarId = null;
var currentSrvCat = 'all';


function slugifyCarName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function getCarImageSrc(c) {
  return './assets/cars/' + slugifyCarName(c && c.n) + '.webp';
}

function getCarImageTag(c, cls) {
  var src = getCarImageSrc(c);
  var alt = (c && c.n ? c.n : 'Автомобиль').replace(/"/g, '&quot;');
  cls = cls || 'car-img';
  return '<img class="' + cls + '" src="' + src + '" alt="' + alt + '" loading="lazy" onerror="this.onerror=null;this.src=\'./assets/cars/default.webp\';">';
}

function getConditionClass(cond) {
  if (cond >= 75) return 'good';
  if (cond >= 45) return 'warn';
  return 'bad';
}

function getRarityLabel(c) {
  if (c.rv >= 2500000) return 'ELITE';
  if (c.rv >= 900000) return 'RARE';
  if (c.cond <= 35 || (c.damages && c.damages.length >= 4)) return 'RISK';
  return 'LOT';
}

function getProfitClass(v) {
  return v >= 0 ? 'pos' : 'neg';
}


var MARKET_PULSES = [
  { key: 'steady', title: 'Спокойный поток', desc: 'Рынок ровный, без резких перекосов.', buyBias: 1.00, condBias: 0, rareBonus: 0.00 },
  { key: 'buyers', title: 'Охота покупателей', desc: 'Покупатели активны, хорошие машины уходят быстро.', buyBias: 1.05, condBias: 4, rareBonus: 0.03 },
  { key: 'risky', title: 'Серый день', desc: 'На рынке больше сомнительных лотов и скрытых дефектов.', buyBias: 0.95, condBias: -6, rareBonus: 0.00 },
  { key: 'premium', title: 'Премиум-окно', desc: 'На витрину выходят машины классом выше обычного.', buyBias: 1.08, condBias: 6, rareBonus: 0.06 }
];

var CONTRACT_TEMPLATES = [
  { key: 'buy_any', title: 'Разогрев рынка', desc: 'Купи 1 машину сегодня', goal: 1, rewardMoney: 18000, rewardRep: 2 },
  { key: 'sell_profit', title: 'Чистый профит', desc: 'Продай машину с прибылью не ниже 60 000 ₽', goal: 1, rewardMoney: 32000, rewardRep: 3, targetProfit: 60000 },
  { key: 'diagnose', title: 'Глубокая диагностика', desc: 'Проведи 1 диагностику в сервисе', goal: 1, rewardMoney: 14000, rewardRep: 2 },
  { key: 'sell_clean', title: 'Чистая выдача', desc: 'Продай машину без жалоб клиента', goal: 1, rewardMoney: 26000, rewardRep: 3 },
  { key: 'buy_rare', title: 'Охота за редкостью', desc: 'Купи rare/elite лот', goal: 1, rewardMoney: 42000, rewardRep: 4 },
  { key: 'sell_high', title: 'Большая касса', desc: 'Продай машину дороже 900 000 ₽', goal: 1, rewardMoney: 50000, rewardRep: 4, targetPrice: 900000 }
];

var ECONOMY_SCENARIOS = [
  { key: 'balanced', title: 'Баланс', desc: 'Спрос ровный, рынок без резких перекосов.', focus: 'mass', buyBias: 1.00, sellBias: 1.00, demand: { mass: 1.00, comfort: 1.00, business: 1.00, premium: 1.00, collector: 1.00 } },
  { key: 'premium_rush', title: 'Премиум-спрос', desc: 'Покупатели охотятся за дорогими сегментами и статусом.', focus: 'premium', buyBias: 1.03, sellBias: 1.08, demand: { mass: 0.96, comfort: 1.00, business: 1.08, premium: 1.16, collector: 1.10 } },
  { key: 'fleet_week', title: 'Корпоративная неделя', desc: 'Лучше идут массовые и комфортные машины для парков и служб.', focus: 'mass', buyBias: 1.01, sellBias: 1.06, demand: { mass: 1.12, comfort: 1.08, business: 0.98, premium: 0.92, collector: 0.88 } },
  { key: 'cold_market', title: 'Холодный рынок', desc: 'Покупатели осторожны, приходится ловить цену и экономить оборот.', focus: 'comfort', buyBias: 0.96, sellBias: 0.95, demand: { mass: 1.02, comfort: 1.04, business: 0.94, premium: 0.88, collector: 0.84 } },
  { key: 'collector_hype', title: 'Коллекционный хайп', desc: 'Редкие и легендарные лоты улетают быстрее обычного.', focus: 'collector', buyBias: 1.05, sellBias: 1.11, demand: { mass: 0.94, comfort: 0.98, business: 1.02, premium: 1.08, collector: 1.22 } }
];

var RIVAL_PROFILES = [
  { key: 'quiet', title: 'Тихо', desc: 'Никто не давит на рынок.', pressure: 0, stealChance: 0.00, hagglePenalty: 0.00 },
  { key: 'watching', title: 'На радарах', desc: 'Мелкие перекупы отслеживают сильные лоты.', pressure: 1, stealChance: 0.10, hagglePenalty: 0.03 },
  { key: 'active', title: 'Жёсткая конкуренция', desc: 'Конкуренты снимают лучшие машины и давят на сделки.', pressure: 2, stealChance: 0.18, hagglePenalty: 0.05 },
  { key: 'predators', title: 'Хищники в игре', desc: 'Сильные перекупы охотятся за редкими и выгодными лотами.', pressure: 3, stealChance: 0.26, hagglePenalty: 0.08 }
];

function getCarSegment(c) {
  var rv = Number(c && c.rv || 0);
  if (rv >= 2500000) return 'collector';
  if (rv >= 1500000) return 'premium';
  if (rv >= 900000) return 'business';
  if (rv >= 450000) return 'comfort';
  return 'mass';
}

function ensureEconomySystems() {
  if (!G.economy || typeof G.economy !== 'object') G.economy = ECONOMY_SCENARIOS[0];
  if (!G.rivals || typeof G.rivals !== 'object') G.rivals = { day: G.day || 1, profile: RIVAL_PROFILES[0], sweepCount: 0 };
}

function rollEconomyState() {
  var repTier = getRepTier(G.rep || 0);
  var pool = ECONOMY_SCENARIOS.slice();
  if (repTier.key === 'elite') pool.push(ECONOMY_SCENARIOS[1], ECONOMY_SCENARIOS[4]);
  if (repTier.key === 'shady') pool.push(ECONOMY_SCENARIOS[3]);
  G.economy = pool[rnd(0, pool.length - 1)];
}

function rollRivalPressure() {
  var repTier = getRepTier(G.rep || 0);
  var pool = RIVAL_PROFILES.slice();
  if (repTier.key === 'elite') pool.push(RIVAL_PROFILES[2], RIVAL_PROFILES[3]);
  if (repTier.key === 'rookie') pool.unshift(RIVAL_PROFILES[0]);
  var profile = pool[rnd(0, pool.length - 1)];
  G.rivals = { day: G.day || 1, profile: profile, sweepCount: 0 };
}

function getDemandMultForSegment(segment) {
  segment = segment || 'mass';
  var eco = G.economy || ECONOMY_SCENARIOS[0];
  var demand = eco.demand || {};
  return Number(demand[segment]) || 1;
}

function getEconomySellBias() {
  var eco = G.economy || ECONOMY_SCENARIOS[0];
  return Number(eco.sellBias) || 1;
}

function getRivalProfile() {
  ensureEconomySystems();
  return G.rivals && G.rivals.profile ? G.rivals.profile : RIVAL_PROFILES[0];
}

function rivalSweepMarket() {
  ensureEconomySystems();
  var profile = getRivalProfile();
  var pool = (G.mkt || []).filter(function(c) {
    return c && (c.rareLevel === 'rare' || c.rareLevel === 'elite' || estimateMarketProfit(c) > 90000);
  });
  var maxSweep = profile.pressure || 0;
  if (!pool.length || !maxSweep) {
    G.rivals.sweepCount = 0;
    return;
  }
  var sweepCount = 0;
  pool.sort(function(a, b) { return estimateMarketProfit(b) - estimateMarketProfit(a); });
  for (var i = 0; i < pool.length && sweepCount < maxSweep; i++) {
    if (Math.random() < profile.stealChance) {
      var id = pool[i].id;
      G.mkt = G.mkt.filter(function(x) { return String(x.id) !== String(id); });
      sweepCount++;
    }
  }
  G.rivals.sweepCount = sweepCount;
  if (sweepCount > 0) {
    toast('⚠️ Конкуренты сняли с рынка лотов: ' + sweepCount, 'error');
  }
}

function haggleForCar(id) {
  var c = G.mkt.find(function(x) { return String(x.id) === String(id); });
  if (!c) return;
  if (c.haggled) return toast('Ты уже торговался по этому лоту.', 'error');

  saveSnapshot('sim:before_haggle');

  var profile = getRivalProfile();
  var tradeSkill = (G.sk && G.sk.торговля ? G.sk.торговля.l : 1);
  var cunningSkill = (G.sk && G.sk.хитрость ? G.sk.хитрость.l : 1);
  var repTier = getRepTier(G.rep || 0);
  var pressurePenalty = profile.hagglePenalty || 0;
  var successChance = clamp(0.46 + tradeSkill * 0.03 + cunningSkill * 0.02 + (repTier.key === 'dealer' ? 0.04 : 0) - pressurePenalty, 0.18, 0.86);

  c.haggled = true;

  if (Math.random() <= successChance) {
    var discount = clamp(0.03 + tradeSkill * 0.004 + cunningSkill * 0.003 + Math.random() * 0.03, 0.03, 0.16);
    var oldPrice = c.ap;
    c.ap = Math.max(1000, Math.round(c.ap * (1 - discount)));
    c.dealFlag = 'haggle_win';
    updateContracts('buy_any', {});
    toast('🤝 Торг удался: -' + fmt(oldPrice - c.ap) + ' ₽', 'success');
  } else {
    var failRoll = Math.random();
    if (failRoll < 0.45 && G.mkt.length > 1) {
      G.mkt = G.mkt.filter(function(x) { return String(x.id) !== String(id); });
      if (G.rivals) G.rivals.sweepCount = (G.rivals.sweepCount || 0) + 1;
      toast('💨 Продавец ушёл к конкуренту', 'error');
    } else {
      var markup = clamp(0.02 + (profile.pressure || 0) * 0.01 + Math.random() * 0.02, 0.02, 0.08);
      c.ap = Math.round(c.ap * (1 + markup));
      c.dealFlag = 'haggle_fail';
      toast('📈 Торг провалился: цена выросла', 'error');
    }
  }

  renderSim();
}

function ensureMetaSystems() {
  if (!G.contracts || typeof G.contracts !== 'object') G.contracts = { day: G.day || 1, items: [] };
  if (!Array.isArray(G.contracts.items)) G.contracts.items = [];
  if (!G.marketPulse || typeof G.marketPulse !== 'object') G.marketPulse = MARKET_PULSES[0];
  ensureEconomySystems();
}

function cloneContractTemplate(t, idx) {
  return {
    id: 'day' + G.day + '_' + t.key + '_' + idx,
    key: t.key,
    title: t.title,
    desc: t.desc,
    goal: t.goal || 1,
    progress: 0,
    done: false,
    rewardMoney: t.rewardMoney || 0,
    rewardRep: t.rewardRep || 0,
    targetProfit: t.targetProfit || 0,
    targetPrice: t.targetPrice || 0
  };
}

function rollMarketPulse() {
  var repTier = getRepTier(G.rep || 0);
  var pool = MARKET_PULSES.slice();
  if (repTier.key === 'elite') pool.push(MARKET_PULSES[3]);
  if (repTier.key === 'shady') pool.push(MARKET_PULSES[2]);
  G.marketPulse = pool[rnd(0, pool.length - 1)];
}

function rollDailyContracts() {
  var pool = CONTRACT_TEMPLATES.slice().sort(function(){ return Math.random() - 0.5; }).slice(0, 3);
  G.contracts = { day: G.day || 1, items: pool.map(cloneContractTemplate) };
}

function ensureDailyContracts() {
  ensureMetaSystems();
  if ((G.contracts.day || 0) !== (G.day || 1) || !G.contracts.items.length) {
    rollDailyContracts();
  }
  if (!G.marketPulse || !G.marketPulse.key) {
    rollMarketPulse();
  }
  if (!G.economy || !G.economy.key) {
    rollEconomyState();
  }
  if (!G.rivals || !G.rivals.profile || (G.rivals.day || 0) !== (G.day || 1)) {
    rollRivalPressure();
  }
}

function rewardContract(item) {
  if (!item || item.done) return;
  item.done = true;
  if (item.rewardMoney) G.m += item.rewardMoney;
  if (item.rewardRep) adjustRep(item.rewardRep);
  toast('📜 Контракт закрыт: ' + item.title + ' • +' + fmt(item.rewardMoney || 0) + ' ₽', 'success');
}

function updateContracts(type, payload) {
  ensureDailyContracts();
  payload = payload || {};
  (G.contracts.items || []).forEach(function(item) {
    if (!item || item.done) return;
    var inc = 0;
    if (item.key === 'buy_any' && type === 'buy') inc = 1;
    if (item.key === 'buy_rare' && type === 'buy' && payload.isRare) inc = 1;
    if (item.key === 'sell_profit' && type === 'sell' && payload.profit >= (item.targetProfit || 0)) inc = 1;
    if (item.key === 'sell_clean' && type === 'sell' && !payload.hadComplaint) inc = 1;
    if (item.key === 'sell_high' && type === 'sell' && payload.sellPrice >= (item.targetPrice || 0)) inc = 1;
    if (item.key === 'diagnose' && type === 'diagnose') inc = 1;
    if (!inc) return;
    item.progress = Math.min(item.goal || 1, (item.progress || 0) + inc);
    if (item.progress >= (item.goal || 1)) rewardContract(item);
  });
}

function renderContracts() {
  ensureDailyContracts();
  var el = document.getElementById('contract-list');
  var pulse = document.getElementById('pulse-desc');
  if (pulse && G.marketPulse) pulse.textContent = G.marketPulse.desc;
  if (!el) return;
  el.innerHTML = (G.contracts.items || []).map(function(item) {
    var pct = Math.max(6, Math.min(100, Math.round(((item.progress || 0) / Math.max(1, item.goal || 1)) * 100)));
    return '<div class="contract-item ' + (item.done ? 'done' : '') + '">' +
      '<div class="contract-row"><div><div class="contract-name">' + item.title + '</div><div class="contract-desc">' + item.desc + '</div></div>' +
      '<div class="contract-reward">+' + fmt(item.rewardMoney || 0) + ' ₽</div></div>' +
      '<div class="contract-progress"><div class="contract-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="contract-foot"><span>' + (item.done ? 'Выполнено' : ('Прогресс: ' + (item.progress || 0) + '/' + (item.goal || 1))) + '</span><span>😎 +' + (item.rewardRep || 0) + '</span></div>' +
    '</div>';
  }).join('');
}


function getKnownDamages(c) {
  return Array.isArray(c && c.damages) ? c.damages : [];
}

function getHiddenDamages(c) {
  return Array.isArray(c && c.hiddenDamages) ? c.hiddenDamages : [];
}

function getUnknownDamageCount(c) {
  return c && !c.pr ? getHiddenDamages(c).length : 0;
}

function mergeUniqueDamages(listA, listB) {
  var map = {};
  return (listA || []).concat(listB || []).filter(function(d) {
    var key = d && d.key ? d.key : ('i_' + Math.random());
    if (map[key]) return false;
    map[key] = 1;
    return true;
  });
}

function getVisibleRepairReserve(c) {
  return getKnownDamages(c).reduce(function(sum, d) {
    return sum + Math.round((d.repairCost || 0) * ((d.severity || 0) / 50));
  }, 0);
}

function getHiddenRepairReserve(c) {
  return getHiddenDamages(c).reduce(function(sum, d) {
    return sum + Math.round((d.repairCost || 0) * ((d.severity || 0) / 50));
  }, 0);
}

function getRiskLabel(c) {
  if (getUnknownDamageCount(c) > 0 && !c.pr) return 'SCAM RISK';
  if (estimateMarketProfit(c) > 120000) return 'TOP DEAL';
  return 'CLEAN';
}

function getRiskClass(c) {
  var label = getRiskLabel(c);
  if (label === 'TOP DEAL') return 'top';
  if (label === 'SCAM RISK') return 'risk';
  return 'clean';
}

function genHiddenDamages(cond, visibleList) {
  var lvl = hiddenLevel();
  var visibleKeys = {};
  (visibleList || []).forEach(function(d) { visibleKeys[d.key] = 1; });
  var result = [];
  var condFactor = (100 - cond) / 100;
  var maxHidden = Math.min(3, Math.max(0, Math.floor(condFactor * 3 + (lvl - 1) * 0.5)));
  var shuffled = DAMAGE_PARTS.slice().sort(function() { return Math.random() - 0.5; });
  for (var i = 0; i < shuffled.length && result.length < maxHidden; i++) {
    var p = shuffled[i];
    if (visibleKeys[p.key]) continue;
    var chance = clamp((p.chance * 0.55) + condFactor * 0.12 + lvl * 0.02, 0, 0.45);
    if (Math.random() < chance) {
      result.push({
        key: p.key,
        part: p.name,
        zone: p.zone,
        icon: p.icon,
        desc: 'Скрытый дефект: ' + p.desc.toLowerCase(),
        repairCost: p.repairCost,
        severity: clamp(rnd(18 + Math.round(condFactor * 18), 50 + Math.round(condFactor * 35) + lvl * 4), 8, 95)
      });
    } else {
      updateContracts('diagnose', { foundHidden: false });
    }
  }
  return result;
}

function adjustRep(delta) {
  G.rep = clamp((G.rep || 0) + delta, -100, 999);
  return G.rep;
}

function getRepDeltaFromSale(profit, c, hadComplaint) {
  var delta = 0;
  if (profit >= 150000) delta += 6;
  else if (profit >= 70000) delta += 4;
  else if (profit >= 20000) delta += 2;
  else if (profit >= 0) delta += 1;
  else if (profit <= -80000) delta -= 4;
  else if (profit < 0) delta -= 2;
  if ((c.cond || 0) >= 85) delta += 1;
  if (hadComplaint) delta -= 8;
  return delta;
}

function estimateMarketProfit(c) {
  var fake = {
    rv: c.rv,
    cond: c.cond,
    vm: c.vm || 1,
    hp: c.hp,
    pr: c.pr,
    damages: getKnownDamages(c),
    pp: c.ap
  };
  var sp = calcSP(fake);
  var visibleReserve = getVisibleRepairReserve(c);
  var hiddenReserve = getHiddenRepairReserve(c);
  var hiddenRiskReserve = c.pr ? hiddenReserve : Math.round(hiddenReserve * 0.55);
  return sp - Math.round(sp * 0.05) - (c.ap || 0) - visibleReserve - hiddenRiskReserve;
}

// Генерация повреждений
function genDamages(cond) {
  var lvl = hiddenLevel();
  var result = [];
  var condFactor = (100 - cond) / 100;
  var maxDamages = Math.min(6, 1 + Math.floor(condFactor * 5) + Math.floor(lvl / 2));
  
  var shuffled = DAMAGE_PARTS.slice().sort(function() { return Math.random() - 0.5; });
  
  for (var i = 0; i < shuffled.length && result.length < maxDamages; i++) {
    var p = shuffled[i];
    var chance = clamp(p.chance + condFactor * 0.3 + lvl * 0.03, 0, 0.7);
    if (Math.random() < chance) {
      result.push({
        key: p.key,
        part: p.name,
        zone: p.zone,
        icon: p.icon,
        desc: p.desc,
        repairCost: p.repairCost,
        severity: clamp(rnd(10 + Math.round(condFactor * 20), 40 + Math.round(condFactor * 40) + lvl * 5), 5, 95)
      });
    }
  }
  return result;
}

// Генерация машины для рынка
function genCarSim() {
  ensureDailyContracts();
  var lvl = hiddenLevel();
  var repTier = getRepTier(G.rep || 0);
  var t = pick(cars);
  var yr = rnd(2005, 2024);
  var age = 2024 - yr;
  var mi = age * rnd(8000, 22000 + 2000 * (lvl - 1));
  var pulse = G.marketPulse || MARKET_PULSES[0];
  var econ = G.economy || ECONOMY_SCENARIOS[0];
  var baseSegment = getCarSegment({ rv: (t.min + t.max) / 2 });
  var demandMult = getDemandMultForSegment(baseSegment);
  var focusBonus = econ.focus === baseSegment ? rnd(1.03, 1.09) : 1;
  var cond = clamp(100 - age * rnd(2, 6 + lvl - 1) + repTier.condBonus + (pulse.condBias || 0) + rnd(-3, 4), 18, 100);
  var rv = rnd(t.min, t.max);
  rv = Math.round(rv * (1 - age * 0.025) * (cond / 100) * demandMult * focusBonus);
  if (Math.random() < repTier.rareChance) {
    rv = Math.round(rv * rnd(1.08, 1.24));
    cond = clamp(cond + rnd(3, 9), 18, 100);
  }
  var riskFactor = Math.max(0.75, 1 + repTier.riskBias + rnd(-0.05, 0.06));
  var ap = Math.round(rv * rnd(75 + 3 * (lvl - 1), 115 + 6 * (lvl - 1)) / 100 * repTier.buyMult * riskFactor * ((pulse && pulse.buyBias) || 1));
  var rareLevel = 'normal';
  if (rv >= 2500000 || Math.random() < (((pulse && pulse.rareBonus) || 0) * 0.45)) rareLevel = 'elite';
  else if (rv >= 900000 || Math.random() < (repTier.rareChance + ((pulse && pulse.rareBonus) || 0))) rareLevel = 'rare';
  return {
    id: Date.now() + '-' + Math.random().toString(36).substr(2,9),
    n: t.n, e: t.e, yr: yr, mi: mi, cond: cond, ap: ap, rv: rv,
    cm: pick(comments), sn: pick(names), sa: pick(avas),
    seg: getCarSegment({ rv: rv }), rareLevel: rareLevel,
    hp: false, pr: false, vm: 1, srv: {}, damages: [], hiddenDamages: []
  };
}

function taxiLeft() { return Math.max(0, TAXI_DAILY_LIMIT - loadTaxiDaily()); }

export function startSim() {
  enterFullscreen();
  ensureDailyContracts();
  show('sim-screen');
  if (!G.mkt.length) G.mkt = [0,0,0,0,0,0].map(function() { return genCarSim(); });
  renderSim();
}

function renderSim() { 
  ensureDailyContracts();
  updG(); 
  renderContracts();
  renderMkt(); 
  renderGar(); 
  renderSrv(); 
  renderTaxi(); 
  renderSk(); 
}

function updG() {
  var tier = getRepTier(G.rep || 0);
  ensureDailyContracts();
  document.getElementById('sim-money').textContent = fmt(G.m) + '₽';
  document.getElementById('sim-day').textContent = G.day;
  document.getElementById('sim-rep').textContent = G.rep || 0;
  var rankEl = document.getElementById('sim-rep-rank');
  if (rankEl) rankEl.textContent = tier.label;
  var mt = document.getElementById('market-tier');
  var mb = document.getElementById('market-bias');
  var mr = document.getElementById('market-risk');
  if (mt) mt.textContent = 'Ранг: ' + tier.label;
  if (mb) mb.textContent = 'Рынок: ' + tier.market;
  if (mr) mr.textContent = 'Риск: ' + (tier.key === 'shady' ? 'Высокий' : tier.key === 'elite' ? 'Ниже нормы' : 'Средний');
  if (mt) mt.className = 'mi-chip ' + (tier.key === 'elite' || tier.key === 'dealer' ? 'good' : tier.key === 'shady' ? 'risk' : '');
  if (mb) mb.className = 'mi-chip ' + (tier.key === 'elite' ? 'good' : 'warn');
  if (mr) mr.className = 'mi-chip ' + (tier.key === 'shady' ? 'risk' : tier.key === 'elite' ? 'good' : 'warn');

  var eco = G.economy || ECONOMY_SCENARIOS[0];
  var ecoMain = document.getElementById('economy-main');
  var ecoSub = document.getElementById('economy-sub');
  var ecoFocus = document.getElementById('economy-focus');
  var ecoSell = document.getElementById('economy-sell');
  if (ecoMain) ecoMain.textContent = eco.title;
  if (ecoSub) ecoSub.textContent = eco.desc;
  if (ecoFocus) ecoFocus.textContent = 'Фокус: ' + String(eco.focus || 'mass').toUpperCase();
  if (ecoSell) ecoSell.textContent = 'Продажа x' + (Number(eco.sellBias || 1).toFixed(2));

  var rivals = getRivalProfile();
  var rivalMain = document.getElementById('rival-main');
  var rivalSub = document.getElementById('rival-sub');
  var rivalPressure = document.getElementById('rival-pressure');
  var rivalSweep = document.getElementById('rival-sweep');
  var rivalBoard = document.getElementById('rival-board');
  if (rivalMain) rivalMain.textContent = rivals.title;
  if (rivalSub) rivalSub.textContent = rivals.desc;
  if (rivalPressure) rivalPressure.textContent = 'Давление: ' + ['низкое','среднее','высокое','критичное'][rivals.pressure || 0];
  if (rivalSweep) rivalSweep.textContent = 'Снято лотов: ' + ((G.rivals && G.rivals.sweepCount) || 0);
  if (rivalBoard) rivalBoard.className = 'rival-board' + ((rivals.pressure || 0) >= 2 ? ' hot' : '');
}

function renderMkt() {
  var eb = document.getElementById('event-banner');
  if (G.lastEvent) {
    eb.classList.add('active');
    document.getElementById('event-title').textContent = G.lastEvent.t;
    document.getElementById('event-desc').textContent = G.lastEvent.d;
  } else {
    eb.classList.remove('active');
  }

  document.getElementById('pulse-desc').textContent = (G.marketPulse && G.marketPulse.desc) || 'Спокойный поток, стандартные лоты.';

  document.getElementById('market-cars').innerHTML = G.mkt.map(function(c) {
    var profit = estimateMarketProfit(c);
    var rarity = c.rareLevel === 'elite' ? 'LEGEND' : (c.rareLevel === 'rare' ? 'RARE' : getRarityLabel(c));
    var condClass = getConditionClass(c.cond);
    var badge2 = getRiskLabel(c);
    var visibleCount = getKnownDamages(c).length;
    var hiddenCount = getUnknownDamageCount(c);
    var repTier = getRepTier(G.rep || 0);
    var demandMult = getDemandMultForSegment(c.seg || getCarSegment(c));
    var rivalFlag = !!c.rivalPressure;
    var rivalBadge = rivalFlag ? '<div class="scar-badge secondary pressure">RIVAL</div>' : '';
    var rivalNote = rivalFlag ? '<div class="scar-rival-note">⚠️ Конкуренты уже смотрят этот лот. Торг становится рискованнее.</div>' : '';
    var priceHint = demandMult > 1.06 ? 'Сегмент в спросе' : (demandMult < 0.96 ? 'Сегмент остывает' : 'Спрос ровный');

    return '<div class="scar neo-card ' + ((rarity === 'ELITE' || rarity === 'LEGEND') ? 'kit-elite' : '') + '">' +
      '<div class="scar-media">' +
        '<div class="scar-badge">' + rarity + '</div>' +
        '<div class="scar-badge secondary ' + getRiskClass(c) + '">' + badge2 + '</div>' +
        rivalBadge +
        getCarImageTag(c, 'car-img') +
      '</div>' +
      '<div class="scar-body">' +
        '<div class="scar-name">' + c.n + '</div>' +
        '<div class="scar-year">' + c.yr + ' • ' + fmt(c.mi) + ' км • ' + String(c.seg || getCarSegment(c)).toUpperCase() + '</div>' +
        '<div class="scar-comment">“' + c.cm + '”</div>' +
        '<div class="scar-stats">' +
          '<div class="sstat"><div class="sstat-lbl">Состояние</div><div class="sstat-val ' + condClass + '">' + c.cond + '%</div></div>' +
          '<div class="sstat"><div class="sstat-lbl">Потенциал</div><div class="sstat-val ' + getProfitClass(profit) + '">' + (profit >= 0 ? '+' : '') + fmt(profit) + '</div></div>' +
        '</div>' +
        '<div class="scar-condition"><div class="scar-condition-fill ' + condClass + '" style="width:' + c.cond + '%"></div></div>' +
        '<div class="scar-meta-line"><span>Видимых дефектов: <strong>' + visibleCount + '</strong></span><span>Теневой риск: <strong>' + (hiddenCount ? 'есть' : 'низкий') + '</strong></span></div>' +
        '<div class="scar-tags">' +
          '<span class="scar-tag">Продавец: ' + c.sn + '</span>' +
          '<span class="scar-tag ' + condClass + '">' + (repTier.key === 'elite' ? 'Ранг открыл доступ' : 'Рыночный лот') + '</span>' +
          '<span class="scar-tag ' + (demandMult > 1 ? 'good' : 'warn') + '">' + priceHint + '</span>' +
          (c.rareLevel === 'elite' ? '<span class="scar-tag top">Легендарный лот</span>' : (c.rareLevel === 'rare' ? '<span class="scar-tag good">Редкий лот</span>' : '')) +
          (hiddenCount ? '<span class="scar-tag bad">Нужна диагностика</span>' : '<span class="scar-tag good">Проверяется быстро</span>') +
          (c.dealFlag === 'haggle_win' ? '<span class="scar-tag top">Выгодный торг</span>' : '') +
          (c.dealFlag === 'haggle_fail' ? '<span class="scar-tag bad">Торг сорван</span>' : '') +
        '</div>' +
        rivalNote +
        '<div class="scar-price-row"><div class="scar-price-stack"><div class="scar-price">' + fmt(c.ap) + ' ₽</div><div class="scar-price-hint">' + priceHint + '</div></div>' +
        '<div class="scar-cta-row">' +
          '<button class="scar-btn alt" onclick="haggleForCar(\'' + c.id + '\')"' + (c.haggled ? ' disabled' : '') + '>🤝 Торг</button>' +
          '<button class="scar-btn buy" onclick="buyG(\'' + c.id + '\')"' + (G.m < c.ap ? ' disabled' : '') + '>🛒 Купить</button>' +
        '</div></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderGar() {
  var gc = document.getElementById('garage-cars');
  var ge = document.getElementById('garage-empty');

  if (!G.gar.length) {
    gc.innerHTML = '';
    ge.style.display = 'block';
    updateSrvSelect();
    return;
  }

  ge.style.display = 'none';
  gc.innerHTML = G.gar.map(function(c) {
    var sp = calcSP(c);
    var fee = Math.round(sp * 0.05);
    var pr = sp - fee - (c.pp || 0);
    var dmgCount = getKnownDamages(c).length + getUnknownDamageCount(c);
    var condClass = getConditionClass(c.cond);
    var status = dmgCount ? ('IN REPAIR') : 'READY';

    return '<div class="scar neo-card garage" onclick="openCarModal(\'' + c.id + '\')">' +
      '<div class="scar-media">' +
        '<div class="scar-badge secondary ' + (dmgCount ? 'risk' : 'top') + '">' + status + '</div>' +
        getCarImageTag(c, 'car-img') +
      '</div>' +
      '<div class="scar-body">' +
        '<div class="scar-name">' + c.n + '</div>' +
        '<div class="scar-year">Гараж • ' + c.yr + ' • ' + fmt(c.mi) + ' км</div>' +
        '<div class="scar-stats">' +
          '<div class="sstat"><div class="sstat-lbl">Состояние</div><div class="sstat-val ' + condClass + '">' + c.cond + '%</div></div>' +
          '<div class="sstat"><div class="sstat-lbl">Прибыль</div><div class="sstat-val ' + getProfitClass(pr) + '">' + (pr >= 0 ? '+' : '') + fmt(pr) + '</div></div>' +
        '</div>' +
        '<div class="scar-condition"><div class="scar-condition-fill ' + condClass + '" style="width:' + c.cond + '%"></div></div>' +
        '<div class="scar-tags">' +
          '<span class="scar-tag">Услуг: ' + (c.srv ? Object.keys(c.srv).filter(function(k){ return c.srv[k]; }).length : 0) + '</span>' +
          '<span class="scar-tag ' + (dmgCount ? 'bad' : 'good') + '">' + (dmgCount ? 'Нужен ремонт' : 'Готова к продаже') + '</span>' +
          (getUnknownDamageCount(c) ? '<span class="scar-tag warn">Есть скрытые риски</span>' : '') +
        '</div>' +
        '<div class="scar-price-row"><div class="scar-price">' + fmt(sp) + ' ₽</div>' +
        '<button class="scar-btn sell" onclick="event.stopPropagation();sellG(\'' + c.id + '\')">💰 Продать</button></div>' +
      '</div>' +
    '</div>';
  }).join('');

  var countEl = document.getElementById('garage-count');
  var valueEl = document.getElementById('garage-value');
  var profitEl = document.getElementById('garage-profit');
  var repEl = document.getElementById('garage-rep');
  if (countEl && valueEl && profitEl) {
    var totalValue = G.gar.reduce(function(sum, car) { return sum + calcSP(car); }, 0);
    var totalProfit = G.gar.reduce(function(sum, car) {
      var sp = calcSP(car);
      var fee = Math.round(sp * 0.05);
      return sum + (sp - fee - (car.pp || 0));
    }, 0);
    countEl.textContent = String(G.gar.length);
    valueEl.textContent = fmt(totalValue) + '₽';
    profitEl.textContent = (totalProfit >= 0 ? '+' : '') + fmt(totalProfit) + '₽';
    if (repEl) repEl.textContent = getRepTier(G.rep || 0).label;
  }

  updateSrvSelect();
}

function updateSrvSelect() {
  var sel = document.getElementById('srv-select');
  sel.innerHTML = '<option value="">— Выберите машину —</option>' +
    G.gar.map(function(c) {
      return '<option value="' + c.id + '">' + c.n + ' (' + c.cond + '%)</option>';
    }).join('');

  if (selectedSrvCarId) {
    var exists = G.gar.some(function(c) { return String(c.id) === String(selectedSrvCarId); });
    if (exists) {
      sel.value = selectedSrvCarId;
    } else {
      selectedSrvCarId = '';
      localStorage.removeItem('selectedSrvCarId');
    }
  }
}

function renderSrv() {
  var disc = G.mods ? (G.mods.srvDiscount || 0) : 0;
  var bodyDisc = G.mods ? (G.mods.bodyDiscount || 0) : 0;
  
  // Рендер категорий
  var catsHtml = '<div class="srv-cats">' +
    '<button class="srv-cat-btn' + (currentSrvCat === 'all' ? ' active' : '') + '" onclick="filterSrvCat(\'all\')">Все</button>' +
    SERVICE_CATS.map(function(cat) {
      return '<button class="srv-cat-btn' + (currentSrvCat === cat.id ? ' active' : '') + '" onclick="filterSrvCat(\'' + cat.id + '\')">' + cat.icon + ' ' + cat.name + '</button>';
    }).join('') +
  '</div>';
  
  // Фильтруем услуги
  var filtered = srvs.filter(function(s) {
    return currentSrvCat === 'all' || s.cat === currentSrvCat;
  });
  
  var gridHtml = '<div class="srv-grid">' + filtered.map(function(s) {
    var catDisc = s.cat === 'body' ? bodyDisc : 0;
    var totalDisc = Math.min(0.5, disc + catDisc);
    var price = Math.round(s.p * (1 - totalDisc));
    var discText = totalDisc > 0 ? ' (-' + Math.round(totalDisc * 100) + '%)' : '';
    
    return '<div class="srv' + (G.m < price ? ' dis' : '') + '" onclick="applySrv(\'' + s.id + '\')">' +
      '<div class="srv-icon">' + s.i + '</div>' +
      '<div class="srv-name">' + s.n + '</div>' +
      '<div class="srv-desc">' + s.d + '</div>' +
      '<div class="srv-price' + (totalDisc > 0 ? ' discount' : '') + '">' + fmt(price) + ' ₽' + discText + '</div>' +
    '</div>';
  }).join('') + '</div>';
  
  document.getElementById('srv-grid').innerHTML = catsHtml + gridHtml;
}

function renderTaxi() {
  var tc = document.getElementById('taxi-card');
  if (!G.gar.length) {
    tc.innerHTML = '<div class="empty"><div class="empty-icon">🅿️</div><p>Нужна машина в гараже</p></div>';
    return;
  }
  if (!G.taxi) genTaxi();
  var o = G.taxi;
  var left = taxiLeft();
  
  tc.innerHTML = '<div class="taxi-route">' +
    '<div class="taxi-pt">📍 ' + o.f + '</div>' +
    '<div class="taxi-arrow">➡️</div>' +
    '<div class="taxi-pt">📍 ' + o.t + '</div>' +
  '</div>' +
  '<div class="taxi-info">' +
    '<div class="taxi-distance">🛣️ ~' + o.dist + ' км</div>' +
  '</div>' +
  '<div class="taxi-reward">💵 ' + fmt(o.r) + ' ₽</div>' +
  '<div class="taxi-btns">' +
    '<button class="taxi-btn acc" onclick="accTaxi()"' + (left <= 0 ? ' disabled' : '') + '>✅ Принять</button>' +
    '<button class="taxi-btn skip" onclick="skipTaxi()">⏭️ Другой</button>' +
  '</div>' +
  '<div class="taxi-limit">📊 Выполнено: ' + (TAXI_DAILY_LIMIT - left) + '/' + TAXI_DAILY_LIMIT + '</div>';
}

function renderSk() {
  var icons = { торговля: '💼', механика: '🔧', хитрость: '🎭', вождение: '🚗' };
  document.getElementById('skills-grid').innerHTML = Object.entries(G.sk).map(function(entry) {
    var k = entry[0], v = entry[1];
    var xpNeeded = v.l * 100;
    var pct = Math.min(100, (v.x / xpNeeded) * 100);
    return '<div class="skill">' +
      '<div class="skill-name">' + icons[k] + ' ' + k.charAt(0).toUpperCase() + k.slice(1) + '</div>' +
      '<div class="skill-bar-bg"><div class="skill-bar" style="width:' + pct + '%"></div></div>' +
      '<div class="skill-info">' +
        '<span class="skill-lvl">Ур. ' + v.l + '</span>' +
        '<span class="skill-xp">' + v.x + '/' + xpNeeded + ' XP</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function calcSP(c) {
  var p = c.rv * (c.cond / 100);
  p *= (1 + G.sk.торговля.l * 0.04);
  p *= (c.vm || 1);
  p *= (G.mods && G.mods.sellMult ? G.mods.sellMult : 1);
  
  if (c.hp && !c.pr && Math.random() < 0.35) p *= 0.70;
  
  var knownDamages = getKnownDamages(c);
  var hiddenCount = getUnknownDamageCount(c);
  if (knownDamages && knownDamages.length) {
    var totalSev = c.damages.reduce(function(s, d) { return s + d.severity; }, 0);
    var avgSev = totalSev / c.damages.length;
    p *= (1 - Math.min(0.40, (avgSev / 100) * 0.6 + c.damages.length * 0.03));
  }
  
  return Math.round(p);
}

function unlockAch(a) {
  if (!a || GS.achievements[a.id]) return;
  GS.achievements[a.id] = Date.now();
  saveGlobalStats();
  showAchievement(a);
  vibrate(100);
}

function buyG(id) {
  saveSnapshot('sim:before_buy');

  var c = G.mkt.find(function(x) { return String(x.id) === String(id); });
  if (!c || G.m < c.ap) return toast('Недостаточно денег!', 'error');

  G.m -= c.ap;
  c.pp = c.ap;
  c.boughtDay = G.day;
  var visible = genDamages(c.cond);
  c.damages = visible.slice(0, Math.max(0, Math.ceil(visible.length * 0.65)));
  c.hiddenDamages = genHiddenDamages(c.cond, c.damages);
  c.hp = c.hiddenDamages.length > 0;
  c.vm = c.vm || 1;
  c.srv = c.srv || {};
  c.haggled = false;
  c.dealFlag = '';
  c.rivalPressure = false;
  G.gar.push(c);
  G.mkt = G.mkt.filter(function(x) { return String(x.id) !== String(id); });
  G.buys++;
  updateContracts('buy', { isRare: c.rareLevel === 'rare' || c.rareLevel === 'elite', rareLevel: c.rareLevel, segment: c.seg || getCarSegment(c) });
  addXP('торговля', 25);

  var msg = c.e + ' Куплено!';
  if (c.hiddenDamages.length) msg += ' ⚠️ скрытые риски: ' + c.hiddenDamages.length;
  else if (c.damages.length) msg += ' 🩹 дефекты: ' + c.damages.length;
  else msg += ' ✨';

  toast(msg, 'success');
  vibrate(30);
  renderSim();
}

function sellG(id) {
  saveSnapshot('sim:before_sell');

  var c = G.gar.find(function(x) { return String(x.id) === String(id); });
  if (!c) return;

  var sp = calcSP(c);
  var fee = Math.round(sp * 0.05);
  var payout = sp - fee;
  var hiddenPenalty = 0;
  var hadComplaint = false;
  if (getUnknownDamageCount(c) > 0) {
    hiddenPenalty = Math.round(getHiddenRepairReserve(c) * 0.60);
    payout = Math.max(0, payout - hiddenPenalty);
    hadComplaint = true;
  }
  var profit = payout - (c.pp || 0);

  G.m += payout;
  G.gar = G.gar.filter(function(x) { return String(x.id) !== String(id); });

  if (String(selectedSrvCarId) === String(id)) {
    selectedSrvCarId = '';
    localStorage.removeItem('selectedSrvCarId');
  }

  var repDelta = getRepDeltaFromSale(profit, c, hadComplaint);
  adjustRep(repDelta);

  GS.totalDeals++;
  GS.totalProfit += profit;
  saveGlobalStats();
  checkAchievements(unlockAch);
  addXP('торговля', 35);
  updateContracts('sell', { profit: profit, hadComplaint: hadComplaint, sellPrice: sp, segment: c.seg || getCarSegment(c), rareLevel: c.rareLevel || 'normal' });

  var msg = (profit >= 0 ? '+' : '') + fmt(profit) + ' ₽ (ком. ' + fmt(fee) + ' ₽)';
  if (hadComplaint) msg += ' • скрытые дефекты: -' + fmt(hiddenPenalty) + ' ₽';
  if (repDelta) msg += ' • реп ' + (repDelta > 0 ? '+' : '') + repDelta;
  toast(profit >= 0 ? '💰 ' + msg : '📉 ' + msg, hadComplaint ? 'error' : (profit >= 0 ? 'success' : 'error'));
  vibrate(hadComplaint ? 90 : (profit >= 0 ? 40 : 80));

  renderSim();
}

function applySrv(sid) {
  var cid = document.getElementById('srv-select').value;
  if (!cid) return toast('Сначала выберите машину!', 'error');
  
  var c = G.gar.find(function(x) { return String(x.id) === String(cid); });
  var s = srvs.find(function(x) { return x.id === sid; });
  if (!c || !s) return;
  
  var disc = G.mods ? (G.mods.srvDiscount || 0) : 0;
  var bodyDisc = (G.mods && s.cat === 'body') ? (G.mods.bodyDiscount || 0) : 0;
  var totalDisc = Math.min(0.5, disc + bodyDisc);
  var price = Math.round(s.p * (1 - totalDisc));
  
  if (G.m < price) return toast('Недостаточно денег!', 'error');
  
  c.srv = c.srv || {};
  if (c.srv[sid]) return toast('Уже выполнено на этой машине!', 'error');
  
  saveSnapshot('sim:before_service');

  G.m -= price;
  
  // Эффекты услуги
  if (s.e.c) c.cond = Math.min(100, c.cond + s.e.c);
  if (s.e.m) { 
    c.mi = Math.max(1000, c.mi + s.e.m); 
    addXP('хитрость', 60); 
  }
  if (s.e.r) {
    c.pr = true;
    if (getHiddenDamages(c).length) {
      c.damages = mergeUniqueDamages(c.damages, c.hiddenDamages);
      c.hiddenDamages = [];
      c.hp = false;
      updateContracts('diagnose', { foundHidden: true });
      toast('💻 Диагностика вскрыла скрытые дефекты', 'success');
    }
  }
  if (s.e.vm) {
    c.vm = c.vm || 1;
    c.vm *= s.e.vm;
    c.vm = Math.min(c.vm, 2.0);
  }
  
  // Ремонт повреждений
  if (s.e.fixAll && c.damages) {
    c.damages = [];
  } else if (s.e.fixPart && c.damages) {
    c.damages = c.damages.filter(function(d) { return d.key !== s.e.fixPart; });
  } else if (s.e.fixZone && c.damages) {
    var zone = s.e.fixZone;
    if (zone === 'any' && c.damages.length > 0) {
      // Убираем одно случайное повреждение
      var idx = rnd(0, c.damages.length - 1);
      c.damages.splice(idx, 1);
    } else {
      c.damages = c.damages.filter(function(d) { return d.zone !== zone; });
    }
  }
  
  c.srv[sid] = true;
  addXP('механика', 20);
  toast(s.i + ' ' + s.n + ' выполнено!', 'success');
  vibrate(25);
  renderSim();
}

function filterSrvCat(cat) {
  currentSrvCat = cat;
  renderSrv();
}

function genTaxi() {
  var f = pick(locs);
  var t = pick(locs);
  while (t === f) t = pick(locs);
  var dist = rnd(5, 35);
  var base = (rnd(400, 1200) + dist * rnd(20, 40)) * (1 + G.sk.вождение.l * 0.12);
  G.taxi = { 
    f: f, 
    t: t, 
    dist: dist,
    r: Math.round(base * (G.mods ? (G.mods.taxiMult || 1) : 1)) 
  };
}

function accTaxi() {
  if (!G.taxi || !G.gar.length || taxiLeft() <= 0) return toast('Лимит поездок!', 'error');
  G.m += G.taxi.r;
  taxiUseOne();
  addXP('вождение', 30);
  toast('🚕 +' + fmt(G.taxi.r) + ' ₽', 'success');
  vibrate(25);
  genTaxi();
  renderSim();
}

function skipTaxi() { 
  genTaxi(); 
  renderTaxi(); 
}

export function refreshMarket() {
  saveSnapshot('sim:before_next_day');

  G.day++;
  G.mods = { srvDiscount: 0, bodyDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1, sellMult: 1 };

  // Событие дня
  if (Math.random() < 0.80) {
    var total = DAILY_EVENTS.reduce(function(s, e) { return s + e.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < DAILY_EVENTS.length; i++) {
      var e = DAILY_EVENTS[i];
      r -= e.w;
      if (r <= 0) {
        G.lastEvent = { t: e.t, d: e.d };
        e.run({ G: G, toast: toast, rnd: rnd, fmt: fmt });
        break;
      }
    }
  } else {
    G.lastEvent = null;
  }

  rollMarketPulse();
  rollEconomyState();
  rollRivalPressure();
  rollDailyContracts();

  // Расходы на содержание
  var upkeep = 0;
  G.gar.forEach(function(c) {
    var base = c.pp || c.ap || 0;
    var fee = Math.round(clamp(base * 0.004, 400, 4000) * (G.mods.upkeepMult || 1));
    upkeep += fee;
    // Случайное ухудшение состояния
    if (Math.random() < 0.30) {
      c.cond = Math.max(10, c.cond - rnd(1, 2));
    }
    // Может появиться новое повреждение
    if (Math.random() < 0.08 && c.damages && c.damages.length < 5) {
      var newDmg = genDamages(c.cond);
      if (newDmg.length > 0) {
        c.damages.push(newDmg[0]);
      }
    }
  });
  
  if (upkeep > 0) { 
    G.m -= upkeep; 
    toast('📅 День ' + G.day + ' • Расходы: ' + fmt(upkeep) + ' ₽', 'success'); 
  } else {
    toast('📅 День ' + G.day, 'success');
  }

  // Новые машины на рынке
  var tier = getRepTier(G.rep || 0);
  var carCount = rnd(5, 8) + (tier.key === 'dealer' ? 1 : tier.key === 'elite' ? 2 : 0);
  G.mkt = [];
  for (var j = 0; j < carCount; j++) {
    var c = genCarSim();
    c.ap = Math.round(c.ap * (G.mods.apMult || 1));
    G.mkt.push(c);
  }
  var rivals = getRivalProfile();
  G.mkt.forEach(function(c) {
    c.rivalPressure = Math.random() < Math.min(0.65, 0.10 + (rivals.pressure || 0) * 0.12 + ((c.rareLevel === 'rare' || c.rareLevel === 'elite') ? 0.16 : 0));
  });
  rivalSweepMarket();
  
  G.taxi = null;
  renderSim();
}

function addXP(sk, am) {
  var s = G.sk[sk];
  if (!s) return;
  s.x += am;
  var needed = s.l * 100;
  if (s.x >= needed) { 
    s.x -= needed; 
    s.l++; 
    toast('🎯 ' + sk + ' → Уровень ' + s.l + '!', 'success');
    vibrate(50);
  }
  renderSk();
}

// ========== МОДАЛЬНОЕ ОКНО ==========

function openCarModal(id) {
  modalCarId = id;
  renderCarModal();
  document.getElementById('car-modal').classList.add('active');
}

export function closeCarModal(e) {
  // Закрываем если клик по оверлею или кнопке
  if (e && e.target && !e.target.closest('.modal-card') && e.target.id !== 'car-modal') {
    return;
  }
  document.getElementById('car-modal').classList.remove('active');
  modalCarId = null;
}

// Функция для кнопки X
function closeModalBtn() {
  document.getElementById('car-modal').classList.remove('active');
  modalCarId = null;
}

function renderCarModal() {
  var c = G.gar.find(function(x) { return String(x.id) === String(modalCarId); });
  if (!c) { closeModalBtn(); return; }

  var hero = document.getElementById('cm-emoji');
  hero.innerHTML = getCarPremiumCardTag(c, 'premium-card-img modal-premium-card');
  document.getElementById('cm-name').textContent = c.n;
  document.getElementById('cm-sub').textContent = c.yr + ' • ' + fmt(c.mi) + ' км • состояние ' + c.cond + '%';

  var sp = calcSP(c);
  var fee = Math.round(sp * 0.05);
  var profit = sp - fee - (c.pp || 0);
  var srvList = c.srv ? Object.keys(c.srv).filter(function(k) { return c.srv[k]; }) : [];
  var dmgHtml = '';
  var knownDamages = getKnownDamages(c);
  var hiddenCount = getUnknownDamageCount(c);
  if (knownDamages && knownDamages.length) {
    dmgHtml = '<div class="modal-sec">' +
      '<div class="modal-sec-title">🩹 Повреждения (' + knownDamages.length + ')</div>' +
      '<div class="car-damage-visual">' + renderCarVisual(knownDamages) + '</div>' +
      '<div class="dmg-list">' +
        knownDamages.map(function(d) {
          return '<div class="dmg">' +
            '<div class="dmg-header">' +
              '<span class="dmg-icon">' + d.icon + '</span>' +
              '<span class="dmg-part">' + d.part + '</span>' +
              '<span class="dmg-sev ' + (d.severity > 50 ? 'high' : d.severity > 25 ? 'med' : 'low') + '">' + d.severity + '%</span>' +
            '</div>' +
            '<div class="dmg-desc">' + d.desc + '</div>' +
            '<div class="dmg-bar"><div class="dmg-fill" style="width:' + d.severity + '%"></div></div>' +
            '<div class="dmg-cost">Ремонт: ~' + fmt(Math.round(d.repairCost * (d.severity / 50))) + ' ₽</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  } else {
    dmgHtml = '<div class="modal-sec">' +
      '<div class="modal-sec-title">✨ Состояние</div>' +
      '<div class="car-damage-visual">' + renderCarVisual(knownDamages) + '</div>' +
      '<div class="no-damage">Повреждений не обнаружено!</div>' +
    '</div>';
  }

  document.getElementById('cm-body').innerHTML =
    '<div class="kv-grid">' +
      '<div class="kv"><div class="k">ПОКУПКА</div><div class="v">' + fmt(c.pp || 0) + ' ₽</div></div>' +
      '<div class="kv"><div class="k">ДЕНЬ</div><div class="v">' + (c.boughtDay || '—') + '</div></div>' +
      '<div class="kv"><div class="k">ПРОДАЖА</div><div class="v">' + fmt(sp) + ' ₽</div></div>' +
      '<div class="kv"><div class="k">КОМИССИЯ</div><div class="v">' + fmt(fee) + ' ₽</div></div>' +
      '<div class="kv"><div class="k">К ВЫПЛАТЕ</div><div class="v">' + fmt(sp - fee) + ' ₽</div></div>' +
      '<div class="kv"><div class="k">ПРИБЫЛЬ</div><div class="v ' + (profit >= 0 ? 'good' : 'bad') + '">' + (profit >= 0 ? '+' : '') + fmt(profit) + ' ₽</div></div>' +
    '</div>' +
    '<div class="modal-sec">' +
      '<div class="modal-sec-title">🏷️ Статус</div>' +
      '<div class="tags">' +
        '<div class="tag ' + (c.pr ? 'ok' : 'warn') + '">' + (c.pr ? '💻 Диагностика OK' : '💻 Без диагностики') + '</div>' +
        '<div class="tag ' + (c.hp ? 'warn' : 'ok') + '">' + (c.hp ? '⚠️ Скрытые проблемы' : '✅ Чистая история') + '</div>' +
        '<div class="tag rep-inline">😎 ' + getRepTier(G.rep || 0).label + '</div>' +
        '<div class="tag">🧾 Услуг: ' + srvList.length + '</div>' +
        '<div class="tag">📈 VM: x' + (c.vm || 1).toFixed(2) + '</div>' +
      '</div>' +
    '</div>' +
    dmgHtml +
    (hiddenCount ? '<div class="hidden-note">⚠️ Без диагностики у этой машины остаётся ' + hiddenCount + ' скрыт(ых) дефект(ов). Продажа без проверки может ударить по прибыли и репутации.</div>' : '');
}

// Визуализация машины с повреждениями
function renderCarVisual(damages) {
  var zones = {
    front: { x: 70, y: 15, damages: [] },
    rear: { x: 70, y: 135, damages: [] },
    left: { x: 15, y: 75, damages: [] },
    right: { x: 125, y: 75, damages: [] },
    top: { x: 70, y: 75, damages: [] },
    under: { x: 70, y: 155, damages: [] }
  };
  
  damages.forEach(function(d) {
    if (zones[d.zone]) {
      zones[d.zone].damages.push(d);
    }
  });
  
  var svg = '<svg viewBox="0 0 160 180" class="car-svg">' +
    // Корпус машины (вид сверху)
    '<rect x="35" y="30" width="70" height="120" rx="15" fill="#1a0a2e" stroke="#333" stroke-width="2"/>' +
    // Капот
    '<rect x="40" y="35" width="60" height="30" rx="5" fill="#2a1a3e" stroke="' + (zones.front.damages.length ? '#ff2d2d' : '#444') + '" stroke-width="' + (zones.front.damages.length ? '3' : '1') + '"/>' +
    // Крыша
    '<rect x="45" y="70" width="50" height="40" rx="3" fill="#2a1a3e" stroke="' + (zones.top.damages.length ? '#ff2d2d' : '#444') + '" stroke-width="' + (zones.top.damages.length ? '3' : '1') + '"/>' +
    // Багажник
    '<rect x="40" y="115" width="60" height="30" rx="5" fill="#2a1a3e" stroke="' + (zones.rear.damages.length ? '#ff2d2d' : '#444') + '" stroke-width="' + (zones.rear.damages.length ? '3' : '1') + '"/>' +
    // Левая сторона
    '<rect x="35" y="65" width="8" height="50" fill="#2a1a3e" stroke="' + (zones.left.damages.length ? '#ff2d2d' : '#444') + '" stroke-width="' + (zones.left.damages.length ? '3' : '1') + '"/>' +
    // Правая сторона
    '<rect x="97" y="65" width="8" height="50" fill="#2a1a3e" stroke="' + (zones.right.damages.length ? '#ff2d2d' : '#444') + '" stroke-width="' + (zones.right.damages.length ? '3' : '1') + '"/>' +
    // Фары
    '<circle cx="48" cy="38" r="5" fill="' + (hasZoneDamage(damages, 'headlight_l') ? '#ff2d2d' : '#ffd700') + '"/>' +
    '<circle cx="92" cy="38" r="5" fill="' + (hasZoneDamage(damages, 'headlight_r') ? '#ff2d2d' : '#ffd700') + '"/>' +
    // Фонари
    '<circle cx="48" cy="142" r="4" fill="' + (hasZoneDamage(damages, 'taillight_l') ? '#ff2d2d' : '#ff0000') + '"/>' +
    '<circle cx="92" cy="142" r="4" fill="' + (hasZoneDamage(damages, 'taillight_r') ? '#ff2d2d' : '#ff0000') + '"/>' +
    // Колёса
    '<ellipse cx="30" cy="50" rx="8" ry="12" fill="#111" stroke="#333"/>' +
    '<ellipse cx="110" cy="50" rx="8" ry="12" fill="#111" stroke="#333"/>' +
    '<ellipse cx="30" cy="130" rx="8" ry="12" fill="#111" stroke="#333"/>' +
    '<ellipse cx="110" cy="130" rx="8" ry="12" fill="#111" stroke="#333"/>';
  
  // Маркеры повреждений
  damages.forEach(function(d, i) {
    var pos = getDamagePosition(d.zone, i);
    svg += '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="8" fill="rgba(255,45,45,0.8)" class="damage-marker"/>' +
           '<text x="' + pos.x + '" y="' + (pos.y + 4) + '" text-anchor="middle" fill="#fff" font-size="10">' + d.icon + '</text>';
  });
  
  // Подпись под машиной
  svg += '<text x="80" y="175" text-anchor="middle" fill="#666" font-size="9">' + 
         (damages.length ? '🔴 ' + damages.length + ' повреждений' : '🟢 Отличное состояние') + '</text>';
  
  svg += '</svg>';
  return svg;
}

function hasZoneDamage(damages, key) {
  return damages.some(function(d) { return d.key === key; });
}

function getDamagePosition(zone, index) {
  var positions = {
    front: [{x:55,y:45},{x:85,y:45},{x:70,y:50}],
    rear: [{x:55,y:125},{x:85,y:125},{x:70,y:135}],
    left: [{x:25,y:70},{x:25,y:90},{x:25,y:110}],
    right: [{x:115,y:70},{x:115,y:90},{x:115,y:110}],
    top: [{x:60,y:85},{x:80,y:85},{x:70,y:95}],
    under: [{x:50,y:160},{x:90,y:160},{x:70,y:165}]
  };
  var arr = positions[zone] || positions.top;
  return arr[index % arr.length];
}

export function setSrvFromModal() {
  if (!modalCarId) return;
  document.getElementById('srv-select').value = modalCarId;
  selectedSrvCarId = String(modalCarId);
  localStorage.setItem('selectedSrvCarId', selectedSrvCarId);
  
  // Переключаемся на вкладку услуг
  document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
  document.querySelectorAll('.panel').forEach(function(x) { x.classList.remove('active'); });
  var srvTab = document.querySelector('.tab[data-p="services"]');
  if (srvTab) srvTab.classList.add('active');
  document.getElementById('services').classList.add('active');
  
  closeModalBtn();
  toast('🛠️ Машина выбрана для услуг', 'success');
}

export function sellFromModal() {
  if (!modalCarId) return;
  var id = modalCarId;
  closeModalBtn();
  sellG(id);
}

// Expose for onclick
if (typeof window !== 'undefined') {
  window.buyG = buyG;
  window.sellG = sellG;
  window.applySrv = applySrv;
  window.accTaxi = accTaxi;
  window.skipTaxi = skipTaxi;
  window.openCarModal = openCarModal;
  window.closeCarModal = closeCarModal;
  window.closeModalBtn = closeModalBtn;
  window.filterSrvCat = filterSrvCat;
}
