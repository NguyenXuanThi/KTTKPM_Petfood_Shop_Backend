const express = require('express');
const moderationController = require('../controllers/moderationController');

const router = express.Router();

// POST /api/moderation/check - Kiểm tra 1 comment
router.post('/check', moderationController.checkComment.bind(moderationController));

// POST /api/moderation/check-multiple - Kiểm tra nhiều comments
router.post('/check-multiple', moderationController.checkMultiple.bind(moderationController));

module.exports = router;
