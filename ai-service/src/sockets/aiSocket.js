const chatService = require('../services/chatService');
const { checkAiChatLimit } = require('../utils/aiRateLimiter');

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
        const allowed = await checkAiChatLimit(socket.handshake.address || socket.id);
        if (!allowed) {
          socket.emit('receive_message', {
            success: false,
            data: {
              message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
              assistantMessage: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
              products: [],
              cart: [],
              showCheckoutButton: false,
            },
          });
          return;
        }

        if (!sessionId || !message) {
          socket.emit('receive_message', {
            success: false,
            data: {
              message: 'sessionId và message là bắt buộc.',
              assistantMessage: 'sessionId và message là bắt buộc.',
              products: [],
              cart: [],
              showCheckoutButton: false,
            },
          });
          return;
        }

        const result = await chatService.sendMessage(sessionId, message, userId || 'guest');

        const replyText =
          result.data?.message ||
          result.data?.assistantMessage ||
          result.message ||
          'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.';

        socket.emit('receive_message', {
          success: !!result.success,
          data: result.success
            ? {
                ...result.data,
                message: result.data.message || replyText,
                assistantMessage: result.data.assistantMessage || result.data.message || replyText,
                products: result.data.products || [],
                cart: result.data.cart || [],
                showCheckoutButton: !!result.data.showCheckoutButton,
              }
            : {
                message: replyText,
                assistantMessage: replyText,
                products: [],
                cart: [],
                showCheckoutButton: false,
              },
        });
      } catch (err) {
        console.error('AISocket send_message error:', err.message);
        const errText = err.message || 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.';
        socket.emit('receive_message', {
          success: false,
          data: {
            message: errText,
            assistantMessage: errText,
            products: [],
            cart: [],
            showCheckoutButton: false,
          },
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('AISocket: client disconnected', socket.id);
    });
  });
};
