const mongoose = require("mongoose");

/**
 * Maps opaque fileId to a file on disk under uploads/private/.
 * Never expose raw filesystem paths publicly.
 */
const privateDocumentSchema = new mongoose.Schema(
  {
    fileId: { type: String, required: true, unique: true, index: true },
    /** Filename stored on disk (e.g. 7f3a....pdf) */
    storedFileName: { type: String, required: true },
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "application/pdf" },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrivateDocument", privateDocumentSchema);
