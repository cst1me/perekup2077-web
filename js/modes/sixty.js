// PEREKUP 2077 — 60 seconds mode
import { fmt, rnd, pick, clamp, toast, vibrate, enterFullscreen } from '../core/utils.js';
import { comments, scamComments, legendaryComments, cars, names, scamNames, legendaryNames, avas, scamAvas, legendaryAvas, DAMAGE_PARTS } from '../core/data.js';
import { S, resetSKeepBuys, hiddenLevel, GS, saveGlobalStats, setPB, ACHIEVEMENTS, showAchievement, persistGameState } from '../core/state.js';
import { show } from '../ui/screens.js';

var offerUI = null;

function getSpeedBonus() {
  if (S.offerTime <= 1.5) return 50;
  if (S.offerTime <= 3) return 25;
  if (S.offerTime <= 4) return 10;
  return 0;
}

function getComboMult() {
  if (S.combo >= 10) return 5;
  if (S.combo >= 7) return 4;
  if (S.combo >= 5) return 3;
  if (S.combo >= 3) return 2;
  return 1;
}

function initOfferDom() {
  var root = document.getElementById('offer');
  if (!root) return;
  root.innerHTML = '<div class="offer-badge" id="of-badge" style="display:none"></div>' +
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
          '<div class="car-specs"><div class="spec"><div class="spec-lbl">Сост.</div><div class="spec-val" id="of-cond">—</div></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="comment" id="of-comment">—</div>' +
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
    comment: root.querySelector('#of-comment'),
    price: root.querySelector('#of-price'),
    real: root.querySelector('#of-real'),
    mult: root.querySelector('#of-mult'),
    btnBuy: root.querySelector('#btn-buy'),
    btnHaggle: root.querySelector('#btn-haggle'),
    btnSkip: root.querySelector('#btn-skip')
  };

  offerUI.btnBuy.addEventListener('click', buy);
  offerUI.btnHaggle.addEventListener('click', haggle);
  offerUI.btnSkip.addEventListener('click', skip);
}

function genCar() {
  var lvl = hiddenLevel();
  var scamChance = clamp(0.12 + 0.03 * (lvl - 1), 0, 0.25);
  var rareChance = clamp(0.08 - 0.015 * (lvl - 1), 0.02, 0.08);
  var legendaryChance = clamp(0.02 - 0.005 * (lvl - 1), 0.005, 0.02);

  var isScam = Math.random() < scamChance;
  var isLegendary = !isScam && Math.random() < legendaryChance;
  var isRare = !isScam && !isLegendary && Math.random() < rareChance;

  var t = pick(cars);
  var yr = rnd(2005, 2024);
  var age = 2024 - yr;
  var mi = age * rnd(10000, 25000 + 3000 * (lvl - 1));
  var cond = clamp(100 - age * rnd(3, 7 + lvl - 1), 15, 100);

  var rv = rnd(t.min, t.max);
  rv = Math.round(rv * (1 - age * 0.02) * (cond / 100));
  if (isLegendary) rv = Math.round(rv * 1.5);

  var ap;
  if (isScam) ap = Math.round((rv * rnd(30, 50)) / 100);
  else if (isLegendary) ap = Math.round((rv * rnd(35, 55)) / 100);
  else if (isRare) ap = Math.round((rv * rnd(40, 60)) / 100);
  else {
    var r = Math.random();
    var bargain = [0.35, 0.30, 0.25, 0.20][lvl - 1];
    var fair = [0.40, 0.40, 0.35, 0.30][lvl - 1];
    if (r < bargain) ap = Math.round((rv * rnd(60, 85)) / 100);
    else if (r < bargain + fair) ap = Math.round((rv * rnd(90, 112 + 3 * (lvl - 1))) / 100);
    else ap = Math.round((rv * rnd(118 + 6 * (lvl - 1), 145 + 8 * (lvl - 1))) / 100);
  }

  var cm = isScam ? pick(scamComments) : isLegendary ? pick(legendaryComments) : pick(comments);
  var sn = isScam ? pick(scamNames) : isLegendary ? pick(legendaryNames) : pick(names);
  var sa = isScam ? pick(scamAvas) : isLegendary ? pick(legendaryAvas) : pick(avas);

  return { id: Date.now(), n: t.n, e: t.e, yr: yr, mi: mi, cond: cond, ap: ap, rv: rv, cm: cm, sn: sn, sa: sa, isScam: isScam, isRare: isRare, isLegendary: isLegendary };
}

function renderOffer() {
  var c = S.cur;
  if (!offerUI) initOfferDom();
  if (!offerUI) return;

  var pr = c.rv - c.ap;
  var pct = c.ap ? Math.round((pr / c.ap) * 100) : 0;
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
    offerUI.badge.textContent = '🚨 ???';
  }

  offerUI.ava.textContent = c.sa;
  offerUI.seller.textContent = c.sn;
  offerUI.status.textContent = c.isScam ? '⚠️ Подозрительный' : (c.isLegendary ? '⭐ Проверенный' : 'Авито');
  offerUI.emoji.textContent = c.e;
  offerUI.name.textContent = c.n;
  offerUI.sub.textContent = c.yr + ' • ' + fmt(c.mi) + 'км';
  offerUI.cond.textContent = c.cond + '%';
  offerUI.cond.className = 'spec-val ' + (c.cond > 70 ? 'good' : c.cond > 40 ? 'med' : 'bad');
  offerUI.comment.textContent = '💬 "' + c.cm + '"';
  offerUI.price.textContent = fmt(c.ap) + '₽';
  offerUI.real.textContent = '~' + fmt(c.rv) + '₽ (' + (pr >= 0 ? '+' : '') + pct + '%)';
  offerUI.real.className = 'price-real ' + (pr >= 0 ? 'profit' : 'loss');

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
  setTimeout(function() { p.classList.remove('active'); }, 500);
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
  sv.className = 'speed-val' + (speedB >= 25 ? ' hot' : '');
  document.getElementById('speed-fill').style.width = Math.max(0, (1 - S.offerTime / 5) * 100) + '%';

  document.getElementById('rs-deals').textContent = S.d;
  document.getElementById('rs-profit').textContent = fmt(S.m) + '₽';

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
  if (typeof window !== 'undefined' && typeof window.onSixtyRoundCompleted === 'function') window.onSixtyRoundCompleted();
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
  setTimeout(function() { el.remove(); }, 700);
}

export function startSixty() {
  enterFullscreen();
  show('sixty-screen');
  document.getElementById('pregame').style.display = 'flex';
  document.getElementById('ingame').style.display = 'none';
  document.getElementById('endgame').style.display = 'none';
  document.getElementById('s-best').textContent = fmt(S.best);
}

export function startRound() {
  enterFullscreen();
  resetSKeepBuys();
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

  if (c.isScam) {
    S.lives = Math.max(0, S.lives - 2);
    S.combo = 0;
    S.comboTimer = 0;
    popup(false, -rnd(5000, 25000), 'КИДАЛА!', '💣 Деньги улетели', 'loss');
    vibrate(200);
    if (S.lives <= 0) return endRound('lives');
    newOffer();
    updS();
    return;
  }

  var mult = getComboMult();
  var speedB = getSpeedBonus();
  var profit = Math.round((c.rv - c.ap) * mult * (1 + speedB / 100));

  S.m += profit;
  S.d += 1;
  S.combo += 1;
  S.comboTimer = 3;
  S.maxCombo = Math.max(S.maxCombo, S.combo);

  if (S.offerTime <= 1.5) S.speedDeals += 1;
  else S.speedDeals = 0;

  if (S.maxCombo >= 5) unlockById('combo_5');
  if (S.maxCombo >= 7) unlockById('combo_7');
  if (c.isLegendary) unlockById('legendary');
  if (S.speedDeals >= 5) unlockById('speed_demon');

  GS.totalDeals += 1;
  GS.totalProfit += profit;
  saveGlobalStats();

  popup(true, profit, 'СДЕЛКА!', mult > 1 || speedB ? '🔥x' + mult + ' ⚡+' + speedB + '%' : '');
  vibrate(30);
  S.buys += 1;
  persistGameState('sixty-buy');
  newOffer();
  updS();
}

export function haggle() {
  if (S.haggling || S.lives <= 0) return;
  var c = S.cur;
  if (!c) return;

  S.haggling = true;
  S.lives -= 1;
  updS();

  var lvl = hiddenLevel();
  var failChance = c.isScam ? 0.75 : clamp(0.28 + 0.07 * (lvl - 1), 0.25, 0.55);

  if (Math.random() < failChance) {
    overlayHaggle('😬', 'Не получилось', 'Продаван упёрся');
    vibrate(60);
    S.combo = 0;
    S.comboTimer = 0;
  } else {
    var disc = rnd(5, 18 - (lvl - 1) * 2);
    var old = c.ap;
    c.ap = Math.max(1000, Math.round(c.ap * (1 - disc / 100)));
    overlayHaggle('🤝', 'Скидка -' + disc + '%', fmt(old) + '₽ → ' + fmt(c.ap) + '₽');
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
  if (c && c.isScam) unlockById('scam_dodge');
  S.combo = 0;
  S.comboTimer = 0;
  newOffer();
  updS();
}
