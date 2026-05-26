const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  messages: [messageSchema],
  context: {
    // Stores cart, products, pendingCheckout, lastIntent, etc.
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // ── Memory Summarization ──────────────────────────────────────────────────
  // Auto-populated when messages.length crosses SUMMARY_FIRST_TRIGGER (5)
  // and then every SUMMARY_INTERVAL (10). Replaces sending all history to LLM.
  summary: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

conversationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Sync context.summary → top-level summary field for easier querying
  if (this.context && this.context.summary) {
    this.summary = this.context.summary;
  }
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
