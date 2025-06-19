const express = require('express');
const router = express.Router();

const {
  getVideosFromChannels,
  updateChannelList,
  loadChannelList,
  saveChannelList
} = require('../services/youtubeService');

// Videoları ülke bazlı çek
router.get('/videos-from-channels', getVideosFromChannels);

// Kanal listesini ülke bazlı manuel güncelle (opsiyonel)
router.get('/update-channel-list', async (req, res) => {
  try {
    const country = (req.query.country || 'TR').toUpperCase();
    await updateChannelList(country);
    res.json({ message: `${country} kanal listesi başarıyla güncellendi.` });
  } catch (error) {
    res.status(500).json({ error: 'Kanal listesi güncellenemedi.' });
  }
});

// Manuel kanal ekleme endpoint'i
router.post('/add-channel', async (req, res) => {
  const { channelId, channelTitle, country = 'TR' } = req.body;

  if (!channelId || !channelTitle) {
    return res.status(400).json({ error: 'channelId ve channelTitle gereklidir.' });
  }

  try {
    const channels = await loadChannelList(country.toUpperCase());

    if (channels.find(c => c.channelId === channelId)) {
      return res.status(409).json({ message: 'Kanal zaten listede.' });
    }

    channels.push({ channelId, channelTitle });
    await saveChannelList(channels, country.toUpperCase());

    res.json({ message: 'Kanal başarıyla eklendi.', channel: { channelId, channelTitle } });
  } catch (error) {
    console.error('Kanal ekleme hatası:', error);
    res.status(500).json({ error: 'Kanal eklenirken hata oluştu.' });
  }
});

module.exports = router;
