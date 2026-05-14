const express = require("express");
const mongoose = require("mongoose");
const { body } = require("express-validator");
const { requireAuth } = require("../middleware/auth");
const { ConsularRegistration } = require("../models/ConsularRegistration");
const { persistPublicConsularRegistration } = require("../lib/consularPublicPersistence");
const { requirePublicKey } = require("../lib/publicFormAuth");

const router = express.Router();

const CITIZEN_STATUSES = ["student", "worker", "resident", "tourist", "other"];

const publicRegistroValidators = [
  requirePublicKey,
  body("referenceCode").isString().trim().isLength({ min: 4, max: 80 }),
  body("fullName").isString().trim().isLength({ min: 1, max: 200 }),
  body("email").trim().isEmail(),
  body("phone").optional().isString().trim().isLength({ max: 80 }),
  body("passportNo").optional().isString().trim().isLength({ max: 80 }),
  body("city").optional().isString().trim().isLength({ max: 120 }),
  body("country").optional().isString().trim().isLength({ max: 120 }),
  body("receiptUrl").optional().isString().trim().isLength({ max: 2000 }),
  body("folderId").optional().isString().trim().isLength({ max: 80 }),
  body("summary").optional().isString().isLength({ max: 7500 }),
  body("citizenStatus").optional().isString().isIn(CITIZEN_STATUSES),
];

router.get("/", requireAuth, async (req, res) => {
  console.log("API HIT: consular-registration");
  console.log("METHOD:", req.method);
  console.log("BODY:", req.body);
  console.log("MONGODB_URI EXISTS:", !!process.env.MONGODB_URI);
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB connected");
  } else {
    console.warn("[consular-registration] MongoDB readyState:", mongoose.connection.readyState);
  }
  try {
    const rows = await ConsularRegistration.find().sort({ createdAt: -1 }).limit(500).lean();
    console.log("[consular-registration] LIST count:", rows.length);
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list registrations", details: err.message });
  }
});

router.post("/", ...publicRegistroValidators, async (req, res) => {
  console.log("API HIT: consular-registration");
  console.log("METHOD:", req.method);
  console.log("BODY:", req.body);
  console.log("MONGODB_URI EXISTS:", !!process.env.MONGODB_URI);
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB connected");
  } else {
    console.warn("[consular-registration] MongoDB readyState:", mongoose.connection.readyState);
  }

  try {
    const result = await persistPublicConsularRegistration(req);
    if (result.kind === "validation") {
      console.warn("[consular-registration] validation failed", result.errors);
      return res.status(400).json({ error: "Validation failed", details: result.errors });
    }
    if (result.kind === "duplicate") {
      const doc = result.doc;
      console.log("Saved document:", doc.toObject ? doc.toObject() : doc);
      return res.json({ ok: true, duplicate: true, id: String(doc._id) });
    }
    const doc = result.doc;
    console.log("Saved document:", doc.toObject ? doc.toObject() : doc);
    return res.status(201).json({ ok: true, id: String(doc._id) });
  } catch (err) {
    console.error("[consular-registration] Failed to record registration", err);
    return res.status(500).json({ error: "Failed to record registration", details: err.message });
  }
});

module.exports = router;
