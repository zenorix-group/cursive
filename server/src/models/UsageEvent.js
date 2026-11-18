const mongoose = require('mongoose');

// one row per receipt request or email send, kept for 90 days
const usageEventSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, index: true },
    ok: { type: Boolean, required: true },
    status: Number,
    ms: Number,
    message: { type: String, maxlength: 300 },
    createdAt: { type: Date, default: Date.now, index: { expires: 90 * 24 * 60 * 60 } },
  },
  { versionKey: false },
);

module.exports = mongoose.models.UsageEvent || mongoose.model('UsageEvent', usageEventSchema);
