const liveService = require('../services/liveService');

// Helper: Check if user role is admin or support
function isStaffRole(role) {
  return role === 'admin' || role === 'support';
}

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('LiveSocket: client connected', socket.id);

    // Join a conversation (or support/admin view)
    socket.on('joinConversation', async ({ conversationId, userId, role }) => {
      try {
        socket.data.userId = userId;
        socket.data.role = role;
        console.log(`[Socket joinConversation] ${role} user ${userId} joining conversation`, { conversationId, socketId: socket.id });

        if (conversationId) {
          socket.join(conversationId);
          console.log(`[Socket joinConversation] Successfully joined room:`, conversationId);

          // Send existing messages for this conversation
          const msgs = await liveService.getMessages(conversationId);
          if (msgs.success) {
            console.log(`[Socket joinConversation] Sending ${msgs.data.length} messages to ${userId}`);
            socket.emit('receiveMessage', { conversationId, messages: msgs.data });
          }
        }

        // If support or admin, send conversation list
        if (isStaffRole(role)) {
          let list;
          
          // For support staff, get their assigned conversations
          if (role === 'support') {
            list = await liveService.getConversationsForSupport(userId);
            console.log(`[Socket joinConversation] Sending ${list.data?.length || 0} conversations to support ${userId}`);
          } else {
            // For admin, get all conversations
            list = await liveService.getConversationsForAdmin();
            console.log(`[Socket joinConversation] Sending ${list.data?.length || 0} conversations to admin ${userId}`);
          }
          
          if (list.success) {
            socket.emit('conversationUpdated', list.data);
          }
        }
      } catch (err) {
        console.error('[Socket joinConversation] Error:', err.message);
        socket.emit('error', { message: err.message });
      }
    });

    // Receive a message from client and persist
    socket.on('sendMessage', async (payload) => {
      try {
        const { conversationId, senderId, senderRole, message, senderName, senderAvatar, messageType, fileUrl, metadata } = payload || {};
        console.log(`[Socket sendMessage] Received from ${senderName} (${senderRole}):`, { conversationId, senderId, messageType, messageLength: message?.length });

        if (!conversationId || !senderId) {
          console.warn(`[Socket sendMessage] Invalid payload - missing conversationId or senderId`, { conversationId, senderId });
          socket.emit('error', { message: 'Invalid payload for sendMessage' });
          return;
        }

        if (messageType === 'image' && !fileUrl) {
          console.warn(`[Socket sendMessage] Image message without fileUrl`);
          socket.emit('error', { message: 'Missing fileUrl for image message' });
          return;
        }

        if (messageType === 'product' && !(payload.productId || payload.productData)) {
          console.warn(`[Socket sendMessage] Product message without productData`);
          socket.emit('error', { message: 'Missing product data for product message' });
          return;
        }

        const res = await liveService.addMessage(
          conversationId, 
          senderId, 
          senderRole, 
          message || '', 
          senderName || '', 
          senderAvatar || '', 
          { messageType, fileUrl, metadata, productId: payload.productId || '', productData: payload.productData || {} }
        );
        
        if (!res.success) {
          console.error(`[Socket sendMessage] addMessage failed:`, res.error);
          socket.emit('error', { message: res.error });
          return;
        }

        console.log(`[Socket sendMessage] Message saved. Emitting to room:`, conversationId);
        // Emit the new message to everyone in the conversation room
        io.to(conversationId).emit('receiveMessage', { conversationId, message: res.data });
        console.log(`[Socket sendMessage] Message emitted to room ${conversationId}`);

        // Get conversation participants to notify staff
        const participants = await liveService.getConversationParticipants(conversationId);
        if (participants.success) {
          // Get updated conversations list for support and admin staff
          const adminConvs = await liveService.getConversationsForAdmin();
          
          // Broadcast updated conversation list so admin UIs receive it in real-time
          if (adminConvs.success) {
            try {
              io.emit('conversationUpdated', adminConvs.data);
            } catch (e) {
              console.error('[Socket sendMessage] broadcast conversationUpdated failed', e.message);
            }
          }

          // Notify support staff assigned to this conversation
          if (participants.data.supportId) {
            const supportConvs = await liveService.getConversationsForSupport(participants.data.supportId);
            io.sockets.sockets.forEach((s) => {
              if (s.data && s.data.role === 'support' && s.data.userId === participants.data.supportId && supportConvs.success) {
                console.log(`[Socket sendMessage] Notifying support ${participants.data.supportId} about conversation update`);
                s.emit('conversationUpdated', supportConvs.data);
              }
            });
          }
        }
      } catch (err) {
        console.error('[Socket sendMessage] Error:', err.message);
        socket.emit('error', { message: err.message });
      }
    });

    // Typing indicator
    socket.on('typing', ({ conversationId, userId }) => {
      if (conversationId) {
        socket.to(conversationId).emit('typing', { conversationId, userId });
      }
    });

    socket.on('disconnect', () => {
      console.log('LiveSocket: client disconnected', socket.id);
    });
  });
};
