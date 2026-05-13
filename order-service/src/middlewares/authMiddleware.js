const jwt = require("jsonwebtoken");
const { jwtSecret, internalKey } = require("../config/env");

const requireUserAuth = (req, res, next) => {
  const authorizationHeader = req.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Missing or invalid authorization header",
    });
  }

  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch (_error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({
      message: "Admin role is required",
    });
  }

  return next();
};

const requireInternal = (req, res, next) => {
  const key = req.headers["x-internal-key"];

  if (!key || key !== internalKey) {
    return res.status(403).json({
      success: false,
      message: "Internal service key is required",
    });
  }

  return next();
};

module.exports = {
  requireUserAuth,
  requireAdmin,
  requireInternal,
};
