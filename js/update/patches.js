// PEREKUP 2077 — patch runtime v3.0.9

function safeObj(v) { return v && typeof v === 'object' ? v : {}; }
function safeArr(v) { return Array.isArray(v) ? v : []; }

const patchFns = {
  patch_init_meta_ui_v1(state) {
    state = safeObj(state);
    state.meta = safeObj(state.meta);
    if (typeof state.meta.lastPatchId !== 'number' || !isFinite(state.meta.lastPatchId)) state.meta.lastPatchId = 0;
    state.ui = safeObj(state.ui);
    if (!state.ui.theme) state.ui.theme = 'neo-dealer-terminal';
    if (!state.ui.cardDensity) state.ui.cardDensity = 'normal';
    return state;
  },

  patch_normalize_services_v2(state) {
    state = safeObj(state);
    state.services = safeObj(state.services);
    if (typeof state.services.washPrice !== 'number') state.services.washPrice = 1200;
    if (typeof state.services.polishPrice !== 'number') state.services.polishPrice = 4500;
    if (typeof state.services.engineBase !== 'number') state.services.engineBase = 9000;
    return state;
  },

  patch_fix_garage_flags_v3(state) {
    state = safeObj(state);
    state.gar = safeArr(state.gar);
    state.gar.forEach(function (car) {
      if (!car || typeof car !== 'object') return;
      if (typeof car.isListed !== 'boolean') car.isListed = false;
      if (typeof car.inRepair !== 'boolean') car.inRepair = false;
      if (!Array.isArray(car.damages)) car.damages = [];
      if (!car.srv || typeof car.srv !== 'object') car.srv = {};
    });
    return state;
  },

  patch_stable_update_defaults_v4(state) {
    state = safeObj(state);
    state.meta = safeObj(state.meta);
    state.ui = safeObj(state.ui);
    if (!state.meta.releaseChannel) state.meta.releaseChannel = 'stable';
    if (!state.ui.theme) state.ui.theme = 'neo-dealer-terminal';
    if (!state.ui.updateMode) state.ui.updateMode = 'stable';
    return state;
  }
};

export function getPatchFunction(name) {
  return patchFns[name] || null;
}

if (typeof window !== 'undefined') {
  window.GamePatches = { get: getPatchFunction };
}
