const express = require("express");
const AuditLog = require("../models/AuditLog");
const { requireRoles } = require("../middleware/rbac");

const router = express.Router();

/** Recent audit entries (Admin only) */
router.get("/", requireRoles("Admin"), async (_req, res) => {
  try {
    const items = await AuditLog.find().sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ data: items });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch audit logs", details: err.message });
  }
});

module.exports = router;
