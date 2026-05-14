const mongoose = require("mongoose");

/** Roles used for RBAC */
const ROLES = ["Admin", "Consul", "Press Attaché"];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, trim: true, default: "" },
    role: { type: String, required: true, enum: ROLES },
    /** bcrypt hash; omit on legacy mock-only users */
    passwordHash: { type: String, select: false },
    /** Legacy field; unused when passwordHash is set */
    passwordHint: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model("User", userSchema),
  ROLES,
};
