const express = require("express");
const mongoose = require("mongoose");
const { body, param, validationResult } = require("express-validator");
const { Message } = require("../models/Message");
const { requireRoles } = require("../middleware/rbac");
const { writeAuditLog } = require("../lib/audit");

const router = express.Router();

/** List recent messages (Consul / Admin) */
router.get("/", requireRoles("Admin", "Consul"), async (_req, res) => {
  try {
    const items = await Message.find().sort({ timestamp: -1 }).limit(200).lean();
    return res.json({ data: items });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list messages", details: err.message });
  }
});

/**
 * POST /admin/messages
 * Records an outbound communication (mock send: status Sent).
 */
router.post(
  "/",
  requireRoles("Admin", "Consul"),
  [
    body("recipientEmail").isEmail().normalizeEmail(),
    body("subject").isString().trim().isLength({ min: 1, max: 500 }),
    body("body").isString().isLength({ min: 1, max: 100000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const msg = await Message.create({
        recipientEmail: req.body.recipientEmail,
        subject: req.body.subject,
        body: req.body.body,
        sentBy: new mongoose.Types.ObjectId(req.user.id),
        status: "Sent",
        timestamp: new Date(),
      });

      await writeAuditLog({
        user: req.user,
        action: "SEND_MESSAGE",
        targetType: "Message",
        targetId: String(msg._id),
        details: `To: ${msg.recipientEmail} | ${msg.subject}`,
      });

      return res.status(201).json({ data: msg });
    } catch (err) {
      return res.status(500).json({ error: "Failed to record message", details: err.message });
    }
  }
);

/**
 * GET /admin/messages/:id
 * Read single message + audit trail entry.
 */
router.get(
  "/:id",
  requireRoles("Admin", "Consul"),
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const msg = await Message.findById(req.params.id).lean();
      if (!msg) {
        return res.status(404).json({ error: "Message not found" });
      }

      await writeAuditLog({
        user: req.user,
        action: "READ_MESSAGE",
        targetType: "Message",
        targetId: String(msg._id),
        details: `Read message: ${msg.subject}`,
      });

      return res.json({ data: msg });
    } catch (err) {
      return res.status(500).json({ error: "Failed to read message", details: err.message });
    }
  }
);

module.exports = router;
