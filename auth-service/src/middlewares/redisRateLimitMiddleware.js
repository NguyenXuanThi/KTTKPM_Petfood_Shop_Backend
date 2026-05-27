const { safeRedis } = require("../config/redis");

const DEFAULT_MESSAGE = "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";

const createRedisRateLimiter = ({
  service = "auth",
  action,
  windowSeconds,
  max,
  keyGenerator,
  message = DEFAULT_MESSAGE,
}) => async (req, res, next) => {
  const identifier = keyGenerator(req) || req.ip || "unknown";
  const key = `rate:${service}:${action}:${identifier}`;

  const count = await safeRedis(async (client) => {
    const value = await client.incr(key);
    if (value === 1) {
      await client.expire(key, windowSeconds);
    }
    return value;
  }, null);

  // Rate limiting should not block auth if Redis is temporarily unavailable.
  if (count === null) return next();

  if (count > max) {
    return res.status(429).json({
      success: false,
      message,
    });
  }

  return next();
};

const emailOrIp = (req) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  return email || req.ip || "unknown";
};

const ipOnly = (req) => req.ip || req.headers["x-forwarded-for"] || "unknown";

module.exports = {
  loginRateLimiter: createRedisRateLimiter({
    action: "login",
    windowSeconds: 15 * 60,
    max: 10,
    keyGenerator: emailOrIp,
  }),
  forgotPasswordIpRateLimiter: createRedisRateLimiter({
    action: "forgot-password-ip",
    windowSeconds: 15 * 60,
    max: 30,
    keyGenerator: ipOnly,
  }),
  resetPasswordRateLimiter: createRedisRateLimiter({
    action: "reset-password",
    windowSeconds: 15 * 60,
    max: 10,
    keyGenerator: emailOrIp,
  }),
};
