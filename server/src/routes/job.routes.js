const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { generateAtsScore, generateEnhancements, generateCoverLetter, generateTailoredResume, exportTailoredPdf } = require('../controllers/job.controller');

router.use(authMiddleware);

router.post('/ats-score', generateAtsScore);
router.post('/enhance', generateEnhancements);
router.post('/cover-letter', generateCoverLetter);
router.post('/tailor', generateTailoredResume);
router.post('/tailor/export/pdf', exportTailoredPdf);

// Kept for backward compatibility while old UI is replaced
router.post('/analyze', generateAtsScore);

module.exports = router;
