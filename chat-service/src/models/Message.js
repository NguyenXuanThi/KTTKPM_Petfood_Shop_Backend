const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveConversation',
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    default: ''
  },
  senderAvatar: {
    type: String,
    default: ''
  },
  senderRole: {
    type: String,
    enum: ['customer', 'admin'],
    required: true
  },
  // message can be text or empty for non-text message types
  message: {
    type: String,
    default: ''
  },
  // file URL for image/video/attachments (only store URL, no binary)
  fileUrl: {
    type: String,
    default: ''
  },
  // provider-specific metadata (size, mimeType, originalName, etc.)
  metadata: {
    type: Object,
    default: {}
  },
  // product message data
  productId: {
    type: String,
    default: ''
  },
  productData: {
    type: Object,
    default: {}
  },
  messageType: {
    type: String,
    default: 'text'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
