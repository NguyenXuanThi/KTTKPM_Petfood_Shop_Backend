const Conversation = require('../models/Conversation');
const aiService = require('./aiService');
const { v4: uuidv4 } = require('uuid');

// Trigger summarization when messages array reaches this count (and multiples of SUMMARY_INTERVAL)
const SUMMARY_FIRST_TRIGGER = 5;
const SUMMARY_INTERVAL = 10;

class ChatService {
  // ---------------------------------------------------------------------------
  // Create a new conversation session
  // ---------------------------------------------------------------------------
  async createConversation(userId, sessionId = null) {
    try {
      const resolvedSessionId = sessionId || uuidv4();
      const conversation = new Conversation({
        userId,
        sessionId: resolvedSessionId,
        messages: [],
        context: {},
        status: 'active',
      });
      await conversation.save();
      return { success: true, data: conversation };
    } catch (error) {
      console.error('Error creating conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Retrieve an existing conversation by sessionId
  // ---------------------------------------------------------------------------
  async getConversation(sessionId) {
    try {
      const conversation = await Conversation.findOne({ sessionId });
      if (!conversation) return { success: false, error: 'Conversation not found' };
      return { success: true, data: conversation };
    } catch (error) {
      console.error('Error getting conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Memory Summarization: triggers at 5 messages, then every 10
  // Summarizes all messages except the 2 most recent, stores in context.summary
  // ---------------------------------------------------------------------------
  async summarizeIfNeeded(conversation) {
    const total = conversation.messages.length;

    const shouldSummarize =
      total === SUMMARY_FIRST_TRIGGER ||
      (total > SUMMARY_FIRST_TRIGGER && (total - SUMMARY_FIRST_TRIGGER) % SUMMARY_INTERVAL === 0);

    if (!shouldSummarize) return;

    // Summarize everything except the last 2 messages
    const messagesToSummarize = conversation.messages.slice(0, -2);
    if (messagesToSummarize.length === 0) return;

    console.log(`[ChatService] 📝 Triggering summarization at ${total} messages...`);

    const summary = await aiService.summarizeConversation(messagesToSummarize);

    if (summary) {
      if (!conversation.context) conversation.context = {};
      conversation.context.summary = summary;
      conversation.markModified('context');
      console.log('[ChatService] ✅ Summary saved:', summary.substring(0, 60) + '...');
    }
  }

  // ---------------------------------------------------------------------------
  // Main: process a user message and return AI response
  // ---------------------------------------------------------------------------
  async sendMessage(sessionId, userMessage, userId) {
    try {
      // Get or create conversation
      let conversationResult = await this.getConversation(sessionId);
      if (!conversationResult.success) {
        conversationResult = await this.createConversation(userId, sessionId);
        if (!conversationResult.success) throw new Error('Failed to create conversation');
      }

      const conversation = conversationResult.data;

      // ── Push user message ─────────────────────────────────────────────────
      conversation.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      // Work on a mutable copy of context
      let context = {
        ...(conversation.context || {}),
        userId,
        sessionId,
      };

      // ── Call AI with Function Calling ─────────────────────────────────────
      const aiResponse = await aiService.chat(conversation.messages, context);

      if (!aiResponse.success) throw new Error('AI service failed');

      // ── Merge context updates from tools ──────────────────────────────────
      if (aiResponse.contextUpdates && Object.keys(aiResponse.contextUpdates).length > 0) {
        context = { ...context, ...aiResponse.contextUpdates };
      }

      // ── Determine intent label from tool used ─────────────────────────────
      const intent = aiResponse.toolsUsed.length > 0 ? aiResponse.toolsUsed[0] : 'general';

      // Mark pending checkout when add_to_cart_context was used
      if (aiResponse.toolsUsed.includes('add_to_cart_context')) {
        context.pendingCheckout = false; // set true when user explicitly confirms
      }

      // Chỉ gửi sản phẩm về client khi lượt này thực sự gọi search_products
      const products =
        aiResponse.toolsUsed.includes('search_products')
          ? (context.products || []).slice(0, 3)
          : [];

      // Xóa sản phẩm cũ khỏi context khi chuyển sang luồng đặt lịch / FAQ
      if (
        aiResponse.toolsUsed.includes('check_available_slots') ||
        aiResponse.toolsUsed.includes('book_appointment')
      ) {
        context.products = [];
      }

      // ── Push assistant message ────────────────────────────────────────────
      conversation.messages.push({
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        metadata: {
          intent,
          toolsUsed: aiResponse.toolsUsed,
          products: products.length > 0 ? products : undefined,
        },
      });

      // ── Memory summarization (non-blocking on response, awaited for save) ─
      await this.summarizeIfNeeded(conversation);

      // ── Persist context ───────────────────────────────────────────────────
      conversation.context = context;
      conversation.markModified('context');
      await conversation.save();

      // ── Build response payload (shape unchanged for Frontend) ─────────────
      return {
        success: true,
        data: {
          message: aiResponse.message,
          assistantMessage: aiResponse.message,
          intent,
          sessionId: conversation.sessionId,
          products,
          cart: context.cart || [],
          showCheckoutButton: context.pendingCheckout === true,
          context,
        },
      };
    } catch (error) {
      console.error('Error sending message:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
      };
    }
  }
}

module.exports = new ChatService();
