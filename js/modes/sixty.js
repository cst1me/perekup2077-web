// PEREKUP 2077 — "60 секунд" mode
import { fmt, rnd, pick, clamp, toast, vibrate, enterFullscreen } from '../core/utils.js';
import { comments, scamComments, legendaryComments, cars, names, scamNames, legendaryNames, avas, scamAvas, legendaryAvas, DAMAGE_PARTS } from '../core/data.js';
import { S, resetSKeepBuys, hiddenLevel, GS, saveGlobalStats, setPB, ACHIEVEMENTS, showAchievement } from '../core/state.js';

let offerUI = null;

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
  const root = document.getElementById('offer');
  if (!root) return;

  root.innerHTML = `
    <div class="offer-badge" id="of-badge" style="display:none"></div>
    <div class="offer-top" id="of-top"></div>
    <div class="offer-content">
      <div class="seller">
        <div class="seller-ava" id="of-ava">👤</div>
        <div>
          <div class="seller-name" id="of-seller">—</div>
          <div class="seller-status" id="of-status">—</div>
        </div>
      </div>

      <div class="car-row">
        <div class="car-emoji" id="of-emoji">🚗</div>
        <div class="car-info">
          <div class="car-name" id="of-name">—</div>
          <div class="car-year" id="of-sub">—</div>
          <div class="car-specs">
            <div class="spec">
              <div class="spec-lbl">Сост.</div>
              <div class="spec-val" id="of-cond">—</div>
            </div>
          </div>
        </div>
      </div>

      <div class="comment" id="of-comment">—</div>

      <div class="price-row">
        <div class="price-info">
          <div class="price-lbl">ЦЕНА</div>
          <div class="price-val" id="of-price">0₽</div>
          <div class="price-real" id="of-real">~0₽</div>
          <div class="multiplier-preview" id="of-mult" style="display:none"></div>
        </div>
        <div class="offer-btns">
          <button class="obtn obtn-buy" id="btn-buy">✅</button>
          <button class="obtn obtn-haggle" id="btn-haggle">🤝</button>
          <button class="obtn obtn-skip" id="btn-skip">❌</button>
        </div>
      </div>
    </div>
  `;

  offerUI = {
    root,
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

function genDamages(cond) {
  const lvl = hiddenLevel();
  const result = [];
  const condFactor = (100 - cond) / 100;
  for (const p of DAMAGE_PARTS) {
    const chance = clamp(p.chance + condFactor * 0.4 + lvl * 0.05, 0, 0.8);
    if (Math.random() < chance) {
      result.push({ part: p.name, severity: clamp(rnd(10 + lvl * 5, 40 + condFactor * 40), 5, 90) });
    }
    if (result.length >= 3) break;
  }
  return result;
}

function genCar(sixty = false) {
  const lvl = hiddenLevel();
  const scamChance = sixty ? clamp(0.12 + 0.03 * (lvl - 1), 0, 0.25) : 0;
  const rareChance = sixty ? clamp(0.08 - 0.015 * (lvl - 1), 0.02, 0.08) : 0;
  const legendaryChance = sixty ? clamp(0.02 - 0.005 * (lvl - 1), 0.005, 0.02) : 0;

  const isScam = sixty && Math.random() < scamChance;
  const isLegendary = sixty && !isScam && Math.random() < legendaryChance;
  const isRare = sixty && !isScam && !isLegendary && Math.random() < rareChance;

  const t = pick(cars);
  const yr = rnd(2005, 2024);
  const age = 2024 - yr;
  const mi = age * rnd(10000, 25000 + 3000 * (lvl - 1));
  const cond = clamp(100 - age * rnd(3, 7 + lvl - 1), 15, 100);

  let rv = rnd(t.min, t.max);
  rv = Math.round(rv * (1 - age * 0.02) * (cond / 100));
  if (isLegendary) rv = Math.round(rv * 1.5);

  let ap;
  if (isScam) ap = Math.round((rv * rnd(30, 50)) / 100);
  else if (isLegendary) ap = Math.round((rv * rnd(35, 55)) / 100);
  else if (isRare) ap = Math.round((rv * rnd(40, 60)) / 100);
  else if (sixty) {
    const r = Math.random();
    const bargain = [0.35, 0.30, 0.25, 0.20][lvl - 1];
    const fair = [0.40, 0.40, 0.35, 0.30][lvl - 1];
    if (r < bargain) ap = Math.round((rv * rnd(60, 85)) / 100);
    else if (r < bargain + fair) ap = Math.round((rv * rnd(90, 112 + 3 * (lvl - 1))) / 100);
    else ap = Math.round((rv * rnd(118 + 6 * (lvl - 1), 145 + 8 * (lvl - 1))) / 100);
  } else {
    const minP = 80 + 4 * (lvl - 1);
    const maxP = 120 + 8 * (lvl - 1);
    ap = Math.round((rv * rnd(minP, maxP)) / 100);
  }

  const cm = isScam ? pick(scamComments) : isLegendary ? pick(legendaryComments) : pick(comments);
  const sn = isScam ? pick(scamNames) : isLegendary ? pick(legendaryNames) : pick(names);
  const sa = isScam ? pick(scamAvas) : isLegendary ? pick(legendaryAvas) : pick(avas);

  return {
    id: Date.now() + Math.random(),
    n: t.n, e: t.e, yr, mi, cond, ap, rv, cm, sn, sa,
    isScam, isRare, isLegendary,
    hp: Math.random() < clamp(0.25 + 0.1 * (lvl - 1), 0, 0.65),
    pr: false, vm: 1, srv: {}, damages: []
  };
}

function renderOffer() {
  const c = S.cur;
  if (!offerUI) initOfferDom();
  if (!offerUI) return;

  const pr = c.rv - c.ap;
  const pct = c.ap ? Math.round((pr / c.ap) * 100) : 0;
  const mult = getComboMult();
  const speedB = getSpeedBonus();

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
  offerUI.sub.textContent = `${c.yr} • ${fmt(c.mi)}км`;

  offerUI.cond.textContent = `${c.cond}%`;
  offerUI.cond.className = 'spec-val ' + (c.cond > 70 ? 'good' : c.cond > 40 ? 'med' : 'bad');

  offerUI.comment.textContent = `💬 "${c.cm}"`;

  offerUI.price.textContent = `${fmt(c.ap)}₽`;
  offerUI.real.textContent = `~${fmt(c.rv)}₽ (${pr >= 0 ? '+' : ''}${pct}%)`;
  offerUI.real.className = 'price-real ' + (pr >= 0 ? 'profit' : 'loss');

  if (mult > 1 || speedB > 0) {
    offerUI.mult.style.display = 'block';
    offerUI.mult.textContent = `🔥x${mult} ⚡+${speedB}%`;
  } else {
    offerUI.mult.style.display = 'none';
  }

  offerUI.btnHaggle.disabled = (S.lives <= 0);
}

function popup(ok, am, text = '', bonus = '', extraClass = '') {
  const p = document.getElementById('popup');
  document.getElementById('p-icon').textContent = ok ? '✅' : '😬';
  document.getElementById('p-text').textContent = text || (ok ? 'СДЕЛКА!' : 'УБЫТОК');
  document.getElementById('p-amt').textContent = (am >= 0 ? '+' : '') + fmt(am) + '₽';
  document.getElementById('p-amt').className = 'popup-amt ' + (ok ? 'profit' : 'loss');
  document.getElementById('p-bonus').textContent = bonus;
  p.className = 'popup active' + (ok ? '' : ' loss') + (extraClass ? ' ' + extraClass : '');
  setTimeout(() => p.classList.remove('active'), 500);
}

function updS() {
  const tm = document.getElementById('timer');
  tm.textContent = Math.max(0, Math.ceil(S.t / 10));
  tm.className = 'timer' + (S.t <= 100 ? ' critical' : '');

  document.getElementById('s-money').textContent = fmt(S.m);
  document.getElementById('s-lives').textContent = S.lives;

  const mult = getComboMult();
  document.getElementById('s-combo').textContent = 'x' + mult;
  document.getElementById('combo-mult').textContent = 'x' + mult;

  const cb = document.getElementById('combo-box');
  cb.className = S.combo >= 3 ? 'combo-display' + (S.combo >= 7 ? ' fire' : '') : 'combo-display inactive';
  document.getElementById('combo-fill').style.width = (S.comboTimer / 3) * 100 + '%';

  let hearts = '';
  for (let i = 0; i < 5; i++) hearts += i < S.lives ? '❤️' : '🖤';
  document.getElementById('lives-hearts').textContent = hearts;

  const speedB = getSpeedBonus();
  const sv = document.getElementById('speed-val');
  sv.textContent = '+' + speedB + '%';
  sv.className = 'speed-val' + (speedB >= 25 ? ' hot' : '');
  document.getElementById('speed-fill').style.width = Math.max(0, (1 - S.offerTime / 5) * 100) + '%';

  document.getElementById('rs-deals').textContent = S.d;
  document.getElementById('rs-profit').textContent = fmt(S.m) + '₽';

  if (S.comboTimer <= 0 && S.combo > 0) S.combo = 0;
}

function endRound(reason = 'time') {
  if (S.iv) { clearInterval(S.iv); S.iv = null; }

  const isRecord = S.m > S.best;
  if (isRecord) {
    S.best = S.m;
    setPB(S.best);
    GS.bestScore = Math.max(GS.bestScore, S.m);
    saveGlobalStats();
  }

  // profit achievements
  if (S.m >= 100000 && !GS.achievements.profit_100k) unlockAchievementById('profit_100k');
  if (S.m >= 500000 && !GS.achievements.profit_500k) unlockAchievementById('profit_500k');

  document.getElementById('ingame').style.display = 'none';
  document.getElementById('endgame').style.display = 'flex';

  const eDeals = document.getElementById('e-deals');
  const eProfit = document.getElementById('e-profit');
  eDeals.textContent = S.d;
  eProfit.textContent = fmt(S.m) + '₽';
  eProfit.className = 'estat-val' + (isRecord ? ' record' : '');

  document.getElementById('e-combo').textContent = 'x' + (S.maxCombo >= 10 ? 5 : S.maxCombo >= 7 ? 4 : S.maxCombo >= 5 ? 3 : S.maxCombo >= 3 ? 2 : 1);

  if (reason === 'lives') {
    document.getElementById('end-reason').textContent = '💔 Попытки торга кончились!';
    document.getElementById('end-title').textContent = 'ПРОВАЛ!';
    document.getElementById('end-title').className = 'end-title lose';
    document.getElementById('end-icon').textContent = '💀';
  } else {
    const w = S.m > 50000;
    const epic = S.m > 300000;
    document.getElementById('end-title').textContent = epic ? 'ЛЕГЕНДА!' : S.m > 150000 ? 'КРАСАВА!' : w ? 'НОРМ!' : 'В МИНУСЕ';
    document.getElementById('end-title').className = 'end-title ' + (epic ? 'epic' : w ? 'win' : 'lose');
    document.getElementById('end-icon').textContent = epic ? '👑' : S.m > 150000 ? '🏆' : w ? '👍' : '😢';
    document.getElementById('end-reason').textContent = '⏱️ Время вышло!' + (isRecord ? ' 🎉 НОВЫЙ РЕКОРД!' : '');
  }
}

function unlockAchievement(a) {
  if (!a || GS.achievements[a.id]) return;
  GS.achievements[a.id] = Date.now();
  saveGlobalStats();
  showAchievement(a);
  vibrate(100);
}

function unlockAchievementById(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (a) unlockAchievement(a);
}

function newOffer() {
  S.cur = genCar(true);
  S.offerTime = 0;
  S.haggling = false;
  renderOffer();
}

function overlayHaggle(icon, title, sub) {
  const host = document.getElementById('offer');
  if (!host) return;
  const old = host.querySelector('.haggle-result');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'haggle-result';
  el.innerHTML = `
    <div class="haggle-icon">${icon}</div>
    <div class="haggle-text">${title}</div>
    <div class="haggle-sub">${sub}</div>
  `;
  host.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

export function startSixty() {
  enterFullscreen();
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

  let last = performance.now();
  S.iv = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.2, (now - last) / 1000);
    last = now;

    // IMPORTANT: smooth timer (no Math.round)
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

export function newOfferPublic() { newOffer(); }

export function buy() {
  if (S.haggling) return;
  const c = S.cur;
  if (!c) return;

  // scam: very likely bad outcome even if price looks good
  if (c.isScam) {
    S.lives = Math.max(0, S.lives - 2);
    S.combo = 0;
    S.comboTimer = 0;
    popup(false, -rnd(5000, 25000), 'КИДАЛА!', '💣 Деньги улетели', 'loss');
    vibrate(200);
    unlockAchievementById('scam_dodge'); // allow if we later skip; here we don't unlock
    if (S.lives <= 0) return endRound('lives');
    newOffer();
    updS();
    return;
  }

  const mult = getComboMult();
  const speedB = getSpeedBonus();
  const baseProfit = c.rv - c.ap;
  const profit = Math.round(baseProfit * mult * (1 + speedB / 100));

  S.m += profit;
  S.d += 1;

  // combo
  S.combo += 1;
  S.comboTimer = 3;
  S.maxCombo = Math.max(S.maxCombo, S.combo);

  // speed streak
  if (S.offerTime <= 1.5) S.speedDeals += 1;
  else S.speedDeals = 0;

  if (S.maxCombo >= 5) unlockAchievementById('combo_5');
  if (S.maxCombo >= 7) unlockAchievementById('combo_7');
  if (c.isLegendary) unlockAchievementById('legendary');
  if (S.speedDeals >= 5) unlockAchievementById('speed_demon');

  // global stats
  GS.totalDeals += 1;
  GS.totalProfit += profit;
  saveGlobalStats();

  popup(true, profit, 'СДЕЛКА!', mult > 1 || speedB ? `🔥x${mult} ⚡+${speedB}%` : '');
  vibrate(30);

  // Buys counter affects hidden level
  S.buys += 1;

  newOffer();
  updS();
}

export function haggle() {
  if (S.haggling) return;
  if (S.lives <= 0) return;

  const c = S.cur;
  if (!c) return;

  S.haggling = true;
  S.lives -= 1;
  updS();

  // scam: haggle almost always fails and wastes time
  const lvl = hiddenLevel();
  const failChance = c.isScam ? 0.75 : clamp(0.28 + 0.07 * (lvl - 1), 0.25, 0.55);

  const roll = Math.random();
  if (roll < failChance) {
    overlayHaggle('😬', 'Не получилось', 'Продаван упёрся');
    vibrate(60);
    S.combo = 0;
    S.comboTimer = 0;
  } else {
    // discount 5–18% depending on level
    const disc = rnd(5, 18 - (lvl - 1) * 2);
    const old = c.ap;
    c.ap = Math.max(1000, Math.round(c.ap * (1 - disc / 100)));
    overlayHaggle('🤝', `Скидка -${disc}%`, `${fmt(old)}₽ → ${fmt(c.ap)}₽`);
    vibrate(40);
  }

  S.haggling = false;
  if (S.lives <= 0) return endRound('lives');

  renderOffer();
  updS();
}

export function skip() {
  if (S.haggling) return;
  const c = S.cur;
  // if we skip scam -> unlock dodge
  if (c?.isScam) unlockAchievementById('scam_dodge');
  S.combo = 0;
  S.comboTimer = 0;
  newOffer();
  updS();
}
