const chatService = require('../services/chatService');

class ChatController {
  async createConversation(req, res) {
    try {
      const userId = req.user?.id || req.body.userId || 'anonymous';
      
      const result = await chatService.createConversation(userId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to create conversation',
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: {
          sessionId: result.data.sessionId,
          userId: result.data.userId,
          createdAt: result.data.createdAt
        }
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const { sessionId, message } = req.body;
      const userId = req.user?.id || req.body.userId || 'anonymous';

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      const result = await chatService.sendMessage(
        sessionId || `session_${userId}_${Date.now()}`,
        message,
        userId
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || 'Failed to send message',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'Message sent successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async getConversation(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await chatService.getConversation(sessionId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async getUserConversations(req, res) {
    try {
      const userId = req.user?.id || req.query.userId || 'anonymous';
      const limit = parseInt(req.query.limit) || 10;

      const result = await chatService.getUserConversations(userId, limit);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to get conversations',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Get user conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async closeConversation(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await chatService.closeConversation(sessionId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'Conversation closed successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Close conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async deleteConversation(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await chatService.deleteConversation(sessionId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to delete conversation',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new ChatController();
