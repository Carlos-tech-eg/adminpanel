/**
 * Production CORS: allowlist from ALLOWED_ORIGINS (+ PUBLIC_ADMIN_BASE_URL + Vercel URL).
 * Development or empty allowlist: permissive (origin: true) so local Vite still works.
 */

function normalizeOrigin(o) {
  return String(o || "")
    .trim()
    .replace(/\/$/, "");
}

function buildAllowedOriginSet() {
  const set = new Set();
  const add = (raw) => {
    const s = normalizeOrigin(raw);
    if (s) set.add(s);
  };
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .forEach((x) => add(x));
  add(process.env.PUBLIC_ADMIN_BASE_URL);
  const vercel = process.env.VERCEL_URL;
  if (vercel) add(`https://${vercel}`);
  return set;
}

function corsOptions() {
  const allowed = buildAllowedOriginSet();
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd || allowed.size === 0) {
    if (isProd && allowed.size === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "[security] CORS is permissive. Set ALLOWED_ORIGINS (comma-separated) and PUBLIC_ADMIN_BASE_URL for an explicit allowlist."
      );
    }
    return { origin: true, credentials: true };
  }

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowed.has(normalizeOrigin(origin))) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
}

module.exports = { corsOptions };
