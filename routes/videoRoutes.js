const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const YouTubeService = require('../services/youtubeServiceNew');

router.get('/my-videos', authenticate, async (req, res) => {
  try {
    const categoryId = req.query.category;
    const userId = req.user.userId || req.user.id;
    const videos = await YouTubeService.getUserVideos(userId, categoryId);
    res.json(videos);
  } catch (error) {
    console.error('Videolar alınırken hata:', error);
    res.status(500).json({ error: 'Videolar alınamadı.' });
  }
});

router.post('/update', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await YouTubeService.updateUserVideos(userId);
    res.json(result);
  } catch (error) {
    console.error('Videolar güncellenirken hata:', error);
    res.status(500).json({ error: 'Videolar güncellenemedi.' });
  }
});

module.exports = router;
