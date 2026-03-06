// PEREKUP 2077 — Emergency Repair UI + Rollback

import { toast } from './utils.js';
import { validateCurrentState, listSnapshots, restoreFromBackup, softResetSession } from './snapshots.js';

function $(id) { return document.getElementById(id); }

function fmtTs(iso) {
  try {
    var d = new Date(iso);
    return d.toLocaleString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch(e) {
    return iso || '—';
  }
}

export async function openRepairModal() {
  var modal = $('repair-modal');
  if (!modal) {
    toast('❌ Repair UI не найден', 'error');
    return;
  }

  var cur = validateCurrentState();
  var status = $('repair-status');
  if (status) {
    status.textContent = cur.ok ? '✅ Состояние выглядит норм' : ('⚠️ Найдена ошибка: ' + cur.err);
    status.style.color = cur.ok ? '#00ff88' : '#ffd700';
  }

  var list = await listSnapshots();
  renderSnapshotList(list);
  modal.classList.add('active');
}

export function closeRepairModal(e) {
  var modal = $('repair-modal');
  if (!modal) return;
  if (e && e.target && e.target !== modal && e.target.closest('.modal-card')) return;
  modal.classList.remove('active');
}

export function isRepairModalOpen() {
  var modal = $('repair-modal');
  return !!(modal && modal.classList.contains('active'));
}

function renderSnapshotList(list) {
  var host = $('repair-list');
  if (!host) return;

  function fmtMoney(n) {
    try {
      if (typeof n !== 'number' || !isFinite(n)) return '—';
      return Math.round(n).toLocaleString('ru-RU');
    } catch(e) {
      return String(n);
    }
  }

  function safeText(x) {
    return (x === null || x === undefined) ? '—' : String(x);
  }

  host.innerHTML = list.map(function(it) {
    if (!it.payload) {
      return '<div class="repair-item empty">' +
        '<div class="repair-item-top">AutoSave_' + it.index + '</div>' +
        '<div class="repair-item-sub">— пусто —</div>' +
        '<button class="mbtn" disabled>Нельзя</button>' +
      '</div>';
    }

    var p = it.payload;
    var ok = it.valid;
    var title = 'AutoSave_' + it.index;
    var reason = p.reasonLabel || p.reason || 'auto';
    var sub = fmtTs(p.ts) + ' • ' + reason;
    var day = (p.preview && p.preview.day != null) ? p.preview.day : (p.G && p.G.day);
    var money = (p.preview && p.preview.money != null) ? p.preview.money : (p.G && p.G.m);
    var meta = 'День: ' + safeText(day) + ' • ₽ ' + fmtMoney(money);
    var build = 'v' + (p.appVersion || '—') + ' • build ' + (p.build || '—') + ' • ' + (p.commit || '—');

    var btn = ok
      ? '<button class="mbtn mbtn-sec" onclick="restoreFromBackup(' + it.index + ')">↩️ Восстановить</button>'
      : '<button class="mbtn" disabled>Битый</button>';

    return '<div class="repair-item' + (ok ? '' : ' bad') + '">' +
      '<div class="repair-item-top">' + title + '</div>' +
      '<div class="repair-item-sub">' + sub + '</div>' +
      '<div class="repair-item-meta">' + meta + '</div>' +
      '<div class="repair-item-meta">' + build + '</div>' +
      btn +
    '</div>';
  }).join('');
}

export async function repairGame() {
  var cur = validateCurrentState();
  if (cur.ok) {
    toast('✅ Состояние норм. Если баги — попробуй rollback вручную.', 'success');
    return openRepairModal();
  }

  toast('⚠️ Найдена поломка: ' + cur.err, 'error');
  await openRepairModal();
}

export async function autoRollbackOnBoot() {
  var cur = validateCurrentState();
  if (cur.ok) return false;

  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
      window.AndroidBridge.vibrate(40);
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.showNativeToast === 'function') {
      window.AndroidBridge.showNativeToast('ПЕРЕКУП 2077: ошибка данных, откройте Починку');
    }
  } catch(e) {}

  toast('⛔ Обнаружена ошибка данных: ' + cur.err, 'error');
  await openRepairModal();
  return true;
}

if (typeof window !== 'undefined') {
  window.restoreFromBackup = restoreFromBackup;
  window.softResetSession = softResetSession;
  window.closeRepairModal = closeRepairModal;
  window.isRepairModalOpen = isRepairModalOpen;
  window.autoRollbackOnBoot = autoRollbackOnBoot;
}
