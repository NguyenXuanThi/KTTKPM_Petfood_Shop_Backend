const liveService = require('../services/liveService');

class LiveController {
  async getOrCreateConversation(req, res) {
    try {
      const customerId = req.user?.id || req.body.customerId || req.query.customerId;
      const customerName = req.body.customerName || req.query.customerName || '';
      const customerAvatar = req.body.customerAvatar || req.query.customerAvatar || '';
      if (!customerId) return res.status(400).json({ success: false, message: 'customerId is required' });

      const result = await liveService.getOrCreateConversation(customerId, customerName, customerAvatar);
      if (!result.success) return res.status(500).json({ success: false, error: result.error });

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error('getOrCreateConversation error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get conversations for support staff
  async getConversationsForSupport(req, res) {
    try {
      const supportId = req.user?.id || req.query.supportId;
      if (!supportId) return res.status(400).json({ success: false, message: 'supportId is required' });

      const result = await liveService.getConversationsForSupport(supportId);
      if (!result.success) return res.status(500).json({ success: false, error: result.error });
      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error('getConversationsForSupport error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get all conversations (backward compatible - for admin)
  async getConversationsForAdmin(req, res) {
    try {
      const result = await liveService.getConversationsForAdmin();
      if (!result.success) return res.status(500).json({ success: false, error: result.error });
      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error('getConversationsForAdmin error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const result = await liveService.getMessages(conversationId);
      if (!result.success) return res.status(500).json({ success: false, error: result.error });
      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error('getMessages error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Assign conversation to support staff
  async assignConversationToSupport(req, res) {
    try {
      const { conversationId } = req.params;
      const { supportId, supportName } = req.body;
      
      if (!conversationId || !supportId) {
        return res.status(400).json({ success: false, message: 'conversationId and supportId are required' });
      }

      const result = await liveService.assignConversationToSupport(conversationId, supportId, supportName);
      if (!result.success) return res.status(500).json({ success: false, error: result.error });

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error('assignConversationToSupport error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get conversation participants
  async getConversationParticipants(req, res) {
    try {
      const { conversationId } = req.params;
      const result = await liveService.getConversationParticipants(conversationId);
      if (!result.success) return res.status(500).json({ success: false, error: result.error });

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error('getConversationParticipants error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new LiveController();
