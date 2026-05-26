const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Kiểm duyệt nội dung review bằng AI.
 * Trả về { passed: boolean, reason: string | null }
 */
const moderateReviewContent = async (comment) => {
  if (!process.env.GROQ_API_KEY) {
    console.warn("[moderation] GROQ_API_KEY not set — skipping AI moderation");
    return { passed: true, reason: null };
  }

  try {
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `Bạn là hệ thống kiểm duyệt nội dung cho trang thương mại điện tử thú cưng PawMart.
Nhiệm vụ: Phân tích nội dung đánh giá sản phẩm và xác định xem có vi phạm không.

Các vi phạm cần từ chối:
- Ngôn từ tục tĩu, chửi bới, xúc phạm (kể cả viết tắt hoặc biến thể)
- Nội dung thù ghét, phân biệt đối xử
- Spam, quảng cáo không liên quan
- Thông tin cá nhân (số điện thoại, địa chỉ, email)
- Nội dung đe dọa hoặc bạo lực

Cho phép:
- Phản hồi tiêu cực về sản phẩm (chất lượng kém, giao hàng chậm, v.v.)
- Phàn nàn về dịch vụ theo cách lịch sự
- Ngôn ngữ thông thường, không tục tĩu

Trả lời ĐÚNG định dạng JSON sau, không thêm gì khác:
{"passed": true} hoặc {"passed": false, "reason": "lý do ngắn gọn bằng tiếng Việt"}`,
        },
        {
          role: "user",
          content: `Nội dung đánh giá: "${comment}"`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[moderation] Could not parse AI response:", raw);
      return { passed: true, reason: null };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      passed: result.passed !== false,
      reason: result.reason || null,
    };
  } catch (error) {
    console.warn(
      "[moderation] AI moderation failed, allowing review:",
      error.message,
    );
    return { passed: true, reason: null };
  }
};

module.exports = { moderateReviewContent };
