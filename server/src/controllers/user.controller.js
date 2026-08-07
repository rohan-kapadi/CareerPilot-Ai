/**
 * User Controller — Profile and skills management
 */
const User = require('../models/User.model');
const { generateDocx, generatePdf } = require('../services/export.service');

/**
 * GET /api/user/profile
 * Returns the authenticated user's profile (including skills).
 */
async function getProfile(req, res) {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
  }

  res.json({
    success: true,
    message: 'Profile fetched successfully',
    data: user,
  });
}

/**
 * PATCH /api/user/skills
 * Add or remove skills from the user's profile.
 * Body: { add: [string], remove: [string] }
 */
async function patchUserSkills(req, res) {
  const { add = [], remove = [] } = req.body;

  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
  }

  // Add new skills (deduplicate, case-insensitive check)
  add.forEach((skill) => {
    const trimmed = skill.trim();
    if (trimmed && !user.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      user.skills.push(trimmed);
    }
  });

  // Remove specified skills
  if (remove.length) {
    user.skills = user.skills.filter(
      (s) => !remove.some((r) => r.toLowerCase() === s.toLowerCase())
    );
  }

  await user.save();

  res.json({
    success: true,
    message: 'User skills updated successfully',
    data: { skills: user.skills },
  });
}

/**
 * PUT /api/user/profile
 * Update global profile sections (experience, education, summary, projects, personalInfo)
 */
async function updateProfile(req, res) {
  const { summary, experience, education, projects, personalInfo } = req.body;
  
  const updateDoc = {};
  if (summary !== undefined) updateDoc.summary = summary;
  if (experience !== undefined) updateDoc.experience = experience;
  if (education !== undefined) updateDoc.education = education;
  if (projects !== undefined) updateDoc.projects = projects;
  if (personalInfo !== undefined) updateDoc.personalInfo = personalInfo;

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updateDoc },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
}

/**
 * PUT /api/user/settings — Phase 8
 * Body: any subset of the settings object.
 *
 * Whitelisted per-key so a client can't write arbitrary fields onto the user
 * document, and so unknown keys fail loudly rather than being silently dropped.
 */
const ALLOWED_SETTINGS = [
  'defaultMemoryTimebox',
  'notifyExpiringMemories',
  'notifyPendingSuggestions',
  'defaultExportTemplate',
  'autoRedactFlaggedPII',
];

async function updateSettings(req, res) {
  const incoming = req.body?.settings ?? req.body ?? {};
  const updateDoc = {};

  for (const [key, value] of Object.entries(incoming)) {
    if (!ALLOWED_SETTINGS.includes(key)) continue;
    updateDoc[`settings.${key}`] = value;
  }

  if (Object.keys(updateDoc).length === 0) {
    return res.status(400).json({
      success: false,
      message: `No valid settings provided. Allowed keys: ${ALLOWED_SETTINGS.join(', ')}`,
      data: null,
    });
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updateDoc },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found', data: null });
  }

  res.json({
    success: true,
    message: 'Settings updated',
    data: { settings: user.settings },
  });
}

/**
 * POST /api/user/profile/export/pdf
 * Export the user's global profile as a PDF resume.
 */
async function exportProfilePdf(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  try {
    const sections = {
      personalInfo: user.personalInfo,
      summary: user.summary,
      experience: user.experience,
      education: user.education,
      projects: user.projects,
      skills: user.skills,
    };
    const pdfPath = await generatePdf(`profile-${user._id}`, sections, { template: 'compact' });
    res.download(pdfPath, `${user.personalInfo?.name || 'Resume'}.pdf`);
  } catch (err) {
    console.error('PDF export error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
}

/**
 * POST /api/user/profile/export/docx
 * Export the user's global profile as a DOCX resume.
 */
async function exportProfileDocx(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  try {
    const sections = {
      personalInfo: user.personalInfo,
      summary: user.summary,
      experience: user.experience,
      education: user.education,
      projects: user.projects,
      skills: user.skills,
    };
    const docxPath = await generateDocx(`profile-${user._id}`, sections, { template: 'compact' });
    res.download(docxPath, `${user.personalInfo?.name || 'Resume'}.docx`);
  } catch (err) {
    console.error('DOCX export error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate DOCX' });
  }
}

module.exports = { getProfile, patchUserSkills, updateProfile, updateSettings, exportProfilePdf, exportProfileDocx };
