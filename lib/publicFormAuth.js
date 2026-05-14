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

  if (!secret) {
    if (prodLike && !relax) {
      return res.status(503).json({
        error:
          "Public form submission is disabled. Set PUBLIC_FORM_SECRET on the API and the same value on the website. " +
          "Vercel: Project (admin) → Settings → Environment Variables → Production → PUBLIC_FORM_SECRET, then Redeploy. " +
          "Diagnose: GET /health → publicFormSecretConfigured should be true.",
      });
    }
    return next();
  }
  const sent = String(req.get("x-embassy-public-key") || "").trim();
  if (sent !== secret) {
    return res.status(401).json({ error: "Invalid or missing x-embassy-public-key" });
  }
  return next();
}

module.exports = { requirePublicKey };
