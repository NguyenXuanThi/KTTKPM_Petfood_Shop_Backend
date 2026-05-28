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
  redis.on("connect", () => console.log("[product-service] Redis connected"));
  redis.on("error", (error) =>
    console.warn(`[product-service] Redis error: ${error.message}`),
  );
} else if (redisEnabled && !Redis) {
  console.warn("[product-service] ioredis is not installed. Redis cache disabled.");
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
      console.warn(`[product-service] Redis connection failed: ${error.message}`);
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
    console.warn(`[product-service] Redis operation failed: ${error.message}`);
    return fallback;
  }
};

const getJson = async (key) =>
  safeRedis(async (client) => {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  }, null);

const setJson = async (key, value, ttlSeconds) =>
  safeRedis(async (client) => client.set(key, JSON.stringify(value), "EX", ttlSeconds));

const deleteByPattern = async (pattern) =>
  safeRedis(async (client) => {
    const stream = client.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream) {
      if (keys.length) await client.del(keys);
    }
  });

const closeRedis = async () => {
  if (redis) await redis.quit().catch(() => null);
};

process.once("SIGINT", closeRedis);
process.once("SIGTERM", closeRedis);

module.exports = {
  redis,
  connectRedis,
  safeRedis,
  getJson,
  setJson,
  deleteByPattern,
};
