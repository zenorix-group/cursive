const mongoose = require('mongoose');

// one row per thing the companion recorded: switch, swell, sign, lens, bleed, next, signin.
// (sessionId, seq) is unique, so sending the same record twice changes nothing. userId is filled in once the reader signs in.
const companionEventSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    seq: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    type: { type: String, required: true, index: true },
    articleId: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    ms: Number,
    receivedAt: { type: Date, default: Date.now, index: { expires: 365 * 24 * 60 * 60 } },
  },
  { versionKey: false },
);
companionEventSchema.index({ sessionId: 1, seq: 1 }, { unique: true });

module.exports = mongoose.models.CompanionEvent || mongoose.model('CompanionEvent', companionEventSchema);
