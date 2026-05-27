const { safeRedis } = require("../config/redis");

const checkAiChatLimit = async (identifier) => {
  const key = `rate:ai:chat:ip:${identifier || "unknown"}`;
  const count = await safeRedis(async (client) => {
    const value = await client.incr(key);
    if (value === 1) {
      await client.expire(key, 60);
    }
    return value;
  }, null);

  return count === null || count <= 30;
};

module.exports = {
  checkAiChatLimit,
};
