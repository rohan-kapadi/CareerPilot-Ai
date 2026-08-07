/**
 * Roadmap Routes — Phase 6
 *
 * :skillGapId is either a JobDescription id or a URL-encoded skill name
 * (see roadmapController for why).
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { getRoadmap, generateRoadmap } = require('../controllers/roadmapController');

router.use(authMiddleware);

router.get('/:skillGapId', getRoadmap);
router.post('/:skillGapId/generate', generateRoadmap);

module.exports = router;
