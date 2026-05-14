/**
 * Shared secret so only your Next.js app can POST public forms.
 * In production, PUBLIC_FORM_SECRET is required when not using test env.
 */
function requirePublicKey(req, res, next) {
  const secret = String(process.env.PUBLIC_FORM_SECRET || "").trim();
  const prod = process.env.NODE_ENV === "production";
  const relax =
    String(process.env.ALLOW_INSECURE_PUBLIC_POST || "")
      .trim()
      .toLowerCase() === "true";

  if (!secret) {
    if (prod && !relax) {
      return res.status(503).json({
        error:
          "Public form submission is disabled. Set PUBLIC_FORM_SECRET on the API and the same value on the website.",
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
