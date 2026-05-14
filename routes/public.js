const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const { persistPublicConsularRegistration } = require("../lib/consularPublicPersistence");
const { requirePublicKey } = require("../lib/publicFormAuth");
const { ContactInquiry } = require("../models/ContactInquiry");
const { NewsArticle } = require("../models/NewsArticle");

const router = express.Router();

const CITIZEN_STATUSES = ["student", "worker", "resident", "tourist", "other"];

function mapNewsRow(doc, adminBase) {
  const row = doc;
  let imageUrl = String(row.imageUrl || "");
  if (imageUrl.startsWith("/media-files")) {
    const base = String(adminBase || "").replace(/\/$/, "");
    if (base) imageUrl = `${base}${imageUrl}`;
  }
  return {
    id: String(row._id),
    title: String(row.title || ""),
    excerpt: String(row.excerpt || ""),
    content: String(row.content || ""),
    dateLabel: String(row.dateLabel || ""),
    badgeLabel: String(row.badgeLabel || ""),
    badgeTone: String(row.badgeTone || "green"),
    imageUrl: imageUrl || "/images/reunion.jpg",
    href: String(row.href || "/noticias"),
    published: !!row.published,
    sortOrder: Number(row.sortOrder) || 0,
    updatedAt: row.updatedAt,
  };
}

function adminBaseFromReq(req) {
  const env = String(process.env.PUBLIC_ADMIN_BASE_URL || "").trim().replace(/\/$/, "");
  if (env) return env;
  const host = req.get("host") || `localhost:${process.env.PORT || 4010}`;
  const proto = req.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

/** Published news for the public website */
router.get("/news", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = await NewsArticle.find({ published: true })
      .sort({ sortOrder: -1, updatedAt: -1 })
      .limit(limit)
      .lean();
    const base = adminBaseFromReq(req);
    return res.json({ data: rows.map((r) => mapNewsRow(r, base)) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list news", details: err.message });
  }
});

router.get("/news/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const row = await NewsArticle.findOne({ _id: id, published: true }).lean();
    if (!row) return res.status(404).json({ error: "Not found" });
    const base = adminBaseFromReq(req);
    return res.json({ data: mapNewsRow(row, base) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load news", details: err.message });
  }
});

/** Contact form from the public site */
router.post(
  "/contact",
  requirePublicKey,
  [
    body("fullName").isString().trim().isLength({ min: 1, max: 200 }),
    body("email").trim().isEmail(),
    body("phone").optional().isString().trim().isLength({ max: 80 }),
    body("subject").optional().isString().trim().isLength({ max: 500 }),
    body("message").isString().trim().isLength({ min: 1, max: 20000 }),
    body("source").optional().isString().trim().isLength({ max: 80 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }
      const email = String(req.body.email || "")
        .toLowerCase()
        .trim();
      const doc = await ContactInquiry.create({
        fullName: req.body.fullName,
        email,
        phone: req.body.phone || "",
        subject: req.body.subject || "",
        message: req.body.message,
        source: req.body.source || "website",
      });
      return res.status(201).json({ ok: true, id: String(doc._id) });
    } catch (err) {
      return res.status(500).json({ error: "Failed to save inquiry", details: err.message });
    }
  }
);

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

async function postPublicConsularRegistration(req, res) {
  try {
    const referenceCode = String(req.body.referenceCode || "").trim().toUpperCase();
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    // eslint-disable-next-line no-console
    console.log("[public-registro] Received consular registration", { referenceCode, email });

    const result = await persistPublicConsularRegistration(req);
    if (result.kind === "validation") {
      // eslint-disable-next-line no-console
      console.warn("[public-registro] validation failed", result.errors);
      return res.status(400).json({ error: "Validation failed", details: result.errors });
    }
    if (result.kind === "duplicate") {
      // eslint-disable-next-line no-console
      console.log("[public-registro] duplicate referenceCode, skipping insert", referenceCode);
      return res.json({ ok: true, duplicate: true, id: String(result.doc._id) });
    }
    const doc = result.doc;
    // eslint-disable-next-line no-console
    console.log("[public-registro] Saved consular registration", {
      id: String(doc._id),
      referenceCode: doc.referenceCode,
    });
    // eslint-disable-next-line no-console
    console.log("Saved document:", doc.toObject ? doc.toObject() : doc);
    return res.status(201).json({ ok: true, id: String(doc._id) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[public-registro] Failed to record registration", err);
    return res.status(500).json({ error: "Failed to record registration", details: err.message });
  }
}

/** Legacy path — sitio público Next.js (default). */
router.post("/registro", ...publicRegistroValidators, postPublicConsularRegistration);

/** Alias explícito — mismo cuerpo y misma colección MongoDB. */
router.post(
  "/consular-registration",
  ...publicRegistroValidators,
  postPublicConsularRegistration
);

module.exports = router;
