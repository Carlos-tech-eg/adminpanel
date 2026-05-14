const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: { type: String, required: true },
    role: { type: String, required: true },
    action: {
      type: String,
      required: true,
      maxlength: 120,
    },
    targetType: { type: String, maxlength: 80 },
    targetId: { type: String, maxlength: 80 },
    details: { type: String, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
