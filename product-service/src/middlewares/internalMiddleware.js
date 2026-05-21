const { internalKey } = require("../config/env");

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

module.exports = { requireInternal };
