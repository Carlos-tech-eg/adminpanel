/**
 * Build MongoDB URI from environment.
 *
 * 1) MONGODB_URI — full connection string (optional).
 * 2) Or Atlas split vars (good for Vercel: separate secret fields, no pasted URI in chat):
 *    MONGODB_ATLAS_USER, MONGODB_ATLAS_PASSWORD, MONGODB_ATLAS_HOST, MONGODB_ATLAS_DB
 *    Optional: MONGODB_ATLAS_APPNAME (e.g. Cluster1)
 *
 * Password special characters are URL-encoded automatically when using split vars.
 */

function trim(env, key) {
  return String(env[key] ?? "").trim();
}

function resolveMongoUri(env = process.env) {
  const full = trim(env, "MONGODB_URI");
  if (full) return full;

  const user = trim(env, "MONGODB_ATLAS_USER");
  const password = env.MONGODB_ATLAS_PASSWORD;
  const host = trim(env, "MONGODB_ATLAS_HOST");
  const db = trim(env, "MONGODB_ATLAS_DB");

  const has =
    Boolean(user) ||
    (password !== undefined && password !== null && String(password) !== "") ||
    Boolean(host) ||
    Boolean(db);

  if (!has) return null;

  const missing = [];
  if (!user) missing.push("MONGODB_ATLAS_USER");
  if (password === undefined || password === null || String(password) === "")
    missing.push("MONGODB_ATLAS_PASSWORD");
  if (!host) missing.push("MONGODB_ATLAS_HOST");
  if (!db) missing.push("MONGODB_ATLAS_DB");

  if (missing.length) {
    throw new Error(
      `Incomplete Atlas configuration (split secrets). Set all of: MONGODB_ATLAS_USER, ` +
        `MONGODB_ATLAS_PASSWORD, MONGODB_ATLAS_HOST, MONGODB_ATLAS_DB. Missing: ${missing.join(", ")}. ` +
        `Or set MONGODB_URI instead.`
    );
  }

  const appName = trim(env, "MONGODB_ATLAS_APPNAME");
  const params = ["retryWrites=true", "w=majority"];
  if (appName) params.push(`appName=${encodeURIComponent(appName)}`);

  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(
    String(password)
  )}@${host}/${db}?${params.join("&")}`;
}

module.exports = { resolveMongoUri };
