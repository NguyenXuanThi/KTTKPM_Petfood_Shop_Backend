const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Create new conversation
router.post('/conversations', chatController.createConversation);

// Send message
router.post('/messages', chatController.sendMessage);

// Get conversation by sessionId
router.get('/conversations/:sessionId', chatController.getConversation);

// Get user conversations
router.get('/conversations', chatController.getUserConversations);

// Close conversation
router.patch('/conversations/:sessionId/close', chatController.closeConversation);

// Delete conversation
router.delete('/conversations/:sessionId', chatController.deleteConversation);

module.exports = router;
