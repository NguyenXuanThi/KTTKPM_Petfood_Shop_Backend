const http = require('http');
const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const { Server } = require('socket.io');

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO for real-time chat
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO connection handling (will be implemented later)
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Start server
const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Chat Service running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
