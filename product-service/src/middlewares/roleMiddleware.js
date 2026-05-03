const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({
      message: "Admin role is required",
    });
  }

  return next();
};

module.exports = {
  requireAdmin,
};