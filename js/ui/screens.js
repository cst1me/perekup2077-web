// PEREKUP 2077 — basic UI helpers (screens, tabs)
import { updateGlobalStatsUI } from '../core/state.js';

export function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

export function toMenu(stopSixtyInterval) {
  stopSixtyInterval?.();
  updateGlobalStatsUI();
  show('menu-screen');
}

export function wireTabs() {
  document.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById(t.dataset.p)?.classList.add('active');
    };
  });
}
