const mongoose = require("mongoose");

const BADGE_TONES = ["green", "blue", "red", "neutral"];

const newsArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 500 },
    excerpt: { type: String, maxlength: 2000, default: "" },
    content: { type: String, maxlength: 100000, default: "" },
    /** Public URL path on main site, e.g. /noticias */
    href: { type: String, trim: true, default: "/noticias" },
    dateLabel: { type: String, trim: true, default: "" },
    badgeLabel: { type: String, trim: true, default: "Noticia" },
    badgeTone: { type: String, enum: BADGE_TONES, default: "green" },
    imageUrl: { type: String, trim: true, default: "/images/reunion.jpg" },
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

newsArticleSchema.index({ published: 1, sortOrder: -1, updatedAt: -1 });

module.exports = {
  NewsArticle: mongoose.model("NewsArticle", newsArticleSchema),
  BADGE_TONES,
};
