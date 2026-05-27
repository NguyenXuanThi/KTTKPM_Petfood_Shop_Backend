const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");
const { startBusinessEventConsumer } = require("./events/businessEventConsumer");

const startServer = async () => {
  try {
    await connectDatabase(mongoUri);

    app.listen(port, () => {
      console.log(`product-service is running on port ${port}`);
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
