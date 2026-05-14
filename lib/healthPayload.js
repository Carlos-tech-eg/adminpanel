const { publicFormSecretConfigured } = require("./publicFormSecret");
const { resolveMongoUri } = require("./resolveMongoUri");

/**
 * Whether the API knows its public base URL (news image absolute URLs, links).
 * On Vercel, VERCEL_URL is always set.
 */
function adminApiUrlConfigured() {
  return Boolean(
    String(process.env.PUBLIC_ADMIN_BASE_URL || "").trim() || process.env.VERCEL_URL
  );
}

function mongodbConfigured() {
  if (String(process.env.USE_MEMORY_MONGO || "").toLowerCase() === "true") return true;
  try {
    const u = resolveMongoUri(process.env);
    return Boolean(u && String(u).trim());
  } catch {
    return false;
  }
}

/**
 * GET /health — operadores / Vercel (sin secretos).
 */
function getHealthPayload() {
  return {
    ok: true,
    service: "embassy-admin-panel-api",
    vercel: process.env.VERCEL === "1",
    nodeEnv: process.env.NODE_ENV || null,
    publicFormSecretConfigured: publicFormSecretConfigured(),
    adminApiUrlConfigured: adminApiUrlConfigured(),
    mongodbConfigured: mongodbConfigured(),
    /** Modelo Mongoose ConsularRegistration → colección consularregistrations */
    consularRegistrationsCollection: "consularregistrations",
  };
}

module.exports = { getHealthPayload, adminApiUrlConfigured, mongodbConfigured };
