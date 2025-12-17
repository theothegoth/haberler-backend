const express = require('express');
const router = express.Router();
const {
  updateChannelList,
  updateVideoCache,
  getVideosFromCache,
  addChannelFromInput
} = require('../services/youtubeService');

// Kanal listesi güncelle
router.get('/load-channel-list', async (req, res) => {
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

// Kanal ekleme (handle, ID veya URL ile)
router.post('/add-channel', async (req, res) => {
  try {
    const { input, country } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'input (kanal ID veya handle) gereklidir.' });
    }

    const result = await addChannelFromInput(input, country || 'TR');
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
