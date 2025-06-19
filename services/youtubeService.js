const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const searchTerms = [
  'haber', 'gündem', 'siyaset', 'ekonomi', 'dış politika',
  'son dakika', 'yorum', 'analiz', 'açıklama','gazeteci',
  'canlı yayın'
];

function getChannelsFilePath(countryCode) {
  return path.join(__dirname, `../channels_${countryCode.toUpperCase()}.json`);
}

async function saveChannelList(channels, countryCode) {
  const filePath = getChannelsFilePath(countryCode);
  await fs.writeFile(filePath, JSON.stringify(channels, null, 2));
}

async function loadChannelList(countryCode) {
  const filePath = getChannelsFilePath(countryCode);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function updateChannelList(countryCode = 'TR') {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelMap = new Map();

  try {
    for (const term of searchTerms) {
      const res = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: term,
          type: 'channel',
          maxResults: 10,
          regionCode: countryCode,
          key: apiKey
        }
      });

      for (const item of res.data.items) {
        const channelId = item.snippet.channelId;
        const channelTitle = item.snippet.channelTitle;
        if (channelId && !channelMap.has(channelId)) {
          channelMap.set(channelId, { channelId, channelTitle });
        }
      }
    }

    const channels = Array.from(channelMap.values());
    await saveChannelList(channels, countryCode);
    console.log(`${countryCode} kanal listesi güncellendi. Toplam kanal: ${channels.length}`);
  } catch (error) {
    console.error(`${countryCode} kanal listesi güncellenirken hata:`, error.message);
  }
}

async function getVideosFromChannels(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const countryCode = (req.query.country || 'TR').toUpperCase();
  const channels = await loadChannelList(countryCode);

  if (!channels || channels.length === 0) {
    return res.status(500).json({ error: `${countryCode} kanal listesi boş veya yüklenemedi.` });
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const publishedAfter = yesterday.toISOString();

  const allVideos = [];

  try {
    for (const channel of channels) {
      const response = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          channelId: channel.channelId,
          type: 'video',
          order: 'date',
          publishedAfter,
          maxResults: 5,
          key: apiKey
        }
      });

      for (const item of response.data.items) {
        allVideos.push({
          videoId: item.id.videoId,
          channelTitle: item.snippet.channelTitle,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          publishedAt: item.snippet.publishedAt
        });
      }
    }

    res.json(allVideos);
  } catch (error) {
    console.error('Videolar alınırken hata:', error.message);
    res.status(500).json({ error: 'Videolar alınamadı.' });
  }
}

module.exports = {
  updateChannelList,
  loadChannelList,
  saveChannelList,
  getVideosFromChannels
};
