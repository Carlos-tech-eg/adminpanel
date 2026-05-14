/**
 * Create or update a staff user with a bcrypt password.
 *
 * Usage:
 *   npm run create-admin -- email@domain.com "YourPassword12" "Full Name" Admin
 *
 * Role is optional (default Admin). Must be one of: Admin, Consul, Press Attaché
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { resolveMongoUri } = require("../lib/resolveMongoUri");
const { User, ROLES } = require("../models/User");

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017/embassy_admin";

async function main() {
  const argv = process.argv.slice(2);
  const [emailRaw, password, displayName = "", roleRaw = "Admin"] = argv;
  const email = String(emailRaw || "")
    .trim()
    .toLowerCase();
  const role = roleRaw.trim();

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.error(
      "Usage: npm run create-admin -- <email> <password> [displayName] [role]\n" +
        `  role: one of ${ROLES.join(", ")} (default Admin)\n` +
        "  password: at least 8 characters"
    );
    process.exit(1);
  }

  if (password.length < 8) {
    // eslint-disable-next-line no-console
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  if (!ROLES.includes(role)) {
    // eslint-disable-next-line no-console
    console.error(`Invalid role "${role}". Use one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const uri = resolveMongoUri() ?? DEFAULT_LOCAL_URI;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    if (displayName) existing.displayName = displayName;
    existing.role = role;
    await existing.save();
    // eslint-disable-next-line no-console
    console.log(`Updated user ${email} (password and profile saved).`);
  } else {
    await User.create({
      email,
      displayName: displayName || email.split("@")[0],
      role,
      passwordHash,
    });
    // eslint-disable-next-line no-console
    console.log(`Created user ${email} (${role}).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
