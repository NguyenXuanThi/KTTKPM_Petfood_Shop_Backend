const mongoose = require("mongoose");

const connectDatabase = async (mongoUri) => {
  await mongoose.connect(mongoUri);
  await dropObsoleteIndexes();
};

const dropObsoleteIndexes = async () => {
  const collection = mongoose.connection.collection("payments");
  const indexes = await collection.indexes();
  const hasLegacyVnpIndex = indexes.some((index) => index.name === "vnpTxnRef_1");

  if (hasLegacyVnpIndex) {
    await collection.dropIndex("vnpTxnRef_1");
    console.log("[payment-service] Dropped obsolete index payments.vnpTxnRef_1");
  }
};

module.exports = {
  connectDatabase,
};
