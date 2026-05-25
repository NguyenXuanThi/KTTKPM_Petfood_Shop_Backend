const jwt = require("jsonwebtoken");
const { jwtSecret, internalKey } = require("../config/env");

const parseBearer = (header = "") => {
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
};

const requireAuth = (req, res, next) => {
  const token = parseBearer(req.headers.authorization || "");
  if (!token) return res.status(401).json({ success: false, message: "Missing or invalid authorization header" });
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

const requireInternal = (req, res, next) => {
  const key = req.headers["x-internal-key"];
  if (!key || key !== internalKey) {
    return res.status(403).json({ success: false, message: "Internal service key is required" });
  }
  return next();
};

module.exports = { requireAuth, requireAdmin, requireInternal };
