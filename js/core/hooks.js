export function buildSellerProfile(seed, difficultyLevel) {
  var baseHonesty = 0.35 + ((seed * 17) % 50) / 100;
  var urgency = 0.2 + ((seed * 11) % 65) / 100;
  var greed = 0.2 + ((seed * 7) % 70) / 100;
  var scamBias = Math.min(0.5, 0.04 * difficultyLevel + ((seed * 13) % 20) / 100);
  return {
    honesty: Math.max(0.05, Math.min(0.95, baseHonesty - scamBias * 0.35)),
    urgency: Math.max(0.05, Math.min(0.95, urgency)),
    greed: Math.max(0.05, Math.min(0.95, greed + scamBias * 0.15)),
    scamBias: scamBias
  };
}

export function getHiddenDifficulty(totalBought) {
  if (totalBought >= 30) return 4;
  if (totalBought >= 20) return 3;
  if (totalBought >= 10) return 2;
  return 1;
}

export function makeRiskReport(input) {
  var score = 0;
  if (input.mileage > 180000) score += 14;
  if (input.historyTag === 'taxi') score += 18;
  if (input.historyTag === 'flood') score += 30;
  if (input.legalRisk > 0.3) score += 25;
  if (input.condition < 45) score += 12;
  if (input.sellerHonesty < 0.4) score += 16;
  if (input.hiddenLevel >= 3) score += 8;

  var band = 'LOW';
  if (score >= 55) band = 'CRITICAL';
  else if (score >= 38) band = 'HIGH';
  else if (score >= 20) band = 'MEDIUM';

  return { score: score, band: band };
}
