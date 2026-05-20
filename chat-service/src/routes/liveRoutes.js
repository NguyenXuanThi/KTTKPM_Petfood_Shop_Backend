const express = require('express');
const router = express.Router();
const liveController = require('../controllers/liveController');

// Create or get conversation for customer
router.post('/conversations', liveController.getOrCreateConversation);

// Admin: get list of conversations
router.get('/conversations', liveController.getConversationsForAdmin);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', liveController.getMessages);

module.exports = router;
