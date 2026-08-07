const PrivacyFlag = require('../models/PrivacyFlag');
const Consent = require('../models/Consent');
const Resume = require('../models/Resume.model');
const Memory = require('../models/Memory');
const { redactResume } = require('../services/redactionService');
const { scanAndFlagResume } = require('../agents/privacyAgent');

// Get flags for a resume
exports.getFlags = async (req, res) => {
  try {
    const flags = await PrivacyFlag.find({ resumeId: req.params.resumeId });
    res.json(flags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Return a redacted preview/export of the resume (does not save to DB)
exports.redact = async (req, res) => {
  try {
    const { resumeId, fieldPaths } = req.body;
    const resume = await Resume.findById(resumeId).lean();
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    const redacted = redactResume(resume, fieldPaths);
    res.json({ success: true, redacted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Scan a resume for PII manually (useful for testing or post-upload hook)
exports.scanResume = async (req, res) => {
    try {
        const { resumeId } = req.body;
        const resume = await Resume.findById(resumeId).lean();
        if (!resume) return res.status(404).json({ message: 'Resume not found' });
    
        const flags = await scanAndFlagResume(resumeId, resume);
        res.json({ success: true, flags });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Toggle consent
exports.updateConsent = async (req, res) => {
  try {
    const { purpose, dataCategory, granted } = req.body;
    const userId = req.user.id;

    const consent = await Consent.findOneAndUpdate(
      { userId, purpose, dataCategory },
      { granted },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(consent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all consents for current user
exports.getConsents = async (req, res) => {
    try {
        const userId = req.user.id;
        const consents = await Consent.find({ userId });
        res.json(consents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Export user data based on category
exports.exportData = async (req, res) => {
  try {
    const { category } = req.query; // 'resume', 'memory'
    const userId = req.user.id;

    let data = {};
    if (category === 'resume' || category === 'all') {
        data.resumes = await Resume.find({ userId }).lean();
    }
    if (category === 'memory' || category === 'all') {
        data.memories = await Memory.find({ userId }).lean();
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user data based on category
exports.deleteDataCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user.id;

    if (category === 'memory') {
        await Memory.deleteMany({ userId });
    } else if (category === 'resume') {
        await Resume.deleteMany({ userId });
    } else {
        return res.status(400).json({ message: 'Invalid category' });
    }
    
    res.json({ success: true, message: `${category} data deleted.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
