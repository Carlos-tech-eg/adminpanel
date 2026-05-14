const express = require("express");
const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { Notice, NOTICE_CATEGORIES } = require("../models/Notice");
const { requireRoles } = require("../middleware/rbac");
const { writeAuditLog } = require("../lib/audit");

const router = express.Router();

/** All authenticated embassy staff */
router.get("/", async (_req, res) => {
  try {
    const notices = await Notice.find().sort({ publishedDate: -1 }).lean();
    return res.json({ data: notices });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch notices", details: err.message });
  }
});

router.post(
  "/",
  requireRoles("Admin", "Consul", "Press Attaché"),
  [
    body("title").isString().trim().isLength({ min: 1, max: 500 }),
    body("content").isString().isLength({ min: 1, max: 50000 }),
    body("category").isString().isIn(NOTICE_CATEGORIES),
    body("publishedDate").optional().isISO8601().toDate(),
    body("priority").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const doc = await Notice.create({
        title: req.body.title,
        content: req.body.content,
        category: req.body.category,
        publishedDate: req.body.publishedDate ? new Date(req.body.publishedDate) : new Date(),
        priority: Boolean(req.body.priority),
        createdBy: new mongoose.Types.ObjectId(req.user.id),
      });

      await writeAuditLog({
        user: req.user,
        action: "CREATE_NOTICE",
        targetType: "Notice",
        targetId: String(doc._id),
        details: `Created notice: ${doc.title}`,
      });

      return res.status(201).json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to create notice", details: err.message });
    }
  }
);

router.put(
  "/:id",
  requireRoles("Admin", "Consul", "Press Attaché"),
  [
    param("id").isMongoId(),
    body("title").optional().isString().trim().isLength({ min: 1, max: 500 }),
    body("content").optional().isString().isLength({ min: 1, max: 50000 }),
    body("category").optional().isString().isIn(NOTICE_CATEGORIES),
    body("publishedDate").optional().isISO8601().toDate(),
    body("priority").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const existing = await Notice.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Notice not found" });
      }

      const updates = {};
      if (req.body.title != null) updates.title = req.body.title;
      if (req.body.content != null) updates.content = req.body.content;
      if (req.body.category != null) updates.category = req.body.category;
      if (req.body.publishedDate != null) updates.publishedDate = new Date(req.body.publishedDate);
      if (req.body.priority != null) updates.priority = Boolean(req.body.priority);

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      Object.assign(existing, updates);
      await existing.save();

      await writeAuditLog({
        user: req.user,
        action: "UPDATE_NOTICE",
        targetType: "Notice",
        targetId: String(existing._id),
        details: `Updated notice: ${existing.title}`,
      });

      return res.json({ data: existing });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update notice", details: err.message });
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

      const deleted = await Notice.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Notice not found" });
      }

      await writeAuditLog({
        user: req.user,
        action: "DELETE_NOTICE",
        targetType: "Notice",
        targetId: String(deleted._id),
        details: `Deleted notice: ${deleted.title}`,
      });

      return res.json({ ok: true, id: String(deleted._id) });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete notice", details: err.message });
    }
  }
);

module.exports = router;
