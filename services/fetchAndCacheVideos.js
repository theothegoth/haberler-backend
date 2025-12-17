const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { loadChannelList } = require('./youtubeService');

async function fetchAndCacheVideos(countryCode = 'TR') {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channels = await loadChannelList(countryCode);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const publishedAfter = yesterday.toISOString();

  let allVideos = [];

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
        const videoId = item.id.videoId;

        // Video detaylarını al (likeCount ve categoryId için)
        const statsRes = await axios.get('https://youtube.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'statistics,snippet',
            id: videoId,
            key: apiKey
          }
        });

        const videoDetails = statsRes.data.items?.[0];

        allVideos.push({
          videoId,
          channelTitle: item.snippet.channelTitle,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          publishedAt: item.snippet.publishedAt,
          likeCount: parseInt(videoDetails?.statistics?.likeCount) || 0,
          category: videoDetails?.snippet?.categoryId || null
        });
      }
    }

    const cachePath = path.join(__dirname, `../cache/videos_cache_${countryCode}.json`);
    await fs.writeFile(cachePath, JSON.stringify(allVideos, null, 2), 'utf-8');
    console.log(`🎉 ${countryCode} için video cache dosyası güncellendi.`);
  } catch (error) {
    console.error('❌ Video cache güncellenemedi:', error.message);
  }
}

module.exports = fetchAndCacheVideos;
