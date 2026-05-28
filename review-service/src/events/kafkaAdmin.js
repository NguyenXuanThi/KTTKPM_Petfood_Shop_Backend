const { kafka, kafkaEnabled, serviceName } = require("../config/kafka");

const DEFAULT_TOPIC_CONFIG = {
  numPartitions: 1,
  replicationFactor: 1,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureTopics = async (topics = [], options = {}) => {
  const uniqueTopics = [...new Set((topics || []).filter(Boolean))];
  if (!uniqueTopics.length) return { ready: true, topics: [] };

  if (!kafkaEnabled || !kafka) {
    return { ready: false, reason: "kafka-disabled", topics: uniqueTopics };
  }

  const retries = options.retries ?? 6;
  const retryDelayMs = options.retryDelayMs ?? 3000;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const admin = kafka.admin();
    try {
      await admin.connect();
      const existingTopics = await admin.listTopics();
      const missingTopics = uniqueTopics.filter((topic) => !existingTopics.includes(topic));

      if (missingTopics.length) {
        await admin.createTopics({
          waitForLeaders: true,
          topics: missingTopics.map((topic) => ({
            topic,
            numPartitions: DEFAULT_TOPIC_CONFIG.numPartitions,
            replicationFactor: DEFAULT_TOPIC_CONFIG.replicationFactor,
          })),
        });
      }

      await admin.disconnect().catch(() => null);
      return { ready: true, topics: uniqueTopics, created: missingTopics };
    } catch (error) {
      lastError = error;
      await admin.disconnect().catch(() => null);
      console.warn(
        `[${serviceName}] Kafka topic bootstrap failed attempt=${attempt}/${retries} topics=${uniqueTopics.join(",")} error=${error.message}`,
      );
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }

  return {
    ready: false,
    reason: lastError?.message || "topic-bootstrap-failed",
    topics: uniqueTopics,
  };
};

module.exports = {
  ensureTopics,
};
