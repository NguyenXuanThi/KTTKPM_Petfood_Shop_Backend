const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const config = require('./config/env');
const chatRoutes = require('./routes/chatRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));
app.use(compression());
app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware (optional - allows anonymous)
app.use(authMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chat Service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/moderation', moderationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: config.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;
