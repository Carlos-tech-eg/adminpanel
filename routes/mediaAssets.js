const express = require("express");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const mongoose = require("mongoose");
const { body, param, validationResult } = require("express-validator");
const MediaAsset = require("../models/MediaAsset");
const { writeAuditLog } = require("../lib/audit");
const { requireRoles } = require("../middleware/rbac");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.mimetype)) {
      return cb(new Error("Solo JPG, JPEG, PNG o WEBP"));
    }
    return cb(null, true);
  },
});

router.get("/", async (_req, res) => {
  try {
    const rows = await MediaAsset.find().sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list media", details: err.message });
  }
});

router.post(
  "/upload",
  requireRoles("Admin", "Consul", "Press Attaché"),
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Upload failed" });
      return next();
    });
  },
  [
    body("alt").optional().isString().trim().isLength({ max: 500 }),
    body("category").optional().isString().trim().isLength({ max: 80 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      if (!req.file) return res.status(400).json({ error: "Missing file (field name: file)" });

      const ext = path.extname(req.file.originalname) || ".jpg";
      const storedFileName = `${crypto.randomUUID()}${ext}`;
      const publicUrl = `/media-files/${storedFileName}`;
      const doc = await MediaAsset.create({
        publicUrl,
        storedFileName,
        originalName: req.file.originalname || "",
        mimeType: req.file.mimetype,
        size: req.file.size || req.file.buffer?.length || 0,
        data: req.file.buffer,
        alt: req.body.alt || "",
        category: req.body.category || "general",
        uploadedBy: new mongoose.Types.ObjectId(req.user.id),
      });

      await writeAuditLog({
        user: req.user,
        action: "UPLOAD_MEDIA",
        targetType: "MediaAsset",
        targetId: String(doc._id),
        details: publicUrl,
      });

      return res.status(201).json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Upload failed", details: err.message });
    }
  }
);

router.patch(
  "/:id",
  requireRoles("Admin", "Consul", "Press Attaché"),
  [param("id").isMongoId()],
  [
    body("alt").optional().isString().trim().isLength({ max: 500 }),
    body("category").optional().isString().trim().isLength({ max: 80 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await MediaAsset.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      if (req.body.alt != null) doc.alt = req.body.alt;
      if (req.body.category != null) doc.category = req.body.category;
      await doc.save();
      await writeAuditLog({
        user: req.user,
        action: "UPDATE_MEDIA",
        targetType: "MediaAsset",
        targetId: String(doc._id),
        details: doc.publicUrl,
      });
      return res.json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update media", details: err.message });
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
      const doc = await MediaAsset.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      await doc.deleteOne();
      await writeAuditLog({
        user: req.user,
        action: "DELETE_MEDIA",
        targetType: "MediaAsset",
        targetId: String(doc._id),
        details: doc.publicUrl,
      });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete media", details: err.message });
    }
  }
);

module.exports = router;
