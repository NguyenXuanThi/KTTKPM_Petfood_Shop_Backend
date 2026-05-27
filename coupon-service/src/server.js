const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");
const TOPICS = require("./events/topics");
const { ensureTopics } = require("./events/kafkaAdmin");

const bootstrapKafkaTopics = () => {
  console.log("[coupon-service] Ensuring Kafka topics...");
  ensureTopics([TOPICS.COUPON_ASSIGNED])
    .then((result) => {
      if (result.ready) console.log("[coupon-service] Kafka topics ready");
      else console.warn(`[coupon-service] Kafka unavailable, topic bootstrap skipped: ${result.reason}`);
    })
    .catch((error) => {
      console.warn("[coupon-service] Kafka topic bootstrap failed:", error.message);
    });
};

const startServer = async () => {
  try {
    await connectDatabase(mongoUri);

    app.listen(port, () => {
      console.log(`coupon-service is running on port ${port}`);
      bootstrapKafkaTopics();
    });
  } catch (error) {
    console.error("Failed to start coupon-service", error);
    process.exit(1);
  }
};

startServer();
