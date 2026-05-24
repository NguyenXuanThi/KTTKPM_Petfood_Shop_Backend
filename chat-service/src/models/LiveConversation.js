const mongoose = require('mongoose');

const liveConversationSchema = new mongoose.Schema({
  participants: {
    type: [String],
    default: []
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    default: ''
  },
  customerAvatar: {
    type: String,
    default: ''
  },
  // Support staff handling conversation (primary)
  supportId: {
    type: String,
    default: null,
    index: true
  },
  supportName: {
    type: String,
    default: ''
  },
  // Backward compatibility: keep adminId for old conversations
  adminId: {
    type: String,
    default: null,
    index: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

liveConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('LiveConversation', liveConversationSchema);
