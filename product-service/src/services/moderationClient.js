const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3011';

class ModerationClient {
  /**
   * Kiểm tra comment có vi phạm tiêu chuẩn cộng đồng không
   * @param {string} content - Nội dung comment
   * @returns {Promise<{isViolation: boolean, reason: string}>}
   */
  async checkComment(content) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/api/moderation/check`,
        { content },
        { timeout: 10000 } // 10 seconds timeout
      );

      if (response.data.success) {
        return response.data.data;
      }

      // Nếu API trả về không success, cho phép comment (fail-open)
      console.warn('Moderation API returned unsuccessful:', response.data);
      return {
        isViolation: false,
        reason: null,
        confidence: 0.0
      };
    } catch (error) {
      console.error('Moderation client error:', error.message);
      // Nếu lỗi kết nối, cho phép comment (fail-open)
      // Không muốn block người dùng vì lỗi hệ thống
      return {
        isViolation: false,
        reason: 'Moderation service unavailable',
        confidence: 0.0,
        error: error.message
      };
    }
  }
}

module.exports = new ModerationClient();
