const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { User } = require("../models/User");

const router = express.Router();

function mockAuthEnabled() {
  return String(process.env.MOCK_AUTH || "")
    .trim()
    .toLowerCase() === "true";
}

/**
 * Production: bcrypt on passwordHash.
 * Dev convenience: MOCK_AUTH=true accepts any non-empty password for users without passwordHash (demo seed).
 */
router.post(
  "/login",
  [
    body("email").trim().isEmail(),
    body("password").isString().isLength({ min: 1, max: 200 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const { password } = req.body;
      const email = String(req.body.email || "")
        .toLowerCase()
        .trim();
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const user = await User.findOne({ email }).select("+passwordHash");
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set" });
      }

      if (user.passwordHash) {
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      } else if (mockAuthEnabled()) {
        // Legacy demo users without stored hash
      } else {
        return res.status(401).json({
          error: "Invalid credentials",
          hint: "This account has no password set. Run npm run create-admin or set MOCK_AUTH=true only for local demo.",
        });
      }

      const token = jwt.sign(
        { sub: String(user._id), email: user.email, role: user.role },
        secret,
        { expiresIn: "8h" }
      );

      return res.json({
        token,
        user: {
          id: String(user._id),
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: "Login failed", details: err.message });
    }
  }
);

module.exports = router;
