const http = require('http');
const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const chatService = require('./services/chatService');

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Join conversation room
  socket.on('join_conversation', (data) => {
    const { sessionId } = data;
    socket.join(sessionId);
    console.log(`User joined conversation: ${sessionId}`);
  });

  // Handle chat message
  socket.on('send_message', async (data) => {
    try {
      const { sessionId, message, userId } = data;

      // Process message through chat service
      const result = await chatService.sendMessage(
        sessionId || `session_${userId}_${Date.now()}`,
        message,
        userId || 'anonymous'
      );

      if (result.success) {
        console.log('Sending products to client:', result.data.products);
        console.log('Cart:', result.data.cart);
        console.log('Show checkout button:', result.data.showCheckoutButton);
        
        // Emit response to the room
        io.to(sessionId).emit('receive_message', {
          success: true,
          data: {
            userMessage: message,
            assistantMessage: result.data.message,
            intent: result.data.intent,
            products: result.data.products,
            cart: result.data.cart,
            showCheckoutButton: result.data.showCheckoutButton,
            sessionId: result.data.sessionId,
            timestamp: new Date()
          }
        });
      } else {
        socket.emit('error', {
          success: false,
          message: result.message || 'Failed to process message'
        });
      }
    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('error', {
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { sessionId, userId } = data;
    socket.to(sessionId).emit('user_typing', { userId });
  });

  // Handle disconnect
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
