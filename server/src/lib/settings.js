const mongoose = require('mongoose');
const Setting = require('../models/Setting');

const DEFAULTS = { registrationOpen: true, receiptsEnabled: true, hiddenArticles: [] };
let cache = { at: 0, value: DEFAULTS };

const pick = (doc) => ({
  registrationOpen: doc.registrationOpen !== false,
  receiptsEnabled: doc.receiptsEnabled !== false,
  hiddenArticles: doc.hiddenArticles || [],
});

// falls back to "everything on" when the database is unavailable, so the app never locks itself out
async function getSettings() {
  if (Date.now() - cache.at < 5000) return cache.value;
  if (mongoose.connection.readyState !== 1) return DEFAULTS;
  const doc = await Setting.findOne({ key: 'main' }).lean();
  cache = { at: Date.now(), value: doc ? pick(doc) : DEFAULTS };
  return cache.value;
}

async function saveSettings(patch) {
  const doc = await Setting.findOneAndUpdate({ key: 'main' }, { $set: patch }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean();
  cache = { at: Date.now(), value: pick(doc) };
  return cache.value;
}

module.exports = { getSettings, saveSettings };
