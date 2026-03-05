// PEREKUP 2077 — utils
export const fmt = (n) => Number(n || 0).toLocaleString('ru-RU');
export const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const pick = (a) => a[rnd(0, a.length - 1)];
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const escapeHtml = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export function toast(message, type = 'success') {
  const e = document.getElementById('toast');
  if (!e) return;
  e.textContent = message;
  e.className = 'toast ' + type + ' show';
  setTimeout(() => e.classList.remove('show'), 2000);
}

export function vibrate(ms) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

export function enterFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  } catch {}
}

// Local-day key (not UTC) for taxi limit etc.
export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
