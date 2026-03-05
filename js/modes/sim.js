// PEREKUP 2077 — Simulator mode
import { fmt, rnd, pick, clamp, toast, vibrate, enterFullscreen } from '../core/utils.js';
import { cars, comments, names, avas, srvs, locs, DAILY_EVENTS, TAXI_DAILY_LIMIT, DAMAGE_PARTS } from '../core/data.js';
import { G, GS, saveGlobalStats, loadTaxiDaily, taxiUseOne, hiddenLevel, checkAchievements, showAchievement } from '../core/state.js';
import { show } from '../ui/screens.js';

let selectedSrvCarId = localStorage.getItem('selectedSrvCarId') || '';
let modalCarId = null;

function genDamages(cond) {
  const lvl = hiddenLevel();
  const result = [];
  const condFactor = (100 - cond) / 100;
  for (const p of DAMAGE_PARTS) {
    const chance = clamp(p.chance + condFactor * 0.4 + lvl * 0.05, 0, 0.8);
    if (Math.random() < chance) {
      result.push({ part: p.name, severity: clamp(rnd(10 + lvl * 5, 40 + Math.round(condFactor * 40)), 5, 90) });
    }
    if (result.length >= 3) break;
  }
  return result;
}

function genCarSim() {
  const lvl = hiddenLevel();
  const t = pick(cars);
  const yr = rnd(2005, 2024);
  const age = 2024 - yr;
  const mi = age * rnd(10000, 25000 + 2500 * (lvl - 1));
  const cond = clamp(100 - age * rnd(3, 7 + lvl - 1), 15, 100);
  let rv = rnd(t.min, t.max);
  rv = Math.round(rv * (1 - age * 0.02) * (cond / 100));
  const minP = 80 + 4 * (lvl - 1);
  const maxP = 120 + 8 * (lvl - 1);
  const ap = Math.round(rv * rnd(minP, maxP) / 100);
  return {
    id: Date.now() + Math.random(),
    n: t.n, e: t.e, yr, mi, cond, ap, rv,
    cm: pick(comments), sn: pick(names), sa: pick(avas),
    hp: Math.random() < clamp(0.22 + 0.08 * (lvl - 1), 0, 0.55),
    pr: false, vm: 1, srv: {}, damages: []
  };
}

function taxiLeft() {
  return Math.max(0, TAXI_DAILY_LIMIT - loadTaxiDaily());
}

export function startSim() {
  enterFullscreen();
  show('sim-screen');
  if (!G.mkt.length) G.mkt = Array(6).fill(0).map(() => genCarSim());
  renderSim();
}

export function renderSim() {
  updG();
  renderMkt();
  renderGar();
  renderSrv();
  renderTaxi();
  renderSk();
}

function updG() {
  document.getElementById('sim-money').textContent = fmt(G.m);
  document.getElementById('sim-day').textContent = G.day;
  document.getElementById('sim-rep').textContent = G.rep || 0;
}

function renderMkt() {
  const eb = document.getElementById('event-banner');
  if (G.lastEvent) {
    eb.classList.add('active');
    document.getElementById('event-title').textContent = G.lastEvent.t;
    document.getElementById('event-desc').textContent = G.lastEvent.d;
  } else {
    eb.classList.remove('active');
  }

  document.getElementById('market-cars').innerHTML = G.mkt.map(c => `
    <div class="scar">
      <div class="scar-emoji">${c.e}</div>
      <div class="scar-name">${c.n}</div>
      <div class="scar-year">${c.yr}</div>
      <div class="scar-comment">"${c.cm}"</div>
      <div class="scar-stats">
        <div class="sstat"><div class="sstat-lbl">Пробег</div><div class="sstat-val">${fmt(c.mi)}км</div></div>
        <div class="sstat"><div class="sstat-lbl">Сост.</div><div class="sstat-val">${c.cond}%</div></div>
      </div>
      <div class="scar-price">${fmt(c.ap)}₽</div>
      <button class="scar-btn buy" onclick="buyG('${c.id}')" ${G.m < c.ap ? 'disabled' : ''}>🛒</button>
    </div>`).join('');
}

function renderGar() {
  const gc = document.getElementById('garage-cars');
  const ge = document.getElementById('garage-empty');
  if (!G.gar.length) {
    gc.innerHTML = '';
    ge.style.display = 'block';
    document.getElementById('srv-select').innerHTML = '<option value="">— Машина —</option>';
    return;
  }
  ge.style.display = 'none';
  gc.innerHTML = G.gar.map(c => {
    const sp = calcSP(c);
    const fee = Math.round(sp * 0.05);
    const pr = sp - fee - (c.pp || 0);
    const dmgCount = c.damages?.length || 0;
    return `<div class="scar" onclick="openCarModal('${c.id}')">
      <div class="scar-emoji">${c.e}</div>
      <div class="scar-name">${c.n}</div>
      ${dmgCount ? `<div class="damage-indicator">🩹 ${dmgCount} повр.</div>` : ''}
      <div class="scar-stats">
        <div class="sstat"><div class="sstat-lbl">Пробег</div><div class="sstat-val">${fmt(c.mi)}км</div></div>
        <div class="sstat"><div class="sstat-lbl">Сост.</div><div class="sstat-val">${c.cond}%</div></div>
      </div>
      <div class="profit-badge ${pr >= 0 ? 'pos' : 'neg'}">${pr >= 0 ? '+' : ''}${fmt(pr)}₽</div>
      <div class="scar-price">${fmt(sp)}₽</div>
      <button class="scar-btn sell" onclick="event.stopPropagation();sellG('${c.id}')">💰</button>
    </div>`;
  }).join('');

  const sel = document.getElementById('srv-select');
  sel.innerHTML = '<option value="">— Машина —</option>' + G.gar.map(c => `<option value="${c.id}">${c.e} ${c.n}</option>`).join('');
  if (selectedSrvCarId && G.gar.some(c => String(c.id) === String(selectedSrvCarId))) sel.value = selectedSrvCarId;
}

function renderSrv() {
  const disc = G.mods?.srvDiscount || 0;
  document.getElementById('srv-grid').innerHTML = srvs.map(s => {
    const price = Math.round(s.p * (1 - disc));
    return `<div class="srv ${G.m < price ? 'dis' : ''}" onclick="applySrv('${s.id}')">
      <div class="srv-icon">${s.i}</div>
      <div class="srv-name">${s.n}</div>
      <div class="srv-desc">${s.d}</div>
      <div class="srv-price ${disc > 0 ? 'discount' : ''}">${fmt(price)}₽${disc > 0 ? ' (-20%)' : ''}</div>
    </div>`;
  }).join('');
}

function renderTaxi() {
  const tc = document.getElementById('taxi-card');
  if (!G.gar.length) {
    tc.innerHTML = '<div class="empty"><div class="empty-icon">🅿️</div>Нужна тачка</div>';
    return;
  }
  if (!G.taxi) genTaxi();
  const o = G.taxi;
  const left = taxiLeft();
  tc.innerHTML = `
    <div class="taxi-route">
      <div class="taxi-pt">📍${o.f}</div>
      <div class="taxi-arrow">➡️</div>
      <div class="taxi-pt">📍${o.t}</div>
    </div>
    <div class="taxi-reward">💵${fmt(o.r)}₽</div>
    <div class="taxi-btns">
      <button class="taxi-btn acc" onclick="accTaxi()" ${left <= 0 ? 'disabled' : ''}>✅</button>
      <button class="taxi-btn skip" onclick="skipTaxi()">⏭️</button>
    </div>
    <div class="taxi-limit">📊 ${TAXI_DAILY_LIMIT - left}/${TAXI_DAILY_LIMIT} | Осталось: ${left}</div>`;
}

function renderSk() {
  const icons = { торговля: '💼', механика: '🔧', хитрость: '🎭', вождение: '🚗' };
  document.getElementById('skills-grid').innerHTML = Object.entries(G.sk).map(([k, v]) => `
    <div class="skill">
      <div class="skill-name">${icons[k]}${k}</div>
      <div class="skill-bar-bg"><div class="skill-bar" style="width:${Math.min(100, v.x / (v.l * 100) * 100)}%"></div></div>
      <div class="skill-lvl">Ур.${v.l}</div>
    </div>`).join('');
}

function calcSP(c) {
  let p = c.rv * (c.cond / 100);
  p *= (1 + G.sk.торговля.l * 0.03);
  p *= (c.vm || 1);
  if (c.hp && !c.pr && Math.random() < 0.4) p *= 0.75;
  if (c.damages?.length) {
    const avg = c.damages.reduce((s, d) => s + d.severity, 0) / c.damages.length;
    p *= (1 - Math.min(0.35, avg / 200));
  }
  return Math.round(p);
}

function unlockAchievement(a) {
  if (!a || GS.achievements[a.id]) return;
  GS.achievements[a.id] = Date.now();
  saveGlobalStats();
  showAchievement(a);
  vibrate(100);
}

function buyG(id) {
  const c = G.mkt.find(x => String(x.id) === String(id));
  if (!c || G.m < c.ap) return toast('Мало денег!', 'error');
  G.m -= c.ap;
  c.pp = c.ap;
  c.boughtDay = G.day;
  c.damages = genDamages(c.cond);
  c.vm = c.vm || 1;
  c.srv = c.srv || {};
  G.gar.push(c);
  G.mkt = G.mkt.filter(x => String(x.id) !== String(id));
  G.buys++;
  addXP('торговля', 20);
  toast(`${c.e} Куплено!`);
  renderSim();
}

function sellG(id) {
  const c = G.gar.find(x => String(x.id) === String(id));
  if (!c) return;
  const sp = calcSP(c);
  const fee = Math.round(sp * 0.05);
  const payout = sp - fee;
  const profit = payout - (c.pp || 0);
  G.m += payout;
  G.gar = G.gar.filter(x => String(x.id) !== String(id));
  GS.totalDeals++;
  GS.totalProfit += profit;
  saveGlobalStats();
  checkAchievements(unlockAchievement);
  addXP('торговля', 30);
  toast(`${profit >= 0 ? '+' : ''}${fmt(profit)}₽ (ком. ${fmt(fee)}₽)`);
  renderSim();
}

function applySrv(sid) {
  const cid = document.getElementById('srv-select').value;
  if (!cid) return toast('Выбери машину!', 'error');
  const c = G.gar.find(x => String(x.id) === String(cid));
  const s = srvs.find(x => x.id === sid);
  if (!c || !s) return;
  const disc = G.mods?.srvDiscount || 0;
  const price = Math.round(s.p * (1 - disc));
  if (G.m < price) return toast('Мало денег!', 'error');
  c.srv = c.srv || {};
  if (c.srv[sid]) return toast('Уже сделано!', 'error');
  G.m -= price;
  if (s.e.c) c.cond = Math.min(100, c.cond + s.e.c);
  if (s.e.m) {
    c.mi = Math.max(1000, c.mi + s.e.m);
    addXP('хитрость', 50);
  }
  if (s.e.r) c.pr = true;
  c.vm = c.vm || 1;
  const vmBoost = { wash: 1.02, oil: 1.04, paint: 1.12, engine: 1.18, mileage: 1.03, diag: 1.03 };
  c.vm *= (vmBoost[sid] || 1);
  c.vm = Math.min(c.vm, 1.8);
  c.srv[sid] = true;
  addXP('механика', 15);
  toast(`${s.i} OK!`);
  renderSim();
}

function genTaxi() {
  const f = pick(locs);
  let t = pick(locs);
  while (t === f) t = pick(locs);
  const base = (rnd(500, 1500) + rnd(15, 40) * 25) * (1 + G.sk.вождение.l * 0.1);
  G.taxi = { f, t, r: Math.round(base * (G.mods?.taxiMult || 1)) };
}

function accTaxi() {
  if (!G.taxi || !G.gar.length || taxiLeft() <= 0) return toast('Лимит!', 'error');
  G.m += G.taxi.r;
  taxiUseOne();
  addXP('вождение', 25);
  toast(`🚕+${fmt(G.taxi.r)}₽`);
  genTaxi();
  renderSim();
}

function skipTaxi() {
  genTaxi();
  renderTaxi();
}

export function refreshMarket() {
  G.day++;
  G.mods = { srvDiscount: 0, apMult: 1, taxiMult: 1, upkeepMult: 1 };

  if (Math.random() < 0.85) {
    const total = DAILY_EVENTS.reduce((s, e) => s + e.w, 0);
    let r = Math.random() * total;
    for (const e of DAILY_EVENTS) {
      r -= e.w;
      if (r <= 0) {
        G.lastEvent = { t: e.t, d: e.d };
        e.run({ G, toast, rnd });
        break;
      }
    }
  } else {
    G.lastEvent = null;
  }

  let upkeep = 0;
  G.gar.forEach(c => {
    const base = c.pp || c.ap || 0;
    const fee = Math.round(clamp(base * 0.005, 500, 5000) * (G.mods.upkeepMult || 1));
    upkeep += fee;
    if (Math.random() < 0.35) c.cond = Math.max(10, c.cond - rnd(1, 3));
  });
  if (upkeep > 0) {
    G.m -= upkeep;
    toast(`📅День ${G.day} • -${fmt(upkeep)}₽`);
  } else {
    toast(`📅День ${G.day}`);
  }

  G.mkt = Array(rnd(5, 7)).fill(0).map(() => {
    const c = genCarSim();
    c.ap = Math.round(c.ap * (G.mods.apMult || 1));
    return c;
  });
  G.taxi = null;
  renderSim();
}

function addXP(sk, am) {
  const s = G.sk[sk];
  if (!s) return;
  s.x += am;
  if (s.x >= s.l * 100) {
    s.x -= s.l * 100;
    s.l++;
    toast(`🎯${sk}→${s.l}`);
  }
  renderSk();
}

function openCarModal(id) {
  modalCarId = id;
  renderCarModal();
  document.getElementById('car-modal').classList.add('active');
}

function closeCarModal(e) {
  if (e && e.target !== document.getElementById('car-modal')) return;
  document.getElementById('car-modal').classList.remove('active');
  modalCarId = null;
}

function renderCarModal() {
  const c = G.gar.find(x => String(x.id) === String(modalCarId));
  if (!c) { closeCarModal(); return; }
  document.getElementById('cm-emoji').textContent = c.e;
  document.getElementById('cm-name').textContent = c.n;
  document.getElementById('cm-sub').textContent = `${c.yr} • ${fmt(c.mi)}км • ${c.cond}%`;
  const sp = calcSP(c);
  const fee = Math.round(sp * 0.05);
  const profit = sp - fee - (c.pp || 0);
  const srvList = c.srv ? Object.keys(c.srv).filter(k => c.srv[k]) : [];
  let dmgHtml = '';
  if (c.damages?.length) {
    dmgHtml = `<div class="modal-sec"><div class="modal-sec-title">🩹 Повреждения</div><div class="dmg-list">${c.damages.map(d => `<div class="dmg"><div class="dmg-row"><div class="dmg-part">${d.part}</div><div class="dmg-sev">${d.severity}%</div></div><div class="dmg-bar"><div class="dmg-fill" style="width:${d.severity}%"></div></div></div>`).join('')}</div></div>`;
  }
  document.getElementById('cm-body').innerHTML = `
    <div class="kv-grid">
      <div class="kv"><div class="k">Покупка</div><div class="v">${fmt(c.pp || 0)}₽</div></div>
      <div class="kv"><div class="k">День</div><div class="v">${c.boughtDay || '—'}</div></div>
      <div class="kv"><div class="k">Продажа</div><div class="v">${fmt(sp)}₽</div></div>
      <div class="kv"><div class="k">Комиссия</div><div class="v">${fmt(fee)}₽</div></div>
      <div class="kv"><div class="k">К выплате</div><div class="v">${fmt(sp - fee)}₽</div></div>
      <div class="kv"><div class="k">Прибыль</div><div class="v ${profit >= 0 ? 'good' : 'bad'}">${profit >= 0 ? '+' : ''}${fmt(profit)}₽</div></div>
    </div>
    <div class="modal-sec"><div class="modal-sec-title">🏷️ Статус</div><div class="tags">
      <div class="tag ${c.pr ? 'ok' : 'warn'}">${c.pr ? '💻 Диагностика OK' : '💻 Без диагностики'}</div>
      <div class="tag ${c.hp ? 'warn' : 'ok'}">${c.hp ? '⚠️ Риск проблем' : '✅ Без рисков'}</div>
      <div class="tag">🧾 Услуг: ${srvList.length}</div>
    </div></div>
    ${dmgHtml}`;
}

export function setSrvFromModal() {
  if (!modalCarId) return;
  document.getElementById('srv-select').value = modalCarId;
  selectedSrvCarId = String(modalCarId);
  localStorage.setItem('selectedSrvCarId', selectedSrvCarId);
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
  document.querySelector('.tab[data-p="services"]').classList.add('active');
  document.getElementById('services').classList.add('active');
  closeCarModal();
  toast('🛠️ Выбрана машина');
}

export function sellFromModal() {
  if (!modalCarId) return;
  const id = modalCarId;
  closeCarModal();
  sellG(id);
}

// Expose for onclick handlers in HTML
if (typeof window !== 'undefined') {
  window.buyG = buyG;
  window.sellG = sellG;
  window.applySrv = applySrv;
  window.accTaxi = accTaxi;
  window.skipTaxi = skipTaxi;
  window.openCarModal = openCarModal;
  window.closeCarModal = closeCarModal;
}
