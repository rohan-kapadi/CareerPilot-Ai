const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const { matchResumeToJD, getMatch, listMatches } = require('../controllers/matchController');

// All matching routes require authentication
router.use(authMiddleware);

router.post('/', matchResumeToJD);
router.get('/', listMatches);
router.get('/:id', getMatch);

module.exports = router;
