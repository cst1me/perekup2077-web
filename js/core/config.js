// PEREKUP 2077 — runtime config loader v4.0.2

var runtimeConfig = {
  loaded: false,
  vehicleClasses: [],
  vehicleMap: {},
  economyBalance: {},
  progression: {},
  factions: {},
  events: {}
};

var DEFAULT_VEHICLE_CLASSES = [
  { id: 'klassika-2107', name: 'Классика 2107', emoji: '🚗', min: 30000, max: 80000, segment: 'mass', tier: 1, basePrice: 65000, liquidity: 0.92, maintenance: 0.05, risk: 0.18, traits: ['cheap', 'fragile', 'flip-fast'] },
  { id: 'hetchbek-narodnyy', name: 'Хэтчбек Народный', emoji: '🚙', min: 50000, max: 150000, segment: 'mass', tier: 1, basePrice: 180000, liquidity: 0.95, maintenance: 0.04, risk: 0.16, traits: ['city', 'cheap-service', 'mass-market'] },
  { id: 'sedan-ekonom', name: 'Седан Эконом', emoji: '🚗', min: 150000, max: 400000, segment: 'mass', tier: 2, basePrice: 420000, liquidity: 0.97, maintenance: 0.05, risk: 0.14, traits: ['liquid', 'safe-margin', 'mass-market'] },
  { id: 'sedan-komfort', name: 'Седан Комфорт', emoji: '🚙', min: 400000, max: 900000, segment: 'comfort', tier: 3, basePrice: 850000, liquidity: 0.86, maintenance: 0.06, risk: 0.19, traits: ['balanced', 'mainstream-plus'] },
  { id: 'taksi-sedan', name: 'Такси-Седан', emoji: '🚕', min: 300000, max: 800000, segment: 'mass', tier: 2, basePrice: 700000, liquidity: 0.89, maintenance: 0.07, risk: 0.22, traits: ['high-mileage', 'workhorse', 'demand-spikes'] },
  { id: 'gorodskoy-kompakt', name: 'Городской Компакт', emoji: '🚗', min: 350000, max: 900000, segment: 'mass', tier: 2, basePrice: 760000, liquidity: 0.91, maintenance: 0.04, risk: 0.15, traits: ['urban', 'fuel-efficient'] },
  { id: 'biznes-sedan', name: 'Бизнес-Седан', emoji: '🚘', min: 500000, max: 2000000, segment: 'business', tier: 4, basePrice: 1800000, liquidity: 0.66, maintenance: 0.09, risk: 0.28, traits: ['prestige', 'slow-turnover', 'high-margin'] },
  { id: 'sportkupe', name: 'Спорткупе', emoji: '🏎️', min: 400000, max: 2500000, segment: 'collector', tier: 4, basePrice: 2400000, liquidity: 0.54, maintenance: 0.11, risk: 0.34, traits: ['emotional-buy', 'high-risk', 'high-margin'] },
  { id: 'premium-sedan', name: 'Премиум-Седан', emoji: '🚘', min: 600000, max: 3500000, segment: 'premium', tier: 5, basePrice: 3500000, liquidity: 0.48, maintenance: 0.12, risk: 0.37, traits: ['elite', 'slow-burn', 'reputation-gated'] },
  { id: 'krossover', name: 'Кроссовер', emoji: '🚙', min: 1500000, max: 7000000, segment: 'business', tier: 4, basePrice: 2700000, liquidity: 0.78, maintenance: 0.08, risk: 0.21, traits: ['seasonal-demand', 'popular', 'strong-winter-sales'] }
];

var ASSET_ALIASES = {
  'lyuks-krossover': 'krossover',
  'Люкс-Кроссовер': 'krossover',
  'Кроссовер': 'krossover'
};

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function toMap(list) {
  var map = {};
  (list || []).forEach(function(item) { if (item && item.id) map[item.id] = item; });
  return map;
}

export async function preloadConfigs() {
  try {
    var files = [
      ['vehicleClasses', './config/vehicle_classes.json'],
      ['economyBalance', './config/economy_balance.json'],
      ['progression', './config/progression.json'],
      ['factions', './config/factions.json'],
      ['events', './config/events.json']
    ];
    var out = {};
    await Promise.all(files.map(async function(entry) {
      var key = entry[0], url = entry[1];
      try {
        var res = await fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        out[key] = await res.json();
      } catch (e) {
        out[key] = null;
      }
    }));
    runtimeConfig.vehicleClasses = (out.vehicleClasses && Array.isArray(out.vehicleClasses.classes) ? out.vehicleClasses.classes : clone(DEFAULT_VEHICLE_CLASSES));
    runtimeConfig.vehicleMap = toMap(runtimeConfig.vehicleClasses);
    runtimeConfig.economyBalance = out.economyBalance || {};
    runtimeConfig.progression = out.progression || {};
    runtimeConfig.factions = out.factions || {};
    runtimeConfig.events = out.events || {};
    runtimeConfig.loaded = true;
    return runtimeConfig;
  } catch (e) {
    runtimeConfig.vehicleClasses = clone(DEFAULT_VEHICLE_CLASSES);
    runtimeConfig.vehicleMap = toMap(runtimeConfig.vehicleClasses);
    runtimeConfig.loaded = true;
    return runtimeConfig;
  }
}

function ensureDefaults() {
  if (!runtimeConfig.vehicleClasses.length) {
    runtimeConfig.vehicleClasses = clone(DEFAULT_VEHICLE_CLASSES);
    runtimeConfig.vehicleMap = toMap(runtimeConfig.vehicleClasses);
  }
}

export function getVehicleCatalog() {
  ensureDefaults();
  return runtimeConfig.vehicleClasses.map(function(item) { return clone(item); });
}

export function getVehicleMeta(idOrCar) {
  ensureDefaults();
  var id = typeof idOrCar === 'string'
    ? idOrCar
    : (idOrCar && (idOrCar.carId || idOrCar.id || idOrCar.assetId || idOrCar.asset || idOrCar.slug || idOrCar.n));
  id = ASSET_ALIASES[id] || id;
  return runtimeConfig.vehicleMap[id] || null;
}

export function attachVehicleMeta(car) {
  if (!car) return car;
  var meta = getVehicleMeta(car) || null;
  if (!meta) return car;
  if (!car.carId) car.carId = meta.id;
  if (!car.assetId) car.assetId = meta.id;
  if (!car.n) car.n = meta.name;
  if (!car.e) car.e = meta.emoji || '🚗';
  if (!car.seg) car.seg = meta.segment || inferSegment(meta);
  if (car.classRisk == null) car.classRisk = Number(meta.risk || 0);
  if (car.liquidity == null) car.liquidity = Number(meta.liquidity || 0.8);
  if (car.maintenanceRate == null) car.maintenanceRate = Number(meta.maintenance || 0.05);
  if (!car.classTraits) car.classTraits = (meta.traits || []).slice();
  if (car.basePrice == null) car.basePrice = Number(meta.basePrice || 0);
  return car;
}

export function inferSegment(meta) {
  if (!meta) return 'mass';
  if (meta.segment) return meta.segment;
  var tier = Number(meta.tier || 1);
  if (tier >= 5) return 'premium';
  if (tier >= 4) return 'business';
  if (tier >= 3) return 'comfort';
  return 'mass';
}

export function getAssetId(idOrCar) {
  try {
    var meta = getVehicleMeta(idOrCar);
    if (meta && meta.id) return meta.id;
    if (typeof idOrCar === 'string') return ASSET_ALIASES[idOrCar] || idOrCar || 'default';
    if (!idOrCar) return 'default';
    return ASSET_ALIASES[idOrCar.assetId] || ASSET_ALIASES[idOrCar.carId] || ASSET_ALIASES[idOrCar.n] || idOrCar.id || idOrCar.carId || 'default';
  } catch(e) {
    return 'default';
  }
}

export function getCarImageSrc(idOrCar) {
  return './assets/cars/' + getAssetId(idOrCar) + '.webp';
}

export function getClassGameplayLabel(car) {
  var meta = getVehicleMeta(car);
  if (!meta) return 'Рыночный лот';
  var risk = Number(meta.risk || 0);
  var liq = Number(meta.liquidity || 0);
  if (liq >= 0.94) return 'Очень ликвидный';
  if (risk >= 0.32) return 'Высокий риск';
  if (risk >= 0.24) return 'Маржа и риск';
  if (meta.id === 'krossover') return 'Сезонный спрос';
  return 'Стабильный спрос';
}

export function getConfigSnapshot() {
  ensureDefaults();
  return runtimeConfig;
}
