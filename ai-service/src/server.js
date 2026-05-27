const http = require('http');
const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const { startConsumer, stopConsumer } = require('./services/productKafkaConsumer');
const TOPICS = require('./events/topics');
const { ensureTopics } = require('./events/kafkaAdmin');

// â”€â”€ Database â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
connectDB();

// â”€â”€ HTTP + Socket.IO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Kafka Consumer (non-fatal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Started after HTTP server is ready. Failure here does NOT crash the service;
// productClient.js falls back to HTTP when Kafka is unavailable.
startConsumer().catch((err) => {
  console.warn('[Server] Kafka consumer startup error (non-fatal):', err.message);
});

// â”€â”€ Start HTTP server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`ðŸ¤– AI Service running on port ${PORT}`);
  console.log(`ðŸ“¡ WebSocket server ready`);
  console.log(`ðŸŒ Environment: ${config.NODE_ENV}`);
  console.log('[ai-service] Ensuring Kafka topics...');
  ensureTopics([TOPICS.AI_CHAT_CREATED])
    .then((result) => {
      if (result.ready) console.log('[ai-service] Kafka topics ready');
      else console.warn(`[ai-service] Kafka unavailable, topic bootstrap skipped: ${result.reason}`);
    })
    .catch((error) => {
      console.warn('[ai-service] Kafka topic bootstrap failed:', error.message);
    });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`âŒ Port ${PORT} is already in use.`);
    console.error('   Cháº¡y: npm run free-port   hoáº·c   npm run dev (tá»± giáº£i phÃ³ng port trÆ°á»›c khi start).');
    console.error('   Hoáº·c Ä‘á»•i port trong .env: AI_PORT=3016');
    process.exit(1);
  }
  console.error('Server error:', err);
});

// â”€â”€ Graceful shutdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


