const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const UserChannel = require('../models/UserChannel');
const YouTubeService = require('../services/youtubeServiceNew');

router.get('/my-channels', authenticate, async (req, res) => {
  try {
    const channels = await UserChannel.getUserChannels(req.user.userId);
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

    const result = await YouTubeService.addChannelForUser(req.user.userId, input);
    res.json(result);
  } catch (error) {
    console.error('Kanal eklenirken hata:', error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/remove/:channelId', authenticate, async (req, res) => {
  try {
    const { channelId } = req.params;
    const result = await YouTubeService.removeChannelForUser(req.user.userId, channelId);
    res.json(result);
  } catch (error) {
    console.error('Kanal silinirken hata:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
