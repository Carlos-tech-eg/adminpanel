const mongoose = require("mongoose");

const REG_STATUSES = ["New", "In review", "Registered", "Rejected", "Archived"];

const consularRegistrationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    passportNo: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "Türkiye" },
    status: { type: String, enum: REG_STATUSES, default: "New" },
    notes: { type: String, maxlength: 8000, default: "" },
    referenceCode: { type: String, trim: true, uppercase: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

consularRegistrationSchema.index({ status: 1, createdAt: -1 });
consularRegistrationSchema.index({ createdAt: -1 });

module.exports = {
  ConsularRegistration: mongoose.model("ConsularRegistration", consularRegistrationSchema),
  REG_STATUSES,
};
