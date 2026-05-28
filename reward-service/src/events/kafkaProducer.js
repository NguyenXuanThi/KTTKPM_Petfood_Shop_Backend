const crypto = require("crypto");
const { kafka, kafkaEnabled, kafkaDebugLog, serviceName } = require("../config/kafka");
const { ensureTopics } = require("./kafkaAdmin");

let producer;
let connecting;

const connectProducer = async () => {
  if (!kafkaEnabled || !kafka) return null;
  if (producer) return producer;
  producer = kafka.producer();
  connecting = producer
    .connect()
    .then(() => {
      console.log(`[${serviceName}] Kafka producer connected`);
      return producer;
    })
    .catch((error) => {
      console.warn(`[${serviceName}] Kafka producer unavailable: ${error.message}`);
      producer = null;
      return null;
    });
  return connecting;
};

const buildEvent = ({ eventType, data, eventId, version = 1 }) => ({
  eventId: eventId || crypto.randomUUID(),
  eventType,
  occurredAt: new Date().toISOString(),
  producer: serviceName,
  version,
  data,
});

const publishEvent = async (topic, { eventType = topic, data = {}, eventId, version } = {}) => {
  const event = buildEvent({ eventType, data, eventId, version });

  const topicResult = await ensureTopics([topic], { retries: 3, retryDelayMs: 1000 });
  if (!topicResult.ready) {
    console.warn(`[${serviceName}] Kafka unavailable, skipped ${topic} publish: ${topicResult.reason}`);
    return { published: false, reason: topicResult.reason, event };
  }

  const client = await connectProducer();
  if (!client) return { published: false, reason: "kafka-disabled-or-unavailable", event };

  try {
    if (kafkaDebugLog) {
      console.log(`[${serviceName}] Kafka publish debug topic=${topic} payload=${JSON.stringify(event)}`);
    }
    await client.send({
      topic,
      messages: [
        {
          key: data.userId || data.orderId || data.productId || data.paymentId || event.eventId,
          value: JSON.stringify(event),
        },
      ],
    });
    return { published: true, event };
  } catch (error) {
    console.warn(`[${serviceName}] Failed to publish ${topic} eventId=${event.eventId}: ${error.message}`);
    return { published: false, error: error.message, event };
  }
};

const disconnectProducer = async () => {
  if (producer) await producer.disconnect().catch(() => null);
};

module.exports = {
  publishEvent,
  disconnectProducer,
};
