const mongoose = require('mongoose');

const privacyFlagSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true,
    index: true
  },
  fieldPath: {
    type: String,
    required: true // e.g., 'personalInfo.dob', 'personalInfo.photo'
  },
  flagType: {
    type: String,
    required: true // e.g., 'DOB', 'Photo', 'MaritalStatus', 'Nationality'
  },
  redacted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a single field is flagged only once per resume
privacyFlagSchema.index({ resumeId: 1, fieldPath: 1 }, { unique: true });

const PrivacyFlag = mongoose.model('PrivacyFlag', privacyFlagSchema);
module.exports = PrivacyFlag;
