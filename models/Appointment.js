const mongoose = require("mongoose");

const SERVICE_TYPES = [
  "Consular registration",
  "Visa",
  "Legalization",
  "Passport",
  "Emergency",
  "Other",
];

const APPT_STATUSES = ["Pending", "Confirmed", "Cancelled", "Completed", "No-show"];

const appointmentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    serviceType: { type: String, enum: SERVICE_TYPES, default: "Other" },
    scheduledAt: { type: Date, required: true },
    durationMins: { type: Number, default: 30, min: 15, max: 240 },
    status: { type: String, enum: APPT_STATUSES, default: "Pending" },
    internalNotes: { type: String, maxlength: 8000, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

appointmentSchema.index({ scheduledAt: 1, status: 1 });
appointmentSchema.index({ status: 1, createdAt: -1 });

module.exports = {
  Appointment: mongoose.model("Appointment", appointmentSchema),
  SERVICE_TYPES,
  APPT_STATUSES,
};
