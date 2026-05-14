const { getPublicFormSecret } = require("./publicFormSecret");

/**
 * Shared secret so only your Next.js app can POST public forms.
 * On Vercel (VERCEL=1) or NODE_ENV=production, a non-empty secret is required unless relaxed.
 */
function requirePublicKey(req, res, next) {
  const secret = getPublicFormSecret();
  const prodLike =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const relax =
    String(process.env.ALLOW_INSECURE_PUBLIC_POST || "")
      .trim()
      .toLowerCase() === "true";
  const verbose =
    String(process.env.VERBOSE_PUBLIC_REGISTRATION_LOGS || "")
      .trim()
      .toLowerCase() === "true";

  const origin = req.get("origin") || "";
  const headerPresent = Boolean(String(req.get("x-embassy-public-key") || "").trim());

  if (verbose || !secret) {
    // eslint-disable-next-line no-console
    console.log("[public-form]", {
      path: req.originalUrl || req.path,
      method: req.method,
      origin: origin || "(none)",
      publicFormSecretConfigured: Boolean(secret),
      xEmbassyPublicKeyPresent: headerPresent,
    });
  }

  if (!secret) {
    if (prodLike && !relax) {
      // eslint-disable-next-line no-console
      console.warn("[public-form] Rejecting: PUBLIC_FORM_SECRET not set on admin API (production).");
      return res.status(503).json({
        error:
          "Public form submission is disabled. Set PUBLIC_FORM_SECRET on the API and the same value on the website. " +
          "Vercel: Project (admin) → Settings → Environment Variables → Production → PUBLIC_FORM_SECRET, then Redeploy. " +
          "Diagnose: GET /health → publicFormSecretConfigured should be true.",
        success: false,
      });
    }
    return next();
  }
  const sent = String(req.get("x-embassy-public-key") || "").trim();
  if (sent !== secret) {
    if (verbose) {
      // eslint-disable-next-line no-console
      console.warn("[public-form] Invalid x-embassy-public-key (length mismatch or wrong value).");
    }
    return res.status(401).json({ error: "Invalid or missing x-embassy-public-key", success: false });
  }
  if (verbose) {
    // eslint-disable-next-line no-console
    console.log("[public-form] Secret validated OK.");
  }
  return next();
}

module.exports = { requirePublicKey };
