/**
 * Resume Controller — Upload, Fetch, Update sections, Skills patch
 *
 * Phase 6 boundary note:
 *   updateSections() and patchSkills() write to Resume.sections directly, and
 *   that is intentional — they carry *human-authored* edits typed into the
 *   editor. The Phase 6 rule ("nothing mutates Resume.sections except
 *   suggestionController") governs AI-generated content: any text an agent
 *   drafts must reach the resume through a Suggestion the user approves.
 *   The Resume Builder's inline accept therefore posts to
 *   /api/suggestions/from-draft, not to these endpoints.
 */
const path = require('path');
const Resume = require('../models/Resume.model');
const User = require('../models/User.model');
const ResumeVersion = require('../models/ResumeVersion');
const PrivacyFlag = require('../models/PrivacyFlag');
const { parseResumeText } = require('../services/pythonBridge.service');
const { extractResumeText } = require('../services/resumeParser.service');
const versionService = require('../services/versionService');
const { redactResume } = require('../services/redactionService');
const { generateDocx, generatePdf, listTemplates } = require('../services/export.service');
const { computeDiff, summarizeDiff } = require('../utils/sectionDiff');

/**
 * POST /api/resume/upload
 * Accepts file via multer, triggers Python parsing, saves to MongoDB.
 */
async function uploadResume(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please provide a PDF or DOCX file.',
      data: null,
    });
  }

  const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
  const fileType = ext === 'pdf' ? 'pdf' : 'docx';
  const filePath = req.file.path;

  // Extract text locally
  let text;
  try {
    text = await extractResumeText(filePath, fileType);
  } catch (err) {
    console.error('Local text extraction error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to extract text from file.',
      data: null,
    });
  }

  // Call Python service to parse the extracted text
  let sections;
  try {
    sections = await parseResumeText(text);
  } catch (err) {
    console.error('Resume parsing error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to parse resume structure from text. Please try again.',
      data: null,
    });
  }

  const resume = await Resume.create({
    userId: req.userId,
    originalFileName: req.file.originalname,
    fileType,
    filePath,
    sections,
  });

  // Sync initially parsed sections to the User profile
  const parsedSkills = sections.skills || [];
  
  const updateDoc = { $set: {} };
  if (parsedSkills.length > 0) {
    updateDoc.$addToSet = { skills: { $each: parsedSkills.filter((s) => s && s.trim()) } };
  }
  if (sections.summary) updateDoc.$set.summary = sections.summary;
  if (sections.experience) updateDoc.$set.experience = sections.experience;
  if (sections.education) updateDoc.$set.education = sections.education;
  if (sections.projects) updateDoc.$set.projects = sections.projects;
  if (sections.personalInfo) updateDoc.$set.personalInfo = sections.personalInfo;

  if (Object.keys(updateDoc.$set).length === 0) delete updateDoc.$set;

  if (Object.keys(updateDoc).length > 0) {
    await User.findByIdAndUpdate(req.userId, updateDoc);
  }

  // Phase 7: snapshot the resume as it arrived, so version 1 is always the
  // untouched original the user can roll back to.
  await versionService.ensureBaseline(resume._id, req.userId, resume.sections);

  res.status(201).json({
    success: true,
    message: 'Resume uploaded and parsed successfully',
    data: { resumeId: resume._id, sections: resume.sections },
  });
}

/**
 * GET /api/resume/:id
 * Fetch full resume JSON.
 */
async function getResume(req, res) {
  const resume = await Resume.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      message: 'Resume not found',
      data: null,
    });
  }

  res.json({
    success: true,
    message: 'Resume fetched successfully',
    data: resume,
  });
}

/**
 * PUT /api/resume/:id/sections
 * Update any section of the resume.
 */
async function updateSections(req, res) {
  const { sections } = req.body;

  if (!sections) {
    return res.status(400).json({
      success: false,
      message: 'sections object is required',
      data: null,
    });
  }

  const resume = await Resume.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: { sections } },
    { new: true, runValidators: true }
  );

  if (!resume) {
    return res.status(404).json({
      success: false,
      message: 'Resume not found',
      data: null,
    });
  }

  // Also sync sections to User document globally
  const updateDoc = { $set: {} };
  if (sections.skills && sections.skills.length > 0) {
    updateDoc.$addToSet = { skills: { $each: sections.skills.filter((s) => s && s.trim()) } };
  }
  if (sections.summary !== undefined) updateDoc.$set.summary = sections.summary;
  if (sections.experience !== undefined) updateDoc.$set.experience = sections.experience;
  if (sections.education !== undefined) updateDoc.$set.education = sections.education;
  if (sections.projects !== undefined) updateDoc.$set.projects = sections.projects;
  if (sections.personalInfo !== undefined) updateDoc.$set.personalInfo = sections.personalInfo;

  if (Object.keys(updateDoc.$set).length === 0) delete updateDoc.$set;

  if (Object.keys(updateDoc).length > 0) {
    await User.findByIdAndUpdate(req.userId, updateDoc);
  }

  res.json({
    success: true,
    message: 'Sections updated successfully',
    data: resume,
  });
}

/**
 * PATCH /api/resume/:id/skills
 * Add or remove skills (used by Chrome extension).
 * Body: { add: [string], remove: [string] }
 */
async function patchSkills(req, res) {
  const { add = [], remove = [] } = req.body;

  const resume = await Resume.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      message: 'Resume not found',
      data: null,
    });
  }

  let skills = resume.sections.skills || [];

  // Add new skills (avoid duplicates)
  add.forEach((skill) => {
    if (!skills.includes(skill)) {
      skills.push(skill);
    }
  });

  // Remove specified skills
  skills = skills.filter((s) => !remove.includes(s));

  resume.sections.skills = skills;
  await resume.save();

  // Sync added skills to the User profile (deduplicated at DB level)
  if (add.length > 0) {
    await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { skills: { $each: add.filter((s) => s.trim()) } } }
    );
  }
  if (remove.length > 0) {
    await User.findByIdAndUpdate(
      req.userId,
      { $pull: { skills: { $in: remove } } }
    );
  }

  res.json({
    success: true,
    message: 'Skills updated successfully',
    data: { skills: resume.sections.skills },
  });
}

/* ──────────────────────────────────────────────────────────────
   Phase 7 — Version History, Comparison & Export
   ────────────────────────────────────────────────────────────── */

/**
 * GET /api/resume/:id/versions
 * Version timeline, newest first. Snapshots are omitted — the list view only
 * needs metadata, and full sections make the payload large.
 */
async function getVersions(req, res) {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId }).select('_id');
  if (!resume) {
    return res.status(404).json({ success: false, message: 'Resume not found', data: null });
  }

  const versions = await ResumeVersion.find({ resumeId: req.params.id, userId: req.userId })
    .sort({ versionNumber: -1 })
    .select('-sections')
    .populate('suggestionId', 'title suggestionType')
    .lean();

  return res.json({
    success: true,
    message: 'Version history retrieved',
    data: { versions, currentVersion: versions[0]?.versionNumber ?? 0 },
  });
}

/**
 * POST /api/resume/:id/versions/:version/restore
 *
 * Append-only: restoring does not delete anything, it snapshots the restored
 * state as a new version. History stays a complete record (PROJECT.md §6.9).
 */
async function restoreVersion(req, res) {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!resume) {
    return res.status(404).json({ success: false, message: 'Resume not found', data: null });
  }

  const target = await ResumeVersion.findOne({
    resumeId: req.params.id,
    userId: req.userId,
    versionNumber: Number(req.params.version),
  }).lean();

  if (!target) {
    return res.status(404).json({ success: false, message: 'Version not found', data: null });
  }

  const changes = computeDiff(resume.sections, target.sections);
  if (!changes.length) {
    return res.json({
      success: true,
      message: `Your resume already matches version ${target.versionNumber}.`,
      data: { resume, version: null },
    });
  }

  const updated = await Resume.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: { sections: target.sections } },
    { new: true, runValidators: true }
  );

  const version = await versionService.recordChange(
    req.params.id,
    req.userId,
    resume.sections,
    target.sections,
    {
      origin: 'restore',
      diffSummary: `Restored version ${target.versionNumber} — ${summarizeDiff(changes)}`,
    }
  );

  return res.json({
    success: true,
    message: `Restored version ${target.versionNumber}.`,
    data: { resume: updated, version, changes },
  });
}

/**
 * GET /api/resume/:id/compare?v1=&v2=
 * Side-by-side comparison of two versions (§6.10). Diff is computed
 * server-side against the structured sections, not rendered text.
 */
async function compareVersions(req, res) {
  const { v1, v2 } = req.query;

  if (!v1 || !v2) {
    return res.status(400).json({
      success: false,
      message: 'Both v1 and v2 query parameters are required.',
      data: null,
    });
  }

  const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId }).select('_id');
  if (!resume) {
    return res.status(404).json({ success: false, message: 'Resume not found', data: null });
  }

  const [left, right] = await Promise.all([
    ResumeVersion.findOne({
      resumeId: req.params.id,
      userId: req.userId,
      versionNumber: Number(v1),
    }).lean(),
    ResumeVersion.findOne({
      resumeId: req.params.id,
      userId: req.userId,
      versionNumber: Number(v2),
    }).lean(),
  ]);

  if (!left || !right) {
    return res.status(404).json({
      success: false,
      message: 'One or both versions were not found.',
      data: null,
    });
  }

  const changes = computeDiff(left.sections, right.sections);

  return res.json({
    success: true,
    message: 'Comparison ready',
    data: {
      left: {
        versionNumber: left.versionNumber,
        sections: left.sections,
        createdAt: left.createdAt,
        diffSummary: left.diffSummary,
      },
      right: {
        versionNumber: right.versionNumber,
        sections: right.sections,
        createdAt: right.createdAt,
        diffSummary: right.diffSummary,
      },
      changes,
      summary: summarizeDiff(changes),
    },
  });
}

/**
 * POST /api/resume/:id/export
 * Body: { format: 'pdf'|'docx', template?, redactFieldPaths?: [String], preview?: Boolean }
 *
 * DELIBERATELY AI-FREE (PROJECT.md §6.8, phases-1.md §7 handoff): no LLM agent
 * touches this path. Rendering is pure template substitution.
 *
 * Redaction happens here, at export time only — the stored Resume.sections is
 * never mutated (phases-1.md §5 handoff).
 */
async function exportResume(req, res) {
  const { format = 'pdf', template = 'modern', redactFieldPaths = [], preview = false } = req.body;

  const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!resume) {
    return res.status(404).json({ success: false, message: 'Resume not found', data: null });
  }

  const paths = Array.isArray(redactFieldPaths) ? redactFieldPaths.filter(Boolean) : [];
  // redactResume deep-copies before redacting, so `resume` itself is untouched.
  const exportSource = paths.length ? redactResume(resume, paths) : resume;

  // Preview mode returns the redacted content without generating a file.
  if (preview) {
    return res.json({
      success: true,
      message: paths.length ? `${paths.length} field(s) will be redacted.` : 'No redactions applied.',
      data: {
        sections: exportSource.sections,
        redactedPaths: paths,
        templates: listTemplates(),
      },
    });
  }

  if (!['pdf', 'docx'].includes(format)) {
    return res.status(400).json({
      success: false,
      message: "format must be 'pdf' or 'docx'.",
      data: null,
    });
  }

  const suffix = paths.length ? '-redacted' : '';
  const displayName = exportSource.sections?.personalInfo?.name || 'Resume';

  try {
    const filePath =
      format === 'pdf'
        ? await generatePdf(resume._id.toString(), exportSource.sections, { template, suffix })
        : await generateDocx(resume._id.toString(), exportSource.sections, { suffix });

    // Only cache the path when nothing was redacted — a redacted export is a
    // one-off artifact, not the canonical file for this resume.
    if (!paths.length) {
      await Resume.findByIdAndUpdate(resume._id, {
        [format === 'pdf' ? 'exportedPdfPath' : 'exportedDocxPath']: filePath,
      });
    }

    return res.download(filePath, `${displayName}${suffix}.${format}`);
  } catch (err) {
    console.error('Export error:', err.message);
    return res.status(500).json({
      success: false,
      message: `Failed to generate ${format.toUpperCase()}.`,
      data: null,
    });
  }
}

/**
 * GET /api/resume/:id/export-options
 * Templates plus any PII the privacy scan flagged, so <ExportModal> can offer
 * redaction toggles without a second round-trip.
 */
async function getExportOptions(req, res) {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId }).select('_id');
  if (!resume) {
    return res.status(404).json({ success: false, message: 'Resume not found', data: null });
  }

  const flags = await PrivacyFlag.find({ resumeId: req.params.id }).lean();

  return res.json({
    success: true,
    message: 'Export options retrieved',
    data: { templates: listTemplates(), flags },
  });
}

module.exports = {
  uploadResume,
  getResume,
  updateSections,
  patchSkills,
  // Phase 7
  getVersions,
  restoreVersion,
  compareVersions,
  exportResume,
  getExportOptions,
};
