const Groq = require('groq-sdk');
const config = require('../config/env');
const productClient = require('./productClient');

class AIService {
  constructor() {
    this.groq = new Groq({
      apiKey: config.GROQ_API_KEY
    });
    this.model = config.GROQ_MODEL;
  }

  async chat(messages, context = {}) {
    try {
      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Include recent conversation history (last 10 messages for context)
      const recentMessages = messages.slice(-10);
      
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const completion = await this.groq.chat.completions.create({
        messages: chatMessages,
        model: this.model,
        temperature: 0.3, // Very low for direct, consistent answers
        max_tokens: 512, // Shorter responses
        top_p: 1,
        stream: false
      });

      return {
        success: true,
        message: completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.',
        usage: completion.usage
      };
    } catch (error) {
      console.error('AI Service Error:', error.message);
      return {
        success: false,
        message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        error: error.message
      };
    }
  }

  buildSystemPrompt(context = {}) {
    let prompt = `Bạn là trợ lý AI của PetFood - cửa hàng thú cưng.

**Cách trả lời:**
- NGẮN GỌN (1-2 câu)
- TRỰC TIẾP, thân thiện
- Nhớ toàn bộ ngữ cảnh

`;

    // Handle order context
    if (context.cart && context.cart.length > 0) {
      prompt += `\n**GIỎ HÀNG HIỆN TẠI:**\n`;
      let total = 0;
      context.cart.forEach(item => {
        const itemTotal = item.product.price * item.quantity;
        total += itemTotal;
        prompt += `- ${item.product.name} x${item.quantity} = ${itemTotal.toLocaleString('vi-VN')}đ\n`;
      });
      prompt += `Tổng: ${total.toLocaleString('vi-VN')}đ\n\n`;
      
      if (context.pendingCheckout) {
        prompt += `Khách đã xác nhận mua. Nói: "Tuyệt vời! Tôi đã chuẩn bị đơn hàng cho bạn. Hãy bấm nút bên dưới để hoàn tất đặt hàng."\n`;
      } else {
        prompt += `Khách vừa thêm sản phẩm vào giỏ. Nói: "Đã thêm vào giỏ hàng! Bạn có muốn mua thêm sản phẩm nào không? Hoặc bạn có thể đặt hàng ngay."\n`;
      }
      return prompt;
    }

    // Handle product display
    if (context.quantityIntent && context.quantityIntent.isSingle) {
      prompt += `Khách yêu cầu 1 sản phẩm. Nói: "Đây là sản phẩm phù hợp nhất cho bạn:"\n`;
    } else if (context.products && context.products.length > 0) {
      prompt += `Nói: "Tôi tìm thấy những sản phẩm này cho bạn:"\n`;
    }

    prompt += `\n**Khi KHÔNG tìm thấy:**
Nói: "Xin lỗi, hiện tại chúng tôi chưa có sản phẩm này."

`;

    // Add product context if available
    if (context.products && context.products.length > 0) {
      prompt += `\n**SẢN PHẨM đang hiển thị:**\n`;
      context.products.forEach((product, index) => {
        prompt += `${index + 1}. ${product.name} - ${product.price?.toLocaleString('vi-VN')}đ (Còn ${product.stock})\n`;
      });
      prompt += `\nKhách có thể nói "mua 2 hộp đó" để thêm vào giỏ.\n`;
    }

    return prompt;
  }

  async analyzeIntent(userMessage) {
    // Simple intent detection
    const message = userMessage.toLowerCase();
    
    // Confirm order intent - HIGHEST PRIORITY
    if (message.includes('mua ngay') || message.includes('đặt ngay') ||
        message.includes('mua luôn') || message.includes('đặt luôn') ||
        message.includes('đặt hàng online') || message.includes('ok mua') ||
        message.includes('đồng ý mua') || message.includes('xác nhận')) {
      return { intent: 'confirm_order', confidence: 0.95 };
    }
    
    // Continue shopping intent
    if (message.includes('mua thêm') || message.includes('thêm') ||
        message.includes('tiếp') || message.includes('nữa') ||
        message.includes('tìm thêm')) {
      return { intent: 'continue_shopping', confidence: 0.9 };
    }
    
    // Order intent - when user wants to add to cart
    // Must have quantity indicator + product reference
    const hasQuantity = /(\d+|một|hai|ba|bốn|năm)\s*(hộp|bịch|gói|chai|lon|kg|g)/i.test(message);
    const hasProductRef = message.includes('đó') || message.includes('này') || message.includes('kia');
    
    if ((message.includes('mua') || message.includes('đặt') || message.includes('lấy')) && 
        (hasQuantity || hasProductRef)) {
      return { intent: 'order', confidence: 0.9 };
    }
    
    // Product search intent - more keywords
    if (message.includes('tìm') || message.includes('có') || message.includes('giá') || 
        message.includes('bao nhiêu') || message.includes('còn') ||
        message.includes('thức ăn') || message.includes('sản phẩm') ||
        message.includes('cho chó') || message.includes('cho mèo') ||
        message.includes('pate') || message.includes('cát') ||
        message.includes('muốn xem') || message.includes('cần')) {
      return { intent: 'product_search', confidence: 0.9 };
    }
    
    // Stock check intent
    if (message.includes('còn hàng') || message.includes('hết hàng') || message.includes('kho')) {
      return { intent: 'stock_check', confidence: 0.8 };
    }
    
    return { intent: 'general', confidence: 0.5 };
  }

  extractOrderDetails(userMessage, context) {
    const message = userMessage.toLowerCase();
    const orderItems = [];
    
    console.log('=== EXTRACT ORDER DETAILS ===');
    console.log('User message:', userMessage);
    console.log('Context products:', context.products);
    
    // Extract quantity
    const quantityPatterns = [
      /(\d+)\s*(hộp|bịch|gói|chai|lon|kg|g)/gi,
      /một\s*(hộp|bịch|gói|chai|lon)/gi,
      /hai\s*(hộp|bịch|gói|chai|lon)/gi,
      /ba\s*(hộp|bịch|gói|chai|lon)/gi
    ];
    
    let quantity = 1; // default
    for (const pattern of quantityPatterns) {
      const match = message.match(pattern);
      if (match) {
        const num = match[0].match(/\d+/);
        if (num) {
          quantity = parseInt(num[0]);
        } else if (match[0].includes('một')) {
          quantity = 1;
        } else if (match[0].includes('hai')) {
          quantity = 2;
        } else if (match[0].includes('ba')) {
          quantity = 3;
        }
        console.log('Extracted quantity:', quantity);
        break;
      }
    }
    
    // Check if referring to displayed products
    if ((message.includes('đó') || message.includes('này') || message.includes('kia') || 
         message.includes('pate') || message.includes('cát') || message.includes('thức ăn')) && 
        context.products && context.products.length > 0) {
      
      console.log('User is referring to displayed products');
      
      // Try to match which product
      let productIndex = 0;
      if (message.includes('thứ 2') || message.includes('thứ hai') || message.includes('cái 2')) {
        productIndex = 1;
      } else if (message.includes('thứ 3') || message.includes('thứ ba') || message.includes('cái 3')) {
        productIndex = 2;
      } else if (message.includes('cuối') || message.includes('sau')) {
        productIndex = context.products.length - 1;
      }
      // Default: first product
      
      console.log('Selected product index:', productIndex);
      
      if (context.products[productIndex]) {
        orderItems.push({
          product: context.products[productIndex],
          quantity: quantity
        });
        console.log('Added to order:', context.products[productIndex].name, 'x', quantity);
      }
    }
    
    console.log('Order items:', orderItems);
    console.log('Has order:', orderItems.length > 0);
    console.log('=== END EXTRACT ===');
    
    return {
      items: orderItems,
      hasOrder: orderItems.length > 0
    };
  }

  async enrichContextWithProducts(userMessage) {
    try {
      // Extract potential product keywords
      const keywords = this.extractKeywords(userMessage);
      
      // Detect quantity intent
      const quantityIntent = this.detectQuantityIntent(userMessage);
      const limit = quantityIntent.limit;
      
      console.log('Searching products with keywords:', keywords.join(' '));
      console.log('Quantity intent:', quantityIntent);

      // Search for products
      const searchResults = await productClient.searchProducts(keywords.join(' '), limit);
      
      console.log('Product search results:', searchResults);
      
      if (searchResults.success && searchResults.data && searchResults.data.length > 0) {
        console.log('Found products:', searchResults.data.length);
        return {
          products: searchResults.data,
          quantityIntent: quantityIntent
        };
      }

      console.log('No products found');
      return { products: [], quantityIntent: quantityIntent };
    } catch (error) {
      console.error('Error enriching context:', error.message);
      return { products: [], quantityIntent: { limit: 3, isSingle: false } };
    }
  }

  detectQuantityIntent(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Single product intent
    if (message.includes('cho tôi 1') || 
        message.includes('cho tôi một') ||
        message.includes('1 sản phẩm') ||
        message.includes('một sản phẩm') ||
        message.includes('1 mặt hàng') ||
        message.includes('một mặt hàng')) {
      return { limit: 1, isSingle: true };
    }
    
    // Multiple products intent
    if (message.includes('các sản phẩm') || 
        message.includes('nhiều sản phẩm') ||
        message.includes('một số sản phẩm') ||
        message.includes('vài sản phẩm')) {
      return { limit: 3, isSingle: false };
    }
    
    // Default: 3 products
    return { limit: 3, isSingle: false };
  }

  extractKeywords(text) {
    // Remove common Vietnamese stop words and extract meaningful keywords
    const stopWords = ['tôi', 'muốn', 'cần', 'cho', 'của', 'có', 'là', 'và', 'thì', 'được', 'các', 'về', 'một', 'số'];
    const words = text.toLowerCase()
      .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.includes(word));
    
    return [...new Set(words)]; // Remove duplicates
  }
}

module.exports = new AIService();
