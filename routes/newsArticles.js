const express = require("express");
const mongoose = require("mongoose");
const { body, param, validationResult } = require("express-validator");
const { NewsArticle, BADGE_TONES } = require("../models/NewsArticle");
const { writeAuditLog } = require("../lib/audit");
const { requireRoles } = require("../middleware/rbac");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await NewsArticle.find().sort({ sortOrder: -1, updatedAt: -1 }).limit(200).lean();
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list news", details: err.message });
  }
});

router.post(
  "/",
  requireRoles("Admin", "Consul", "Press Attaché"),
  [
    body("title").isString().trim().isLength({ min: 1, max: 500 }),
    body("excerpt").optional().isString().isLength({ max: 2000 }),
    body("content").optional().isString().isLength({ max: 100000 }),
    body("href").optional().isString().trim().isLength({ max: 500 }),
    body("dateLabel").optional().isString().trim().isLength({ max: 120 }),
    body("badgeLabel").optional().isString().trim().isLength({ max: 120 }),
    body("badgeTone").optional().isString().isIn(BADGE_TONES),
    body("imageUrl").optional().isString().trim().isLength({ max: 2000 }),
    body("published").optional().isBoolean(),
    body("sortOrder").optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await NewsArticle.create({
        ...req.body,
        updatedBy: new mongoose.Types.ObjectId(req.user.id),
      });
      await writeAuditLog({
        user: req.user,
        action: "CREATE_NEWS",
        targetType: "NewsArticle",
        targetId: String(doc._id),
        details: doc.title,
      });
      return res.status(201).json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to create news", details: err.message });
    }
  }
);

router.patch(
  "/:id",
  requireRoles("Admin", "Consul", "Press Attaché"),
  [param("id").isMongoId()],
  [
    body("title").optional().isString().trim().isLength({ min: 1, max: 500 }),
    body("excerpt").optional().isString().isLength({ max: 2000 }),
    body("content").optional().isString().isLength({ max: 100000 }),
    body("href").optional().isString().trim().isLength({ max: 500 }),
    body("dateLabel").optional().isString().trim().isLength({ max: 120 }),
    body("badgeLabel").optional().isString().trim().isLength({ max: 120 }),
    body("badgeTone").optional().isString().isIn(BADGE_TONES),
    body("imageUrl").optional().isString().trim().isLength({ max: 2000 }),
    body("published").optional().isBoolean(),
    body("sortOrder").optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await NewsArticle.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      Object.assign(doc, req.body);
      doc.updatedBy = new mongoose.Types.ObjectId(req.user.id);
      await doc.save();
      await writeAuditLog({
        user: req.user,
        action: "UPDATE_NEWS",
        targetType: "NewsArticle",
        targetId: String(doc._id),
        details: doc.title,
      });
      return res.json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update news", details: err.message });
    }
  }
);

router.delete(
  "/:id",
  requireRoles("Admin", "Consul"),
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await NewsArticle.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      await writeAuditLog({
        user: req.user,
        action: "DELETE_NEWS",
        targetType: "NewsArticle",
        targetId: String(doc._id),
        details: doc.title,
      });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete news", details: err.message });
    }
  }
);

module.exports = router;
