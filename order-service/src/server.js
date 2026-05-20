const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");
const { startBankingPaymentTimeoutJob } = require("./jobs/bankingPaymentTimeout.job");

const startServer = async () => {
  try {
    await connectDatabase(mongoUri);

    app.listen(port, () => {
      console.log(`order-service is running on port ${port}`);
      startBankingPaymentTimeoutJob();
    });
  } catch (error) {
    console.error("Failed to start order-service", error);
    process.exit(1);
  }
};

startServer();
