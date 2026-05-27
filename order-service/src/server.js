const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");
const { startBankingPaymentTimeoutJob } = require("./jobs/bankingPaymentTimeout.job");
const { startBusinessEventConsumer } = require("./events/businessEventConsumer");

const startServer = async () => {
  try {
    await connectDatabase(mongoUri);

    app.listen(port, () => {
      console.log(`order-service is running on port ${port}`);
      startBankingPaymentTimeoutJob();
      startBusinessEventConsumer().catch((error) => {
        console.warn("[order-service] Kafka consumer startup failed:", error.message);
      });
    });
  } catch (error) {
    console.error("Failed to start order-service", error);
    process.exit(1);
  }
};

startServer();
