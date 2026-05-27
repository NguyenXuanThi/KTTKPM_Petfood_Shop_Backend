const { redisUrl, redisEnabled } = require("./env");

let Redis;
try {
  Redis = require("ioredis");
} catch (error) {
  Redis = null;
}

let redis = null;
let connectPromise = null;
const enabled = redisEnabled && Boolean(Redis);

if (enabled) {
  redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  });
  redis.on("connect", () => console.log("[api-gateway] Redis connected"));
  redis.on("error", (error) =>
    console.warn(`[api-gateway] Redis error: ${error.message}`),
  );
} else if (redisEnabled && !Redis) {
  console.warn("[api-gateway] ioredis is not installed. Redis rate limit disabled.");
}

const connectRedis = async () => {
  if (!redis) return null;
  if (redis.status === "ready") return redis;
  if (redis.status === "connecting" || redis.status === "connect") {
    return connectPromise || redis;
  }

  connectPromise = redis
    .connect()
    .then(() => redis)
    .catch((error) => {
      connectPromise = null;
      console.warn(`[api-gateway] Redis connection failed: ${error.message}`);
      return null;
    });

  return connectPromise;
};

const safeRedis = async (operation, fallback = null) => {
  const client = await connectRedis();
  if (!client) return fallback;
  try {
    return await operation(client);
  } catch (error) {
    console.warn(`[api-gateway] Redis operation failed: ${error.message}`);
    return fallback;
  }
};

const closeRedis = async () => {
  if (redis) await redis.quit().catch(() => null);
};

process.once("SIGINT", closeRedis);
process.once("SIGTERM", closeRedis);

module.exports = {
  redis,
  connectRedis,
  safeRedis,
};
