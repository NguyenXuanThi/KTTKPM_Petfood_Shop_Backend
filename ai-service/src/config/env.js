require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.CHAT_PORT || 3011,
  CORS_ORIGIN: process.env.CHAT_CORS_ORIGIN || '*',
  
  // Groq AI Configuration
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  
  // Internal Services
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
  CATEGORY_SERVICE_URL: process.env.CATEGORY_SERVICE_URL || 'http://localhost:3005',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'petfood_secret_key',
  
  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/petfood_chat'
};
