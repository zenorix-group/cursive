const mongoose = require('mongoose');

// one document holds every switch the admin can flip
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    registrationOpen: { type: Boolean, default: true },
    receiptsEnabled: { type: Boolean, default: true },
    hiddenArticles: { type: [Number], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Setting || mongoose.model('Setting', settingSchema);
