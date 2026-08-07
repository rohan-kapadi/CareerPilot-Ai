const express = require('express');
const router = express.Router();
const privacyController = require('../controllers/privacyController');
const protect = require('../middleware/auth.middleware');

router.use(protect); // All privacy routes require auth

router.get('/flags/:resumeId', privacyController.getFlags);
router.post('/scan', privacyController.scanResume);
router.post('/redact', privacyController.redact);

router.get('/consent', privacyController.getConsents);
router.post('/consent', privacyController.updateConsent);

router.get('/export', privacyController.exportData);
router.delete('/data/:category', privacyController.deleteDataCategory);

module.exports = router;
