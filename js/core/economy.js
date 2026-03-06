export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function calcConditionFactor(condition) {
  return clamp(0.35 + (condition / 100) * 0.75, 0.35, 1.1);
}

export function calcAgeFactor(ageYears) {
  if (ageYears <= 1) return 1.08;
  if (ageYears <= 3) return 1.0;
  if (ageYears <= 5) return 0.92;
  if (ageYears <= 8) return 0.82;
  if (ageYears <= 12) return 0.72;
  return 0.58;
}

export function calcHistoryFactor(historyTag) {
  var map = {
    taxi: 0.82,
    family: 1.02,
    garage: 1.08,
    corporate: 0.97,
    tuned: 0.94,
    collector: 1.12,
    flood: 0.63,
    crash: 0.76,
    rental: 0.84
  };
  return map[historyTag] || 1.0;
}

export function calcLegalFactor(legalRisk) {
  return clamp(1 - legalRisk, 0.4, 1);
}

export function calcMarketPrice(input) {
  var basePrice = input.basePrice || 0;
  var condition = calcConditionFactor(input.condition || 50);
  var age = calcAgeFactor(input.ageYears || 5);
  var demand = input.demandFactor || 1;
  var district = input.districtFactor || 1;
  var history = calcHistoryFactor(input.historyTag);
  var legal = calcLegalFactor(input.legalRisk || 0);
  var rarity = input.rarityFactor || 1;

  return Math.round(basePrice * condition * age * demand * district * history * legal * rarity);
}

export function calcTotalCost(input) {
  return Math.round(
    (input.buyPrice || 0) +
    (input.diagCost || 0) +
    (input.repairCost || 0) +
    (input.detailingCost || 0) +
    (input.deliveryCost || 0) +
    (input.parkingCost || 0) +
    (input.commissionCost || 0) +
    (input.fines || 0)
  );
}

export function calcDealResult(input) {
  var totalCost = calcTotalCost(input);
  var salePrice = input.salePrice || 0;
  var profit = salePrice - totalCost;
  var margin = totalCost > 0 ? profit / totalCost : 0;
  return {
    totalCost: totalCost,
    salePrice: salePrice,
    profit: profit,
    margin: margin
  };
}
