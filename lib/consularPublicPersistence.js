const { validationResult } = require("express-validator");
const { ConsularRegistration } = require("../models/ConsularRegistration");
const { CONSULAR_SERVICE_TYPES } = require("./consularServiceTypes");

/**
 * Shared create logic for public consular registration (website → MongoDB).
 * Used by POST /api/public/registro, POST /api/public/consular-registration, and POST /api/consular-registration.
 */
async function persistPublicConsularRegistration(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return { kind: "validation", errors: errors.array() };
  }

  const referenceCode = String(req.body.referenceCode).trim().toUpperCase();
  const email = String(req.body.email || "")
    .toLowerCase()
    .trim();

  const existing = await ConsularRegistration.findOne({ referenceCode });
  if (existing) {
    return { kind: "duplicate", doc: existing };
  }

  const notesParts = [];
  if (req.body.summary) notesParts.push(String(req.body.summary).trim());
  if (req.body.receiptUrl) notesParts.push(`Recibo / descarga: ${String(req.body.receiptUrl).trim()}`);
  if (req.body.folderId) notesParts.push(`Carpeta (sitio público): ${String(req.body.folderId).trim()}`);
  const notes = notesParts.join("\n\n").slice(0, 8000);

  const citizenStatus = String(req.body.citizenStatus || "").trim();
  const receiptUrl = String(req.body.receiptUrl || "").trim();
  const sourceFolderId = String(req.body.folderId || "").trim();

  const st = String(req.body.serviceType || "").trim();
  const serviceType = CONSULAR_SERVICE_TYPES.includes(st) ? st : "other";

  // eslint-disable-next-line no-console
  console.log("[consular-registrations] INSERT collection=consularregistrations", {
    referenceCode,
  });

  const doc = await ConsularRegistration.create({
    fullName: req.body.fullName,
    email,
    phone: req.body.phone || "",
    passportNo: req.body.passportNo || "",
    city: req.body.city || "",
    country: req.body.country || "Türkiye",
    status: "New",
    notes,
    referenceCode,
    citizenStatus,
    serviceType,
    receiptUrl,
    sourceFolderId,
    source: "website",
  });

  return { kind: "created", doc };
}

module.exports = { persistPublicConsularRegistration };
