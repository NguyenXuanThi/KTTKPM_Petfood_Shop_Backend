const { safeRedis } = require("../config/redis");

const aiChatRateLimiter = async (req, res, next) => {
  const identifier = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const key = `rate:ai:chat:ip:${identifier}`;

  const count = await safeRedis(async (client) => {
    const value = await client.incr(key);
    if (value === 1) {
      await client.expire(key, 60);
    }
    return value;
  }, null);

  if (count === null) return next();

  if (count > 30) {
    return res.status(429).json({
      success: false,
      message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    });
  }

  return next();
};

module.exports = {
  aiChatRateLimiter,
};
