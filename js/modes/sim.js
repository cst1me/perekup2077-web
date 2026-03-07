// PEREKUP 2077 — Simulator mode v4.5.1
import { fmt, rnd, pick, clamp, toast, vibrate, enterFullscreen } from '../core/utils.js';
import { cars, comments, names, avas, srvs, locs, DAILY_EVENTS, TAXI_DAILY_LIMIT, DAMAGE_PARTS, HIDDEN_DAMAGE_PARTS, SERVICE_CATS, CAR_STORY_TAGS, BLACK_MARKET_PREFIX } from '../core/data.js';
import { G, GS, saveGlobalStats, loadTaxiDaily, taxiUseOne, hiddenLevel, getHiddenDifficultyProfile, checkAchievements, showAchievement, persistGameState } from '../core/state.js';
import { saveSnapshot } from '../core/snapshots.js';
import { show } from '../ui/screens.js';
import { getCurrentWeeklyEvent, getWeeklyEventMult, getGarageCap } from '../core/growth.js';

var selectedSrvCarId = localStorage.getItem('selectedSrvCarId') || '';
var modalCarId = null;
var currentSrvCat = 'all';

const TREND_PRESETS = [
  { key: 'classic_boom', label: 'Классика в моде', target: ['klassika-2107'], mult: 1.22, risk: 'Низкий' },
  { key: 'suv_wave', label: 'Бум кроссоверов', target: ['krossover','lyuks-krossover'], mult: 1.18, risk: 'Средний' },
  { key: 'business_rush', label: 'Корпо спрос', target: ['biznes-sedan','premium-sedan'], mult: 1.16, risk: 'Низкий' },
  { key: 'sport_flash', label: 'Неоновый дрифт', target: ['sportkupe'], mult: 1.24, risk: 'Высокий' },
  { key: 'budget_day', label: 'Народный спрос', target: ['hetchbek-narodnyy','sedan-ekonom','gorodskoy-kompakt'], mult: 1.14, risk: 'Средний' }
];

function getRepMeta(rep) {
  if (rep >= 120) return { rank: 'ЛЕГЕНДА', mult: 1.14, buyer: 'VIP' };
  if (rep >= 60) return { rank: 'АВТОРИТЕТ', mult: 1.09, buyer: 'Лояльные' };
  if (rep >= 20) return { rank: 'НАДЁЖНЫЙ', mult: 1.05, buyer: 'Спокойные' };
  if (rep <= -60) return { rank: 'АФЕРИСТ', mult: 0.88, buyer: 'Параноики' };
  if (rep <= -20) return { rank: 'МУТНЫЙ', mult: 0.94, buyer: 'Осторожные' };
  return { rank: 'НОВИЧОК', mult: 1, buyer: 'Обычные' };
}

function weightedStoryPick(group) {
  var arr = CAR_STORY_TAGS[group] || [];
  return arr.length ? pick(arr) : null;
}

function genStory(carId, cond) {
  var tags = [];
  if (cond >= 78 && Math.random() < 0.55) tags.push(weightedStoryPick('clean'));
  if (cond <= 62 && Math.random() < 0.65) tags.push(weightedStoryPick('risky'));
  if (Math.random() < 0.12) tags.push(weightedStoryPick('legendary'));
  tags = tags.filter(Boolean);
  if (!tags.length) tags.push(weightedStoryPick(cond >= 65 ? 'clean' : 'risky'));
  var mult = 1;
  var rep = 0;
  tags.forEach(function(t) { mult *= (t.value || 1); rep += (t.rep || 0); });
  return {
    tags: tags,
    summary: tags.map(function(t) { return t.label; }).join(' • '),
    mult: Math.max(0.65, Math.min(1.35, mult)),
    repDelta: rep
  };
}

function getStoryTone(story) {
  if (!story || !story.tags || !story.tags.length) return 'Обычная история';
  if (story.mult >= 1.15) return 'Легендарная история';
  if (story.mult <= 0.9) return 'Тёмное прошлое';
  return 'Проверяемый лот';
}

function getTrendMult(car) {
  var mt = G.marketTrend;
  if (!mt || !Array.isArray(mt.target)) return 1;
  var daily = mt.target.indexOf(car.carId || car.id) >= 0 ? (mt.mult || 1) : 1;
  return daily * getWeeklyEventMult(car.carId || car.id);
}

function maybeBlackMarketCar(baseCar) {
  if (Math.random() >= 0.16) return baseCar;
  baseCar.blackMarket = true;
  baseCar.blackRisk = rnd(18, 42);
  baseCar.ap = Math.round(baseCar.ap * rnd(42, 68) / 100);
  baseCar.cm = pick(BLACK_MARKET_PREFIX) + ' лот. Документы лучше не светить.';
  return baseCar;
}


function slugifyCarName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function getCarImageSrc(c) {
  var id = (c && (c.carId || c.id)) ? (c.carId || c.id) : 'default';
  // Если id содержит тире и цифры (сгенерированный) — используем default
  if (id.match(/^\d+-/)) id = 'default';
  return './assets/cards-premium/' + id + '.png';
}

function getCarImageTag(c, cls) {
  var src = getCarImageSrc(c);
  var alt = (c && c.n ? c.n : 'Автомобиль').replace(/"/g, '&quot;');
  cls = cls || 'car-img';
  return '<img class="' + cls + '" src="' + src + '" alt="' + alt + '" loading="lazy" onerror="this.onerror=null;this.src=\'./assets/cards-premium/default.png\';">';
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

function estimateMarketProfit(c) {
  var fake = {
    rv: c.rv,
    cond: c.cond,
    vm: c.vm || 1,
    hp: c.hp,
    pr: c.pr,
    damages: c.damages || [],
    pp: c.ap
  };
  var sp = calcSP(fake);
  return sp - Math.round(sp * 0.05) - (c.ap || 0);
}

// Генерация повреждений
// Генерация ВИДИМЫХ повреждений (бесплатно показываются)
function genVisibleDamages(cond) {
  var lvl = hiddenLevel();
  var profile = getHiddenDifficultyProfile();
  var result = [];
  var condFactor = (100 - cond) / 100;
  var maxDamages = Math.min(5, 1 + Math.floor(condFactor * 3) + Math.floor(profile.level / 4));
  
  var shuffled = DAMAGE_PARTS.slice().sort(function() { return Math.random() - 0.5; });
  
  for (var i = 0; i < shuffled.length && result.length < maxDamages; i++) {
    var p = shuffled[i];
    var chance = clamp(p.chance + condFactor * 0.25 + profile.simDamageBonus, 0, 0.68);
    if (Math.random() < chance) {
      result.push({
        key: p.key,
        part: p.name,
        zone: p.zone,
        icon: p.icon,
        desc: p.desc,
        repairCost: p.repairCost,
        severity: clamp(rnd(15, 50 + Math.round(condFactor * 30)), 10, 90),
        hidden: false
      });
    }
  }
  return result;
}

// Генерация СКРЫТЫХ повреждений (только после диагностики)
function genHiddenDamages(cond) {
  var lvl = hiddenLevel();
  var profile = getHiddenDifficultyProfile();
  var result = [];
  var condFactor = (100 - cond) / 100;
  var maxHidden = Math.min(4, Math.floor(condFactor * 2.5) + Math.floor(lvl / 3));
  
  var shuffled = HIDDEN_DAMAGE_PARTS.slice().sort(function() { return Math.random() - 0.5; });
  
  for (var i = 0; i < shuffled.length && result.length < maxHidden; i++) {
    var p = shuffled[i];
    var chance = clamp(p.chance + condFactor * 0.2 + lvl * 0.02 + profile.simDamageBonus, 0, 0.58);
    if (Math.random() < chance) {
      result.push({
        key: p.key,
        part: p.name,
        zone: p.zone,
        icon: p.icon,
        desc: p.desc,
        repairCost: p.repairCost,
        severity: clamp(rnd(20, 60 + Math.round(condFactor * 25)), 15, 95),
        hidden: true
      });
    }
  }
  return result;
}

// Совместимость со старым кодом
function genDamages(cond) {
  return genVisibleDamages(cond);
}

// Генерация машины для рынка
function genCarSim() {
  var lvl = hiddenLevel();
  var profile = getHiddenDifficultyProfile();
  var t = pick(cars);
  var CURRENT_YEAR = new Date().getFullYear();
  var yr = rnd(2005, CURRENT_YEAR);
  var age = CURRENT_YEAR - yr;
  var mi = age * rnd(9000, 23000 + 2500 * (lvl - 1));
  var cond = clamp(100 - age * rnd(2, 6 + lvl) - Math.round(profile.level * 1.5), 18, 100);
  var rv = rnd(t.min, t.max);
  rv = Math.round(rv * (1 - age * 0.025) * (cond / 100));
  var ap = Math.round(rv * rnd(78 + 4 * (lvl - 1), 116 + 7 * (lvl - 1)) / 100 * (1 + profile.simPricePressure));
  
  var story = genStory(t.id, cond);
  rv = Math.round(rv * (story.mult || 1));
  ap = Math.round(ap * (story.mult >= 1.15 ? 1.06 : story.mult <= 0.9 ? 0.93 : 1));

  return maybeBlackMarketCar({
    id: Date.now() + '-' + Math.random().toString(36).substr(2,9),
    carId: t.id || 'default',
    n: t.n, e: t.e, yr: yr, mi: mi, cond: cond, ap: ap, rv: rv,
    cm: pick(comments), sn: pick(names), sa: pick(avas),
    hp: Math.random() < clamp(0.18 + 0.06 * (lvl - 1), 0, 0.50),
    pr: false, vm: 1, srv: {},
    damages: [],
    hiddenDamages: [],
    story: story
  });
}


function applyDailyLegendaryLot() {
  if (!G.mkt || !G.mkt.length) return;
  var key = (G.retention && G.retention.dailyLotKey) || '';
  var idx = 0;
  if (key) {
    for (var i = 0; i < key.length; i++) idx = (idx + key.charCodeAt(i)) % G.mkt.length;
  }
  var c = G.mkt[idx];
  if (!c || c.dailyLegendary) return;
  c.dailyLegendary = true;
  c.story = Object.assign({}, c.story || {}, {
    tone: 'legendary',
    summary: 'ЛОТ ДНЯ • редкая поставка',
    mult: Math.max(1.22, (c.story && c.story.mult) || 1)
  });
  c.rv = Math.round(c.rv * 1.18);
  c.ap = Math.round(c.ap * 0.9);
  c.cm = 'Лот дня. Если упустишь — завтра исчезнет.';
}

function taxiLeft() { return Math.max(0, TAXI_DAILY_LIMIT - loadTaxiDaily()); }

function ensureTaxiProg() {
  if (!G.taxiProg || typeof G.taxiProg !== 'object') G.taxiProg = { lvl: 1, xp: 0, totalDone: 0 };
  if (!Number.isInteger(G.taxiProg.lvl) || G.taxiProg.lvl < 1) G.taxiProg.lvl = 1;
  if (!Number.isInteger(G.taxiProg.xp) || G.taxiProg.xp < 0) G.taxiProg.xp = 0;
  if (!Number.isInteger(G.taxiProg.totalDone) || G.taxiProg.totalDone < 0) G.taxiProg.totalDone = 0;
  return G.taxiProg;
}

function taxiXpNeed(lvl) { return 3 + lvl * 2; }

function taxiTierMeta(lvl) {
  if (lvl >= 10) return { key: 'elite', name: 'NEON ELITE', mult: 2.35, minDist: 20, maxDist: 60, hard: 'Очень высокий' };
  if (lvl >= 7) return { key: 'business', name: 'BIZ GRID', mult: 1.9, minDist: 14, maxDist: 48, hard: 'Высокий' };
  if (lvl >= 4) return { key: 'comfort', name: 'COMFORT+', mult: 1.45, minDist: 9, maxDist: 40, hard: 'Средний' };
  return { key: 'base', name: 'STREET', mult: 1, minDist: 5, maxDist: 28, hard: 'Базовый' };
}

function addTaxiXp(amount) {
  var tp = ensureTaxiProg();
  tp.totalDone += 1;
  tp.xp += amount;
  var ups = 0;
  while (tp.xp >= taxiXpNeed(tp.lvl)) {
    tp.xp -= taxiXpNeed(tp.lvl);
    tp.lvl += 1;
    ups += 1;
  }
  if (ups > 0) toast('🚕 Уровень такси повышен до ' + tp.lvl + '!', 'success');
}

export function startSim() {
  enterFullscreen();
  show('sim-screen');
  if (!G.mkt.length) G.mkt = [0,0,0,0,0,0].map(function() { return genCarSim(); });
  applyDailyLegendaryLot();
  renderSim();
}

function renderSim() { 
  updG(); 
  renderMkt(); 
  renderGar(); 
  renderSrv(); 
  renderTaxi(); 
  renderSk(); 
}

function updG() {
  document.getElementById('sim-money').textContent = fmt(G.m) + '₽';
  document.getElementById('sim-day').textContent = G.day;
  document.getElementById('sim-rep').textContent = G.rep || 0;
  var repMeta = getRepMeta(G.rep || 0);
  var rr = document.getElementById('sim-rep-rank');
  if (rr) rr.textContent = repMeta.rank;
}

function renderMkt() {
  // Обновляем счётчик лотов
  var countEl = document.getElementById('market-count');
  if (countEl) countEl.textContent = '🚗 ' + G.mkt.length + ' лотов';
  var repMeta = getRepMeta(G.rep || 0);
  var tierEl = document.getElementById('market-tier');
  if (tierEl) tierEl.textContent = '😎 ' + repMeta.rank;
  var riskEl = document.getElementById('market-risk');
  if (riskEl) {
    var trendLbl = G.marketTrend ? G.marketTrend.label : 'Стабильный рынок';
    var weekly = getCurrentWeeklyEvent();
    riskEl.textContent = '📈 ' + trendLbl + ' • ' + (weekly ? weekly.title : 'WEEKLY');
  }

  var eb = document.getElementById('event-banner');
  if (G.lastEvent) {
    eb.classList.add('active');
    document.getElementById('event-title').textContent = G.lastEvent.t;
    document.getElementById('event-desc').textContent = G.lastEvent.d;
  } else {
    eb.classList.remove('active');
  }

  applyDailyLegendaryLot();
  document.getElementById('market-cars').innerHTML = G.mkt.map(function(c) {
    var profit = estimateMarketProfit(c);
    var rarity = getRarityLabel(c);
    var condClass = getConditionClass(c.cond);
    var badge2 = c.dailyLegendary ? 'LOT OF THE DAY' : (c.blackMarket ? 'BLACK LOT' : (profit > 70000 ? 'TOP DEAL' : (c.hp ? 'SCAM RISK' : 'CLEAN')));
    var storyTone = getStoryTone(c.story);
    return '<div class="scar neo-card">' +
      '<div class="scar-media">' +
        '<div class="scar-badge">' + rarity + '</div>' +
        '<div class="scar-badge secondary ' + (badge2 === 'TOP' ? 'top' : 'risk') + '">' + badge2 + '</div>' +
        getCarImageTag(c, 'car-img') +
      '</div>' +
      '<div class="scar-body">' +
        '<div class="scar-name">' + c.n + '</div>' +
        '<div class="scar-year">' + c.yr + ' • ' + fmt(c.mi) + ' км</div>' +
        '<div class="scar-comment">“' + c.cm + '”</div>' +
        '<div class="scar-comment" style="color:#9fe8ff;">' + storyTone + ': ' + (c.story && c.story.summary ? c.story.summary : 'без сюрпризов') + '</div>' +
        '<div class="scar-stats">' +
          '<div class="sstat"><div class="sstat-lbl">Состояние</div><div class="sstat-val ' + condClass + '">' + c.cond + '%</div></div>' +
          '<div class="sstat"><div class="sstat-lbl">Потенциал</div><div class="sstat-val ' + getProfitClass(profit) + '">' + (profit >= 0 ? '+' : '') + fmt(profit) + '</div></div>' +
        '</div>' +
        '<div class="scar-condition"><div class="scar-condition-fill ' + condClass + '" style="width:' + c.cond + '%"></div></div>' +
        '<div class="scar-tags">' +
          '<span class="scar-tag">Продавец: ' + c.sn + '</span>' +
          '<span class="scar-tag ' + condClass + '">' + (c.hp ? 'Скрытый риск' : 'Открытая продажа') + '</span>' +
          '<span class="scar-tag">' + (c.dailyLegendary ? 'Лот дня' : (c.blackMarket ? 'Чёрный рынок' : 'История: ' + getStoryTone(c.story))) + '</span>' +
        '</div>' +
        '<div class="scar-price-row"><div class="scar-price">' + fmt(c.ap) + ' ₽</div>' +
        '<button class="scar-btn buy" onclick="buyG(\'' + c.id + '\')"' + (G.m < c.ap ? ' disabled' : '') + '>🛒 Купить</button></div>' +
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
    var dmgCount = c.damages ? c.damages.length : 0;
    var condClass = getConditionClass(c.cond);
    var status = c.blackMarket ? 'BLACK LOT' : (dmgCount ? ('IN REPAIR') : 'READY');

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
        '</div>' +
        '<div class="scar-price-row"><div class="scar-price">' + fmt(sp) + ' ₽</div>' +
        '<button class="scar-btn sell" onclick="event.stopPropagation();sellG(\'' + c.id + '\')">💰 Продать</button></div>' +
      '</div>' +
    '</div>';
  }).join('');

  var countEl = document.getElementById('garage-count');
  var valueEl = document.getElementById('garage-value');
  var profitEl = document.getElementById('garage-profit');
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
    var garageRep = document.getElementById('garage-rep');
    if (garageRep) garageRep.textContent = getRepMeta(G.rep || 0).rank;
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
  ensureTaxiProg();
  if (!G.gar.length) {
    tc.innerHTML = '<div class="empty"><div class="empty-icon">🅿️</div><p>Нужна машина в гараже</p></div>';
    return;
  }
  if (!G.taxi) genTaxi();
  var o = G.taxi;
  var left = taxiLeft();
  var tp = ensureTaxiProg();
  var xpNeed = taxiXpNeed(tp.lvl);

  tc.innerHTML = '<div class="taxi-route">' +
    '<div class="taxi-pt">📍 ' + o.f + '</div>' +
    '<div class="taxi-arrow">➡️</div>' +
    '<div class="taxi-pt">📍 ' + o.t + '</div>' +
  '</div>' +
  '<div class="taxi-meta-row">' +
    '<div class="taxi-rank">LVL ' + tp.lvl + ' • ' + o.tier + '</div>' +
    '<div class="taxi-difficulty">Сложность: ' + o.diff + '</div>' +
  '</div>' +
  '<div class="taxi-info">' +
    '<div class="taxi-distance">🛣️ ~' + o.dist + ' км</div>' +
    '<div class="taxi-distance">⭐ +' + o.xp + ' XP</div>' +
  '</div>' +
  '<div class="taxi-reward">💵 ' + fmt(o.r) + ' ₽</div>' +
  '<div class="taxi-xpbar"><div class="taxi-xpfill" style="width:' + Math.min(100, Math.round((tp.xp / xpNeed) * 100)) + '%"></div></div>' +
  '<div class="taxi-limit">📊 Выполнено: ' + (TAXI_DAILY_LIMIT - left) + '/' + TAXI_DAILY_LIMIT + ' • XP: ' + tp.xp + '/' + xpNeed + '</div>' +
  '<div class="taxi-btns">' +
    '<button class="taxi-btn acc" onclick="accTaxi()"' + (left <= 0 ? ' disabled' : '') + '>✅ Принять</button>' +
    '<button class="taxi-btn skip" onclick="skipTaxi()">⏭️ Другой</button>' +
  '</div>';
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
  p *= getRepMeta(G.rep || 0).mult;
  p *= getTrendMult(c);
  if (c.story && c.story.mult) p *= Math.max(0.85, Math.min(1.18, c.story.mult));
  
  if (c.damages && c.damages.length) {
    var totalSev = c.damages.reduce(function(s, d) { return s + d.severity; }, 0);
    var avgSev = totalSev / c.damages.length;
    p *= (1 - Math.min(0.35, (avgSev / 100) * 0.5 + c.damages.length * 0.025));
  }
  
  if (!c.pr && c.hiddenDamages && c.hiddenDamages.length > 0) {
    if (Math.random() < 0.40) {
      var hiddenPenalty = 0.15 + c.hiddenDamages.length * 0.08;
      p *= (1 - Math.min(0.40, hiddenPenalty));
    }
  }

  if (c.blackMarket) p *= (1 - Math.min(0.18, (c.blackRisk || 0) / 250));
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
  if (G.gar.length >= getGarageCap()) return toast('Гараж заполнен! Лимит: ' + getGarageCap(), 'error');
  
  G.m -= c.ap;
  c.pp = c.ap;
  c.boughtDay = G.day;
  
  // Генерируем ВИДИМЫЕ повреждения (сразу видны)
  c.damages = genVisibleDamages(c.cond);
  // Генерируем СКРЫТЫЕ повреждения (раскроются диагностикой)
  c.hiddenDamages = genHiddenDamages(c.cond);
  
  c.vm = c.vm || 1;
  c.srv = c.srv || {};
  c.pr = false; // Диагностика не проведена
  G.gar.push(c);
  G.mkt = G.mkt.filter(function(x) { return String(x.id) !== String(id); });
  G.buys++;
  if (c.story && c.story.repDelta) G.rep += c.story.repDelta;
  if (c.blackMarket) G.heat = (G.heat || 0) + (c.blackRisk || 10);
  addXP('торговля', 25);
  
  var dmgCount = c.damages.length;
  var hiddenCount = c.hiddenDamages ? c.hiddenDamages.length : 0;
  if (dmgCount > 0 || hiddenCount > 0) {
    toast(c.e + ' Куплено! (👁️ ' + dmgCount + ' видно' + (hiddenCount > 0 ? ', 🔍 ?' : '') + ')', 'success');
  } else {
    toast(c.e + ' Куплено! ✨', 'success');
  }
  
  vibrate(30);
  persistGameState('sim-buy');
  renderSim();
}

function sellG(id) {
  saveSnapshot('sim:before_sell');

  var c = G.gar.find(function(x) { return String(x.id) === String(id); });
  if (!c) return;
  
  var sp = calcSP(c);
  var fee = Math.round(sp * 0.05);
  var payout = sp - fee;
  var profit = payout - (c.pp || 0);
  var repDelta = profit >= 0 ? 2 : -2;
  if (c.blackMarket) repDelta -= 4;
  if (c.story && c.story.mult >= 1.15) repDelta += 2;
  G.rep += repDelta;
  G.m += payout;
  G.gar = G.gar.filter(function(x) { return String(x.id) !== String(id); });
  
  // Убираем выбор если продали выбранную машину
  if (String(selectedSrvCarId) === String(id)) {
    selectedSrvCarId = '';
    localStorage.removeItem('selectedSrvCarId');
  }
  
  GS.totalDeals++;
  GS.totalProfit += profit;
  saveGlobalStats();
  checkAchievements(unlockAch);
  addXP('торговля', 35);
  
  var msg = (profit >= 0 ? '+' : '') + fmt(profit) + ' ₽ (ком. ' + fmt(fee) + ' ₽)';
  toast(profit >= 0 ? '💰 ' + msg : '📉 ' + msg, profit >= 0 ? 'success' : 'error');
  vibrate(profit >= 0 ? 40 : 80);
  if (typeof window !== 'undefined' && typeof window.trackSuccessfulSale === 'function') {
    window.trackSuccessfulSale(profit, c.n + ' ' + c.e);
  }
  persistGameState('sim-sell');
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
  if (s.e.r) c.pr = true;
  if (s.e.vm) {
    c.vm = c.vm || 1;
    c.vm *= s.e.vm;
    c.vm = Math.min(c.vm, 2.0);
  }
  
  // Ремонт повреждений (видимых и скрытых)
  if (s.e.fixAll) {
    c.damages = [];
    c.hiddenDamages = [];
  } else if (s.e.fixPart) {
    // Убираем из видимых
    if (c.damages) {
      c.damages = c.damages.filter(function(d) { return d.key !== s.e.fixPart; });
    }
    // Убираем из скрытых (если диагностика ещё не проведена)
    if (c.hiddenDamages) {
      c.hiddenDamages = c.hiddenDamages.filter(function(d) { return d.key !== s.e.fixPart; });
    }
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
  var tp = ensureTaxiProg();
  var tier = taxiTierMeta(tp.lvl);
  var f = pick(locs);
  var t = pick(locs);
  while (t === f) t = pick(locs);
  var dist = rnd(tier.minDist, tier.maxDist);
  var skillMult = 1 + G.sk.вождение.l * 0.12;
  var lvlMult = 1 + (tp.lvl - 1) * 0.09;
  var base = (rnd(500, 1400) + dist * rnd(28, 54)) * skillMult * lvlMult * tier.mult;
  var xp = Math.max(1, Math.round(1 + dist / 10 + tier.mult));
  G.taxi = { 
    f: f, 
    t: t, 
    dist: dist,
    diff: tier.hard,
    tier: tier.name,
    xp: xp,
    r: Math.round(base * (G.mods ? (G.mods.taxiMult || 1) : 1)) 
  };
}

function accTaxi() {
  if (!G.taxi || !G.gar.length || taxiLeft() <= 0) return toast('Лимит поездок!', 'error');
  G.m += G.taxi.r;
  taxiUseOne();
  addXP('вождение', 30 + Math.round((G.taxi.xp || 1) * 2));
  addTaxiXp(G.taxi.xp || 1);
  toast('🚕 +' + fmt(G.taxi.r) + ' ₽ • заказ ' + (G.taxi.tier || 'STREET'), 'success');
  vibrate(25);
  persistGameState('taxi-complete');
  genTaxi();
  renderSim();
}

function skipTaxi() { 
  genTaxi(); 
  renderTaxi(); 
}

export function nextDayWithAd() {
  // Показываем рекламу только при переходе на 2й день (когда G.day === 1)
  if (G.day === 1 && typeof window !== 'undefined' && typeof window.showFullAd === 'function') {
    window.showFullAd().then(function() {
      refreshMarket();
    });
  } else {
    refreshMarket();
  }
}

export function refreshMarket() {
  saveSnapshot('sim:before_next_day');

  G.day++;
  G.mods = { srvDiscount: 0, bodyDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1, sellMult: 1 };
  G.marketTrend = pick(TREND_PRESETS);
  G.heat = Math.max(0, (G.heat || 0) - rnd(3, 8));

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
  var lvl = hiddenLevel();
  var carCount = rnd(5, 7) + Math.min(2, Math.floor((lvl - 1) / 2)) + ((G.entitlements && G.entitlements.vipDealer) ? 1 : 0);
  G.mkt = [];
  G.blackMarket = null;
  for (var j = 0; j < carCount; j++) {
    var c = genCarSim();
    c.ap = Math.round(c.ap * (G.mods.apMult || 1));
    G.mkt.push(c);
    if (c.blackMarket && !G.blackMarket) G.blackMarket = { id: c.id, risk: c.blackRisk, label: c.n };
  }
  applyDailyLegendaryLot();
  if ((G.heat || 0) >= 70) {
    var fine = rnd(15000, 45000);
    G.m -= fine;
    G.rep -= rnd(5, 12);
    G.lastEvent = { t: '👮 Рейд по чёрному рынку', d: 'Штраф ' + fmt(fine) + ' ₽ • жара рынка слишком высокая' };
  }
  
  G.taxi = null;
  persistGameState('next-day');
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
  hero.innerHTML = getCarImageTag(c, 'car-img modal-car-img');
  document.getElementById('cm-name').textContent = c.n;
  document.getElementById('cm-sub').textContent = c.yr + ' • ' + fmt(c.mi) + ' км • ' + c.cond + '%';

  var sp = calcSP(c);
  var fee = Math.round(sp * 0.05);
  var profit = sp - fee - (c.pp || 0);
  var srvList = c.srv ? Object.keys(c.srv).filter(function(k) { return c.srv[k]; }) : [];
  var dmgHtml = '';
  var hiddenCount = c.hiddenDamages ? c.hiddenDamages.length : 0;
  var visibleCount = c.damages ? c.damages.length : 0;
  
  // Видимые повреждения (бесплатно)
  if (visibleCount > 0) {
    dmgHtml = '<div class="modal-sec">' +
      '<div class="modal-sec-title">👁️ Видимые повреждения (' + visibleCount + ')</div>' +
      '<div class="car-damage-visual">' + renderCarVisual(c.damages) + '</div>' +
      '<div class="dmg-list">' +
        c.damages.map(function(d) {
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
      '<div class="modal-sec-title">✨ Внешний осмотр</div>' +
      '<div class="car-damage-visual">' + renderCarVisual([]) + '</div>' +
      '<div class="no-damage">Видимых повреждений нет!</div>' +
    '</div>';
  }
  
  // Скрытые повреждения (нужна диагностика)
  var hiddenHtml = '';
  if (!c.pr && hiddenCount > 0) {
    // Диагностика НЕ проведена - показываем что есть скрытые
    hiddenHtml = '<div class="modal-sec hidden-dmg-sec">' +
      '<div class="modal-sec-title">🔍 Скрытые дефекты</div>' +
      '<div class="hidden-warning">⚠️ Возможны скрытые проблемы!</div>' +
      '<div class="hidden-hint">Двигатель, КПП, электрика... Проведи диагностику чтобы узнать точно.</div>' +
    '</div>';
  } else if (c.pr && hiddenCount === 0 && visibleCount === 0) {
    // Диагностика проведена, ничего не найдено
    hiddenHtml = '<div class="modal-sec hidden-dmg-sec ok">' +
      '<div class="modal-sec-title">✅ Полная диагностика</div>' +
      '<div class="hidden-ok">Машина в отличном состоянии! Скрытых дефектов нет.</div>' +
    '</div>';
  } else if (c.pr) {
    // Диагностика проведена
    hiddenHtml = '<div class="modal-sec hidden-dmg-sec ok">' +
      '<div class="modal-sec-title">✅ Диагностика пройдена</div>' +
      '<div class="hidden-ok">Все дефекты выявлены и показаны выше.</div>' +
    '</div>';
  }
  
  dmgHtml += hiddenHtml;

  // Показываем кнопку диагностики только если НЕ проведена
  var diagBtn = '';
  if (!c.pr) {
    diagBtn = '<div class="modal-sec ad-terminal-box">' +
      '<div class="modal-sec-title">📺 ЯНДЕКС БОНУСЫ</div>' +
      '<div class="ad-terminal-actions">' +
        '<button class="ad-terminal-btn" onclick="rewardDiagnoseCurrentCar()">▶ ГЛУБОКАЯ ДИАГНОСТИКА</button>' +
        '<div class="ad-terminal-note">Проверит двигатель, КПП, электрику, топливную систему</div>' +
        '<div class="ad-terminal-hint">💡 Это опционально — видимые дефекты уже показаны бесплатно!</div>' +
      '</div>' +
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
        '<div class="tag ' + (c.pr ? 'ok' : 'warn') + '">' + (c.pr ? '✅ Диагностика OK' : '⚠️ Без диагностики') + '</div>' +
        '<div class="tag">' + (hiddenCount > 0 && !c.pr ? '🔍 Скрытые: ?' : '🔍 Скрытых нет') + '</div>' +
        '<div class="tag">🧾 Услуг: ' + srvList.length + '</div>' +
        '<div class="tag">📈 VM: x' + (c.vm || 1).toFixed(2) + '</div>' +
        '<div class="tag">📖 ' + (c.story && c.story.summary ? c.story.summary : 'Обычная история') + '</div>' +
        '<div class="tag ' + (c.blackMarket ? 'warn' : 'ok') + '">' + (c.blackMarket ? '🕶️ Чёрный рынок • Heat +' + (c.blackRisk || 0) : '🧾 Белый рынок') + '</div>' +
      '</div>' +
    '</div>' +
    diagBtn +
    dmgHtml;
}

export function rewardDiagnoseCurrentCar() {
  if (!modalCarId || typeof window === 'undefined') return;
  var c = G.gar.find(function(x) { return String(x.id) === String(modalCarId); });
  if (!c) return toast('Машина не найдена', 'error');
  if (c.pr) return toast('Диагностика уже проведена!', 'success');
  
  window.showRewardedAd && window.showRewardedAd('diagnosis', function() {
    c.pr = true;
    c.hp = false;
    
    // Раскрываем скрытые повреждения
    var hiddenCount = c.hiddenDamages ? c.hiddenDamages.length : 0;
    if (hiddenCount > 0) {
      // Переносим скрытые в видимые
      c.damages = (c.damages || []).concat(c.hiddenDamages);
      c.hiddenDamages = [];
      toast('🔍 Найдено ' + hiddenCount + ' скрытых дефектов! Теперь ты знаешь всё.', 'success');
    } else {
      toast('✨ Диагностика чистая! Скрытых дефектов нет.', 'success');
    }
    
    persistGameState('reward-diagnosis');
    openCarModal(c.id);
    renderSim();
  });
}

export function rewardRepairPart(partKey) {
  if (!modalCarId || typeof window === 'undefined') return;
  var c = G.gar.find(function(x) { return String(x.id) === String(modalCarId); });
  if (!c || !Array.isArray(c.damages)) return toast('Деталь не найдена', 'error');
  var part = c.damages.find(function(d) { return d.key === partKey; });
  if (!part) return toast('Эта деталь уже исправна', 'success');
  window.showRewardedAd && window.showRewardedAd('repair', function() {
    c.damages = c.damages.filter(function(d) { return d.key !== partKey; });
    c.cond = Math.min(100, c.cond + 8);
    toast('🛠️ ' + part.part + ' восстановлена до 100% HP', 'success');
    persistGameState('reward-repair');
    openCarModal(c.id);
    renderSim();
  });
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
  window.rewardDiagnoseCurrentCar = rewardDiagnoseCurrentCar;
  window.rewardRepairPart = rewardRepairPart;
  window.nextDayWithAd = nextDayWithAd;
}
