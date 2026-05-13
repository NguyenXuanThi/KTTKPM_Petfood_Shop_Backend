const Conversation = require('../models/Conversation');
const aiService = require('./aiService');
const { v4: uuidv4 } = require('uuid');

class ChatService {
  async createConversation(userId) {
    try {
      const sessionId = uuidv4();
      const conversation = new Conversation({
        userId,
        sessionId,
        messages: [],
        status: 'active'
      });

      await conversation.save();
      return { success: true, data: conversation };
    } catch (error) {
      console.error('Error creating conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getConversation(sessionId) {
    try {
      const conversation = await Conversation.findOne({ sessionId });
      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }
      return { success: true, data: conversation };
    } catch (error) {
      console.error('Error getting conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getUserConversations(userId, limit = 10) {
    try {
      const conversations = await Conversation.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(limit);
      
      return { success: true, data: conversations };
    } catch (error) {
      console.error('Error getting user conversations:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendMessage(sessionId, userMessage, userId) {
    try {
      // Get or create conversation
      let conversationResult = await this.getConversation(sessionId);
      
      if (!conversationResult.success) {
        conversationResult = await this.createConversation(userId);
        if (!conversationResult.success) {
          throw new Error('Failed to create conversation');
        }
      }

      const conversation = conversationResult.data;
      
      console.log('=== CONVERSATION LOADED ===');
      console.log('Session ID:', sessionId);
      console.log('Existing context:', JSON.stringify(conversation.context, null, 2));

      // Add user message to conversation
      conversation.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Analyze intent
      const intent = await aiService.analyzeIntent(userMessage);
      console.log('=== INTENT ANALYSIS ===');
      console.log('User message:', userMessage);
      console.log('Detected intent:', intent);

      // Enrich context with product information if needed
      // IMPORTANT: Use existing context from conversation
      let context = conversation.context || {};
      let products = [];
      let orderDetails = null;
      
      if (intent.intent === 'order') {
        console.log('=== ORDER INTENT ===');
        // Extract order details first
        orderDetails = aiService.extractOrderDetails(userMessage, context);
        
        if (orderDetails.hasOrder) {
          console.log('Order has items, adding to cart');
          // Add to cart context
          if (!context.cart) {
            context.cart = [];
          }
          
          orderDetails.items.forEach(item => {
            const existingItem = context.cart.find(ci => ci.product._id === item.product._id);
            if (existingItem) {
              existingItem.quantity += item.quantity;
            } else {
              context.cart.push(item);
            }
          });
          
          console.log('Cart after adding:', context.cart);
          
          context.lastIntent = intent.intent;
          context.lastUserMessage = userMessage;
          context.pendingCheckout = false; // Ask if want to buy more
          // Keep products from previous search
          products = context.products || [];
        } else {
          console.log('No order items extracted');
        }
      } else if (intent.intent === 'confirm_order') {
        // User confirms checkout
        context.lastIntent = intent.intent;
        context.lastUserMessage = userMessage;
        context.pendingCheckout = true; // Show checkout button
        // Keep products and cart
        products = context.products || [];
      } else if (intent.intent === 'continue_shopping') {
        // User wants to continue shopping - search for more products
        const productContext = await aiService.enrichContextWithProducts(userMessage);
        products = productContext.products || [];
        context = { 
          ...context, 
          products: products,
          quantityIntent: productContext.quantityIntent,
          lastUserMessage: userMessage,
          lastIntent: intent.intent,
          pendingCheckout: false
        };
      } else if (intent.intent === 'product_search' || intent.intent === 'stock_check') {
        const productContext = await aiService.enrichContextWithProducts(userMessage);
        products = productContext.products || [];
        context = { 
          ...context, 
          products: products,
          quantityIntent: productContext.quantityIntent,
          lastUserMessage: userMessage,
          lastIntent: intent.intent
        };
      } else {
        // Keep previous products in context for reference
        context.lastUserMessage = userMessage;
        context.lastIntent = intent.intent;
        // Keep products from previous search
        products = context.products || [];
      }

      // Get AI response
      const aiResponse = await aiService.chat(conversation.messages, context);

      if (!aiResponse.success) {
        throw new Error('AI service failed');
      }

      // Add assistant message to conversation
      conversation.messages.push({
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        metadata: {
          intent: intent.intent,
          confidence: intent.confidence,
          products: products.length > 0 ? products.slice(0, 3) : undefined
        }
      });

      // Update context - IMPORTANT: Save context back to conversation
      conversation.context = context;
      console.log('Saving context to conversation:', JSON.stringify(context, null, 2));
      
      // Mark context as modified for Mongoose to save it
      conversation.markModified('context');

      // Save conversation
      await conversation.save();
      
      console.log('Conversation saved. Context after save:', JSON.stringify(conversation.context, null, 2));

      return {
        success: true,
        data: {
          message: aiResponse.message,
          intent: intent.intent,
          sessionId: conversation.sessionId,
          // Always send products if available
          products: products.length > 0 ? products.slice(0, 3) : undefined,
          cart: context.cart,
          showCheckoutButton: context.pendingCheckout === true,
          context: context
        }
      };
    } catch (error) {
      console.error('Error sending message:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.'
      };
    }
  }

  async closeConversation(sessionId) {
    try {
      const conversation = await Conversation.findOne({ sessionId });
      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }

      conversation.status = 'closed';
      await conversation.save();

      return { success: true, data: conversation };
    } catch (error) {
      console.error('Error closing conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteConversation(sessionId) {
    try {
      await Conversation.deleteOne({ sessionId });
      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ChatService();
