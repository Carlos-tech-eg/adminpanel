const AuditLog = require("../models/AuditLog");

/**
 * @param {object} params
 * @param {{ id: string, email: string, role: string }} params.user
 * @param {string} params.action
 * @param {string} [params.targetType]
 * @param {string} [params.targetId]
 * @param {string} [params.details]
 */
async function writeAuditLog({ user, action, targetType, targetId, details }) {
  await AuditLog.create({
    userId: user.id,
    userEmail: user.email,
    role: user.role,
    action,
    targetType: targetType ?? "",
    targetId: targetId != null ? String(targetId) : "",
    details: details ?? "",
  });
}

module.exports = { writeAuditLog };
