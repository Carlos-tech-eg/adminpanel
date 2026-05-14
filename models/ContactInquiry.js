const mongoose = require("mongoose");

const contactInquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, default: "", maxlength: 500 },
    message: { type: String, required: true, maxlength: 20000 },
    source: { type: String, trim: true, default: "website", maxlength: 80 },
  },
  { timestamps: true }
);

contactInquirySchema.index({ createdAt: -1 });

module.exports = {
  ContactInquiry: mongoose.model("ContactInquiry", contactInquirySchema),
};
