const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");
const { startBusinessEventConsumer } = require("./events/businessEventConsumer");
const TOPICS = require("./events/topics");
const { ensureTopics } = require("./events/kafkaAdmin");

const startServer = async () => {
  try {
    await connectDatabase(mongoUri);

    app.listen(port, () => {
      console.log(`product-service is running on port ${port}`);
      console.log("[product-service] Ensuring Kafka topics...");
      ensureTopics([TOPICS.PRODUCT_VIEWED, TOPICS.PRODUCT_SEARCHED])
        .then((result) => {
          if (result.ready) console.log("[product-service] Kafka topics ready");
          else console.warn(`[product-service] Kafka unavailable, topic bootstrap skipped: ${result.reason}`);
        })
        .catch((error) => {
          console.warn("[product-service] Kafka topic bootstrap failed:", error.message);
        });
      startBusinessEventConsumer().catch((error) => {
        console.warn("[product-service] Kafka consumer startup failed:", error.message);
      });
    });
  } catch (error) {
    console.error("Failed to start product-service", error);
    process.exit(1);
  }
};

startServer();
