const mongoose = require("mongoose");

const VISA_TYPES = ["Tourist", "Business", "Official", "Transit", "Other"];
const STATUSES = ["Received", "In review", "Approved", "Rejected", "Completed"];

const visaApplicationSchema = new mongoose.Schema(
  {
    applicantName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    passportNo: { type: String, trim: true, default: "" },
    nationality: { type: String, trim: true, default: "" },
    visaType: { type: String, enum: VISA_TYPES, default: "Tourist" },
    status: { type: String, enum: STATUSES, default: "Received" },
    notes: { type: String, maxlength: 8000, default: "" },
    referenceCode: { type: String, trim: true, uppercase: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

visaApplicationSchema.index({ status: 1, createdAt: -1 });
visaApplicationSchema.index({ createdAt: -1 });

module.exports = {
  VisaApplication: mongoose.model("VisaApplication", visaApplicationSchema),
  VISA_TYPES,
  VISA_STATUSES: STATUSES,
};
