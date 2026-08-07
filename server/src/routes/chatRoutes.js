const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const { sendMessage, getConversation, listConversations } = require('../controllers/chatController');

router.use(authMiddleware);

router.post('/', sendMessage);
router.get('/', listConversations);
router.get('/:id', getConversation);

module.exports = router;
