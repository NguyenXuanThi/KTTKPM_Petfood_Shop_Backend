// Test script for Chat Service
const axios = require('axios');

const BASE_URL = 'http://localhost:3011/api/chat';

async function testChatService() {
  console.log('🧪 Testing Chat Service...\n');

  try {
    // Test 1: Create conversation
    console.log('1️⃣ Creating conversation...');
    const createRes = await axios.post(`${BASE_URL}/conversations`, {
      userId: 'test_user_123'
    });
    console.log('✅ Conversation created:', createRes.data);
    const sessionId = createRes.data.data.sessionId;
    console.log('Session ID:', sessionId, '\n');

    // Test 2: Send message - Product search
    console.log('2️⃣ Sending message: "Có thức ăn cho chó giá rẻ không?"');
    const msg1 = await axios.post(`${BASE_URL}/messages`, {
      sessionId,
      message: 'Có thức ăn cho chó giá rẻ không?',
      userId: 'test_user_123'
    });
    console.log('✅ Response:', msg1.data.data.message);
    console.log('Intent:', msg1.data.data.intent, '\n');

    // Test 3: Send message - Stock check
    console.log('3️⃣ Sending message: "Thức ăn cho mèo còn hàng không?"');
    const msg2 = await axios.post(`${BASE_URL}/messages`, {
      sessionId,
      message: 'Thức ăn cho mèo còn hàng không?',
      userId: 'test_user_123'
    });
    console.log('✅ Response:', msg2.data.data.message);
    console.log('Intent:', msg2.data.data.intent, '\n');

    // Test 4: Send message - Order intent
    console.log('4️⃣ Sending message: "Tôi muốn mua 2 gói thức ăn cho chó"');
    const msg3 = await axios.post(`${BASE_URL}/messages`, {
      sessionId,
      message: 'Tôi muốn mua 2 gói thức ăn cho chó',
      userId: 'test_user_123'
    });
    console.log('✅ Response:', msg3.data.data.message);
    console.log('Intent:', msg3.data.data.intent, '\n');

    // Test 5: Get conversation
    console.log('5️⃣ Getting conversation history...');
    const getConv = await axios.get(`${BASE_URL}/conversations/${sessionId}`);
    console.log('✅ Conversation has', getConv.data.data.messages.length, 'messages\n');

    // Test 6: Get user conversations
    console.log('6️⃣ Getting user conversations...');
    const userConvs = await axios.get(`${BASE_URL}/conversations?userId=test_user_123`);
    console.log('✅ User has', userConvs.data.data.length, 'conversations\n');

    // Test 7: Close conversation
    console.log('7️⃣ Closing conversation...');
    const closeRes = await axios.patch(`${BASE_URL}/conversations/${sessionId}/close`);
    console.log('✅ Conversation closed:', closeRes.data.data.status, '\n');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testChatService();
