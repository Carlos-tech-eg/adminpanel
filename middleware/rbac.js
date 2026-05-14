/**
 * @param {...string} allowedRoles
 */
function requireRoles(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This action requires one of: ${allowedRoles.join(", ")}`,
      });
    }
    return next();
  };
}

module.exports = { requireRoles };
