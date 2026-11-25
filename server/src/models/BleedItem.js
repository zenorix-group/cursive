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
    // a breaking item stretches the companion at once and stays until the reader opens it
    // what the item is about (a fixed list); used to put the right items first for a reader who agreed to it
    topics: { type: [String], default: [] },
    priority: { type: String, enum: ['normal', 'breaking'], default: 'normal' },
  },
  { timestamps: true },
);

module.exports = mongoose.models.BleedItem || mongoose.model('BleedItem', bleedItemSchema);
