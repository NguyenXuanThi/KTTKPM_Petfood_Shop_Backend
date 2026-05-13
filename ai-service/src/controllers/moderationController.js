const moderationService = require('../services/moderationService');

class ModerationController {
  /**
   * POST /api/moderation/check
   * Kiểm tra 1 comment
   */
  async checkComment(req, res) {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required'
        });
      }

      const result = await moderationService.moderateComment(content);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Check comment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check comment',
        error: error.message
      });
    }
  }

  /**
   * POST /api/moderation/check-multiple
   * Kiểm tra nhiều comments
   */
  async checkMultiple(req, res) {
    try {
      const { contents } = req.body;

      if (!Array.isArray(contents)) {
        return res.status(400).json({
          success: false,
          message: 'Contents must be an array'
        });
      }

      const results = await moderationService.moderateMultiple(contents);

      return res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Check multiple comments error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check comments',
        error: error.message
      });
    }
  }
}

module.exports = new ModerationController();
