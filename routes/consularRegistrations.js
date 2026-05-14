const express = require("express");
const mongoose = require("mongoose");
const { body, param, validationResult } = require("express-validator");
const { ConsularRegistration, REG_STATUSES } = require("../models/ConsularRegistration");
const { CONSULAR_SERVICE_TYPES } = require("../lib/consularServiceTypes");
const { writeAuditLog } = require("../lib/audit");
const { requireRoles } = require("../middleware/rbac");

const router = express.Router();

function refCode(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

router.get("/", async (_req, res) => {
  try {
    const rows = await ConsularRegistration.find().sort({ createdAt: -1 }).limit(500).lean();
    // eslint-disable-next-line no-console
    console.log("[consular-registrations] LIST collection=consularregistrations count=%s", rows.length);
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list registrations", details: err.message });
  }
});

router.get("/:id", [param("id").isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }
    const doc = await ConsularRegistration.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    // eslint-disable-next-line no-console
    console.log("[consular-registrations] Fetched consular registration", req.params.id);
    return res.json({ data: doc });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load registration", details: err.message });
  }
});

router.post(
  "/",
  [
    body("fullName").isString().trim().isLength({ min: 1, max: 200 }),
    body("email").isEmail().normalizeEmail(),
    body("phone").optional().isString().trim().isLength({ max: 80 }),
    body("passportNo").optional().isString().trim().isLength({ max: 80 }),
    body("city").optional().isString().trim().isLength({ max: 120 }),
    body("country").optional().isString().trim().isLength({ max: 120 }),
    body("status").optional().isString().isIn(REG_STATUSES),
    body("notes").optional().isString().isLength({ max: 8000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await ConsularRegistration.create({
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone || "",
        passportNo: req.body.passportNo || "",
        city: req.body.city || "",
        country: req.body.country || "Türkiye",
        status: req.body.status || "New",
        notes: req.body.notes || "",
        referenceCode: refCode("REG"),
        createdBy: new mongoose.Types.ObjectId(req.user.id),
      });
      await writeAuditLog({
        user: req.user,
        action: "CREATE_CONSULAR_REGISTRATION",
        targetType: "ConsularRegistration",
        targetId: String(doc._id),
        details: doc.fullName,
      });
      return res.status(201).json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to create registration", details: err.message });
    }
  }
);

router.patch(
  "/:id",
  [param("id").isMongoId()],
  [
    body("status").optional().isString().isIn(REG_STATUSES),
    body("notes").optional().isString().isLength({ max: 8000 }),
    body("fullName").optional().isString().trim().isLength({ min: 1, max: 200 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("phone").optional().isString().trim().isLength({ max: 80 }),
    body("passportNo").optional().isString().trim().isLength({ max: 80 }),
    body("city").optional().isString().trim().isLength({ max: 120 }),
    body("country").optional().isString().trim().isLength({ max: 120 }),
    body("citizenStatus").optional().isString().isLength({ max: 40 }),
    body("serviceType").optional().isString().isIn(CONSULAR_SERVICE_TYPES),
    body("receiptUrl").optional().isString().isLength({ max: 2000 }),
    body("sourceFolderId").optional().isString().isLength({ max: 80 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await ConsularRegistration.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      const allowed = [
        "status",
        "notes",
        "fullName",
        "email",
        "phone",
        "passportNo",
        "city",
        "country",
        "citizenStatus",
        "serviceType",
        "receiptUrl",
        "sourceFolderId",
      ];
      for (const k of allowed) {
        if (req.body[k] !== undefined) doc[k] = req.body[k];
      }
      await doc.save();
      await writeAuditLog({
        user: req.user,
        action: "UPDATE_CONSULAR_REGISTRATION",
        targetType: "ConsularRegistration",
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
    const doc = await ConsularRegistration.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    await writeAuditLog({
      user: req.user,
      action: "DELETE_CONSULAR_REGISTRATION",
      targetType: "ConsularRegistration",
      targetId: String(doc._id),
      details: doc.fullName,
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete", details: err.message });
  }
});

module.exports = router;
