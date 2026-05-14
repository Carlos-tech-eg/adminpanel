const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

function getBearerToken(req) {
  const h = req.headers.authorization;
  if (!h || typeof h !== "string") return null;
  const [scheme, token] = h.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
}

/**
 * Mock JWT auth: verifies signature and loads user from DB.
 */
async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set" });
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      role: user.role,
      displayName: user.displayName || "",
    };
    return next();
  } catch (err) {
    return res.status(500).json({ error: "Authentication failed", details: err.message });
  }
}

module.exports = { requireAuth, getBearerToken };
