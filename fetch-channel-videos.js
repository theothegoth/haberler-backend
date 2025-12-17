const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

async function fetchChannelVideos() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = 'UCzJMy0X4vYivbZHkNccpPhQ'; // Ünsal Ünlü
  const channelTitle = 'Ünsal Ünlü';

  console.log(`Fetching videos for: ${channelTitle}`);
  console.log(`Channel ID: ${channelId}\n`);

  // Fetch videos from last 48 hours
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  console.log(`Fetching videos published after: ${twoDaysAgo}\n`);

  const videoRes = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'date',
      publishedAfter: twoDaysAgo,
      maxResults: 10,
      key: apiKey
    }
  });

  console.log(`Found ${videoRes.data.items?.length || 0} videos\n`);

  if (!videoRes.data.items?.length) {
    console.log('No videos found in the last 48 hours');
    return;
  }

  // Get video IDs
  const videoIds = videoRes.data.items.map(item => item.id.videoId).join(',');

  // Fetch statistics
  const statsRes = await axios.get('https://youtube.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'statistics,snippet',
      id: videoIds,
      key: apiKey
    }
  });

  // Load existing cache
  const cachePath = path.join(__dirname, 'cache/videos_cache_TR.json');
  let videosCache = JSON.parse(await fs.readFile(cachePath, 'utf-8'));

  // Add videos to cache
  let addedCount = 0;
  for (const video of videoRes.data.items) {
    const videoId = video.id.videoId;

    // Skip if already in cache
    if (videosCache.some(v => v.videoId === videoId)) {
      console.log(`Skipping (already in cache): ${video.snippet.title}`);
      continue;
    }

    const stats = statsRes.data.items?.find(item => item.id === videoId);
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

    console.log(`Added: ${video.snippet.title}`);
    console.log(`  Published: ${video.snippet.publishedAt}`);
    console.log(`  Likes: ${likeCount}\n`);
    addedCount++;
  }

  // Save updated cache
  await fs.writeFile(cachePath, JSON.stringify(videosCache, null, 2));

  console.log(`\n✅ Added ${addedCount} videos to cache`);
  console.log(`Total videos in cache: ${videosCache.length}`);
}

fetchChannelVideos()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
