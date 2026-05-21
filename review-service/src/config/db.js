const mongoose = require("mongoose");

const connectDatabase = async (mongoUri) => {
  await mongoose.connect(mongoUri);
  console.log("review-service connected to MongoDB");
};

module.exports = { connectDatabase };
