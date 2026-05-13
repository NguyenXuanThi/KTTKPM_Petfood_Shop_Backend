const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");

const startServer = async () => {
  try {
    await connectDatabase(mongoUri);

    app.listen(port, () => {
      console.log(`coupon-service is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start coupon-service", error);
    process.exit(1);
  }
};

startServer();
