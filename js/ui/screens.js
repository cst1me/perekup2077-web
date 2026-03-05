// PEREKUP 2077 — screens
import { updateGlobalStatsUI } from '../core/state.js';

export function show(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

export function toMenu(stopFn) {
  if (stopFn) stopFn();
  updateGlobalStatsUI();
  show('menu-screen');
}

export function wireTabs() {
  document.querySelectorAll('.tab').forEach(function(t) {
    t.onclick = function() {
      document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function(x) { x.classList.remove('active'); });
      t.classList.add('active');
      var panel = document.getElementById(t.dataset.p);
      if (panel) panel.classList.add('active');
    };
  });
}
