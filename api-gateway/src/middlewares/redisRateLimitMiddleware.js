const { rateLimitWindowMs, rateLimitMax } = require("../config/env");
const { safeRedis } = require("../config/redis");

const apiRateLimiter = async (req, res, next) => {
  const windowSeconds = Math.max(1, Math.ceil(rateLimitWindowMs / 1000));
  const identifier = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const key = `rate:api-gateway:general:${identifier}`;

  const count = await safeRedis(async (client) => {
    const value = await client.incr(key);
    if (value === 1) {
      await client.expire(key, windowSeconds);
    }
    return value;
  }, null);

  if (count === null) return next();

  if (count > rateLimitMax) {
    return res.status(429).json({
      success: false,
      message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    });
  }

  return next();
};

module.exports = {
  apiRateLimiter,
};
