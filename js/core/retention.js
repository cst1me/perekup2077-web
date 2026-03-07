import { G, persistGameState } from './state.js';
import { fmt, getTodayKey, toast } from './utils.js';

function dayIndexFromKey(key) {
  if (!key) return null;
  var d = new Date(key + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 86400000);
}

function ensureRetentionShape() {
  if (!G.retention || typeof G.retention !== 'object') {
    G.retention = {
      lastLoginDay: '',
      streak: 0,
      comebackDaysMissed: 0,
      dailyLotKey: '',
      dailyClaimed: false,
      shortcutPromptShown: false,
      reviewPromptShown: false
    };
  }
  if (!G.meta || typeof G.meta !== 'object') {
    G.meta = { sessions: 0, totalPlaySeconds: 0, bestFlipProfit: 0, lastBigProfit: 0 };
  }
  if (!G.entitlements || typeof G.entitlements !== 'object') {
    G.entitlements = { noAds: false, vipDealer: false };
  }
  return G.retention;
}

export function getTodayLotKey() {
  return getTodayKey();
}

export function getDailyStreakReward(streak) {
  var seq = [5000, 8000, 12000, 18000, 'rare_ticket', 25000, 'legendary_ticket'];
  return seq[Math.min(Math.max(1, streak) - 1, seq.length - 1)];
}

function applyReward(reward) {
  if (typeof reward === 'number') {
    G.m += reward;
    return '💰 +' + fmt(reward) + ' ₽';
  }
  if (reward === 'rare_ticket') {
    G.rep += 4;
    return '🎟️ Rare ticket +4 репутации';
  }
  if (reward === 'legendary_ticket') {
    G.rep += 8;
    return '👑 Legendary ticket +8 репутации';
  }
  return '🎁 Награда получена';
}

export function processRetentionLogin() {
  var r = ensureRetentionShape();
  var today = getTodayKey();
  var todayIdx = dayIndexFromKey(today);
  var lastIdx = dayIndexFromKey(r.lastLoginDay);
  var diff = (todayIdx != null && lastIdx != null) ? (todayIdx - lastIdx) : null;
  var messages = [];

  G.meta.sessions = (parseInt(G.meta.sessions, 10) || 0) + 1;
  r.dailyLotKey = today;

  if (r.lastLoginDay !== today) {
    if (diff === 1) r.streak = (parseInt(r.streak, 10) || 0) + 1;
    else if (diff && diff > 1) {
      r.comebackDaysMissed = diff - 1;
      r.streak = Math.max(1, (parseInt(r.streak, 10) || 0) - 1);
      var comeback = Math.min(50000, 10000 + (r.comebackDaysMissed * 5000));
      G.m += comeback;
      messages.push('🎁 Welcome back: +' + fmt(comeback) + ' ₽');
    } else {
      r.streak = Math.max(1, parseInt(r.streak, 10) || 1);
    }

    var rewardText = applyReward(getDailyStreakReward(r.streak));
    messages.push('📅 День серии ' + r.streak + ': ' + rewardText);
    r.dailyClaimed = true;
    r.lastLoginDay = today;
    persistGameState('retention-login');
  }

  return {
    streak: r.streak,
    comebackDaysMissed: r.comebackDaysMissed,
    messages: messages,
    dailyLotKey: r.dailyLotKey
  };
}

export function maybePromptShortcut() {
  var r = ensureRetentionShape();
  if (r.shortcutPromptShown) return;
  if ((G.meta.sessions || 0) < 3) return;
  if (!window.ysdk || !window.ysdk.shortcut || typeof window.ysdk.shortcut.canShowPrompt !== 'function') return;
  window.ysdk.shortcut.canShowPrompt().then(function(result) {
    if (result && result.canShow) {
      return window.ysdk.shortcut.showPrompt().then(function(outcome) {
        if (outcome && outcome.outcome === 'accepted') {
          r.shortcutPromptShown = true;
          toast('📲 Иконка игры добавлена', 'success');
          persistGameState('shortcut-accepted');
        }
      });
    }
  }).catch(function(){});
}

export function maybePromptReview(trigger) {
  var r = ensureRetentionShape();
  if (r.reviewPromptShown) return;
  if (!window.ysdk || !window.ysdk.feedback || typeof window.ysdk.feedback.canReview !== 'function') return;
  window.ysdk.feedback.canReview().then(function(res) {
    if (res && res.value) {
      return window.ysdk.feedback.requestReview().then(function() {
        r.reviewPromptShown = true;
        persistGameState('review-' + (trigger || 'generic'));
      });
    }
  }).catch(function(){});
}

export function getVipLabel() {
  ensureRetentionShape();
  if (G.entitlements.vipDealer) return '👑 VIP DEALER';
  if (G.entitlements.noAds) return '🛡️ NO ADS';
  return 'FREE';
}
