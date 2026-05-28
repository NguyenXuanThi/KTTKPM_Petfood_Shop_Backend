const Groq = require('groq-sdk');
const config = require('../config/env');
const productClient = require('./productClient');
const {
  appointmentClient,
  normalizeSlot,
  normalizePhone,
  mapPetType,
} = require('./appointmentClient');

// ──────────────────────────────────────────────────────────────────────────────
// Groq Function Calling Tool Definitions
// ──────────────────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description:
        'Tìm kiếm sản phẩm thức ăn thú cưng theo từ khóa. QUY TẮC BẮT BUỘC: 1. Chỉ dùng MỘT từ ngắn nhất có thể. 2. TUYỆT ĐỐI giữ nguyên chính tả tiếng Việt và dấu câu của người dùng. KHÔNG ĐƯỢC tự ý sửa dấu hoặc viết sai chính tả (Ví dụ: khách gõ \'vòng cổ\' thì keyword phải là \'vòng cổ\', tuyệt đối không trả về \'vông cộ\'). Nếu user hỏi về sản phẩm cụ thể, hãy search trước để lấy danh sách rồi mới dùng ID thật.',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'string',
            description:
              'MỘT từ ngắn nhất trích xuất từ câu của khách. Bắt buộc giữ nguyên 100% dấu tiếng Việt. Ví dụ: \'chó\', \'mèo\', \'pate\', \'vòng cổ\', \'hạt\'.',
          },
          limit: {
            type: 'integer',
            description: 'Số sản phẩm tối đa trả về. Mặc định 3, tối đa 5.',
            default: 3,
          },
        },
        required: ['keywords'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_inventory',
      description:
        'Kiem tra ton kho san pham. ' +
        'CANH BAO: chi dung productId LAY TU KET QUA search_products (truong _id). ' +
        'TUYET DOI KHONG tu dat productId. Neu chua biet _id, hay goi search_products truoc.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'MongoDB _id cua san pham, lay tu ket qua search_products. Vi du: "64f3a1b2c8e9d0001234abcd"',
          },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart_context',
      description:
        'Them san pham vao gio hang khi user muon mua. ' +
        'CANH BAO: chi dung productId LAY TU KET QUA search_products (truong _id). ' +
        'TUYET DOI KHONG tu dat productId. Neu chua biet _id, hay goi search_products truoc.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'MongoDB _id cua san pham, lay tu ket qua search_products. Vi du: "64f3a1b2c8e9d0001234abcd"',
          },
          quantity: {
            type: 'integer',
            description: 'Số lượng cần thêm. Mặc định 1.',
            default: 1,
          },
        },
        required: ['productId', 'quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_available_slots',
      description:
        'Kiểm tra các khung giờ còn trống trong một ngày cụ thể. Hãy gọi tool này NGAY LẬP TỨC khi khách hàng đề cập đến ngày muốn đặt lịch, để báo cho họ biết giờ nào còn trống.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Ngày cần kiểm tra, định dạng YYYY-MM-DD (ví dụ: 2026-05-26).',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description:
        'Lưu lịch hẹn chính thức vào hệ thống. TUYỆT ĐỐI CHỈ GỌI tool này khi khách hàng đã xác nhận và cung cấp ĐẦY ĐỦ các thông tin bắt buộc. KHÔNG được tự bịa thông tin.',
      parameters: {
        type: 'object',
        properties: {
          customerName: {
            type: 'string',
            description: 'Tên khách hàng.',
          },
          phone: {
            type: 'string',
            description: 'Số điện thoại liên hệ.',
          },
          petName: {
            type: 'string',
            description: 'Tên thú cưng.',
          },
          petType: {
            type: 'string',
            description: 'Loài thú cưng (Ví dụ: Chó, Mèo, Hamster).',
          },
          date: {
            type: 'string',
            description: 'Ngày hẹn, định dạng YYYY-MM-DD.',
          },
          time: {
            type: 'string',
            description: 'Giờ hẹn chính xác đã chốt (Ví dụ: 09:00).',
          },
          services: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách các dịch vụ khách chọn (Ví dụ: ["Tắm rửa", "Cắt tỉa lông"]).',
          },
        },
        required: ['customerName', 'phone', 'petName', 'petType', 'date', 'time', 'services'],
      },
    },
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// AIService Class
// ──────────────────────────────────────────────────────────────────────────────
class AIService {
  constructor() {
    this.groq = new Groq({ apiKey: config.GROQ_API_KEY });
    this.model = config.GROQ_MODEL;
  }

  // ---------------------------------------------------------------------------
  // Execute a single tool call and return { result, contextUpdates }
  // ---------------------------------------------------------------------------
  async executeTool(toolName, toolArgs, context) {
    const contextUpdates = {};
    let result = {};

    try {
      switch (toolName) {
        // ── search_products ──────────────────────────────────────────────────
        case 'search_products': {
          const { keywords, limit = 3 } = toolArgs;
          const searchResult = await productClient.searchProducts(keywords, Math.min(limit, 5));
          const products = searchResult.success ? searchResult.data : [];
          contextUpdates.products = products;
          result = {
            found: products.length > 0,
            count: products.length,
            products: products.map((p) => ({
              _id: p._id,
              name: p.name,
              price: p.price,
              stock: p.stock,
              category: p.category,
            })),
          };
          break;
        }

        // ── check_inventory ──────────────────────────────────────────────────
        case 'check_inventory': {
          const { productId } = toolArgs;
          // Validate: must be a real MongoDB ObjectId (24 hex chars)
          if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
            result = {
              error: 'productId khong hop le. Hay goi search_products truoc de lay _id that cua san pham.',
              hint: 'Dung _id tu ket qua search_products, khong tu dat ID.',
            };
            break;
          }
          const inventoryResult = await productClient.checkInventory(productId);
          if (inventoryResult.success) {
            const stock = inventoryResult.data?.stock ?? 0;
            result = {
              productId,
              stock,
              available: stock > 0,
              message: stock > 0 ? `Con ${stock} san pham trong kho` : 'San pham da het hang',
            };
          } else {
            result = { productId, available: false, message: 'Khong the kiem tra ton kho luc nay' };
          }
          break;
        }

        // ── add_to_cart_context ──────────────────────────────────────────────
        case 'add_to_cart_context': {
          const { productId, quantity = 1 } = toolArgs;
          // Validate: must be a real MongoDB ObjectId (24 hex chars)
          if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
            result = {
              error: 'productId khong hop le. Hay goi search_products truoc de lay _id that cua san pham.',
              hint: 'Dung _id tu ket qua search_products, khong tu dat ID.',
            };
            break;
          }
          const products = context.products || [];
          const product = products.find((p) => p._id?.toString() === productId);

          if (!context.cart) context.cart = [];

          if (product) {
            const existingItem = context.cart.find(
              (ci) => ci.product._id?.toString() === productId
            );
            if (existingItem) {
              existingItem.quantity += quantity;
            } else {
              context.cart.push({ product, quantity });
            }
            contextUpdates.cart = [...context.cart];
            result = {
              success: true,
              message: `Đã thêm ${quantity} "${product.name}" vào giỏ hàng`,
              cartCount: context.cart.length,
            };
          } else {
            result = { success: false, message: 'Không tìm thấy sản phẩm trong danh sách hiện tại để thêm vào giỏ' };
          }
          break;
        }

        // ── check_available_slots (appointment-service) ─────────────────────
        case 'check_available_slots': {
          contextUpdates.products = [];
          const { date } = toolArgs;
          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            result = {
              success: false,
              message: 'Ngày không hợp lệ. Dùng định dạng YYYY-MM-DD.',
            };
            break;
          }
          const slotsResult = await appointmentClient.getSlotsForDate(date);
          if (!slotsResult.success) {
            result = {
              success: false,
              message: slotsResult.message || 'Không kiểm tra được lịch trống. Thử lại sau.',
            };
            break;
          }
          const { availableSlots } = slotsResult;
          contextUpdates.appointmentDraft = {
            ...(context.appointmentDraft || {}),
            date,
            availableSlots,
          };
          result = {
            success: true,
            date,
            availableSlots,
            message: availableSlots.length
              ? `Ngày ${date} còn các khung giờ: ${availableSlots.join(', ')}`
              : `Ngày ${date} đã hết chỗ. Vui lòng chọn ngày khác.`,
          };
          break;
        }

        // ── book_appointment (lưu vào appointment-service) ───────────────────
        case 'book_appointment': {
          contextUpdates.products = [];
          const {
            customerName,
            phone,
            petName,
            petType,
            date,
            time,
            services,
          } = toolArgs;

          const missing = [];
          if (!customerName?.trim()) missing.push('customerName');
          if (!phone?.trim()) missing.push('phone');
          if (!petName?.trim()) missing.push('petName');
          if (!petType?.trim()) missing.push('petType');
          if (!date?.trim()) missing.push('date');
          if (!time?.trim()) missing.push('time');
          if (!Array.isArray(services) || services.length === 0) missing.push('services');

          if (missing.length > 0) {
            result = {
              success: false,
              message: `Thiếu thông tin bắt buộc: ${missing.join(', ')}. Hãy hỏi khách bổ sung, không tự điền.`,
            };
            break;
          }

          const appointmentSlot = normalizeSlot(time);
          if (!appointmentSlot) {
            result = {
              success: false,
              message: 'Giờ hẹn không hợp lệ. Dùng định dạng HH:mm (ví dụ: 08:30).',
            };
            break;
          }

          const customerPhone = normalizePhone(phone);
          const customerId =
            context.userId && context.userId !== 'guest'
              ? String(context.userId)
              : `ai_chat_${context.sessionId || Date.now()}`;

          const createResult = await appointmentClient.createAppointment({
            customerId,
            customerName: customerName.trim(),
            customerPhone,
            petName: petName.trim(),
            petType: mapPetType(petType),
            serviceType: services.map((s) => String(s).trim()).filter(Boolean).join(', '),
            appointmentDate: date.trim(),
            appointmentSlot,
          });

          if (!createResult.success) {
            result = {
              success: false,
              message:
                createResult.message ||
                'Không lưu được lịch hẹn. Kiểm tra lại giờ/ngày hoặc thử khung giờ khác.',
            };
            break;
          }

          const saved = createResult.data;
          const appointmentId = createResult.appointmentId;
          const appointment = {
            appointmentId,
            mongoId: saved._id,
            customerName: saved.customerName,
            phone: saved.customerPhone,
            petName: saved.petName,
            petType: saved.petType,
            date: saved.appointmentDate,
            time: saved.appointmentSlot,
            services: services.map((s) => String(s).trim()).filter(Boolean),
            status: saved.status,
            createdAt: saved.createdAt,
          };

          contextUpdates.appointment = appointment;
          contextUpdates.appointmentDraft = null;

          result = {
            success: true,
            appointmentId,
            appointment,
            message: `Đặt lịch thành công. Mã xác nhận: ${appointmentId}`,
          };
          break;
        }

        default:
          result = { error: `Unknown tool: ${toolName}` };
      }
    } catch (err) {
      console.error(`[AIService] Tool execution error (${toolName}):`, err.message);
      result = { error: err.message };
    }

    return { result, contextUpdates };
  }

  // ---------------------------------------------------------------------------
  // Main chat function — supports multi-turn Function Calling
  // ---------------------------------------------------------------------------
  async chat(messages, context = {}) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);

      // Use summary + last 2 messages when summary exists; otherwise last 10
      const recentMessages = context.summary ? messages.slice(-2) : messages.slice(-10);

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const contextUpdates = {};
      const toolsUsed = [];

      // ── First Groq call (with tools) ──────────────────────────────────────
      const completion = await this.groq.chat.completions.create({
        messages: chatMessages,
        model: this.model,
        temperature: 0.3,
        max_tokens: 512,
        top_p: 1,
        stream: false,
        tools: TOOLS,
        tool_choice: 'auto',
      });

      const firstChoice = completion.choices[0];

      // ── Detect leaked tool call in text (model bug workaround) ────────────
      // Some model versions emit tool calls as text instead of tool_calls field.
      // Patterns: <function=NAME>ARGS</function>  or  <function>...</function>
      if (
        firstChoice.finish_reason !== 'tool_calls' &&
        firstChoice.message?.content &&
        (/<function[=>]/i.test(firstChoice.message.content) || /<function>/i.test(firstChoice.message.content))
      ) {
        console.warn('[AIService] ⚠️  Detected leaked tool call in text response — stripping and retrying without tools');
        const cleanedContent = this._cleanResponse(firstChoice.message.content);
        if (cleanedContent && cleanedContent !== 'Xin lỗi, tôi không thể trả lời lúc này.') {
          return {
            success: true,
            message: cleanedContent,
            usage: completion.usage,
            toolsUsed: [],
            contextUpdates: {},
          };
        }
        // If nothing meaningful left after cleaning, retry without tools
        const retryCompletion = await this.groq.chat.completions.create({
          messages: chatMessages,
          model: this.model,
          temperature: 0.3,
          max_tokens: 256,
          top_p: 1,
          stream: false,
          // No tools — force plain text response
        });
        return {
          success: true,
          message: this._cleanResponse(retryCompletion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.'),
          usage: retryCompletion.usage,
          toolsUsed: [],
          contextUpdates: {},
        };
      }

      // ── Handle tool_calls (Function Calling) ──────────────────────────────
      if (
        firstChoice.finish_reason === 'tool_calls' &&
        firstChoice.message.tool_calls?.length > 0
      ) {
        const toolCallResults = [];

        for (const toolCall of firstChoice.message.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments);
          } catch (_) {
            toolArgs = {};
          }

          console.log(`[AIService] 🔧 Tool called: ${toolName}`, toolArgs);
          toolsUsed.push(toolName);

          const { result, contextUpdates: updates } = await this.executeTool(
            toolName,
            toolArgs,
            context
          );
          // Apply context updates immediately so subsequent tools in same batch see them
          Object.assign(context, updates);
          Object.assign(contextUpdates, updates);

          toolCallResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(result),
          });
        }

        // ── Second Groq call with tool results ──────────────────────────────
        const followUpMessages = [
          ...chatMessages,
          firstChoice.message,           // assistant message with tool_calls
          ...toolCallResults,            // tool results
        ];

        const finalCompletion = await this.groq.chat.completions.create({
          messages: followUpMessages,
          model: this.model,
          temperature: 0.3,
          max_tokens: 512,
          top_p: 1,
          stream: false,
        });

        return {
          success: true,
          message:
            this._cleanResponse(finalCompletion.choices[0]?.message?.content ||
              'Xin lỗi, tôi không thể trả lời lúc này.'),
          usage: finalCompletion.usage,
          toolsUsed,
          contextUpdates,
        };
      }

      // ── No tool calls — direct text response ──────────────────────────────
      return {
        success: true,
        message: this._cleanResponse(firstChoice.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.'),
        usage: completion.usage,
        toolsUsed: [],
        contextUpdates: {},
      };
    } catch (error) {
      console.error('[AIService] Error:', error.message);
      return {
        success: false,
        message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        error: error.message,
        toolsUsed: [],
        contextUpdates: {},
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Build system prompt — uses summary + products/cart context
  // ---------------------------------------------------------------------------
  buildSystemPrompt(context = {}) {
    const now = new Date();
    const todayLabel = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    let prompt = `Bạn là trợ lý AI của PawMart - cửa hàng thú cưng cao cấp.

**Nguyên tắc trả lời:**
- NGẮN GỌN (1-3 câu), thân thiện, dùng tiếng Việt
- Khi user hỏi sản phẩm → dùng tool search_products
- Khi user hỏi còn hàng không → dùng check_inventory (chỉ sau khi đã có _id từ search_products)
- Khi user muốn mua/thêm vào giỏ:
  * Nếu đã có sản phẩm trong SẢN PHẨM ĐANG HIỂN THỊ → dùng add_to_cart_context với _id đó
  * Nếu CHƯA có sản phẩm → dùng search_products TRƯỚC, rồi mới add_to_cart_context
  * TUYỆT ĐỐI KHÔNG tự đặt productId — chỉ dùng _id lấy từ kết quả search_products
- Khi khách muốn đặt lịch spa/thăm khám → dùng check_available_slots và book_appointment

**LỄ TÂN ẢO (ĐẶT LỊCH HẸN):**
- TRẠNG THÁI HIỆN TẠI: Hôm nay là ngày ${todayLabel}. Bắt buộc dùng ngày này làm mốc khi khách nói 'ngày mai', 'hôm kia', v.v. Khi gọi book_appointment, truyền date dạng YYYY-MM-DD và time dạng HH:mm (ví dụ 08:30).
- VAI TRÒ LỄ TÂN: Khi khách muốn đặt lịch, hãy hướng dẫn họ từng bước.
- QUY TRÌNH:
  1. Hỏi ngày giờ khách muốn.
  2. Gọi tool check_available_slots để báo giờ rảnh.
  3. Khi chốt được giờ, nhẹ nhàng hỏi các thông tin còn thiếu (Tên, SĐT, Tên/Loài thú cưng, Dịch vụ). Hỏi 1-2 thông tin mỗi lần, KHÔNG hỏi dồn dập 5 câu cùng lúc.
  4. Khi đã đủ thông tin, gọi tool book_appointment và thông báo đặt lịch thành công kèm mã xác nhận.

**QUY TẮC QUAN TRỌNG:**
- Không bao giờ hiển thị raw JSON, function call, hay code trong câu trả lời
- Chỉ trả lời bằng ngôn ngữ tự nhiên tiếng Việt
- Khi trích xuất từ khóa để gọi function, BẮT BUỘC phải giữ nguyên chính tả và dấu tiếng Việt gốc của người dùng.

`;

    if (context.summary) {
      prompt += `**TÓM TẮT HỘI THOẠI TRƯỚC:**\n${context.summary}\n\n`;
    }

    if (context.cart && context.cart.length > 0) {
      prompt += `**GIỎ HÀNG HIỆN TẠI:**\n`;
      let total = 0;
      context.cart.forEach((item) => {
        const itemTotal = (item.product.price || 0) * item.quantity;
        total += itemTotal;
        prompt += `- ${item.product.name} x${item.quantity} = ${itemTotal.toLocaleString('vi-VN')}đ\n`;
      });
      prompt += `Tổng: ${total.toLocaleString('vi-VN')}đ\n\n`;
    }

    if (context.products && context.products.length > 0) {
      prompt += `**SẢN PHẨM ĐANG HIỂN THỊ (dùng _id này để add_to_cart_context):**\n`;
      context.products.forEach((product, index) => {
        prompt += `${index + 1}. [_id: ${product._id}] ${product.name} - ${product.price?.toLocaleString('vi-VN')}đ (Còn ${product.stock} sản phẩm)\n`;
      });
      prompt += `\nKhi user nói "mua cái đó", "mua 2 túi", "thêm vào giỏ" → dùng add_to_cart_context với _id ở trên.\n\n`;
    }

    if (context.appointmentDraft?.date) {
      prompt += `**ĐANG ĐẶT LỊCH (nháp):**\n`;
      prompt += `- Ngày đã chọn: ${context.appointmentDraft.date}\n`;
      if (context.appointmentDraft.availableSlots?.length) {
        prompt += `- Giờ trống đã kiểm tra: ${context.appointmentDraft.availableSlots.join(', ')}\n`;
      }
      prompt += `\n`;
    }

    if (context.appointment?.appointmentId) {
      const apt = context.appointment;
      prompt += `**LỊCH HẸN ĐÃ CHỐT:**\n`;
      prompt += `- Mã: ${apt.appointmentId}\n`;
      prompt += `- Khách: ${apt.customerName} (${apt.phone})\n`;
      prompt += `- Thú cưng: ${apt.petName} (${apt.petType})\n`;
      prompt += `- Thời gian: ${apt.date} lúc ${apt.time}\n`;
      prompt += `- Dịch vụ: ${(apt.services || []).join(', ')}\n\n`;
    }

    return prompt;
  }

  // ---------------------------------------------------------------------------
  // Summarize conversation history for memory compression
  // ---------------------------------------------------------------------------
  async summarizeConversation(messages) {
    try {
      const historyText = messages
        .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n');

      const summaryPrompt = `Tóm tắt ngắn gọn cuộc hội thoại mua sắm thú cưng sau. Trích xuất:
- Sở thích thú cưng (chó/mèo/khác)
- Ngân sách / mức giá quan tâm
- Sản phẩm user đã xem hoặc quan tâm
- Yêu cầu đặc biệt (thương hiệu, chất liệu...)
- Sản phẩm đã thêm vào giỏ hàng

Lịch sử:
${historyText}

Tóm tắt (ngắn gọn, dưới 100 từ):`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: summaryPrompt }],
        model: this.model,
        temperature: 0.1,
        max_tokens: 200,
        stream: false,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (err) {
      console.error('[AIService] Summarize error:', err.message);
      return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Clean leaked tool-call syntax from model response text
  // Patterns seen in production:
  //   <function=search_products>{"keywords":"..."}</function>
  //   <function=check_inventory>69f1883f...</function>
  //   <function>...</function>
  //   ```json {...} ```
  // ---------------------------------------------------------------------------
  _cleanResponse(text) {
    if (!text) return text;

    let cleaned = text;

    // Pattern 1: <function=NAME>CONTENT</function>  ← most common leak
    cleaned = cleaned.replace(/<function=[\w_]+>[\s\S]*?<\/function>/gi, '');

    // Pattern 2: <function>CONTENT</function>  ← older pattern
    cleaned = cleaned.replace(/<function>[\s\S]*?<\/function>/gi, '');

    // Pattern 3: <function=NAME /> self-closing
    cleaned = cleaned.replace(/<function=[\w_]+\s*\/>/gi, '');

    // Pattern 4: ```json {...} ``` blocks that look like tool calls
    cleaned = cleaned.replace(/```json[\s\S]*?```/gi, '');

    // Pattern 5: bare JSON objects with product_id / productId
    cleaned = cleaned.replace(/\{[\s\S]*?"product[_]?[Ii]d"[\s\S]*?\}/gi, '');

    // Pattern 6: [tool_name({...})]
    cleaned = cleaned.replace(/\[[\w_]+\([\s\S]*?\)\]/g, '');

    // Collapse multiple blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned || 'Xin lỗi, tôi không thể trả lời lúc này.';
  }

  // Keep for backward compatibility
  extractKeywords(text) {
    const stopWords = ['tôi', 'muốn', 'cần', 'cho', 'của', 'có', 'là', 'và', 'thì', 'được', 'các', 'về', 'một', 'số'];
    const words = text
      .toLowerCase()
      .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 1 && !stopWords.includes(word));
    return [...new Set(words)];
  }
}

module.exports = new AIService();
