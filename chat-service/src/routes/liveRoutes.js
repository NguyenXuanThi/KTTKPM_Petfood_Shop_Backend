const express = require('express');
const router = express.Router();
const liveController = require('../controllers/liveController');

// Create or get conversation for customer
router.post('/conversations', liveController.getOrCreateConversation);

// Get all conversations (for admin - backward compatible)
router.get('/conversations', liveController.getConversationsForAdmin);

// Get conversations for support staff
router.get('/conversations/support/:supportId', liveController.getConversationsForSupport);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', liveController.getMessages);

// Get conversation participants
router.get('/conversations/:conversationId/participants', liveController.getConversationParticipants);

// Assign conversation to support staff
router.put('/conversations/:conversationId/assign', liveController.assignConversationToSupport);

module.exports = router;
