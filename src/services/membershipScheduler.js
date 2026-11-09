// Scheduler promo akhir bulan (idempoten, tidak menahan proses Node saat test)
const { runEndMonthPromo, getMonthEndInfo, expireCoupons } = require('./membership');

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // cek tiap 1 jam
let timer = null;
let lastRun = null;

function runOnce(now = new Date()) {
  expireCoupons(now);
  const info = getMonthEndInfo(now);
  if (!info.in_window) {
    return { skipped: true, reason: 'Belum memasuki window akhir bulan.', campaign: info };
  }
  const result = runEndMonthPromo({ now });
  lastRun = {
    at: new Date().toISOString(),
    campaign: result.campaign ? result.campaign.campaign_id : null,
    issued: result.issued || 0
  };
  return result;
}

function startScheduler({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  if (timer) return timer;
  timer = setInterval(() => {
    try {
      const result = runOnce();
      if (!result.skipped) {
        console.log(`[Membership] Promo ${result.campaign.campaign_id}: ${result.issued} kupon diterbitkan.`);
      }
    } catch (err) {
      console.error('[Membership] Scheduler error:', err.message);
    }
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function getSchedulerStatus() {
  return { running: Boolean(timer), last_run: lastRun };
}

module.exports = {
  startScheduler,
  stopScheduler,
  runOnce,
  getSchedulerStatus
};
