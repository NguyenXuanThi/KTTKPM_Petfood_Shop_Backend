const mongoose = require("mongoose");

const connectDatabase = async (mongoUri) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
};

module.exports = {
  connectDatabase,
};
