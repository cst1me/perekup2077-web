// PEREKUP 2077 — 60 seconds mode v5.2 turbo growth
import { fmt, rnd, pick, clamp, toast, vibrate, enterFullscreen } from '../core/utils.js';
import { comments, scamComments, legendaryComments, cars, names, scamNames, legendaryNames, avas, scamAvas, legendaryAvas } from '../core/data.js';
import { S, G, resetSKeepBuys, hiddenLevel, getHiddenDifficultyProfile, GS, saveGlobalStats, setPB, ACHIEVEMENTS, showAchievement, persistGameState } from '../core/state.js';
import { show } from '../ui/screens.js';
import { getCrystals, spendCrystals } from '../core/monetization.js';

var offerUI = null;
var boostModalOpen = false;

const PHASES = {
  warmup: { id: 'warmup', label: 'WARMUP', status: 'Спокойный рынок', className: '', scam: 0.03, rare: 0.06, legendary: 0.01, vip: 0.00 },
  hot: { id: 'hot', label: 'HOT MARKET', status: 'Рынок кипит', className: 'hot', scam: 0.10, rare: 0.14, legendary: 0.03, vip: 0.04 },
  final: { id: 'final', label: 'FINAL RUSH', status: 'Финальный рывок', className: 'final', scam: 0.22, rare: 0.20, legendary: 0.12, vip: 0.18 }
};

function getPhaseByTime() {
  var sec = Math.max(0, Math.ceil(S.t / 10));
  if (sec >= 40) return PHASES.warmup;
  if (sec >= 11) return PHASES.hot;
  return PHASES.final;
}

function getSpeedBonus() {
  var base = 0;
  if (S.offerTime <= 1.5) base = 50;
  else if (S.offerTime <= 3) base = 25;
  else if (S.offerTime <= 4) base = 10;
  var phase = getPhaseByTime();
  if (phase.id === 'hot') base += 10;
  if (phase.id === 'final') base += 20;
  return base;
}

function getComboMult() {
  if (S.combo >= 10) return 5;
  if (S.combo >= 7) return 4;
  if (S.combo >= 5) return 3;
  if (S.combo >= 3) return 2;
  return 1;
}

function ensureOfferDom() {
  if (offerUI) return offerUI;
  var root = document.getElementById('offer');
  if (!root) return null;
  root.innerHTML = '' +
    '<div class="offer-badge" id="of-badge" style="display:none"></div>' +
    '<div class="offer-top"></div>' +
    '<div class="offer-content">' +
      '<div class="seller">' +
        '<div class="seller-ava" id="of-ava">👤</div>' +
        '<div>' +
          '<div class="seller-name" id="of-seller">—</div>' +
          '<div class="seller-status" id="of-status">—</div>' +
          '<div class="offer-phase" id="of-phase">WARMUP</div>' +
        '</div>' +
      '</div>' +
      '<div class="car-row">' +
        '<div class="car-emoji" id="of-emoji">🚗</div>' +
        '<div class="car-info">' +
          '<div class="car-name" id="of-name">—</div>' +
          '<div class="car-year" id="of-sub">—</div>' +
          '<div class="car-specs">' +
            '<div class="spec"><div class="spec-lbl">Сост.</div><div class="spec-val" id="of-cond">—</div></div>' +
            '<div class="spec"><div class="spec-lbl">Торг</div><div class="spec-val" id="of-temper">—</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="comment" id="of-comment">—</div>' +
      '<div class="inspect-result" id="of-inspect" style="display:none"></div>' +
      '<div class="price-row">' +
        '<div class="price-info">' +
          '<div class="price-lbl">ЦЕНА</div>' +
          '<div class="price-val" id="of-price">0₽</div>' +
          '<div class="price-real" id="of-real">~0₽</div>' +
          '<div class="multiplier-preview" id="of-mult" style="display:none"></div>' +
        '</div>' +
        '<div class="offer-btns">' +
          '<button class="obtn obtn-buy" id="btn-buy" title="Купить">✅</button>' +
          '<button class="obtn obtn-haggle" id="btn-haggle" title="Торг">🤝</button>' +
          '<button class="obtn obtn-inspect" id="btn-inspect" title="Проверить">🔍</button>' +
          '<button class="obtn obtn-skip" id="btn-skip" title="Пропустить">❌</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  offerUI = {
    root: root,
    badge: root.querySelector('#of-badge'),
    ava: root.querySelector('#of-ava'),
    seller: root.querySelector('#of-seller'),
    status: root.querySelector('#of-status'),
    phase: root.querySelector('#of-phase'),
    emoji: root.querySelector('#of-emoji'),
    name: root.querySelector('#of-name'),
    sub: root.querySelector('#of-sub'),
    cond: root.querySelector('#of-cond'),
    temper: root.querySelector('#of-temper'),
    comment: root.querySelector('#of-comment'),
    inspect: root.querySelector('#of-inspect'),
    price: root.querySelector('#of-price'),
    real: root.querySelector('#of-real'),
    mult: root.querySelector('#of-mult'),
    btnBuy: root.querySelector('#btn-buy'),
    btnHaggle: root.querySelector('#btn-haggle'),
    btnInspect: root.querySelector('#btn-inspect'),
    btnSkip: root.querySelector('#btn-skip')
  };

  offerUI.btnBuy.addEventListener('click', buy);
  offerUI.btnHaggle.addEventListener('click', haggle);
  offerUI.btnInspect.addEventListener('click', inspectOffer);
  offerUI.btnSkip.addEventListener('click', skip);
  return offerUI;
}

function getTemperText(temper) {
  if (temper === 'soft') return 'Настроен на торг';
  if (temper === 'hard') return 'Упёртый';
  return 'Спешит';
}

function getTemperDiscountRange(temper) {
  if (temper === 'soft') return [10, 20];
  if (temper === 'hard') return [3, 9];
  return [6, 14];
}

function getTemperSuccessChance(car) {
  var profile = getHiddenDifficultyProfile();
  if (car.isScam) {
    if (car.temper === 'soft') return 0.32;
    if (car.temper === 'hard') return 0.10;
    return 0.20;
  }
  if (car.temper === 'soft') return Math.max(0.65, 0.82 - profile.sixtyHardSellerBonus * 0.4);
  if (car.temper === 'hard') return Math.max(0.18, 0.34 - profile.sixtyHardSellerBonus * 0.5);
  return Math.max(0.35, 0.58 - profile.sixtyHardSellerBonus * 0.35);
}

function buildCar(phase) {
  var lvl = hiddenLevel();
  var profile = getHiddenDifficultyProfile();
  var t = pick(cars);
  var CURRENT_YEAR = new Date().getFullYear();
  var yr = rnd(2005, CURRENT_YEAR);
  var age = CURRENT_YEAR - yr;
  var vipBuyer = phase.id === 'final' && !S.vipBuyerSpawned && Math.random() < phase.vip;
  var isScam = !vipBuyer && Math.random() < clamp(phase.scam + 0.02 * (lvl - 1) + profile.sixtyScamBonus, 0, 0.40);
  var isLegendary = !vipBuyer && !isScam && Math.random() < clamp(phase.legendary + (phase.id === 'final' ? 0.03 : 0), 0, 0.20);
  var isRare = !vipBuyer && !isScam && !isLegendary && Math.random() < clamp(phase.rare, 0, 0.26);
  var mi = age * rnd(9000, 24000 + 2500 * (lvl - 1));
  var cond = clamp(100 - age * rnd(3, 7 + lvl - 1), 15, 100);
  var rv = rnd(t.min, t.max);
  rv = Math.round(rv * (1 - age * 0.02) * (cond / 100));
  if (isRare) rv = Math.round(rv * 1.18);
  if (isLegendary) rv = Math.round(rv * 1.55);
  if (vipBuyer) rv = Math.round(rv * 1.95);

  var ap;
  if (isScam) ap = Math.round((rv * rnd(36, 56)) / 100);
  else if (vipBuyer) ap = Math.round((rv * rnd(34, 46)) / 100);
  else if (isLegendary) ap = Math.round((rv * rnd(38, 54)) / 100);
  else if (isRare) ap = Math.round((rv * rnd(44, 62)) / 100);
  else {
    var r = Math.random();
    var bargain = phase.id === 'warmup' ? 0.45 : phase.id === 'hot' ? 0.34 : 0.26;
    var fair = phase.id === 'warmup' ? 0.35 : 0.34;
    if (r < bargain) ap = Math.round((rv * rnd(62, 84)) / 100);
    else if (r < bargain + fair) ap = Math.round((rv * rnd(92, 114 + 4 * (lvl - 1))) / 100);
    else ap = Math.round((rv * rnd(120 + 6 * (lvl - 1), 148 + 8 * (lvl - 1))) / 100);
  }

  var temperRoll = Math.random();
  var hardLine = Math.max(0.52, (phase.id === 'final' ? 0.65 : 0.78) - profile.sixtyHardSellerBonus);
  var softLine = Math.max(0.18, (phase.id === 'warmup' ? 0.45 : 0.25) - profile.sixtyHardSellerBonus * 0.3);
  var temper = temperRoll < softLine ? 'soft' : temperRoll > hardLine ? 'hard' : 'normal';
  if (vipBuyer) temper = 'soft';
  if (isScam && Math.random() < 0.6) temper = 'hard';

  var cm = isScam ? pick(scamComments) : isLegendary ? pick(legendaryComments) : pick(comments);
  var sn = vipBuyer ? 'VIP Buyer' : isScam ? pick(scamNames) : isLegendary ? pick(legendaryNames) : pick(names);
  var sa = vipBuyer ? '💼' : isScam ? pick(scamAvas) : isLegendary ? pick(legendaryAvas) : pick(avas);
  if (vipBuyer) S.vipBuyerSpawned = true;

  return {
    id: Date.now() + Math.random(),
    n: vipBuyer ? t.n + ' — VIP' : t.n,
    e: vipBuyer ? '🛸' : t.e,
    yr: yr,
    mi: mi,
    cond: cond,
    ap: ap,
    rv: rv,
    cm: cm,
    sn: sn,
    sa: sa,
    isScam: isScam,
    isRare: isRare,
    isLegendary: isLegendary,
    vipBuyer: vipBuyer,
    phaseId: phase.id,
    temper: temper,
    temperText: getTemperText(temper)
  };
}

function genCar() {
  var phase = getPhaseByTime();
  S.phase = phase.id;
  return buildCar(phase);
}

function renderOffer() {
  var c = S.cur;
  var ui = ensureOfferDom();
  if (!c || !ui) return;

  var phase = getPhaseByTime();
  var pr = c.rv - c.ap;
  var pct = c.ap ? Math.round((pr / c.ap) * 100) : 0;
  var mult = getComboMult();
  var speedB = getSpeedBonus();

  ui.root.className = 'offer';
  ui.badge.style.display = 'none';
  ui.badge.className = 'offer-badge';

  if (c.vipBuyer) {
    ui.root.classList.add('vip-buyer');
    ui.badge.style.display = 'block';
    ui.badge.classList.add('gold');
    ui.badge.textContent = '💼 VIP BUYER';
  } else if (c.isLegendary) {
    ui.root.classList.add('legendary');
    ui.badge.style.display = 'block';
    ui.badge.classList.add('legendary');
    ui.badge.textContent = '💎 ЛЕГЕНДА';
  } else if (c.isRare) {
    ui.root.classList.add('rare');
    ui.badge.style.display = 'block';
    ui.badge.classList.add('gold');
    ui.badge.textContent = '🌟 РЕДКАЯ';
  } else if (c.isScam) {
    ui.root.classList.add('scam');
    ui.badge.style.display = 'block';
    ui.badge.classList.add('scam');
    ui.badge.textContent = '🚨 ???';
  }
  if (phase.id === 'final') ui.root.classList.add('final-rush');

  ui.ava.textContent = c.sa;
  ui.ava.className = 'seller-ava temper-' + c.temper;
  ui.seller.textContent = c.sn;
  ui.status.textContent = c.temperText;
  ui.status.className = 'seller-status temper-' + c.temper;
  ui.phase.textContent = phase.label;
  ui.phase.className = 'offer-phase ' + phase.className;
  ui.emoji.textContent = c.e;
  ui.name.textContent = c.n;
  ui.sub.textContent = c.yr + ' • ' + fmt(c.mi) + 'км';
  ui.cond.textContent = c.cond + '%';
  ui.cond.className = 'spec-val ' + (c.cond > 70 ? 'good' : c.cond > 40 ? 'med' : 'bad');
  ui.temper.textContent = c.temper === 'soft' ? 'SOFT' : c.temper === 'hard' ? 'HARD' : 'NORMAL';
  ui.temper.className = 'spec-val ' + (c.temper === 'soft' ? 'good' : c.temper === 'hard' ? 'bad' : 'med');
  ui.comment.textContent = '💬 "' + c.cm + '"';
  ui.price.textContent = fmt(c.ap) + '₽';
  ui.real.textContent = '~' + fmt(c.rv) + '₽ (' + (pr >= 0 ? '+' : '') + pct + '%)';
  ui.real.className = 'price-real ' + (pr >= 0 ? 'profit' : 'loss');

  if (S.inspected) {
    ui.inspect.style.display = 'block';
    ui.inspect.textContent = S.inspectResult;
    ui.inspect.className = 'inspect-result ' + (c.isScam ? 'scam' : 'clean');
  } else {
    ui.inspect.style.display = 'none';
  }

  if (mult > 1 || speedB > 0 || S.nextProfitMult > 1) {
    ui.mult.style.display = 'block';
    ui.mult.textContent = '🔥x' + mult + ' ⚡+' + speedB + '%' + (S.nextProfitMult > 1 ? ' 🎯x' + S.nextProfitMult.toFixed(1) : '');
  } else {
    ui.mult.style.display = 'none';
  }

  ui.btnBuy.disabled = !!S.inspectLock;
  ui.btnHaggle.disabled = (S.lives <= 0) || !!S.inspectLock;
  ui.btnInspect.disabled = !!S.inspectLock || S.inspected;
  ui.btnSkip.disabled = !!S.inspectLock;
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
  setTimeout(function() { p.classList.remove('active'); }, 600);
}

function grantChainLife() {
  if (S.combo > 0 && S.combo % 3 === 0 && S.lives < 5) {
    S.lives += 1;
    toast('💖 Chain Bonus: +1 торг', 'success');
  }
}

function grantDodgeBonus() {
  if (S.dodgeChain >= 2) {
    S.nextProfitMult = 1.2;
    S.dodgeChain = 0;
    toast('🕵️ Scam Hunter: x1.2 к следующей сделке', 'success');
  }
}

function grantFastBonus() {
  if (S.fastDecisionChain > 0 && S.fastDecisionChain % 5 === 0) {
    S.t += 50;
    toast('⚡ Turbo Chain: +5 секунд', 'success');
    vibrate(60);
  }
}

function updS() {
  var phase = getPhaseByTime();
  S.phase = phase.id;
  var tm = document.getElementById('timer');
  tm.textContent = Math.max(0, Math.ceil(S.t / 10));
  tm.className = 'timer' + (S.t <= 100 ? ' critical' : '') + (phase.id === 'final' ? ' final-rush' : '');

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
  sv.className = 'speed-val' + (speedB >= 25 ? ' hot' : '');
  document.getElementById('speed-fill').style.width = Math.max(0, (1 - S.offerTime / 5) * 100) + '%';

  document.getElementById('rs-deals').textContent = S.d;
  document.getElementById('rs-profit').textContent = fmt(S.m) + '₽';

  if (!S.finalRushTriggered && phase.id === 'final') {
    S.finalRushTriggered = true;
    toast('🏁 FINAL RUSH! VIP buyer может появиться в любой момент', 'warn');
    vibrate(120);
  }
  if (S.comboTimer <= 0 && S.combo > 0) S.combo = 0;
}

function endRound(reason) {
  if (S.iv) { clearInterval(S.iv); S.iv = null; }

  var isRecord = S.m > S.best;
  if (isRecord) {
    S.best = S.m;
    setPB(S.best);
    GS.bestScore = Math.max(GS.bestScore, S.m);
    saveGlobalStats();
  }

  if (S.m >= 100000 && !GS.achievements.profit_100k) unlockById('profit_100k');
  if (S.m >= 500000 && !GS.achievements.profit_500k) unlockById('profit_500k');

  document.getElementById('ingame').style.display = 'none';
  document.getElementById('endgame').style.display = 'flex';

  document.getElementById('e-deals').textContent = S.d;
  var ep = document.getElementById('e-profit');
  ep.textContent = fmt(S.m) + '₽';
  ep.className = 'estat-val' + (isRecord ? ' record' : '');
  document.getElementById('e-combo').textContent = 'x' + (S.maxCombo >= 10 ? 5 : S.maxCombo >= 7 ? 4 : S.maxCombo >= 5 ? 3 : S.maxCombo >= 3 ? 2 : 1);

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
    document.getElementById('end-reason').textContent = '⏱️ Время!' + (isRecord ? ' 🎉 РЕКОРД!' : '');
  }
  persistGameState('sixty-end');
  if (typeof window !== 'undefined' && typeof window.onSixtyRoundCompleted === 'function') {
    window.onSixtyRoundCompleted({
      profit: S.m || 0,
      fastestDeals: S.fastestDeals || 0,
      maxCombo: S.maxCombo || 0,
      scamsDodged: S.scamsDodged || 0
    });
  }
}

function unlockAch(a) {
  if (!a || GS.achievements[a.id]) return;
  GS.achievements[a.id] = Date.now();
  saveGlobalStats();
  showAchievement(a);
  vibrate(100);
}

function unlockById(id) {
  var a = ACHIEVEMENTS.find(function(x) { return x.id === id; });
  if (a) unlockAch(a);
}

function newOffer() {
  S.cur = genCar();
  S.offerTime = 0;
  S.haggling = false;
  S.inspected = false;
  S.inspectResult = '';
  S.inspectLock = false;
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
  setTimeout(function() { el.remove(); }, 750);
}

function inspectOffer() {
  if (S.haggling || S.inspectLock || S.inspected || !S.cur) return;
  var c = S.cur;
  var instant = !!(S.boosts && S.boosts.scanCharge);
  S.inspectLock = !instant;
  renderOffer();
  var delay = instant ? 0 : rnd(800, 1000);
  if (!instant) toast('🔍 Сканируем лот...', 'warn');
  setTimeout(function() {
    S.inspected = true;
    S.inspectLock = false;
    S.inspectResult = c.isScam ? 'SCAM DETECTED • грязные доки / скрутка' : 'CLEAN • лот без явной подставы';
    renderOffer();
  }, delay);
}

function applyDecisionSpeed() {
  if (S.offerTime <= 1.5) {
    S.speedDeals += 1;
    S.fastestDeals += 1;
    S.fastDecisionChain += 1;
    grantFastBonus();
  } else {
    S.fastDecisionChain = 0;
  }
}

function applyScamHitPenalty() {
  if (S.boosts && S.boosts.insurance && !S.insuranceUsed) {
    S.insuranceUsed = true;
    popup(false, 0, 'INSURANCE SAVE', '🛡 Первый scam не снял жизнь', 'loss');
    toast('🛡 Insurance спас тебя от первого scam', 'success');
    return;
  }
  S.lives = Math.max(0, S.lives - (S.inspected ? 1 : 2));
}

export function startSixty() {
  enterFullscreen();
  show('sixty-screen');
  document.getElementById('pregame').style.display = 'flex';
  document.getElementById('ingame').style.display = 'none';
  document.getElementById('endgame').style.display = 'none';
  document.getElementById('s-best').textContent = fmt(S.best);
}

function isTurboPrepUnlocked() {
  return ((GS && GS.totalDeals) || 0) >= 12 || ((G && G.day) || 1) >= 5 || ((G && G.rep) || 0) >= 25;
}

function showTurboBoostModal() {
  return new Promise(function(resolve) {
    var screen = document.getElementById('sixty-screen');
    if (!screen || boostModalOpen) return resolve({ scanCharge: false, timeHacker: false, insurance: false });
    if (!isTurboPrepUnlocked()) return resolve({ scanCharge: false, timeHacker: false, insurance: false });
    boostModalOpen = true;
    var chosen = { scanCharge: false, timeHacker: false, insurance: false };
    var costs = { scanCharge: 10, timeHacker: 15, insurance: 20 };
    var names = { scanCharge: 'Scan Charge', timeHacker: 'Time Hacker', insurance: 'Insurance' };
    var desc = {
      scanCharge: 'Сканирование происходит мгновенно весь забег',
      timeHacker: '+10 секунд к базовому таймеру',
      insurance: 'Первый scam не отнимает жизнь'
    };
    var wrap = document.createElement('div');
    wrap.className = 'sixty-boost-modal';
    function render() {
      var bal = getCrystals();
      var items = ['scanCharge', 'timeHacker', 'insurance'].map(function(id) {
        return '<button class="sixty-boost-item' + (chosen[id] ? ' active' : '') + '" data-boost="' + id + '">' +
          '<div><div class="sixty-boost-name">' + names[id] + '</div><div class="sixty-boost-desc">' + desc[id] + '</div></div>' +
          '<div class="sixty-boost-cost">💠 ' + costs[id] + '</div>' +
        '</button>';
      }).join('');
      wrap.innerHTML = '<div class="sixty-boost-card">' +
        '<div class="sixty-boost-title">SIXTY ПОДГОТОВКА</div>' +
        '<div class="sixty-boost-sub">Поздняя опциональная настройка забега. Основной режим спокойно проходится и без неё.</div>' +
        '<div class="sixty-boost-balance">Баланс: 💠 ' + bal + '</div>' +
        '<div class="sixty-boost-list">' + items + '</div>' +
        '<div class="sixty-boost-actions">' +
          '<button class="mbtn mbtn-sec" data-act="skip">ПРОПУСТИТЬ</button>' +
          '<button class="mbtn mbtn-main" data-act="start">СТАРТ</button>' +
        '</div>' +
      '</div>';
    }
    render();
    wrap.addEventListener('click', function(e) {
      var boost = e.target.closest('[data-boost]');
      if (boost) {
        var id = boost.getAttribute('data-boost');
        chosen[id] = !chosen[id];
        render();
        return;
      }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var type = act.getAttribute('data-act');
      if (type === 'skip') {
        boostModalOpen = false;
        wrap.remove();
        return resolve({ scanCharge: false, timeHacker: false, insurance: false });
      }
      var selected = Object.keys(chosen).filter(function(k) { return chosen[k]; });
      var total = selected.reduce(function(sum, k) { return sum + costs[k]; }, 0);
      if (total > 0 && !spendCrystals(total)) {
        toast('💠 Не хватает кристаллов', 'warn');
        return;
      }
      boostModalOpen = false;
      wrap.remove();
      if (total > 0) toast('⚙ Подготовка активирована: -' + total + ' крист.', 'success');
      resolve(chosen);
    });
    screen.appendChild(wrap);
  });
}

export async function startRound() {
  enterFullscreen();
  var boosts = await showTurboBoostModal();
  resetSKeepBuys();
  S.boosts = boosts || { scanCharge: false, timeHacker: false, insurance: false };
  if (S.boosts.timeHacker) S.t += 100;
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
    if (!S.inspectLock) S.offerTime = Math.min(5, S.offerTime + dt);
    updS();
    if (S.t <= 0) endRound('time');
  }, 100);
}

export function stopSixtyInterval() {
  if (S.iv) { clearInterval(S.iv); S.iv = null; }
}

export function buy() {
  if (S.haggling || S.inspectLock) return;
  var c = S.cur;
  if (!c) return;
  S.decisions += 1;
  applyDecisionSpeed();

  if (c.isScam) {
    applyScamHitPenalty();
    S.combo = 0;
    S.comboTimer = 0;
    S.dodgeChain = 0;
    popup(false, -rnd(5000, 25000), S.inspected ? 'SCAM ПОДТВЕРЖДЁН' : 'КИДАЛА!', S.inspected ? 'Ты рискнул даже после скана' : '💣 Деньги улетели', 'loss');
    vibrate(200);
    if (S.lives <= 0) return endRound('lives');
    newOffer();
    updS();
    return;
  }

  var mult = getComboMult();
  var speedB = getSpeedBonus();
  var profit = Math.round((c.rv - c.ap) * mult * (1 + speedB / 100) * (S.nextProfitMult || 1));

  S.m += profit;
  S.d += 1;
  S.combo += 1;
  S.comboTimer = 3;
  S.maxCombo = Math.max(S.maxCombo, S.combo);
  S.nextProfitMult = 1;
  grantChainLife();

  if (S.maxCombo >= 5) unlockById('combo_5');
  if (S.maxCombo >= 7) unlockById('combo_7');
  if (c.isLegendary || c.vipBuyer) unlockById('legendary');
  if (S.speedDeals >= 5) unlockById('speed_demon');

  GS.totalDeals += 1;
  GS.totalProfit += profit;
  saveGlobalStats();

  popup(true, profit, c.vipBuyer ? 'VIP FLIP!' : 'СДЕЛКА!', mult > 1 || speedB || S.nextProfitMult > 1 ? '🔥x' + mult + ' ⚡+' + speedB + '%' : '');
  vibrate(30);
  S.buys += 1;
  persistGameState('sixty-buy');
  newOffer();
  updS();
}

export function haggle() {
  if (S.haggling || S.lives <= 0 || S.inspectLock) return;
  var c = S.cur;
  if (!c) return;
  S.decisions += 1;
  applyDecisionSpeed();

  S.haggling = true;
  S.lives -= 1;
  updS();

  var successChance = getTemperSuccessChance(c);
  if (Math.random() < successChance) {
    var range = getTemperDiscountRange(c.temper);
    var disc = rnd(range[0], range[1]);
    var old = c.ap;
    c.ap = Math.max(1000, Math.round(c.ap * (1 - disc / 100)));
    overlayHaggle('🤝', 'Скидка -' + disc + '%', fmt(old) + '₽ → ' + fmt(c.ap) + '₽');
    vibrate(40);
  } else {
    overlayHaggle('😬', 'Не получилось', c.temper === 'hard' ? 'Упертый продавец' : 'Продавец сорвался');
    vibrate(60);
    S.combo = 0;
    S.comboTimer = 0;
  }

  S.haggling = false;
  if (S.lives <= 0) return endRound('lives');
  renderOffer();
  updS();
}

export function skip() {
  if (S.haggling || S.inspectLock) return;
  var c = S.cur;
  S.decisions += 1;
  applyDecisionSpeed();
  S.combo = 0;
  S.comboTimer = 0;
  if (c && c.isScam) {
    unlockById('scam_dodge');
    S.dodgeChain += 1;
    S.scamsDodged += 1;
    grantDodgeBonus();
  } else {
    S.dodgeChain = 0;
  }
  newOffer();
  updS();
}

export function addExtraTime(seconds) {
  S.t += seconds * 10;
  var tm = document.getElementById('timer');
  if (tm) {
    tm.textContent = Math.ceil(S.t / 10);
    tm.classList.remove('critical');
  }
}
