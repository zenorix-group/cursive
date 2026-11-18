const mongoose = require('mongoose');

// what the admin did, newest first; kept for a year
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    detail: { type: String, maxlength: 300 },
    createdAt: { type: Date, default: Date.now, index: { expires: 365 * 24 * 60 * 60 } },
  },
  { versionKey: false },
);

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
