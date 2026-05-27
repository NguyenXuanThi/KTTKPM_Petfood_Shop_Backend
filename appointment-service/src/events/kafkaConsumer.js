const { kafka, kafkaEnabled, kafkaDebugLog, serviceName } = require("../config/kafka");
const { ensureTopics } = require("./kafkaAdmin");

const RETRY_DELAY_MS = Number(process.env.KAFKA_CONSUMER_RETRY_DELAY_MS || 5000);

const startConsumer = async ({ groupId, topics, eachMessage }) => {
  if (!kafkaEnabled || !kafka) {
    console.warn(`[${serviceName}] Kafka consumer disabled for ${groupId}`);
    return null;
  }

  const retryLater = (reason) => {
    console.warn(
      `[${serviceName}] Kafka consumer will retry groupId=${groupId} in ${RETRY_DELAY_MS}ms reason=${reason}`,
    );
    setTimeout(() => {
      startConsumer({ groupId, topics, eachMessage }).catch((error) => {
        console.warn(`[${serviceName}] Kafka consumer retry failed groupId=${groupId}: ${error.message}`);
      });
    }, RETRY_DELAY_MS).unref?.();
  };

  console.log(`[${serviceName}] Ensuring Kafka topics...`);
  const topicResult = await ensureTopics(topics, { retries: 5, retryDelayMs: 3000 });
  if (!topicResult.ready) {
    console.warn(`[${serviceName}] Kafka unavailable, topics not ready: ${topicResult.reason}`);
    retryLater(topicResult.reason);
    return null;
  }
  console.log(`[${serviceName}] Kafka topics ready`);
  console.log(`[${serviceName}] Starting Kafka consumer...`);

  const consumer = kafka.consumer({ groupId });
  try {
    await consumer.connect();
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        let event = null;
        try {
          event = JSON.parse(message.value.toString());
          if (kafkaDebugLog) {
            console.log(
              `[${serviceName}] Kafka debug topic=${topic} partition=${partition} offset=${message.offset} payload=${JSON.stringify(event)}`,
            );
          }
          await eachMessage({ topic, partition, message, event });
        } catch (error) {
          console.error(
            `[${serviceName}] Failed processing ${event?.eventType || topic} eventId=${event?.eventId || "unknown"} orderId=${event?.data?.orderId || "n/a"} userId=${event?.data?.userId || "n/a"} error=${error.message}`,
          );
        }
      },
    });
    console.log(`[${serviceName}] Kafka consumer started: ${groupId}`);
    console.log(`[${serviceName}] Subscribed topics: ${topics.join(", ")}`);
    return consumer;
  } catch (error) {
    console.warn(`[${serviceName}] Kafka consumer unavailable (${groupId}): ${error.message}`);
    await consumer.disconnect().catch(() => null);
    retryLater(error.message);
    return null;
  }
};

module.exports = {
  startConsumer,
};
