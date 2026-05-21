const liveService = require("../services/liveService");

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("LiveSocket: client connected", socket.id);

    // Join a conversation (or admin view)
    socket.on("joinConversation", async ({ conversationId, userId, role }) => {
      try {
        socket.data.userId = userId;
        socket.data.role = role;
        console.log(`Socket ${socket.id} joinConversation payload:`, {
          conversationId,
          userId,
          role,
        });

        if (conversationId) {
          socket.join(conversationId);
          console.log(`Socket ${socket.id} joined room ${conversationId}`);

          // Send existing messages for this conversation
          const msgs = await liveService.getMessages(conversationId);
          if (msgs.success) {
            socket.emit("receiveMessage", {
              conversationId,
              messages: msgs.data,
            });
          }
        }

        // If admin, send conversation list
        if (role === "admin") {
          const list = await liveService.getConversationsForAdmin();
          if (list.success) {
            socket.emit("conversationUpdated", list.data);
          }
        }
      } catch (err) {
        console.error("joinConversation error", err.message);
        socket.emit("error", { message: err.message });
      }
    });

    // Receive a message from client and persist
    socket.on("sendMessage", async (payload) => {
      try {
        console.log("sendMessage received payload:", payload);
        const {
          conversationId,
          senderId,
          senderRole,
          message,
          senderName,
          senderAvatar,
          messageType,
          fileUrl,
          metadata,
        } = payload || {};

        if (!conversationId || !senderId) {
          socket.emit("error", { message: "Invalid payload for sendMessage" });
          return;
        }

        if (messageType === "image" && !fileUrl) {
          socket.emit("error", {
            message: "Missing fileUrl for image message",
          });
          return;
        }

        if (
          messageType === "product" &&
          !(payload.productId || payload.productData)
        ) {
          socket.emit("error", {
            message: "Missing product data for product message",
          });
          return;
        }

        const res = await liveService.addMessage(
          conversationId,
          senderId,
          senderRole,
          message || "",
          senderName || "",
          senderAvatar || "",
          {
            messageType,
            fileUrl,
            metadata,
            productId: payload.productId || "",
            productData: payload.productData || {},
          },
        );
        if (!res.success) {
          socket.emit("error", { message: res.error });
          return;
        }

        // Emit the new message to everyone in the conversation room
        io.to(conversationId).emit("receiveMessage", {
          conversationId,
          message: res.data,
        });

        // Notify admins about updated conversation list
        const convs = await liveService.getConversationsForAdmin();
        if (convs.success) {
          io.sockets.sockets.forEach((s) => {
            if (s.data && s.data.role === "admin") {
              s.emit("conversationUpdated", convs.data);
            }
          });
        }
      } catch (err) {
        console.error("sendMessage error", err.message);
        socket.emit("error", { message: err.message });
      }
    });

    // Typing indicator
    socket.on("typing", ({ conversationId, userId }) => {
      if (conversationId) {
        socket.to(conversationId).emit("typing", { conversationId, userId });
      }
    });

    socket.on("disconnect", () => {
      console.log("LiveSocket: client disconnected", socket.id);
    });
  });
};
