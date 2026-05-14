const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const mongoose = require("mongoose");
const { body, param, validationResult } = require("express-validator");
const MediaAsset = require("../models/MediaAsset");
const { writeAuditLog } = require("../lib/audit");
const { requireRoles } = require("../middleware/rbac");

const router = express.Router();

const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads", "public-media");

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureDir();
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /^image\//.test(file.mimetype);
    if (!ok) return cb(new Error("Only image uploads are allowed"));
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

      const publicUrl = `/media-files/${req.file.filename}`;
      const doc = await MediaAsset.create({
        publicUrl,
        storedFileName: req.file.filename,
        originalName: req.file.originalname || "",
        mimeType: req.file.mimetype,
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
      const abs = path.resolve(UPLOAD_DIR, doc.storedFileName);
      if (abs.startsWith(UPLOAD_DIR) && fs.existsSync(abs)) fs.unlinkSync(abs);
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
