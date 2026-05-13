require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3012,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/petfood_chat',
  JWT_SECRET: process.env.JWT_SECRET || 'petfood_chat_secret',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
