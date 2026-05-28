const buckets = new Map();

const createMemoryRateLimiter = ({
  windowMs,
  max,
  keyGenerator,
  message = "Too many requests. Please try again later.",
}) => (req, res, next) => {
  const now = Date.now();
  const key = keyGenerator(req);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return next();
  }

  bucket.count += 1;

  if (bucket.count > max) {
    return res.status(429).json({ message });
  }

  return next();
};

const forgotPasswordRateLimiter = createMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip || "unknown",
  message: "Báº¡n thao tÃ¡c quÃ¡ nhanh. Vui lÃ²ng thá»­ láº¡i sau.",
});

module.exports = {
  forgotPasswordRateLimiter,
};


