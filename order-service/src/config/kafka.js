process.env.KAFKAJS_NO_PARTITIONER_WARNING = process.env.KAFKAJS_NO_PARTITIONER_WARNING || "1";

let Kafka;
try {
  ({ Kafka } = require("kafkajs"));
} catch (error) {
  Kafka = null;
}

const serviceName = process.env.KAFKA_CLIENT_ID || process.env.SERVICE_NAME || "petfood-service";
const kafkaEnabled = process.env.KAFKA_ENABLED !== "false";
const kafkaDebugLog = process.env.KAFKA_DEBUG_LOG === "true";
const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

let kafka = null;

if (kafkaEnabled && Kafka) {
  kafka = new Kafka({ clientId: serviceName, brokers });
} else if (kafkaEnabled && !Kafka) {
  console.warn(`[${serviceName}] kafkajs is not installed. Kafka is disabled.`);
}

module.exports = {
  kafka,
  kafkaEnabled: kafkaEnabled && Boolean(Kafka),
  kafkaDebugLog,
  serviceName,
  brokers,
};
