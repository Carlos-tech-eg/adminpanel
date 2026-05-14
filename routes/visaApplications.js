const express = require("express");
const mongoose = require("mongoose");
const { body, param, validationResult } = require("express-validator");
const { VisaApplication, VISA_TYPES, VISA_STATUSES } = require("../models/VisaApplication");
const { writeAuditLog } = require("../lib/audit");
const { requireRoles } = require("../middleware/rbac");

const router = express.Router();

function refCode(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

router.get("/", async (_req, res) => {
  try {
    const rows = await VisaApplication.find().sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list visa applications", details: err.message });
  }
});

router.post(
  "/",
  requireRoles("Admin", "Consul"),
  [
    body("applicantName").isString().trim().isLength({ min: 1, max: 200 }),
    body("email").isEmail().normalizeEmail(),
    body("phone").optional().isString().trim().isLength({ max: 80 }),
    body("passportNo").optional().isString().trim().isLength({ max: 80 }),
    body("nationality").optional().isString().trim().isLength({ max: 120 }),
    body("visaType").optional().isString().isIn(VISA_TYPES),
    body("status").optional().isString().isIn(VISA_STATUSES),
    body("notes").optional().isString().isLength({ max: 8000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await VisaApplication.create({
        applicantName: req.body.applicantName,
        email: req.body.email,
        phone: req.body.phone || "",
        passportNo: req.body.passportNo || "",
        nationality: req.body.nationality || "",
        visaType: req.body.visaType || "Tourist",
        status: req.body.status || "Received",
        notes: req.body.notes || "",
        referenceCode: refCode("VIS"),
        createdBy: new mongoose.Types.ObjectId(req.user.id),
      });
      await writeAuditLog({
        user: req.user,
        action: "CREATE_VISA_APPLICATION",
        targetType: "VisaApplication",
        targetId: String(doc._id),
        details: doc.applicantName,
      });
      return res.status(201).json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to create visa application", details: err.message });
    }
  }
);

router.patch(
  "/:id",
  requireRoles("Admin", "Consul"),
  [param("id").isMongoId()],
  [
    body("status").optional().isString().isIn(VISA_STATUSES),
    body("notes").optional().isString().isLength({ max: 8000 }),
    body("applicantName").optional().isString().trim().isLength({ min: 1, max: 200 }),
    body("visaType").optional().isString().isIn(VISA_TYPES),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await VisaApplication.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      const allowed = ["status", "notes", "applicantName", "visaType", "email", "phone", "passportNo", "nationality"];
      for (const k of allowed) {
        if (req.body[k] !== undefined) doc[k] = req.body[k];
      }
      await doc.save();
      await writeAuditLog({
        user: req.user,
        action: "UPDATE_VISA_APPLICATION",
        targetType: "VisaApplication",
        targetId: String(doc._id),
        details: `status=${doc.status}`,
      });
      return res.json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update", details: err.message });
    }
  }
);

router.delete("/:id", requireRoles("Admin", "Consul"), [param("id").isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }
    const doc = await VisaApplication.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    await writeAuditLog({
      user: req.user,
      action: "DELETE_VISA_APPLICATION",
      targetType: "VisaApplication",
      targetId: String(doc._id),
      details: doc.applicantName,
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete", details: err.message });
  }
});

module.exports = router;
