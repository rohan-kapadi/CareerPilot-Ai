const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  getProfile,
  patchUserSkills,
  updateProfile,
  updateSettings,
  exportProfilePdf,
  exportProfileDocx
} = require('../controllers/user.controller');

// All user routes require authentication
router.use(authMiddleware);

router.get('/profile', getProfile);
router.patch('/skills', patchUserSkills);
router.put('/profile', updateProfile);
router.put('/settings', updateSettings);
router.post('/profile/export/pdf', exportProfilePdf);
router.post('/profile/export/docx', exportProfileDocx);

module.exports = router;
