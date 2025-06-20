const express = require('express');
const router = express.Router();
const {
  updateChannelList,
  updateVideoCache,
  getVideosFromCache
} = require('../services/youtubeService');

// Kanal listesi güncelle
router.get('/update-channel-list', async (req, res) => {
  try {
    const country = (req.query.country || 'TR').toUpperCase();
    const result = await updateChannelList(country);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Video cache güncelle
router.get('/update-video-cache', async (req, res) => {
  try {
    const country = (req.query.country || 'TR').toUpperCase();
    const result = await updateVideoCache(country);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cache'den videoları getir
router.get('/videos-from-cache', getVideosFromCache);

module.exports = router;
