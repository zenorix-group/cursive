const mongoose = require('mongoose');

// one item of the Bleed. endsAt hides an item once its date has passed (a deadline, an event).
const bleedItemSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['news', 'opportunity'], required: true },
    type: { type: String, default: '' },
    title: { type: String, required: true, maxlength: 140 },
    summary: { type: String, default: '', maxlength: 400 },
    url: { type: String, default: '' },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.BleedItem || mongoose.model('BleedItem', bleedItemSchema);
