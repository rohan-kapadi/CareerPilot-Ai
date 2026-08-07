const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  purpose: {
    type: String,
    enum: ['scoring', 'chat_memory', 'export'],
    required: true
  },
  dataCategory: {
    type: String,
    required: true
  },
  granted: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user has only one consent setting per purpose and category combination
consentSchema.index({ userId: 1, purpose: 1, dataCategory: 1 }, { unique: true });

// Auto-update timestamp
consentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Consent = mongoose.model('Consent', consentSchema);
module.exports = Consent;
