const app = require("./app");
const { connectDatabase } = require("./config/db");
const { mongoUri, port } = require("./config/env");

const startServer = async () => {
  app.listen(port, () => {
    console.log(`reward-service is running on port ${port}`);
  });

  try {
    await connectDatabase(mongoUri);
  } catch (error) {
    console.error(
      "reward-service MongoDB connection failed. Service is still running, but reward APIs need database connectivity.",
      error.message,
    );
  }
};

startServer();
