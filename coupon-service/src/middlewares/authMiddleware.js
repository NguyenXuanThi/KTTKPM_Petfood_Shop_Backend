const jwt = require("jsonwebtoken");
const { jwtSecret, internalKey } = require("../config/env");

const requireUserAuth = (req, res, next) => {
  const authorizationHeader = req.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid authorization header" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.auth = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
};

const requireInternal = (req, res, next) => {
  const key = req.headers["x-internal-key"];
  if (!key || key !== internalKey) {
    return res.status(401).json({ message: "Unauthorized internal request" });
  }
  return next();
};

module.exports = { requireUserAuth, requireAdmin, requireInternal };
