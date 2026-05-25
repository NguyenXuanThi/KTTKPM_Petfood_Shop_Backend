const chatService = require('../services/chatService');

module.exports = function (io) {
  io.on('connection', (socket) => {
    console.log('AISocket: client connected', socket.id);

    socket.on('join_conversation', ({ sessionId }) => {
      if (sessionId) {
        socket.join(sessionId);
        socket.data.sessionId = sessionId;
        console.log(`AISocket: joined session ${sessionId}`);
      }
    });

    socket.on('send_message', async ({ sessionId, message, userId }) => {
      try {
        if (!sessionId || !message) {
          socket.emit('error', { message: 'sessionId and message are required' });
          return;
        }

        const result = await chatService.sendMessage(sessionId, message, userId || 'guest');

        if (result.success) {
          socket.emit('receive_message', {
            success: true,
            data: result.data
          });
        } else {
          socket.emit('receive_message', {
            success: false,
            data: { assistantMessage: result.message || 'Xin lỗi, đã có lỗi xảy ra.' }
          });
        }
      } catch (err) {
        console.error('AISocket send_message error:', err.message);
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('AISocket: client disconnected', socket.id);
    });
  });
};
