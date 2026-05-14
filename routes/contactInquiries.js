const express = require("express");
const { ContactInquiry } = require("../models/ContactInquiry");
const { requireRoles } = require("../middleware/rbac");

const router = express.Router();

router.get("/", requireRoles("Admin", "Consul"), async (_req, res) => {
  try {
    const items = await ContactInquiry.find().sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ data: items });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list inquiries", details: err.message });
  }
});

module.exports = router;
