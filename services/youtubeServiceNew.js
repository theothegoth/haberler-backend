const axios = require('axios');
const UserChannel = require('../models/UserChannel');
const VideoCache = require('../models/VideoCache');
const RSSService = require('./rssService');

class YouTubeService {
  /**
   * Get the best available thumbnail URL from YouTube API response
   * Priority: maxres > high > standard > medium > default
   * @param {object} thumbnails - thumbnails object from YouTube API
   * @param {string} fallbackUrl - fallback URL if no thumbnails found
   * @returns {string} Best available thumbnail URL
   */
  static getBestThumbnail(thumbnails, fallbackUrl = null) {
    if (!thumbnails) return fallbackUrl;

    // Try maxres first (1280x720 or higher) - best quality
    if (thumbnails.maxres?.url) {
      return thumbnails.maxres.url;
    }

    // Fall back to high quality (480x360)
    if (thumbnails.high?.url) {
      return thumbnails.high.url;
    }

    // Fall back to standard (640x480)
    if (thumbnails.standard?.url) {
      return thumbnails.standard.url;
    }

    // Fall back to medium (320x180)
    if (thumbnails.medium?.url) {
      return thumbnails.medium.url;
    }

    // Last resort: default (120x90)
    if (thumbnails.default?.url) {
      return thumbnails.default.url;
    }

    return fallbackUrl;
  }
  static async updateUserVideos(userId) {
    const apiKey = process.env.YOUTUBE_API_KEY;

    const channels = await UserChannel.getChannelsToUpdate(userId, 1);
    if (channels.length === 0) {
      return { message: 'Tüm kanallar güncel.', videosAdded: 0 };
    }

    const channelIds = channels.map(c => c.channel_id);
    const lastCheckedDates = {};
    channels.forEach(c => {
      if (c.last_checked) {
        lastCheckedDates[c.channel_id] = c.last_checked;
      }
    });

    const rssResults = await RSSService.checkMultipleChannels(channelIds, lastCheckedDates);

    const videoIdsToFetch = new Set();
    const rssVideoData = {};

    for (const [channelId, videos] of Object.entries(rssResults)) {
      let videosToProcess = videos;

      // Fallback: If RSS failed (returned null), try API Search
      if (videosToProcess === null) {
        try {
          const searchRes = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
            params: {
              part: 'snippet,id',
              channelId: channelId,
              type: 'video',
              order: 'date',
              maxResults: 5, // Limit to 5 to save quota
              key: apiKey
            }
          });
          
          if (searchRes.data.items) {
            videosToProcess = searchRes.data.items.map(item => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
              publishedAt: item.snippet.publishedAt,
              channelTitle: item.snippet.channelTitle,
              thumbnail: YouTubeService.getBestThumbnail(item.snippet.thumbnails)
            }));
          } else {
            videosToProcess = [];
          }
        } catch (err) {
          console.error(`Fallback update failed for ${channelId}:`, err.message);
          videosToProcess = [];
        }
      }

      if (!videosToProcess || videosToProcess.length === 0) continue;

      for (const video of videosToProcess) {
        const exists = await VideoCache.exists(video.videoId);
        if (!exists) {
          videoIdsToFetch.add(video.videoId);
          rssVideoData[video.videoId] = {
            ...video,
            channelId
          };
        }
      }
    }

    let videosAdded = 0;

    if (videoIdsToFetch.size > 0) {
      const videoIds = Array.from(videoIdsToFetch);
      const chunkSize = 50;

      for (let i = 0; i < videoIds.length; i += chunkSize) {
        const chunk = videoIds.slice(i, i + chunkSize);

        try {
          const statsRes = await axios.get('https://youtube.googleapis.com/youtube/v3/videos', {
            params: {
              part: 'statistics,snippet',
              id: chunk.join(','),
              key: apiKey
            }
          });

          if (statsRes.data.items) {
            const videosToAdd = statsRes.data.items.map(item => ({
              videoId: item.id,
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle,
              title: item.snippet.title,
              thumbnail: YouTubeService.getBestThumbnail(item.snippet.thumbnails, rssVideoData[item.id]?.thumbnail),
              publishedAt: item.snippet.publishedAt,
              likeCount: parseInt(item.statistics?.likeCount) || 0,
              categoryId: item.snippet?.categoryId || null
            }));

            await VideoCache.addBatch(videosToAdd);
            videosAdded += videosToAdd.length;
          }
        } catch (error) {
          console.error('API stats çekerken hata:', error.message);
        }
      }
    }

    for (const channel of channels) {
      await UserChannel.updateLastChecked(userId, channel.channel_id);
    }

    return { message: 'Videolar güncellendi.', videosAdded, channelsChecked: channels.length };
  }

  static async getUserVideos(userId, categoryId = null) {
    const channels = await UserChannel.getUserChannels(userId);
    if (channels.length === 0) {
      return [];
    }

    const channelIds = channels.map(c => c.channel_id);
    const videos = await VideoCache.getByChannelIds(channelIds, 48);

    let filteredVideos = videos;
    if (categoryId) {
      filteredVideos = videos.filter(v => v.category_id === categoryId);
    }

    return filteredVideos.map(v => ({
      videoId: v.video_id,
      channelTitle: v.channel_title,
      title: v.title,
      thumbnail: v.thumbnail,
      publishedAt: v.published_at,
      likeCount: v.like_count,
      category: v.category_id
    }));
  }

  static async addChannelForUser(userId, input) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    let channelId = null;

    if (input.startsWith('@')) {
      const handle = input;
      const res = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: handle,
          type: 'channel',
          maxResults: 1,
          key: apiKey
        }
      });

      if (!res.data.items?.length) {
        throw new Error('Handle ile kanal bulunamadı.');
      }

      channelId = res.data.items[0].snippet.channelId;
    } else if (input.includes('youtube.com/@')) {
      const match = input.match(/youtube\.com\/@([\w\-]+)/);
      if (!match) throw new Error('URL\'den handle alınamadı.');
      const handle = '@' + match[1];

      const res = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: handle,
          type: 'channel',
          maxResults: 1,
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
        throw new Error('URL\'den kanal ID alınamadı.');
      }
    } else {
      channelId = input;
    }

    if (!channelId) {
      throw new Error('channelId alınamadı.');
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
    await UserChannel.add(userId, channelId, channelTitle);

    const rssVideos = await RSSService.checkChannelForNewVideos(channelId);
    let videoIds = [];

    if (rssVideos && rssVideos.length > 0) {
      videoIds = rssVideos.map(v => v.videoId);
    } else {
      // Fallback: If RSS fails or is empty, use Search API to get latest videos
      // This ensures we get videos even if RSS is broken (404) or empty
      try {
        const searchRes = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
          params: {
            part: 'id',
            channelId: channelId,
            type: 'video',
            order: 'date',
            maxResults: 10,
            key: apiKey
          }
        });
        if (searchRes.data.items) {
          videoIds = searchRes.data.items.map(item => item.id.videoId);
        }
      } catch (searchError) {
        console.error('Fallback Search API failed:', searchError.message);
      }
    }

    if (videoIds.length > 0) {
      const statsRes = await axios.get('https://youtube.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'statistics,snippet',
          id: videoIds.join(','),
          key: apiKey
        }
      });

      if (statsRes.data.items) {
        const videosToAdd = statsRes.data.items.map(item => ({
          videoId: item.id,
          channelId,
          channelTitle,
          title: item.snippet.title,
          thumbnail: YouTubeService.getBestThumbnail(item.snippet.thumbnails),
          publishedAt: item.snippet.publishedAt,
          likeCount: parseInt(item.statistics?.likeCount) || 0,
          categoryId: item.snippet?.categoryId || null
        }));

        await VideoCache.addBatch(videosToAdd);
      }
    }

    return { message: `✅ Kanal başarıyla eklendi: ${channelTitle}`, channelId, channelTitle };
  }

  static async removeChannelForUser(userId, channelId) {
    const result = await UserChannel.remove(userId, channelId);
    if (!result) {
      throw new Error('Kanal bulunamadı veya zaten silinmiş.');
    }
    return { message: 'Kanal başarıyla kaldırıldı.' };
  }

  static async cleanOldVideos() {
    const deleted = await VideoCache.cleanOldVideos(48);
    return { message: `${deleted.length} eski video silindi.` };
  }

  /**
   * Fetch and cache a single video by video ID
   * Used when users want to add any YouTube video to their article
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<object>} Video data
   */
  static async fetchAndCacheVideo(videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY;

    // Check if video already exists in cache
    const existingVideo = await VideoCache.exists(videoId);
    if (existingVideo) {
      return { message: 'Video already cached', cached: true };
    }

    try {
      // Fetch video details from YouTube API
      const response = await axios.get('https://youtube.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'statistics,snippet',
          id: videoId,
          key: apiKey
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found or unavailable');
      }

      const item = response.data.items[0];

      // Prepare video data
      const videoData = {
        videoId: item.id,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        title: item.snippet.title,
        thumbnail: YouTubeService.getBestThumbnail(item.snippet.thumbnails),
        publishedAt: item.snippet.publishedAt,
        likeCount: parseInt(item.statistics?.likeCount) || 0,
        categoryId: item.snippet?.categoryId || null
      };

      // Add to cache
      await VideoCache.addBatch([videoData]);

      return {
        message: 'Video fetched and cached successfully',
        cached: false,
        video: videoData
      };

    } catch (error) {
      console.error('[FETCH_VIDEO] Error:', error.message);
      if (error.response?.status === 403) {
        throw new Error('YouTube API quota exceeded or invalid API key');
      }
      throw new Error(error.message || 'Failed to fetch video metadata');
    }
  }
}

module.exports = YouTubeService;
