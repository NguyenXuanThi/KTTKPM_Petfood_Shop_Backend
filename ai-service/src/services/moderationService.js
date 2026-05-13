const Groq = require('groq-sdk');
const config = require('../config/env');

class ModerationService {
  constructor() {
    this.groq = new Groq({
      apiKey: config.GROQ_API_KEY
    });
    this.model = config.GROQ_MODEL;
  }

  /**
   * Kiểm tra nội dung comment có vi phạm tiêu chuẩn cộng đồng không
   * @param {string} content - Nội dung comment cần kiểm tra
   * @returns {Promise<{isViolation: boolean, reason: string, confidence: number}>}
   */
  async moderateComment(content) {
    try {
      if (!content || content.trim().length === 0) {
        return {
          isViolation: false,
          reason: null,
          confidence: 1.0
        };
      }

      const systemPrompt = `Bạn là hệ thống kiểm duyệt nội dung tự động cho cửa hàng thú cưng PetFood.

**NHIỆM VỤ**: Phân tích comment và xác định có vi phạm tiêu chuẩn cộng đồng không.

**VI PHẠM BAO GỒM**:
1. Ngôn từ thô tục, tục tĩu, chửi bới
2. Phân biệt đối xử về:
   - Vùng miền (miền Bắc, miền Nam, miền Trung)
   - Màu da, chủng tộc
   - Tôn giáo, tín ngưỡng
   - Giới tính, xu hướng tính dục
3. Kích động bạo lực, thù hận
4. Spam, quảng cáo không liên quan
5. Thông tin cá nhân nhạy cảm (số điện thoại, địa chỉ nhà)
6. Lừa đảo, giả mạo

**KHÔNG VI PHẠM**:
- Phản hồi tiêu cực về sản phẩm (chất lượng kém, giá cao)
- Góp ý xây dựng
- Chia sẻ trải nghiệm thực tế
- So sánh với sản phẩm khác

**ĐỊNH DẠNG TRẢ LỜI** (JSON):
{
  "isViolation": true/false,
  "reason": "Lý do cụ thể nếu vi phạm, null nếu không vi phạm",
  "confidence": 0.0-1.0
}

**CHÚ Ý**: 
- Chỉ đánh dấu vi phạm khi CHẮC CHẮN
- Không đánh dấu phản hồi tiêu cực về sản phẩm là vi phạm
- Phân biệt giữa "góp ý" và "chửi bới"`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Kiểm tra comment này:\n\n"${content}"` }
        ],
        model: this.model,
        temperature: 0.1, // Very low for consistent moderation
        max_tokens: 256,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      const result = JSON.parse(response);

      console.log('=== MODERATION RESULT ===');
      console.log('Content:', content);
      console.log('Result:', result);

      return {
        isViolation: result.isViolation || false,
        reason: result.reason || null,
        confidence: result.confidence || 0.0
      };
    } catch (error) {
      console.error('Moderation Service Error:', error.message);
      // Nếu lỗi, cho phép comment (fail-open để không block người dùng)
      return {
        isViolation: false,
        reason: 'Moderation service error',
        confidence: 0.0,
        error: error.message
      };
    }
  }

  /**
   * Kiểm tra hàng loạt comments
   * @param {string[]} contents - Mảng nội dung cần kiểm tra
   * @returns {Promise<Array>}
   */
  async moderateMultiple(contents) {
    const results = await Promise.all(
      contents.map(content => this.moderateComment(content))
    );
    return results;
  }
}

module.exports = new ModerationService();
