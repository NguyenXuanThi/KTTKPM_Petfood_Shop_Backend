const jwt = require("jsonwebtoken");
const { jwtSecret, internalKey } = require("../config/env");

const requireAuth = (req, res, next) => {
  const authorizationHeader = req.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Missing or invalid authorization header",
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.auth = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const requireInternal = (req, res, next) => {
  const key = req.headers["x-internal-key"];

  if (!key || key !== internalKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized internal request",
    });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireInternal,
};
