const express = require('express');
const router = express.Router();
const { classifyChannel } = require('../services/youtubeService');

// GET /api/youtube/classify-channel
router.get('/classify-channel', classifyChannel);

module.exports = router;