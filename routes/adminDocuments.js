const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const mongoose = require("mongoose");
const PrivateDocument = require("../models/PrivateDocument");
const { requireRoles } = require("../middleware/rbac");
const { writeAuditLog } = require("../lib/audit");

const router = express.Router();

const UPLOAD_ROOT = path.resolve(__dirname, "..", "uploads", "private");

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureUploadDir();
    cb(null, UPLOAD_ROOT);
  },
  filename(req, file, cb) {
    const id = crypto.randomUUID();
    req.generatedPrivateFileId = id;
    const ext = path.extname(file.originalname) || ".pdf";
    const safeExt = ext.toLowerCase() === ".pdf" ? ".pdf" : ext;
    cb(null, `${id}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF uploads are allowed"));
    }
    return cb(null, true);
  },
});

/**
 * POST /admin/documents/upload
 * Stores file on disk and returns opaque fileId for later retrieval via GET /admin/documents/:fileId
 */
router.post(
  "/upload",
  requireRoles("Admin", "Consul"),
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      return next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Missing file field (use multipart name: file)" });
      }

      const fileId = req.generatedPrivateFileId;
      if (!fileId) {
        return res.status(500).json({ error: "Upload id not generated" });
      }
      const storedFileName = req.file.filename;

      await PrivateDocument.create({
        fileId,
        storedFileName,
        originalName: req.file.originalname || "document.pdf",
        mimeType: "application/pdf",
        uploadedBy: new mongoose.Types.ObjectId(req.user.id),
      });

      await writeAuditLog({
        user: req.user,
        action: "UPLOAD_PRIVATE_DOC",
        targetType: "PrivateDocument",
        targetId: fileId,
        details: `Uploaded PDF: ${req.file.originalname}`,
      });

      return res.status(201).json({
        data: {
          fileId,
          originalName: req.file.originalname,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: "Upload processing failed", details: err.message });
    }
  }
);

/**
 * GET /admin/documents/:fileId
 * Controlled access: streams PDF only for Consul or Admin.
 */
router.get("/:fileId", requireRoles("Admin", "Consul"), async (req, res) => {
  try {
    const { fileId } = req.params;
    const doc = await PrivateDocument.findOne({ fileId }).lean();
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const absolutePath = path.resolve(UPLOAD_ROOT, doc.storedFileName);
    if (!absolutePath.startsWith(UPLOAD_ROOT)) {
      return res.status(400).json({ error: "Invalid path" });
    }
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "File missing on server" });
    }

    await writeAuditLog({
      user: req.user,
      action: "VIEW_PRIVATE_DOC",
      targetType: "PrivateDocument",
      targetId: fileId,
      details: `Viewed private document: ${doc.originalName || doc.storedFileName}`,
    });

    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.originalName || "document.pdf")}"`
    );

    return res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) {
        return res.status(500).json({ error: "Failed to stream document" });
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Document access failed", details: err.message });
  }
});

module.exports = router;
