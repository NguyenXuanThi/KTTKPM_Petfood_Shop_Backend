const http = require('http');
const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const { startConsumer, stopConsumer } = require('./services/productKafkaConsumer');

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── HTTP + Socket.IO ──────────────────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const setupAISocket = require('./sockets/aiSocket');
setupAISocket(io);

// ── Kafka Consumer (non-fatal) ────────────────────────────────────────────────
// Started after HTTP server is ready. Failure here does NOT crash the service;
// productClient.js falls back to HTTP when Kafka is unavailable.
startConsumer().catch((err) => {
  console.warn('[Server] Kafka consumer startup error (non-fatal):', err.message);
});

// ── Start HTTP server ─────────────────────────────────────────────────────────
const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`🤖 AI Service running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('   Chạy: npm run free-port   hoặc   npm run dev (tự giải phóng port trước khi start).');
    console.error('   Hoặc đổi port trong .env: AI_PORT=3016');
    process.exit(1);
  }
  console.error('Server error:', err);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  await stopConsumer();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
