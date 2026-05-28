const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");
const TOPICS = require("./events/topics");
const { ensureTopics } = require("./events/kafkaAdmin");

const bootstrapKafkaTopics = () => {
  console.log("[payment-service] Ensuring Kafka topics...");
  ensureTopics([TOPICS.PAYMENT_PAID, TOPICS.PAYMENT_FAILED])
    .then((result) => {
      if (result.ready) console.log("[payment-service] Kafka topics ready");
      else console.warn(`[payment-service] Kafka unavailable, topic bootstrap skipped: ${result.reason}`);
    })
    .catch((error) => {
      console.warn("[payment-service] Kafka topic bootstrap failed:", error.message);
    });
};

const startServer = async () => {
  try {
    await connectDatabase(mongoUri);

    app.listen(port, () => {
      console.log(`payment-service is running on port ${port}`);
      bootstrapKafkaTopics();
    });
  } catch (error) {
    console.error("Failed to start payment-service", error);
    process.exit(1);
  }
};

startServer();
