const mongoose = require("mongoose");

const MESSAGE_STATUSES = ["Sent", "Failed"];

const messageSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true, maxlength: 500 },
    body: { type: String, required: true, maxlength: 100000 },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: MESSAGE_STATUSES,
      default: "Sent",
    },
  },
  { timestamps: true }
);

messageSchema.index({ timestamp: -1 });
messageSchema.index({ sentBy: 1, timestamp: -1 });

module.exports = {
  Message: mongoose.model("Message", messageSchema),
  MESSAGE_STATUSES,
};
