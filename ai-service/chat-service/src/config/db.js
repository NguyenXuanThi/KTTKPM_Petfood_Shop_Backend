const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ MongoDB connected (ai-service)');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // Non-fatal: service can run without DB (in-memory sessions)
  }
};

module.exports = connectDB;
