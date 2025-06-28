const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const searchTerms = [
  'haber', 'gündem', 'siyaset', 'ekonomi', 'dış politika',
  'son dakika', 'gazeteci'
];

function getChannelsFilePath(countryCode) {
  return path.join(__dirname, `../data/channels_${countryCode.toUpperCase()}.json`);
}

function getVideosCacheFilePath(countryCode) {
  return path.join(__dirname, `../cache/videos_cache_${countryCode.toUpperCase()}.json`);
}

async function saveChannelList(channels, countryCode) {
  const filePath = getChannelsFilePath(countryCode);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(channels, null, 2));
}

async function loadChannelList(countryCode) {
  const filePath = getChannelsFilePath(countryCode);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveVideosCache(videos, countryCode) {
  const filePath = getVideosCacheFilePath(countryCode);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(videos, null, 2));
}

async function loadVideosCache(countryCode) {
  const filePath = getVideosCacheFilePath(countryCode);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function cleanVideosCache(videos) {
  const MAX_CACHE_AGE_HOURS = 48;
  const now = new Date();

  return videos.filter(video => {
    const publishedAt = new Date(video.publishedAt);
    const ageHours = (now - publishedAt) / (1000 * 60 * 60);
    return ageHours <= MAX_CACHE_AGE_HOURS;
  });
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

    return { message: `${countryCode} kanal listesi başarıyla güncellendi.` };
  } catch (error) {
    console.error(`${countryCode} kanal listesi güncellenirken hata:`, error.message);
    throw error;
  }
}

async function updateVideoCache(countryCode = 'TR') {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channels = await loadChannelList(countryCode);
  if (!channels || channels.length === 0) {
    throw new Error(`${countryCode} kanal listesi boş veya yüklenemedi.`);
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const publishedAfter = yesterday.toISOString();

  let videosCache = await loadVideosCache(countryCode);
  const videosCacheMap = new Map(videosCache.map(v => [v.videoId, v]));

  try {
    for (const channel of channels) {
      const res = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          channelId: channel.channelId,
          type: 'video',
          order: 'date',
          publishedAfter,
          maxResults: 1,
          key: apiKey
        }
      });

      if (res.data.items && res.data.items.length > 0) {
        const video = res.data.items[0];
        const videoId = video.id.videoId;

        if (!videosCacheMap.has(videoId)) {
          videosCache.push({
            videoId,
            channelTitle: video.snippet.channelTitle,
            title: video.snippet.title,
            thumbnail: video.snippet.thumbnails.medium.url,
            publishedAt: video.snippet.publishedAt,
            likeCount: 0,
            category: null
          });
          videosCacheMap.set(videoId, videosCache[videosCache.length - 1]);
        }
      }
    }

    const videoIds = videosCache.map(v => v.videoId);
    const chunkSize = 50;

    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const chunk = videoIds.slice(i, i + chunkSize).join(',');

      const statsRes = await axios.get('https://youtube.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'statistics,snippet',
          id: chunk,
          key: apiKey
        }
      });

      if (statsRes.data.items) {
        for (const item of statsRes.data.items) {
          const vid = item.id;
          if (videosCacheMap.has(vid)) {
            const video = videosCacheMap.get(vid);
            video.likeCount = parseInt(item.statistics?.likeCount) || 0;
            video.category = item.snippet?.categoryId || null;
          }
        }
      }
    }

    videosCache = cleanVideosCache(videosCache);
    await saveVideosCache(videosCache, countryCode);

    console.log(`${countryCode} video cache başarıyla güncellendi. Toplam video: ${videosCache.length}`);
    return { message: `${countryCode} video cache başarıyla güncellendi.` };
  } catch (error) {
    console.error(`${countryCode} video cache güncellenirken hata:`, error.message);
    throw error;
  }
}

async function getVideosFromCache(req, res) {
  const countryCode = (req.query.country || 'TR').toUpperCase();
  const category = req.query.category;
  let videos = await loadVideosCache(countryCode);

  if (category) {
    videos = videos.filter(video => video.category === category);
  }

  videos.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
  res.json(videos);
}

async function addChannelFromInput(input, countryCode = 'TR') {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channels = await loadChannelList(countryCode);

  let channelId = null;

  if (input.startsWith('@')) {
    const handle = input;
    const res = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: handle,
        type: 'channel',
        maxResults: 1,
        regionCode: countryCode,
        key: apiKey
      }
    });

    if (!res.data.items?.length) {
      throw new Error('Handle ile kanal bulunamadı.');
    }

    channelId = res.data.items[0].snippet.channelId;
  } else if (input.includes('youtube.com/@')) {
    const match = input.match(/youtube\.com\/@([\w\-]+)/);
    if (!match) throw new Error('URL’den handle alınamadı.');
    const handle = '@' + match[1];

    const res = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: handle,
        type: 'channel',
        maxResults: 1,
        regionCode: countryCode,
        key: apiKey
      }
    });

    if (!res.data.items?.length) {
      throw new Error('Handle ile kanal bulunamadı.');
    }

    channelId = res.data.items[0].snippet.channelId;
  } else if (input.includes('youtube.com/channel/')) {
    const match = input.match(/channel\/([a-zA-Z0-9_-]+)/);
    if (match) {
      channelId = match[1];
    } else {
      throw new Error('URL’den kanal ID alınamadı.');
    }
  } else {
    channelId = input;
  }

  if (!channelId) {
    throw new Error('channelId alınamadı.');
  }

  if (channels.some(c => c.channelId === channelId)) {
    return { message: 'Bu kanal zaten listede.' };
  }

  const channelRes = await axios.get('https://youtube.googleapis.com/youtube/v3/channels', {
    params: {
      part: 'snippet',
      id: channelId,
      key: apiKey
    }
  });

  if (!channelRes.data.items?.length) {
    throw new Error('Kanal bilgisi alınamadı.');
  }

  const channelTitle = channelRes.data.items[0].snippet.title;
  channels.push({ channelId, channelTitle });
  await saveChannelList(channels, countryCode);

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const videoRes = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'date',
      publishedAfter: yesterday,
      maxResults: 1,
      key: apiKey
    }
  });

  let videosCache = await loadVideosCache(countryCode);

  if (videoRes.data.items?.length) {
    const video = videoRes.data.items[0];
    const videoId = video.id.videoId;

    const statsRes = await axios.get('https://youtube.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'statistics,snippet',
        id: videoId,
        key: apiKey
      }
    });

    const stats = statsRes.data.items?.[0];
    const likeCount = parseInt(stats?.statistics?.likeCount) || 0;
    const category = stats?.snippet?.categoryId || null;

    videosCache.push({
      videoId,
      channelTitle,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.medium.url,
      publishedAt: video.snippet.publishedAt,
      likeCount,
      category
    });

    await saveVideosCache(videosCache, countryCode);
  }

  return { message: `✅ Kanal ve son videosu başarıyla eklendi: ${channelTitle}` };
}

module.exports = {
  updateChannelList,
  updateVideoCache,
  addChannelFromInput,
  getVideosFromCache
};
