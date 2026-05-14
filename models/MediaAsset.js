const mongoose = require("mongoose");

const mediaAssetSchema = new mongoose.Schema(
  {
    /** URL path served by API, e.g. /media-files/xyz.jpg */
    publicUrl: { type: String, required: true, trim: true },
    storedFileName: { type: String, required: true },
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "image/jpeg" },
    alt: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "general" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

mediaAssetSchema.index({ createdAt: -1 });

module.exports = mongoose.model("MediaAsset", mediaAssetSchema);
