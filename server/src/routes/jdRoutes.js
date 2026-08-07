const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const { createJD, listJDs, getJD } = require('../controllers/jdController');

// All JD routes require authentication
router.use(authMiddleware);

router.post('/', createJD);
router.get('/', listJDs);
router.get('/:id', getJD);

module.exports = router;
