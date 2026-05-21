const http = require("http");
const app = require("./app");
const config = require("./config/env");
const connectDB = require("./config/db");
const { Server } = require("socket.io");

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO for real-time chat
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
// Socket.IO connection handling - live chat
const setupLiveSocket = require("./sockets/liveSocket");
setupLiveSocket(io);

// Start server
const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Chat Service running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
});

// Handle listen errors (e.g., port already in use)
server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is already in use. Please free the port or set a different PORT.`,
    );
    process.exit(1);
  }
  console.error("Server error:", err);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} signal received: closing HTTP server`);
  try {
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  } catch (err) {
    console.error("Error during shutdown", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});
