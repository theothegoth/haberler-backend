const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const UserChannel = require('../models/UserChannel');
const YouTubeService = require('../services/youtubeServiceNew');

router.get('/my-channels', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const channels = await UserChannel.getUserChannels(userId);
    res.json(channels);
  } catch (error) {
    console.error('Kanallar alınırken hata:', error);
    res.status(500).json({ error: 'Kanallar alınamadı.' });
  }
});

router.post('/add', authenticate, async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Kanal bilgisi gereklidir.' });
    }

    const userId = req.user?.id || req.user?.userId;

    const result = await YouTubeService.addChannelForUser(userId, input);
    res.json(result);
  } catch (error) {
    console.error('Kanal eklenirken hata:', error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/remove/:channelId', authenticate, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?.id || req.user?.userId;
    const result = await YouTubeService.removeChannelForUser(userId, channelId);
    res.json(result);
  } catch (error) {
    console.error('Kanal silinirken hata:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
