const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // her choice about the use of her reading data (the picks); off until she agrees
    readingConsent: { agreed: { type: Boolean, default: false }, version: { type: String, default: '' }, at: { type: Date, default: null } },
    // never returned unless a query asks for it with .select('+passwordHash')
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
