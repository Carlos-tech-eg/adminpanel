const express = require("express");
const mongoose = require("mongoose");
const { body, param, validationResult } = require("express-validator");
const { Appointment, SERVICE_TYPES, APPT_STATUSES } = require("../models/Appointment");
const { writeAuditLog } = require("../lib/audit");
const { requireRoles } = require("../middleware/rbac");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const q = {};
    if (status) q.status = String(status);
    if (from || to) {
      q.scheduledAt = {};
      if (from) q.scheduledAt.$gte = new Date(String(from));
      if (to) q.scheduledAt.$lte = new Date(String(to));
    }
    const rows = await Appointment.find(q).sort({ scheduledAt: 1 }).limit(500).lean();
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list appointments", details: err.message });
  }
});

router.post(
  "/",
  requireRoles("Admin", "Consul"),
  [
    body("fullName").isString().trim().isLength({ min: 1, max: 200 }),
    body("email").isEmail().normalizeEmail(),
    body("phone").optional().isString().trim().isLength({ max: 80 }),
    body("serviceType").optional().isString().isIn(SERVICE_TYPES),
    body("scheduledAt").isISO8601().toDate(),
    body("durationMins").optional().isInt({ min: 15, max: 240 }),
    body("status").optional().isString().isIn(APPT_STATUSES),
    body("internalNotes").optional().isString().isLength({ max: 8000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await Appointment.create({
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone || "",
        serviceType: req.body.serviceType || "Other",
        scheduledAt: new Date(req.body.scheduledAt),
        durationMins: req.body.durationMins ?? 30,
        status: req.body.status || "Pending",
        internalNotes: req.body.internalNotes || "",
        createdBy: new mongoose.Types.ObjectId(req.user.id),
      });
      await writeAuditLog({
        user: req.user,
        action: "CREATE_APPOINTMENT",
        targetType: "Appointment",
        targetId: String(doc._id),
        details: `${doc.fullName} @ ${doc.scheduledAt.toISOString()}`,
      });
      return res.status(201).json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to create appointment", details: err.message });
    }
  }
);

router.patch(
  "/:id",
  requireRoles("Admin", "Consul"),
  [param("id").isMongoId()],
  [
    body("fullName").optional().isString().trim().isLength({ min: 1, max: 200 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("phone").optional().isString().trim().isLength({ max: 80 }),
    body("serviceType").optional().isString().isIn(SERVICE_TYPES),
    body("scheduledAt").optional().isISO8601().toDate(),
    body("durationMins").optional().isInt({ min: 15, max: 240 }),
    body("status").optional().isString().isIn(APPT_STATUSES),
    body("internalNotes").optional().isString().isLength({ max: 8000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const doc = await Appointment.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      const patch = { ...req.body };
      if (patch.scheduledAt) patch.scheduledAt = new Date(patch.scheduledAt);
      Object.assign(doc, patch);
      await doc.save();
      await writeAuditLog({
        user: req.user,
        action: "UPDATE_APPOINTMENT",
        targetType: "Appointment",
        targetId: String(doc._id),
        details: `status=${doc.status}`,
      });
      return res.json({ data: doc });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update appointment", details: err.message });
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
      const doc = await Appointment.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      await writeAuditLog({
        user: req.user,
        action: "DELETE_APPOINTMENT",
        targetType: "Appointment",
        targetId: String(doc._id),
        details: doc.fullName,
      });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete appointment", details: err.message });
    }
  }
);

module.exports = router;
