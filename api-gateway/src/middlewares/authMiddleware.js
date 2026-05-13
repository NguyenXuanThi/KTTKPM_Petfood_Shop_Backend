const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");

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
    req.auth = {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = {
  requireAuth,
};
