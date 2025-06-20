const fs = require('fs').promises;
const path = require('path');

async function getVideosFromCache(req, res) {
  const countryCode = (req.query.country || 'TR').toUpperCase();
  const cachePath = path.join(__dirname, `../cache/videos_cache_${countryCode}.json`);

  try {
    const data = await fs.readFile(cachePath, 'utf-8');
    const videos = JSON.parse(data);
    res.json(videos);
  } catch (error) {
    console.error('❌ Cache dosyası okunamadı:', error.message);
    res.status(500).json({ error: 'Cache verisi okunamadı veya mevcut değil.' });
  }
}

module.exports = getVideosFromCache;
