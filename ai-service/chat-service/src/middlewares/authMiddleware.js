const jwt = require('jsonwebtoken');
const config = require('../config/env');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      // Allow anonymous access
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // If token is invalid, allow anonymous access
    req.user = null;
    next();
  }
};

module.exports = authMiddleware;
