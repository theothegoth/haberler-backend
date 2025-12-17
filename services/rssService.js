const Parser = require('rss-parser');
const parser = new Parser();

class RSSService {
  static async checkChannelForNewVideos(channelId, lastCheckedDate = null) {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const feed = await parser.parseURL(feedUrl);

      if (!feed.items || feed.items.length === 0) {
        return [];
      }

      let newVideos = feed.items;

      if (lastCheckedDate) {
        const lastChecked = new Date(lastCheckedDate);
        newVideos = feed.items.filter(item => {
          const pubDate = new Date(item.pubDate);
          return pubDate > lastChecked;
        });
      }

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      newVideos = newVideos.filter(item => {
        const pubDate = new Date(item.pubDate);
        return pubDate > twoDaysAgo;
      });

      return newVideos.map(item => ({
        videoId: item.id.split(':')[2],
        title: item.title,
        publishedAt: item.pubDate,
        channelTitle: item.author,
        thumbnail: item.media?.thumbnail?.url || null
      }));
    } catch (error) {
      console.error(`RSS feed hatası (Channel: ${channelId}):`, error.message);
      return null;
    }
  }

  static async checkMultipleChannels(channelIds, lastCheckedDates = {}) {
    const results = await Promise.allSettled(
      channelIds.map(channelId =>
        this.checkChannelForNewVideos(channelId, lastCheckedDates[channelId])
      )
    );

    const channelVideos = {};
    results.forEach((result, index) => {
      const channelId = channelIds[index];
      if (result.status === 'fulfilled' && result.value !== null) {
        channelVideos[channelId] = result.value;
      } else {
        channelVideos[channelId] = null; // Return null if failed
      }
    });

    return channelVideos;
  }
}

module.exports = RSSService;
