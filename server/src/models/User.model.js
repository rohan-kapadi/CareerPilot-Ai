const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: Array,
      default: [],
    },
    education: {
      type: Array,
      default: [],
    },
    projects: {
      type: Array,
      default: [],
    },
    summary: {
      type: String,
      default: '',
    },
    personalInfo: {
      type: Object,
      default: {},
    },
    /**
     * Persona type — used by Career Chat, Explainability tone, and Memory Agent
     * from Phase 1 onward to personalize AI outputs.
     * Values align with PROJECT.md §3 (User Personas).
     */
    personaType: {
      type: String,
      enum: ['student', 'fresher', 'professional', 'switcher', 'recruiter', null],
      default: null,
    },
    /**
     * AdaptIQ profile shape — tagline and current job title.
     * Displayed on ProfilePage and used by careerCoachAgent for personalization.
     */
    tagline: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
    },
    jobTitle: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    /**
     * User preferences — Phase 8 (PROJECT.md §13.12).
     *
     * These set DEFAULTS for future decisions only. They never retroactively
     * change a memory the user already timeboxed, and they never bypass an
     * approval gate: autoRedactFlaggedPII only pre-ticks the redaction boxes in
     * the export dialog, it does not redact anything on its own.
     */
    settings: {
      /** Default timebox offered on new Memory Cards */
      defaultMemoryTimebox: {
        type: String,
        enum: ['session', '30d', '90d', 'long_term'],
        default: '30d',
      },
      notifyExpiringMemories: { type: Boolean, default: true },
      notifyPendingSuggestions: { type: Boolean, default: true },
      defaultExportTemplate: {
        type: String,
        enum: ['modern', 'classic', 'compact'],
        default: 'modern',
      },
      /** Pre-select flagged PII in the export dialog (user still confirms) */
      autoRedactFlaggedPII: { type: Boolean, default: true },
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove passwordHash from JSON output
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
