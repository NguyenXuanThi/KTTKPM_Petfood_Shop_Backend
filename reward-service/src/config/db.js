const mongoose = require("mongoose");

const connectDatabase = async (mongoUri) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: Number(process.env.REWARD_MONGO_SERVER_SELECTION_TIMEOUT_MS || 8000),
    connectTimeoutMS: Number(process.env.REWARD_MONGO_CONNECT_TIMEOUT_MS || 8000),
  });
  console.log("reward-service connected to MongoDB");
};

const isDatabaseReady = () => mongoose.connection.readyState === 1;

module.exports = { connectDatabase, isDatabaseReady };
