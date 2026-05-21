const LiveConversation = require("../models/LiveConversation");
const Message = require("../models/Message");

class LiveService {
  async getOrCreateConversation(
    customerId,
    customerName = "",
    customerAvatar = "",
  ) {
    try {
      let conv = await LiveConversation.findOne({ customerId });
      if (!conv) {
        conv = new LiveConversation({
          customerId,
          customerName,
          customerAvatar,
          participants: [customerId],
        });
        await conv.save();
      } else {
        // update display info if provided
        let changed = false;
        if (customerName && conv.customerName !== customerName) {
          conv.customerName = customerName;
          changed = true;
        }
        if (customerAvatar && conv.customerAvatar !== customerAvatar) {
          conv.customerAvatar = customerAvatar;
          changed = true;
        }
        if (changed) await conv.save();
      }
      return { success: true, data: conv };
    } catch (error) {
      console.error("getOrCreateConversation error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getConversationsForAdmin(limit = 50) {
    try {
      const convs = await LiveConversation.find()
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(limit)
        .lean();
      return { success: true, data: convs };
    } catch (error) {
      console.error("getConversationsForAdmin error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getConversationById(conversationId) {
    try {
      const conv = await LiveConversation.findById(conversationId);
      if (!conv) return { success: false, error: "Conversation not found" };
      return { success: true, data: conv };
    } catch (error) {
      console.error("getConversationById error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async getMessages(conversationId, limit = 100) {
    try {
      const messages = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .limit(limit);
      return { success: true, data: messages };
    } catch (error) {
      console.error("getMessages error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async addMessage(
    conversationId,
    senderId,
    senderRole,
    messageText = "",
    senderName = "",
    senderAvatar = "",
    options = {},
  ) {
    try {
      const conv = await LiveConversation.findById(conversationId);
      if (!conv) return { success: false, error: "Conversation not found" };

      const {
        messageType = "text",
        fileUrl = "",
        metadata = {},
        productId = "",
        productData = {},
      } = options;

      const msg = new Message({
        conversationId,
        senderId,
        senderRole,
        message: messageText || "",
        messageType,
        fileUrl: fileUrl || "",
        metadata: metadata || {},
        productId: productId || "",
        productData: productData || {},
        senderName,
        senderAvatar,
      });

      await msg.save();
      // update conversation preview
      if (messageType === "image") {
        conv.lastMessage = "[Hình ảnh]";
      } else if (messageType === "product") {
        conv.lastMessage =
          productData && productData.name
            ? `[Sản phẩm] ${productData.name}`
            : "[Sản phẩm]";
      } else {
        conv.lastMessage = messageText;
      }
      conv.lastMessageAt = msg.createdAt;
      if (!conv.participants.includes(senderId))
        conv.participants.push(senderId);
      await conv.save();

      return { success: true, data: msg, conversation: conv };
    } catch (error) {
      console.error("addMessage error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async markAsRead(conversationId, userId) {
    try {
      await Message.updateMany(
        { conversationId, senderId: { $ne: userId } },
        { $set: { isRead: true } },
      );
      return { success: true };
    } catch (error) {
      console.error("markAsRead error:", error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new LiveService();
