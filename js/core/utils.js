// PEREKUP 2077 — Utilities v3.0.7
export function fmt(n) {
  try {
    return Number(n || 0).toLocaleString('ru-RU');
  } catch(e) {
    return String(n || 0);
  }
}

export function rnd(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function pick(arr) {
  if (!arr || !arr.length) return null;
  return arr[rnd(0, arr.length - 1)];
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function toast(message, type) {
  try {
    type = type || 'success';
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast ' + type + ' show';
    setTimeout(function() { el.classList.remove('show'); }, 2500);
  } catch(e) {}
}

export function vibrate(ms) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch(e) {}
}

export function enterFullscreen() {
  try {
    var el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(function(){});
    }
  } catch(e) {}
}

export function getTodayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
