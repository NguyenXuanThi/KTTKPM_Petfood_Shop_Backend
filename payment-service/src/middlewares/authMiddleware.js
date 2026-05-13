const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");

const requireUserAuth = (req, res, next) => {
  const authorizationHeader = req.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Missing or invalid authorization header",
    });
  }

  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin role is required",
    });
  }
  return next();
};

module.exports = {
  requireUserAuth,
  requireAdmin,
};
