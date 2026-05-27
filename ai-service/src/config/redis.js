const config = require("./env");

let Redis;
try {
  Redis = require("ioredis");
} catch (error) {
  Redis = null;
}

let redis = null;
let connectPromise = null;
const enabled = config.REDIS_ENABLED && Boolean(Redis);

if (enabled) {
  redis = new Redis(config.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  });
  redis.on("connect", () => console.log("[ai-service] Redis connected"));
  redis.on("error", (error) => console.warn(`[ai-service] Redis error: ${error.message}`));
} else if (config.REDIS_ENABLED && !Redis) {
  console.warn("[ai-service] ioredis is not installed. Redis rate limit disabled.");
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
      console.warn(`[ai-service] Redis connection failed: ${error.message}`);
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
    console.warn(`[ai-service] Redis operation failed: ${error.message}`);
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
