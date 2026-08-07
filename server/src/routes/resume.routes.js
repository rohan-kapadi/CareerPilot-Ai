const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
  uploadResume,
  listResumes,
  getResume,
  updateSections,
  patchSkills,
  getVersions,
  restoreVersion,
  compareVersions,
  exportResume,
  getExportOptions,
} = require('../controllers/resume.controller');

// All resume routes require authentication
router.use(authMiddleware);

router.get('/', listResumes);
router.post('/upload', upload.single('file'), uploadResume);

// ── Phase 7: version history, comparison & export ──
// Declared before '/:id' so these path segments are never read as an id.
router.get('/:id/versions', getVersions);
router.post('/:id/versions/:version/restore', restoreVersion);
router.get('/:id/compare', compareVersions);
router.get('/:id/export-options', getExportOptions);
router.post('/:id/export', exportResume);

router.get('/:id', getResume);
router.put('/:id/sections', updateSections);
router.patch('/:id/skills', patchSkills);

module.exports = router;
