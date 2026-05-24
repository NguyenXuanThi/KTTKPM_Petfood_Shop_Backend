const LiveConversation = require('../models/LiveConversation');
const Message = require('../models/Message');
const { getRandomSupportUser } = require('../utils/userClient');

class LiveService {
  async getOrCreateConversation(customerId, customerName = '', customerAvatar = '') {
    try {
      let conv = await LiveConversation.findOne({ customerId });
      
      if (!conv) {
        // Get support user to assign to new conversation
        const supportResult = await getRandomSupportUser();
        const supportId = supportResult.success ? supportResult.data.id : null;
        const supportName = supportResult.success ? supportResult.data.fullName : '';

        conv = new LiveConversation({ 
          customerId, 
          customerName, 
          customerAvatar, 
          participants: [customerId],
          supportId,
          supportName
        });
        await conv.save();
      } else {
        // Update display info if provided
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
      console.error('getOrCreateConversation error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get all conversations (for support staff and admins)
  async getConversations(limit = 50) {
    try {
      const convs = await LiveConversation.find()
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(limit)
        .lean();
      return { success: true, data: convs };
    } catch (error) {
      console.error('getConversations error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get conversations assigned to specific support user
  async getConversationsForSupport(supportId, limit = 50) {
    try {
      // Find conversations assigned to this support user
      // Also include conversations with no support assigned (to be claimed)
      const convs = await LiveConversation.find({
        $or: [
          { supportId },
          { supportId: null }
        ]
      })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(limit)
        .lean();
      
      return { success: true, data: convs };
    } catch (error) {
      console.error('getConversationsForSupport error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Backward compatibility: get conversations for admin (all conversations)
  async getConversationsForAdmin(limit = 50) {
    return this.getConversations(limit);
  }

  async getConversationById(conversationId) {
    try {
      const conv = await LiveConversation.findById(conversationId);
      if (!conv) return { success: false, error: 'Conversation not found' };
      return { success: true, data: conv };
    } catch (error) {
      console.error('getConversationById error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getMessages(conversationId, limit = 20, before = null) {
    try {
      const filter = { conversationId };
      if (before) {
        // accept ISO date string
        const beforeDate = new Date(before);
        if (!isNaN(beforeDate.getTime())) {
          // get messages earlier than the beforeDate
          filter.createdAt = { $lt: beforeDate };
        }
      }

      // Fetch newest messages first (optionally before a date), then reverse to chronological order
      const msgs = await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      const messages = msgs.reverse();
      return { success: true, data: messages };
    } catch (error) {
      console.error('getMessages error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async addMessage(conversationId, senderId, senderRole, messageText = '', senderName = '', senderAvatar = '', options = {}) {
    try {
      console.log(`[addMessage] Processing message from ${senderName} (${senderRole}):`, { conversationId, senderId, messageText: messageText?.substring(0, 50) });
      
      const conv = await LiveConversation.findById(conversationId);
      if (!conv) {
        console.error(`[addMessage] Conversation not found: ${conversationId}`);
        return { success: false, error: 'Conversation not found' };
      }

      const { messageType = 'text', fileUrl = '', metadata = {}, productId = '', productData = {} } = options;

      const msg = new Message({
        conversationId,
        senderId,
        senderRole,
        message: messageText || '',
        messageType,
        fileUrl: fileUrl || '',
        metadata: metadata || {},
        productId: productId || '',
        productData: productData || {},
        senderName,
        senderAvatar
      });

      await msg.save();
      console.log(`[addMessage] Message saved successfully:`, msg._id);
      
      // update conversation preview
      if (messageType === 'image') {
        conv.lastMessage = '[Hình ảnh]';
      } else if (messageType === 'product') {
        conv.lastMessage = (productData && productData.name) ? `[Sản phẩm] ${productData.name}` : '[Sản phẩm]';
      } else {
        conv.lastMessage = messageText;
      }
      conv.lastMessageAt = msg.createdAt;
      if (!conv.participants.includes(senderId)) conv.participants.push(senderId);
      await conv.save();
      console.log(`[addMessage] Conversation updated:`, conversationId);

      return { success: true, data: msg, conversation: conv };
    } catch (error) {
      console.error('[addMessage] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async markAsRead(conversationId, userId) {
    try {
      await Message.updateMany({ conversationId, senderId: { $ne: userId } }, { $set: { isRead: true } });
      return { success: true };
    } catch (error) {
      console.error('markAsRead error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Assign conversation to support user
  async assignConversationToSupport(conversationId, supportId, supportName = '') {
    try {
      const conv = await LiveConversation.findByIdAndUpdate(
        conversationId,
        { 
          supportId, 
          supportName,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!conv) return { success: false, error: 'Conversation not found' };
      return { success: true, data: conv };
    } catch (error) {
      console.error('assignConversationToSupport error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get conversation participants (for socket room management)
  async getConversationParticipants(conversationId) {
    try {
      const conv = await LiveConversation.findById(conversationId);
      if (!conv) return { success: false, error: 'Conversation not found' };
      
      const participants = {
        customerId: conv.customerId,
        supportId: conv.supportId,
        // Backward compatibility
        adminId: conv.adminId,
        allParticipantIds: [...new Set([conv.customerId, conv.supportId, conv.adminId].filter(Boolean))]
      };
      
      return { success: true, data: participants };
    } catch (error) {
      console.error('getConversationParticipants error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new LiveService();
