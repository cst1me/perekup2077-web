// PEREKUP 2077 — 60 seconds mode v4.0.3 (market psychology + combo tempo)
import { fmt, rnd, pick, clamp, vibrate, enterFullscreen } from '../core/utils.js';
import {
  comments, scamComments, legendaryComments,
  cars, names, scamNames, legendaryNames,
  avas, scamAvas, legendaryAvas
} from '../core/data.js';
import { attachVehicleMeta, getVehicleMeta, getClassGameplayLabel } from '../core/config.js';
import {
  S, resetSKeepBuys, hiddenLevel, GS,
  saveGlobalStats, setPB, ACHIEVEMENTS, showAchievement,
  ensureMeta, metaLevel, addMetaProgress, adjustStreetRep, noteSellerMemory
} from '../core/state.js';
import { show } from '../ui/screens.js';

var offerUI = null;

var CONFIDENCE_LABELS = ['Туман', 'Нервно', 'Норм', 'Чётко'];
var RISK_LABELS = ['Низкий', 'Средний', 'Высокий', 'Критический'];
var FOG_LABELS = ['Прозрачно', 'Дымка', 'Туман', 'Шум'];
var TELL_LABELS = ['Сухой', 'Неровный', 'Гладкий', 'Липкий'];
var BODY_LABELS = ['Спокойный', 'Дёрганый', 'Самоуверенный', 'Скользкий'];
var BUYER_LABELS = {
  patient: 'Спокойный покупатель',
  flipper: 'Перекуп',
  collector: 'Коллекционер',
  picky: 'Придирчивый клиент',
  rich: 'Горячий клиент',
  broker: 'Посредник'
};

var SELLER_ARCHETYPES = [
  { id: 'owner', title: 'Собственник', honesty: 0.74, haggle: 0.42, volatility: 0.12, scamBias: -0.08, heat: 0.00 },
  { id: 'flipper', title: 'Перекуп', honesty: 0.45, haggle: 0.63, volatility: 0.19, scamBias: 0.05, heat: 0.03 },
  { id: 'collector', title: 'Фанат марки', honesty: 0.67, haggle: 0.27, volatility: 0.10, scamBias: -0.04, heat: 0.06 },
  { id: 'hustler', title: 'Суетолог', honesty: 0.34, haggle: 0.58, volatility: 0.24, scamBias: 0.09, heat: 0.04 },
  { id: 'sleepy', title: 'Уставший', honesty: 0.61, haggle: 0.51, volatility: 0.14, scamBias: -0.02, heat: -0.02 },
  { id: 'broker', title: 'Посредник', honesty: 0.40, haggle: 0.54, volatility: 0.20, scamBias: 0.06, heat: 0.01 },
  { id: 'student', title: 'Студент', honesty: 0.53, haggle: 0.68, volatility: 0.16, scamBias: 0.02, heat: -0.01 },
  { id: 'mechanic', title: 'Механик', honesty: 0.70, haggle: 0.32, volatility: 0.10, scamBias: -0.06, heat: 0.02 }
];

var MARKET_MOODS = [
  { id: 'cold', title: 'Рынок остыл', demand: -0.10, priceNoise: 0.14, faultBias: 0.00, vibe: 'Все торгуются жёстче обычного' },
  { id: 'flat', title: 'Рынок сонный', demand: -0.03, priceNoise: 0.10, faultBias: 0.00, vibe: 'Сделки идут лениво, зато можно дожать' },
  { id: 'alive', title: 'Рынок живой', demand: 0.04, priceNoise: 0.09, faultBias: -0.01, vibe: 'Хорошие варианты улетают быстро' },
  { id: 'hot', title: 'Рынок горячий', demand: 0.10, priceNoise: 0.12, faultBias: -0.02, vibe: 'Покупатели нервные, но платят смелее' },
  { id: 'chaos', title: 'Рынок нервный', demand: 0.00, priceNoise: 0.18, faultBias: 0.03, vibe: 'Сигналы противоречат друг другу' }
];

var BUYER_ARCHETYPES = [
  { id: 'patient', bonus: 0.00, volatility: 0.03, note: 'Берёт спокойно, без цирка' },
  { id: 'flipper', bonus: -0.06, volatility: 0.04, note: 'Сам хочет маржу' },
  { id: 'collector', bonus: 0.09, volatility: 0.02, note: 'Любит интересные машины' },
  { id: 'picky', bonus: -0.10, volatility: 0.03, note: 'Докапывается до мелочей' },
  { id: 'rich', bonus: 0.12, volatility: 0.05, note: 'Покупает по эмоции' },
  { id: 'broker', bonus: -0.02, volatility: 0.07, note: 'Плавает от спроса' }
];

function ensureMetaPreview() {
  var host = document.getElementById('pregame');
  if (!host) return null;
  var el = document.getElementById('sixty-meta');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sixty-meta';
    el.className = 'sixty-meta';
    var btn = host.querySelector('.start-btn');
    if (btn) host.insertBefore(el, btn);
    else host.appendChild(el);
  }
  return el;
}

function ensureMetaState() {
  ensureMeta();
  if (!Number.isFinite(GS.meta.runs60)) GS.meta.runs60 = 0;
  if (!Number.isFinite(GS.meta.bestStreak)) GS.meta.bestStreak = 0;
}

function getSkillPack() {
  ensureMetaState();
  return {
    intuition: metaLevel('intuition'),
    mechanic: metaLevel('mechanic'),
    psychology: metaLevel('psychology'),
    analytics: metaLevel('analytics'),
    rep: Number(GS.meta.streetRep || 0)
  };
}

function updatePregameMeta() {
  var el = ensureMetaPreview();
  if (!el) return;
  var sk = getSkillPack();
  el.innerHTML = [
    '<div class="signal-chip">👁️ Чутьё Lv.' + sk.intuition + '</div>',
    '<div class="signal-chip">🔧 Механик Lv.' + sk.mechanic + '</div>',
    '<div class="signal-chip">🧠 Психология Lv.' + sk.psychology + '</div>',
    '<div class="signal-chip">📈 Аналитик Lv.' + sk.analytics + '</div>',
    '<div class="signal-chip">🏙️ Репутация ' + (sk.rep >= 0 ? '+' : '') + sk.rep + '</div>'
  ].join('');
}

function getSpeedBonus() {
  if (S.offerTime <= 1.0) return 60;
  if (S.offerTime <= 2.0) return 30;
  if (S.offerTime <= 3.4) return 14;
  return 0;
}

function getComboMult() {
  if (S.combo >= 12) return 5;
  if (S.combo >= 8) return 4;
  if (S.combo >= 5) return 3;
  if (S.combo >= 3) return 2;
  return 1;
}

function unlockById(id) {
  var a = ACHIEVEMENTS.find(function(x) { return x.id === id; });
  if (!a || GS.achievements[a.id]) return;
  GS.achievements[a.id] = Date.now();
  saveGlobalStats();
  showAchievement(a);
  vibrate(100);
}

function initOfferDom() {
  var root = document.getElementById('offer');
  if (!root) return;

  root.innerHTML =
    '<div class="offer-badge" id="of-badge" style="display:none"></div>' +
    '<div class="offer-top"></div>' +
    '<div class="offer-content">' +
      '<div class="seller">' +
        '<div class="seller-ava" id="of-ava">👤</div>' +
        '<div><div class="seller-name" id="of-seller">—</div><div class="seller-status" id="of-status">—</div></div>' +
      '</div>' +
      '<div class="car-row">' +
        '<div class="car-emoji" id="of-emoji">🚗</div>' +
        '<div class="car-info">' +
          '<div class="car-name" id="of-name">—</div>' +
          '<div class="car-year" id="of-sub">—</div>' +
          '<div class="car-specs">' +
            '<div class="spec"><div class="spec-lbl">Сост.</div><div class="spec-val" id="of-cond">—</div></div>' +
            '<div class="spec"><div class="spec-lbl">Риск</div><div class="spec-val" id="of-risk">—</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="comment" id="of-comment">—</div>' +
      '<div class="signal-strip" id="of-signals"></div>' +
      '<div class="price-row">' +
        '<div class="price-info">' +
          '<div class="price-lbl">ЦЕНА</div>' +
          '<div class="price-val" id="of-price">0₽</div>' +
          '<div class="price-real" id="of-real">~0₽</div>' +
          '<div class="multiplier-preview" id="of-mult" style="display:none"></div>' +
        '</div>' +
        '<div class="offer-btns">' +
          '<button class="obtn obtn-buy" id="btn-buy">✅</button>' +
          '<button class="obtn obtn-haggle" id="btn-haggle">🤝</button>' +
          '<button class="obtn obtn-inspect" id="btn-inspect">🔍</button>' +
          '<button class="obtn obtn-skip" id="btn-skip">❌</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  offerUI = {
    root: root,
    badge: root.querySelector('#of-badge'),
    ava: root.querySelector('#of-ava'),
    seller: root.querySelector('#of-seller'),
    status: root.querySelector('#of-status'),
    emoji: root.querySelector('#of-emoji'),
    name: root.querySelector('#of-name'),
    sub: root.querySelector('#of-sub'),
    cond: root.querySelector('#of-cond'),
    risk: root.querySelector('#of-risk'),
    comment: root.querySelector('#of-comment'),
    signals: root.querySelector('#of-signals'),
    price: root.querySelector('#of-price'),
    real: root.querySelector('#of-real'),
    mult: root.querySelector('#of-mult'),
    btnBuy: root.querySelector('#btn-buy'),
    btnHaggle: root.querySelector('#btn-haggle'),
    btnSkip: root.querySelector('#btn-skip'),
    btnInspect: root.querySelector('#btn-inspect')
  };

  offerUI.btnBuy.addEventListener('click', buy);
  offerUI.btnHaggle.addEventListener('click', haggle);
  offerUI.btnSkip.addEventListener('click', skip);
  offerUI.btnInspect.addEventListener('click', inspect);
}

function roundBand(n) { return Math.max(5000, Math.round(n / 5000) * 5000); }

function marketRange(center, confidence, fog, sellerNoise, skillPack) {
  var spread = [0.40, 0.28, 0.18, 0.11][confidence] || 0.22;
  spread += [0.00, 0.04, 0.08, 0.13][fog] || 0;
  spread += sellerNoise || 0;
  if (skillPack) spread -= (skillPack.analytics - 1) * 0.015;
  spread = clamp(spread, 0.09, 0.56);
  var lo = Math.round(center * (1 - spread));
  var hi = Math.round(center * (1 + spread));
  return { lo: Math.max(10000, lo), hi: Math.max(15000, hi) };
}

function liarClue() {
  return pick(['Слишком гладкая история', 'Чувствуется заготовленный текст', 'Отвечает быстро, но скользко', 'Кажется, что часть правды спрятана']);
}
function honestClue() {
  return pick(['Есть шанс на живую сделку', 'Похоже на честный вариант', 'Если не тупить — можно забрать спред', 'Есть ощущение, что машина реальная, но не без нюансов']);
}
function fogClue() {
  return pick(['Рынок сегодня шумный', 'Сигналы противоречат друг другу', 'По фоткам и словам картинка не до конца сходится', 'Сделка на чувство и холодную голову']);
}

function hiddenSeverity(cond, lvl, isScam, mood, archetype, skillPack) {
  var chance = 0.08 + (100 - cond) / 250 + (lvl - 1) * 0.05 + (mood.faultBias || 0) + (archetype.scamBias > 0 ? 0.05 : 0);
  if (isScam) chance += 0.22;
  chance -= (skillPack.mechanic - 1) * 0.02;
  chance = clamp(chance, 0.05, 0.62);
  if (Math.random() > chance) return 0;
  var top = 18000 + lvl * 6500 + Math.max(0, 72 - cond) * 140;
  top -= (skillPack.mechanic - 1) * 2200;
  return rnd(3500, Math.max(5000, top));
}

function classifyTell(archetype) {
  return clamp((archetype.honesty < 0.42 ? 3 : archetype.honesty < 0.55 ? 2 : archetype.honesty < 0.68 ? 1 : 0) + rnd(-1, 1), 0, 3);
}

function memoryKey(archetype, name, emoji) {
  return archetype.id + '|' + name + '|' + emoji;
}

function readMemoryText(signature) {
  ensureMetaState();
  var lore = GS.meta.sellerLore[signature];
  if (!lore || lore.seen < 2) return null;
  var score = (lore.good || 0) - (lore.bad || 0);
  if (score >= 2) return 'Память: раньше заходил честнее';
  if (score <= -2) return 'Память: уже подкидывал грязь';
  return 'Память: знакомый, но нераскрытый';
}

function signalTags(c) {
  var tags = [];
  tags.push('Уверенность: ' + CONFIDENCE_LABELS[c.confidence]);
  tags.push('Шум: ' + FOG_LABELS[c.fog]);
  tags.push('Манера: ' + TELL_LABELS[c.tellTone]);
  tags.push('Язык тела: ' + BODY_LABELS[c.bodyTell]);
  if (c.fakeSweetener) tags.push('Слишком сладко');
  if (c.marketPulse > 0.08) tags.push('Рынок дышит');
  else if (c.marketPulse < -0.08) tags.push('Спрос вязкий');
  else tags.push('Рынок плавает');
  if (c.memoryText) tags.push(c.memoryText);
  return tags;
}

function renderSignalStrip(c) {
  if (!offerUI || !offerUI.signals) return;
  offerUI.signals.innerHTML = signalTags(c).map(function(t){ return '<span class="signal-chip">' + t + '</span>'; }).join('');
}

function estimateVerdict(c) {
  var center = (c.estLo + c.estHi) / 2;
  var spread = (c.estHi - c.estLo) / Math.max(1, center);
  if (spread > 0.38) return 'Сделка на интуиции';
  if (spread > 0.24) return 'Можно читать, но есть шум';
  return 'Картина стала чище';
}

function revealHint(car) {
  var hints = [];
  if (car.hiddenFaultCost > 0) hints.push('🩹 Техника просит внимания');
  else hints.push('🔍 По технике выглядит спокойнее');

  if (car.liquidityShift > 0.06) hints.push('📈 Спрос на эту модель ожил');
  else if (car.liquidityShift < -0.06) hints.push('📉 Спрос сегодня вязкий');
  else hints.push('🧾 Ликвидность средняя');

  if (car.sellerProfile.honesty >= 0.62) hints.push('🙂 Продавец говорит ровно');
  else if (car.sellerProfile.honesty <= 0.42) hints.push('😶 Есть ощущение игры в слова');
  else hints.push('🤔 По продавцу — 50/50');

  return pick(hints);
}

function pickBuyer(car, skillPack) {
  var pool = BUYER_ARCHETYPES.slice();
  if (car.isLegendary || car.isRare) pool.push(BUYER_ARCHETYPES[2], BUYER_ARCHETYPES[4]);
  if (skillPack && skillPack.rep > 6) pool.push(BUYER_ARCHETYPES[4]);
  if (skillPack && skillPack.rep < -6) pool.push(BUYER_ARCHETYPES[1], BUYER_ARCHETYPES[3]);
  return pick(pool);
}

function actualResale(c, skillPack) {
  var buyer = pickBuyer(c, skillPack);
  var resale = c.rv;
  resale = Math.round(resale * (1 + c.marketMood.demand + c.liquidityShift + c.storySwing));
  resale = Math.round(resale * (1 + buyer.bonus + rnd(-100, 100) / 1000 + buyer.volatility * (Math.random() - 0.5)));
  if (c.fakeSweetener) resale = Math.round(resale * (1 - rnd(2, 8) / 100));
  resale -= c.hiddenFaultCost;
  if (Math.random() < c.varianceLucky) resale += rnd(5000, 26000);
  if (Math.random() < c.varianceBad) resale -= rnd(5000, 22000);
  if (c.isScam && Math.random() < 0.42) resale -= rnd(7000, 20000);
  resale += Math.round((skillPack.rep || 0) * 350);
  return { value: Math.max(8000, resale), buyer: buyer };
}

function genCar() {
  ensureMetaState();
  var skill = getSkillPack();
  var lvl = hiddenLevel();
  var archetype = pick(SELLER_ARCHETYPES);
  var mood = pick(MARKET_MOODS);
  var repMod = skill.rep * 0.004;
  var offerState = applyEventToOfferState({ scamChance: 0.12 + 0.035 * (lvl - 1) + archetype.scamBias - repMod, demandBonus: 0, sellBonus: 1, priceNoise: 0 });

  var scamChance = clamp(offerState.scamChance, 0.05, 0.42);
  var rareChance = clamp(0.09 - 0.010 * (lvl - 1) + Math.max(0, repMod * 0.5), 0.02, 0.10);
  var legendaryChance = clamp(0.02 - 0.004 * (lvl - 1) + Math.max(0, repMod * 0.2), 0.003, 0.025);

  var isScam = Math.random() < scamChance;
  var isLegendary = !isScam && Math.random() < legendaryChance;
  var isRare = !isScam && !isLegendary && Math.random() < rareChance;

  var weightedCars = cars.slice();
  if (mood.demand > 0.05) weightedCars = weightedCars.concat(cars.filter(function(x){ return (x.segment || 'mass') !== 'mass'; }));
  if (skill.rep > 5) weightedCars = weightedCars.concat(cars.filter(function(x){ return ['premium','business','collector'].indexOf(x.segment || '') >= 0; }));
  var picked = pick(weightedCars);
  if (!picked) picked = cars[0] || { id: 'default', n: 'Авто', e: '🚗', min: 100000, max: 300000 };
  var t = attachVehicleMeta(picked);
  var yr = rnd(2004, 2024);
  var age = 2024 - yr;
  var mi = age * rnd(9000, 26000 + 3500 * (lvl - 1));
  var classRisk = Number(t.risk || 0.18);
  var classLiquidity = Number(t.liquidity || 0.8);
  var cond = clamp(100 - age * rnd(3, 8 + lvl - 1) - Math.round(classRisk * 18) + Math.round(classLiquidity * 6) + rnd(-6, 6), 12, 100);

  var rv = rnd(t.min, t.max);
  rv = Math.round(rv * (1 - age * 0.02) * (cond / 100) * (0.92 + classLiquidity * 0.16) * (1 + offerState.demandBonus));
  if (isLegendary) rv = Math.round(rv * 1.55);
  if (isRare) rv = Math.round(rv * 1.10);

  var basePricePct;
  if (isScam) basePricePct = rnd(34, 72);
  else if (isLegendary) basePricePct = rnd(58, 84);
  else if (isRare) basePricePct = rnd(64, 90);
  else {
    var r = Math.random();
    var bargain = [0.26, 0.22, 0.18, 0.15, 0.12][lvl - 1] || 0.12;
    var fair = [0.36, 0.34, 0.31, 0.28, 0.26][lvl - 1] || 0.26;
    if (r < bargain) basePricePct = rnd(68, 92);
    else if (r < bargain + fair) basePricePct = rnd(92, 112 + 6 * (lvl - 1));
    else basePricePct = rnd(114 + 6 * (lvl - 1), 154 + 12 * (lvl - 1));
  }

  basePricePct += Math.round((0.5 - archetype.honesty) * 10) + rnd(-6, 7);
  basePricePct -= (skill.psychology - 1) * 1.2;
  var ap = Math.max(10000, Math.round(rv * basePricePct / 100));

  var honestyNoise = 1 - archetype.honesty;
  var tellTone = classifyTell(archetype);
  var bodyTell = clamp(tellTone + rnd(-1, 1), 0, 3);
  var confidence = clamp(
    (isLegendary ? 3 : 2) - (isScam ? 2 : 0) - (honestyNoise > 0.5 ? 1 : 0) + rnd(-1, 1) + (skill.intuition > 3 ? 1 : 0),
    0, 3
  );

  var fog = clamp(
    (mood.id === 'chaos' ? 2 : 0) + (honestyNoise > 0.45 ? 1 : 0) + (age > 12 ? 1 : 0) + rnd(0, 1) - Math.floor((skill.analytics - 1) / 2),
    0, 3
  );

  var hiddenRisk = clamp(
    (classRisk >= 0.28 ? 1 : 0) +
    (isScam ? 2 : 0) +
    (cond < 45 ? 1 : 0) +
    (age > 12 ? 1 : 0) +
    (mood.faultBias > 0 ? 1 : 0) +
    rnd(0, 1) - (skill.mechanic > 3 ? 1 : 0),
    0, 3
  );

  var marketPulse = clamp(mood.demand + rnd(-10, 10) / 100 + archetype.heat, -0.22, 0.22);
  var liquidityShift = clamp(marketPulse + (classLiquidity - 0.8) * 0.18 + rnd(-7, 7) / 100, -0.22, 0.22);
  var storySwing = clamp((isLegendary ? 0.07 : 0) + (isRare ? 0.03 : 0) + rnd(-7, 7) / 100, -0.14, 0.16);
  var fakeSweetener = (!isScam && honestyNoise > 0.45 && Math.random() < 0.28) || (isScam && Math.random() < 0.55);
  var misreadBias = fakeSweetener ? rnd(6, 15) / 100 : rnd(-6, 6) / 100;

  var hiddenFaultCost = hiddenSeverity(cond, lvl, isScam, mood, archetype, skill);
  var estimateCenter = rv * (1 + liquidityShift * 0.42 + storySwing * 0.32 + rnd(-9, 9) / 100);
  estimateCenter *= 1 + (honestyNoise > 0.5 ? rnd(-14, 12) / 100 : rnd(-7, 7) / 100);
  estimateCenter *= 1 + misreadBias;
  estimateCenter *= 1 + (skill.analytics - 1) * 0.01;

  var estRange = marketRange(estimateCenter, confidence, fog, archetype.volatility + mood.priceNoise * 0.35 + offerState.priceNoise + (fakeSweetener ? 0.05 : 0), skill);
  estRange.lo = roundBand(estRange.lo);
  estRange.hi = roundBand(estRange.hi);

  var cm = isScam ? pick(scamComments) : isLegendary ? pick(legendaryComments) : pick(comments);
  var sn = isScam ? pick(scamNames) : isLegendary ? pick(legendaryNames) : pick(names);
  var sa = isScam ? pick(scamAvas) : isLegendary ? pick(legendaryAvas) : pick(avas);
  var memory = readMemoryText(memoryKey(archetype, sn, t.e));

  var clue;
  if (isScam || archetype.honesty < 0.42) clue = liarClue();
  else if (fog >= 2) clue = fogClue();
  else clue = honestClue();

  return attachVehicleMeta({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    carId: t.id,
    assetId: t.id,
    n: t.n,
    e: t.e,
    yr: yr,
    mi: mi,
    cond: cond,
    ap: ap,
    rv: rv,
    cm: cm,
    sn: sn,
    sa: sa,
    memoryKey: memoryKey(archetype, sn, t.e),
    memoryText: memory,
    isScam: isScam,
    isRare: isRare,
    isLegendary: isLegendary,
    confidence: confidence,
    fog: fog,
    hiddenRisk: hiddenRisk,
    liquidityShift: liquidityShift,
    storySwing: storySwing,
    hiddenFaultCost: hiddenFaultCost,
    estLo: estRange.lo,
    estHi: estRange.hi,
    clue: clue,
    inspected: false,
    revealCount: 0,
    tellTone: tellTone,
    bodyTell: bodyTell,
    fakeSweetener: fakeSweetener,
    marketPulse: marketPulse,
    sellerProfile: archetype,
    marketMood: mood,
    buyerBias: pick(BUYER_ARCHETYPES).id,
    varianceLucky: clamp(0.05 + (isRare ? 0.05 : 0) + (isLegendary ? 0.06 : 0) + Math.max(0, liquidityShift), 0.04, 0.24),
    varianceBad: clamp(0.06 + (fog * 0.04) + (hiddenRisk >= 2 ? 0.05 : 0) + Math.max(0, -liquidityShift) + (fakeSweetener ? 0.03 : 0), 0.05, 0.28),
    historyTag: pick(['1 владелец','Парк компании','Гаражное хранение','Машина выходного дня','Свежий окрас','Бывшее такси'])
  });
}

function renderOffer() {
  var c = S.cur;
  if (!offerUI) initOfferDom();
  if (!offerUI) return;

  var mult = getComboMult();
  var speedB = getSpeedBonus();

  offerUI.root.className = 'offer';
  offerUI.badge.style.display = 'none';
  offerUI.badge.className = 'offer-badge';

  if (c.isLegendary) {
    offerUI.root.classList.add('legendary');
    offerUI.badge.style.display = 'block';
    offerUI.badge.classList.add('legendary');
    offerUI.badge.textContent = '💎 ЛЕГЕНДА';
  } else if (c.isRare) {
    offerUI.root.classList.add('rare');
    offerUI.badge.style.display = 'block';
    offerUI.badge.classList.add('gold');
    offerUI.badge.textContent = '🌟 РЕДКАЯ';
  } else if (c.isScam) {
    offerUI.root.classList.add('scam');
    offerUI.badge.style.display = 'block';
    offerUI.badge.classList.add('scam');
    offerUI.badge.textContent = '🚨 МУТНО';
  }

  offerUI.ava.textContent = c.sa;
  offerUI.seller.textContent = c.sn;
  offerUI.status.textContent = c.sellerProfile.title + ' • ' + CONFIDENCE_LABELS[c.confidence] + ' • ' + FOG_LABELS[c.fog];
  renderSignalStrip(c);

  offerUI.emoji.textContent = c.e;
  offerUI.name.textContent = c.n;
  offerUI.sub.textContent = c.yr + ' • ' + fmt(c.mi) + 'км • ' + c.marketMood.title + ' • ' + c.historyTag;

  offerUI.cond.textContent = c.cond + '%';
  offerUI.cond.className = 'spec-val ' + (c.cond > 72 ? 'good' : c.cond > 42 ? 'med' : 'bad');
  offerUI.risk.textContent = RISK_LABELS[c.hiddenRisk];
  offerUI.risk.className = 'spec-val ' + (c.hiddenRisk <= 1 ? 'good' : c.hiddenRisk === 2 ? 'med' : 'bad');

  offerUI.comment.textContent = '💬 "' + c.cm + '" • ' + c.clue + (c.fakeSweetener ? ' • слишком уж красиво' : '') + (S.activeEvent ? ' • ' + S.activeEvent.text : '');
  offerUI.price.textContent = fmt(c.ap) + '₽';

  var estimateText = 'Оценка рынка: ~' + fmt(c.estLo) + '–' + fmt(c.estHi) + '₽ • ' + estimateVerdict(c);
  if (c.inspected) estimateText += ' • ' + revealHint(c);
  offerUI.real.textContent = estimateText;
  offerUI.real.className = 'price-real';

  if (mult > 1 || speedB > 0) {
    offerUI.mult.style.display = 'block';
    offerUI.mult.textContent = '🔥x' + mult + ' ⚡+' + speedB + '%';
  } else {
    offerUI.mult.style.display = 'none';
  }

  offerUI.btnHaggle.disabled = (S.lives <= 0);
}

function popup(ok, am, text, bonus, extraClass) {
  text = text || (ok ? 'СДЕЛКА!' : 'УБЫТОК');
  var p = document.getElementById('popup');
  document.getElementById('p-icon').textContent = ok ? '✅' : '😬';
  document.getElementById('p-text').textContent = text;
  document.getElementById('p-amt').textContent = (am >= 0 ? '+' : '') + fmt(am) + '₽';
  document.getElementById('p-amt').className = 'popup-amt ' + (ok ? 'profit' : 'loss');
  document.getElementById('p-bonus').textContent = bonus || '';
  p.className = 'popup active' + (ok ? '' : ' loss') + (extraClass ? ' ' + extraClass : '');
  setTimeout(function() { p.classList.remove('active'); }, 900);
}

function updS() {
  var tm = document.getElementById('timer');
  tm.textContent = Math.max(0, Math.ceil(S.t / 10));
  tm.className = 'timer' + (S.t <= 100 ? ' critical' : '');

  document.getElementById('s-money').textContent = fmt(S.m);
  document.getElementById('s-lives').textContent = S.lives;

  var mult = getComboMult();
  document.getElementById('s-combo').textContent = 'x' + mult;
  document.getElementById('combo-mult').textContent = 'x' + mult;

  var cb = document.getElementById('combo-box');
  cb.className = S.combo >= 3 ? 'combo-display' + (S.combo >= 7 ? ' fire' : '') : 'combo-display inactive';
  document.getElementById('combo-fill').style.width = (S.comboTimer / 3) * 100 + '%';

  var hearts = '';
  for (var i = 0; i < 5; i++) hearts += i < S.lives ? '❤️' : '🖤';
  document.getElementById('lives-hearts').textContent = hearts;

  var speedB = getSpeedBonus();
  var sv = document.getElementById('speed-val');
  sv.textContent = '+' + speedB + '%';
  sv.className = 'speed-val' + (speedB >= 30 ? ' hot' : '');
  document.getElementById('speed-fill').style.width = Math.max(0, (1 - S.offerTime / 5) * 100) + '%';

  document.getElementById('rs-deals').textContent = S.d;
  document.getElementById('rs-profit').textContent = fmt(S.m) + '₽';

  if (S.comboTimer <= 0 && S.combo > 0) S.combo = 0;
}

function finishMetaRound() {
  ensureMetaState();
  GS.meta.runs60 += 1;
  GS.meta.bestStreak = Math.max(GS.meta.bestStreak || 0, S.maxCombo || 0);
  saveGlobalStats();
}

function endRound(reason) {
  if (S.iv) { clearInterval(S.iv); S.iv = null; }

  var isRecord = S.m > S.best;
  if (isRecord) {
    S.best = S.m;
    setPB(S.best);
    GS.bestScore = Math.max(GS.bestScore, S.m);
  }

  if (S.m >= 100000) unlockById('profit_100k');
  if (S.m >= 500000) unlockById('profit_500k');
  if (S.truthfulReads >= 5) unlockById('mind_reader');

  finishMetaRound();
  saveGlobalStats();

  document.getElementById('ingame').style.display = 'none';
  document.getElementById('endgame').style.display = 'flex';
  document.getElementById('e-deals').textContent = S.d;
  var ep = document.getElementById('e-profit');
  ep.textContent = fmt(S.m) + '₽';
  ep.className = 'estat-val' + (isRecord ? ' record' : '');
  document.getElementById('e-combo').textContent = 'x' + (S.maxCombo >= 12 ? 5 : S.maxCombo >= 8 ? 4 : S.maxCombo >= 5 ? 3 : S.maxCombo >= 3 ? 2 : 1);

  if (reason === 'lives') {
    document.getElementById('end-reason').textContent = '💔 Попытки кончились!';
    document.getElementById('end-title').textContent = 'ПРОВАЛ!';
    document.getElementById('end-title').className = 'end-title lose';
    document.getElementById('end-icon').textContent = '💀';
  } else {
    var w = S.m > 50000;
    var epic = S.m > 300000;
    document.getElementById('end-title').textContent = epic ? 'ЛЕГЕНДА!' : S.m > 150000 ? 'КРАСАВА!' : w ? 'НОРМ!' : 'В МИНУСЕ';
    document.getElementById('end-title').className = 'end-title ' + (epic ? 'epic' : w ? 'win' : 'lose');
    document.getElementById('end-icon').textContent = epic ? '👑' : S.m > 150000 ? '🏆' : w ? '👍' : '😢';
    document.getElementById('end-reason').textContent = '⏱️ Время! ' + (S.marketEvent ? S.marketEvent.vibe : '') + (isRecord ? ' 🎉 РЕКОРД!' : '');
  }
  updatePregameMeta();
}

function newOffer() {
  if (!S.marketEvent) S.marketEvent = pick(MARKET_MOODS);
  S.cur = genCar();
  // lightly bias to round market event
  S.cur.marketMood = S.marketEvent;
  S.offerTime = 0;
  S.haggling = false;
  renderOffer();
}

function overlayHaggle(icon, title, sub) {
  var host = document.getElementById('offer');
  if (!host) return;
  var old = host.querySelector('.haggle-result');
  if (old) old.remove();
  var el = document.createElement('div');
  el.className = 'haggle-result';
  el.innerHTML = '<div class="haggle-icon">' + icon + '</div><div class="haggle-text">' + title + '</div><div class="haggle-sub">' + sub + '</div>';
  host.appendChild(el);
  setTimeout(function() { el.remove(); }, 1000);
}

// 🚨 СЛУЧАЙНЫЕ СОБЫТИЯ
var RANDOM_EVENTS = [
  { id: 'police', chance: 0.04, text: '🚔 Проверка документов!', effect: 'heat', value: 1.3 },
  { id: 'stolen', chance: 0.02, text: '🚨 Машина в угоне!', effect: 'scam_boost', value: 0.15 },
  { id: 'tax', chance: 0.03, text: '📋 Налоговая проверка', effect: 'cost', value: 0.1 },
  { id: 'rich_week', chance: 0.05, text: '💎 Неделя богатых клиентов', effect: 'bonus', value: 1.15 },
  { id: 'parts_shortage', chance: 0.04, text: '🔧 Дефицит запчастей', effect: 'repair_cost', value: 1.25 },
  { id: 'demand_surge', chance: 0.05, text: '📈 Всплеск спроса!', effect: 'demand', value: 1.12 }
];

function rollRandomEvent() {
  for (var i = 0; i < RANDOM_EVENTS.length; i++) {
    var ev = RANDOM_EVENTS[i];
    if (Math.random() < ev.chance) {
      S.activeEvent = ev;
      return ev;
    }
  }
  S.activeEvent = null;
  return null;
}


function applyEventToOfferState(state) {
  var ev = S.activeEvent;
  if (!ev || !state) return state;
  if (ev.effect === 'scam_boost') state.scamChance += ev.value;
  if (ev.effect === 'demand') state.demandBonus += (ev.value - 1);
  if (ev.effect === 'bonus') state.sellBonus *= ev.value;
  if (ev.effect === 'heat') state.priceNoise += 0.04;
  return state;
}

function getDealTimeBonus(finalProfit, car) {
  var bonus = 0;
  if (finalProfit >= 120000) bonus += 5;
  else if (finalProfit >= 60000) bonus += 3;
  else if (finalProfit >= 15000) bonus += 2;
  else if (finalProfit < 0) bonus -= 2;
  if (car && car.isLegendary) bonus += 2;
  else if (car && car.isRare) bonus += 1;
  if (S.combo >= 3) bonus += 1;
  return clamp(bonus, -3, 7);
}

function addRoundTime(seconds) {
  if (!seconds) return;
  S.t = clamp(S.t + seconds * 10, 0, 600);
}

function getInspectCost() {
  var skills = getSkillPack();
  var cost = INSPECT_COST - (skills.mechanic - 1) * 700;
  if (S.activeEvent && S.activeEvent.effect === 'repair_cost') cost = Math.round(cost * S.activeEvent.value);
  return Math.max(2000, Math.round(cost));
}

function showEventToast(ev) {
  if (!ev) return;
  var toast = document.createElement('div');
  toast.className = 'event-toast';
  toast.innerHTML = '<div class="event-icon">' + ev.text.split(' ')[0] + '</div><div class="event-text">' + ev.text + '</div>';
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('show'); }, 50);
  setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, 2500);
}

export function startSixty() {
  enterFullscreen();
  show('sixty-screen');
  document.getElementById('pregame').style.display = 'flex';
  document.getElementById('ingame').style.display = 'none';
  document.getElementById('endgame').style.display = 'none';
  document.getElementById('s-best').textContent = fmt(S.best);
  updatePregameMeta();
}

export function startRound() {
  enterFullscreen();
  resetSKeepBuys();
  S.marketEvent = pick(MARKET_MOODS);
  S.activeEvent = null;
  
  // Проверяем случайное событие
  var ev = rollRandomEvent();
  if (ev) showEventToast(ev);
  
  document.getElementById('pregame').style.display = 'none';
  document.getElementById('endgame').style.display = 'none';
  document.getElementById('ingame').style.display = 'flex';
  newOffer();
  updS();

  var last = performance.now();
  S.iv = setInterval(function() {
    var now = performance.now();
    var dt = Math.min(0.2, (now - last) / 1000);
    last = now;
    S.t -= dt * 10;
    S.comboTimer = Math.max(0, S.comboTimer - dt);
    S.offerTime = Math.min(5, S.offerTime + dt);
    updS();
    if (S.t <= 0) endRound('time');
  }, 100);
}

export function stopSixtyInterval() {
  if (S.iv) { clearInterval(S.iv); S.iv = null; }
}

export function buy() {
  if (S.haggling) return;
  var c = S.cur;
  if (!c) return;
  var skills = getSkillPack();

  if (c.isScam && Math.random() < 0.72) {
    var scamLoss = rnd(7000, 32000);
    S.lives = Math.max(0, S.lives - 2);
    S.combo = 0; S.comboTimer = 0;
    noteSellerMemory(c.memoryKey, 'bad');
    addMetaProgress('intuition', 1);
    adjustStreetRep(-1);
    popup(false, -scamLoss, 'КИДАЛА!', '💣 Деньги улетели', 'loss');
    vibrate(200);
    saveGlobalStats();
    if (S.lives <= 0) return endRound('lives');
    newOffer(); updS();
    return;
  }

  var resalePack = actualResale(c, skills);
  var resale = resalePack.value;
  if (S.activeEvent && S.activeEvent.effect === 'bonus') resale = Math.round(resale * S.activeEvent.value);
  if (S.activeEvent && S.activeEvent.effect === 'demand') resale = Math.round(resale * S.activeEvent.value);
  var buyer = resalePack.buyer;
  var baseProfit = resale - c.ap;
  var mult = getComboMult();
  var speedB = getSpeedBonus();
  var finalProfit = Math.round(baseProfit * mult * (1 + speedB / 100));

  var timeBonus = getDealTimeBonus(finalProfit, c);
  addRoundTime(timeBonus);
  S.m += finalProfit;
  S.d += 1;
  S.combo += 1;
  S.comboTimer = 3;
  S.maxCombo = Math.max(S.maxCombo, S.combo);
  if (S.offerTime <= 1.0) S.speedDeals += 1; else S.speedDeals = 0;

  if (S.maxCombo >= 5) unlockById('combo_5');
  if (S.maxCombo >= 7) unlockById('combo_7');
  if (c.isLegendary) unlockById('legendary');
  if (S.speedDeals >= 5) unlockById('speed_demon');

  GS.totalDeals += 1;
  GS.totalProfit += finalProfit;

  if (finalProfit >= 0) {
    noteSellerMemory(c.memoryKey, 'good');
    adjustStreetRep(1);
    addMetaProgress('analytics', 1);
    addMetaProgress('psychology', c.inspected ? 2 : 1);
    if (c.hiddenRisk >= 2 || c.isScam) {
      S.truthfulReads += 1;
      addMetaProgress('intuition', 2);
    }
  } else {
    noteSellerMemory(c.memoryKey, 'bad');
    adjustStreetRep(-1);
    addMetaProgress('mechanic', 1);
  }

  saveGlobalStats();

  var notes = [];
  if (c.hiddenFaultCost > 0) notes.push('🩹 скрытый дефект -' + fmt(c.hiddenFaultCost) + '₽');
  if (c.liquidityShift > 0.06) notes.push('📈 рынок подхватил');
  if (c.liquidityShift < -0.06) notes.push('📉 рынок зажал');
  notes.push('👤 ' + BUYER_LABELS[buyer.id]);
  if (mult > 1) notes.push('🔥x' + mult);
  if (speedB > 0) notes.push('⚡+' + speedB + '%');
  if (timeBonus) notes.push((timeBonus > 0 ? '⏱️ +' : '⌛ ') + timeBonus + 'с');

  popup(finalProfit >= 0, finalProfit, finalProfit >= 0 ? 'ПЕРЕПРОДАЖА!' : 'НЕУДАЧНАЯ СДЕЛКА', notes.join(' • '));
  vibrate(35);

  S.buys += 1;
  newOffer();
  updS();
}

export function haggle() {
  if (S.haggling || S.lives <= 0) return;
  var c = S.cur;
  if (!c) return;
  var skills = getSkillPack();

  S.haggling = true;
  S.lives -= 1;
  updS();

  var lvl = hiddenLevel();
  var baseFail = 0.26 + (lvl - 1) * 0.05 + (1 - c.sellerProfile.haggle) * 0.18 + (c.isScam ? 0.10 : 0.0);
  baseFail -= (skills.psychology - 1) * 0.03;
  var failChance = clamp(baseFail, 0.18, 0.78);

  if (Math.random() < failChance) {
    if (Math.random() < 0.35) {
      var oldPrice = c.ap;
      c.ap = Math.round(c.ap * (1 + rnd(1, 4) / 100));
      overlayHaggle('😤', 'Перегнул', fmt(oldPrice) + '₽ → ' + fmt(c.ap) + '₽');
    } else {
      overlayHaggle('😬', 'Не получилось', 'Продавец упёрся');
    }
    vibrate(60);
    addRoundTime(-1);
    S.combo = 0; S.comboTimer = 0;
    addMetaProgress('psychology', 1);
  } else {
    var old = c.ap;
    var disc = rnd(4, Math.max(5, Math.round(16 * c.sellerProfile.haggle) + 6 + (skills.psychology - 1) * 2));
    c.ap = Math.max(1000, Math.round(c.ap * (1 - disc / 100)));
    c.inspected = true;
    c.revealCount += 1;
    c.confidence = Math.min(3, c.confidence + 1);
    addMetaProgress('psychology', 2);

    if (Math.random() < 0.60) {
      var tighten = 0.04 + Math.random() * 0.06 + (skills.analytics - 1) * 0.01;
      c.estLo = roundBand(c.estLo * (1 + tighten));
      c.estHi = roundBand(c.estHi * (1 - tighten));
      if (c.estHi < c.estLo) c.estHi = c.estLo + 5000;
      if (c.fakeSweetener && Math.random() < 0.35) overlayHaggle('🪤', 'Подсказка мутная', fmt(old) + '₽ → ' + fmt(c.ap) + '₽');
      else overlayHaggle('🧠', 'Торг + инфа', fmt(old) + '₽ → ' + fmt(c.ap) + '₽');
    } else {
      overlayHaggle('🤝', 'Скидка -' + disc + '%', fmt(old) + '₽ → ' + fmt(c.ap) + '₽');
    }
    addRoundTime(1);
    vibrate(40);
  }

  S.haggling = false;
  if (S.lives <= 0) return endRound('lives');
  renderOffer();
  updS();
}

export function skip() {
  if (S.haggling) return;
  var c = S.cur;
  if (c && c.isScam) {
    addRoundTime(2);
    unlockById('scam_dodge');
    S.truthfulReads += 1;
    addMetaProgress('intuition', 2);
    adjustStreetRep(1);
  } else {
    addMetaProgress('analytics', 1);
  }
  noteSellerMemory(c.memoryKey, 'skip');
  saveGlobalStats();
  S.combo = 0;
  S.comboTimer = 0;
  newOffer();
  updS();
}

// 🔍 ДИАГНОСТИКА — платная проверка скрытых дефектов
var INSPECT_COST = 5000;
export function inspect() {
  if (S.haggling) return;
  var c = S.cur;
  if (!c || c.inspected) return;
  
  // Проверяем есть ли деньги (через сумму текущего раунда)
  var inspectCost = getInspectCost();
  if (S.m < inspectCost) {
    popup(false, -inspectCost, 'НЕТ ДЕНЕГ!', 'нужно ' + fmt(inspectCost) + '₽');
    vibrate(50);
    return;
  }
  
  S.m -= inspectCost;
  c.inspected = true;
  
  // Навык механика снижает стоимость и улучшает результат
  addMetaProgress('mechanic', 3);
  
  // Показываем результат
  var hint = revealHint(c);
  var isClean = c.hiddenDamage <= 0 && !c.isScam;
  addRoundTime(isClean ? 1 : 2);
  popup(isClean, -inspectCost, isClean ? 'ЧИСТО!' : 'ПРОБЛЕМЫ!', hint + ' • диагностика ' + fmt(inspectCost) + '₽');
  vibrate(isClean ? 20 : 80);
  
  renderOffer();
  updS();
}
