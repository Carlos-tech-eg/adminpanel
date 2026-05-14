const bcrypt = require("bcryptjs");
const { User } = require("../models/User");

const DEMO_PASSWORD_NOTE =
  "Mock auth: any non-empty password works for the seeded demo accounts (MOCK_AUTH=true).";

function envBool(name) {
  return String(process.env[name] || "")
    .trim()
    .toLowerCase() === "true";
}

async function seedUsersIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) {
    return {
      seeded: false,
      message: "Users already exist",
      authMode: envBool("MOCK_AUTH") ? "mock" : "bcrypt",
    };
  }

  const mockAuth = envBool("MOCK_AUTH");
  if (mockAuth) {
    await User.insertMany([
      {
        email: "admin@embassy.demo",
        displayName: "Embassy Admin",
        role: "Admin",
      },
      {
        email: "consul@embassy.demo",
        displayName: "Consul Officer",
        role: "Consul",
      },
      {
        email: "press@embassy.demo",
        displayName: "Press Attaché",
        role: "Press Attaché",
      },
    ]);

    return {
      seeded: true,
      message: "Demo users created (MOCK_AUTH=true)",
      demoPasswordNote: DEMO_PASSWORD_NOTE,
      users: [
        { email: "admin@embassy.demo", role: "Admin" },
        { email: "consul@embassy.demo", role: "Consul" },
        { email: "press@embassy.demo", role: "Press Attaché" },
      ],
    };
  }

  const initialEmail = String(process.env.INITIAL_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const displayName = String(process.env.INITIAL_ADMIN_DISPLAY_NAME || "").trim() || "Administrator";

  if (initialEmail && initialPassword && initialPassword.length >= 8) {
    const passwordHash = await bcrypt.hash(initialPassword, 12);
    await User.create({
      email: initialEmail,
      displayName,
      role: "Admin",
      passwordHash,
    });

    return {
      seeded: true,
      message:
        "Initial admin created from INITIAL_ADMIN_EMAIL (remove INITIAL_ADMIN_PASSWORD from .env after first successful login)",
      users: [{ email: initialEmail, role: "Admin" }],
      authMode: "bcrypt",
    };
  }

  return {
    seeded: false,
    message:
      "Empty database: set INITIAL_ADMIN_EMAIL + INITIAL_ADMIN_PASSWORD (min 8 chars) for first admin, or MOCK_AUTH=true for demo users. You can also run: npm run create-admin -- email password \"Name\" Role",
    authMode: "bcrypt",
  };
}

module.exports = { seedUsersIfEmpty, DEMO_PASSWORD_NOTE };
