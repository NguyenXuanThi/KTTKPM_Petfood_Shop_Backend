const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");
const { startBusinessEventConsumer } = require("./events/businessEventConsumer");

const startServer = async () => {
  app.listen(port, () => {
    console.log(`reward-service is running on port ${port}`);
  });

  try {
    await connectDatabase(mongoUri);
    startBusinessEventConsumer().catch((error) => {
      console.warn("[reward-service] Kafka consumer startup failed:", error.message);
    });
  } catch (error) {
    console.error(
      "reward-service MongoDB connection failed. Service is still running, but reward APIs need database connectivity.",
      error.message,
    );
  }
};

startServer();
