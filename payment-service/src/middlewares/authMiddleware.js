const jwt = require("jsonwebtoken");
const { jwtSecret, paymentInternalKey } = require("../config/env");

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

const requireInternal = (req, res, next) => {
  const key = req.headers["x-internal-key"];

  if (!key || key !== paymentInternalKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized internal request",
    });
  }

  return next();
};

module.exports = {
  requireUserAuth,
  requireAdmin,
  requireInternal,
};
