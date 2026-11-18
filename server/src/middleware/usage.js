const mongoose = require('mongoose');
const UsageEvent = require('../models/UsageEvent');
const { getSettings } = require('../lib/settings');

// never lets logging break a request
function logUsage({ endpoint, ok, status, ms, message }) {
  if (mongoose.connection.readyState !== 1) return;
  UsageEvent.create({ endpoint, ok, status, ms, message: message?.slice(0, 300) }).catch(() => {});
}

// records every request to a receipt route: how long it took and whether it worked
function track(endpoint) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => logUsage({ endpoint, ok: res.statusCode < 400, status: res.statusCode, ms: Date.now() - start }));
    next();
  };
}

// lets the admin switch receipt generation off
async function receiptsOn(req, res, next) {
  try {
    if ((await getSettings()).receiptsEnabled) return next();
    return res.status(503).json({ message: 'Receipts are paused for a moment. Please try again soon.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { logUsage, receiptsOn, track };
