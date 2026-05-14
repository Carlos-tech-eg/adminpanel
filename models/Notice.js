const mongoose = require("mongoose");

const NOTICE_CATEGORIES = [
  "Visa",
  "Travel Advisory",
  "Embassy News",
  "Emergency",
];

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 500 },
    content: { type: String, required: true, maxlength: 50000 },
    category: {
      type: String,
      required: true,
      enum: NOTICE_CATEGORIES,
    },
    publishedDate: { type: Date, required: true, default: Date.now },
    priority: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

noticeSchema.index({ publishedDate: -1 });
noticeSchema.index({ priority: -1, publishedDate: -1 });

module.exports = {
  Notice: mongoose.model("Notice", noticeSchema),
  NOTICE_CATEGORIES,
};
