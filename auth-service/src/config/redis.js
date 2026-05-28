const { redisUrl, redisEnabled } = require("./env");

let Redis;
try {
  // Optional at boot so local development can still start before npm install.
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

  redis.on("connect", () => {
    console.log("[auth-service] Redis connected");
  });

  redis.on("error", (error) => {
    console.warn(`[auth-service] Redis error: ${error.message}`);
  });
} else if (redisEnabled && !Redis) {
  console.warn("[auth-service] ioredis is not installed. Redis features are disabled.");
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
      console.warn(`[auth-service] Redis connection failed: ${error.message}`);
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
    console.warn(`[auth-service] Redis operation failed: ${error.message}`);
    return fallback;
  }
};

const closeRedis = async () => {
  if (redis) {
    await redis.quit().catch(() => null);
  }
};

process.once("SIGINT", closeRedis);
process.once("SIGTERM", closeRedis);

module.exports = {
  redis,
  connectRedis,
  safeRedis,
  isRedisEnabled: () => enabled,
};
