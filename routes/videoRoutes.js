const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const YouTubeService = require('../services/youtubeServiceNew');

router.get('/my-videos', authenticate, async (req, res) => {
  try {
    const categoryId = req.query.category;
    const videos = await YouTubeService.getUserVideos(req.user.userId, categoryId);
    res.json(videos);
  } catch (error) {
    console.error('Videolar alınırken hata:', error);
    res.status(500).json({ error: 'Videolar alınamadı.' });
  }
});

router.post('/update', authenticate, async (req, res) => {
  try {
    const result = await YouTubeService.updateUserVideos(req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('Videolar güncellenirken hata:', error);
    res.status(500).json({ error: 'Videolar güncellenemedi.' });
  }
});

module.exports = router;
