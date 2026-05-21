const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");

const parseBearerToken = (authorizationHeader = "") => {
  const [scheme, token] = authorizationHeader.split(" ");
  return scheme === "Bearer" && token ? token : null;
};

const optionalAuth = (req, res, next) => {
  const token = parseBearerToken(req.headers.authorization || "");
  if (!token) return next();

  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

const requireAuth = (req, res, next) => {
  const token = parseBearerToken(req.headers.authorization || "");
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing or invalid authorization header" });
  }

  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin role is required" });
  }
  return next();
};

module.exports = { optionalAuth, requireAuth, requireAdmin };
