// PEREKUP 2077 — utils
export var fmt = function(n) { return Number(n || 0).toLocaleString('ru-RU'); };
export var rnd = function(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
export var pick = function(a) { return a[rnd(0, a.length - 1)]; };
export var clamp = function(n, min, max) { return Math.max(min, Math.min(max, n)); };

export function toast(message, type) {
  type = type || 'success';
  var e = document.getElementById('toast');
  if (!e) return;
  e.textContent = message;
  e.className = 'toast ' + type + ' show';
  setTimeout(function() { e.classList.remove('show'); }, 2000);
}

export function vibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e) {}
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
