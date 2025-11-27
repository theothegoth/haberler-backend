const { getCache, setCache } = require('../config/cache');

/**
 * Cache middleware for Express routes
 * Caches GET requests based on the route and query parameters
 *
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param {function} keyGenerator - Optional custom key generator function
 * @returns {function} Express middleware
 */
function cacheMiddleware(ttl = 300, keyGenerator = null) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : generateCacheKey(req);

      // Try to get cached response
      const cachedData = await getCache(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, data, ttl).catch(err => {
            console.error('[CACHE] Error setting cache:', err.message);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('[CACHE] Middleware error:', error.message);
      next(); // Continue without caching on error
    }
  };
}

/**
 * Generate cache key from request
 * @param {object} req - Express request object
 * @returns {string} Cache key
 */
function generateCacheKey(req) {
  const userId = req.user?.userId || 'guest';
  const path = req.path;
  const query = JSON.stringify(req.query);
  return `api:${path}:${userId}:${query}`;
}

/**
 * Cache key generators for specific routes
 */
const cacheKeys = {
  // News feed - cache per user
  newsFeed: (req) => {
    const userId = req.user?.userId || 'guest';
    const page = req.query.page || 1;
    return `news:feed:${userId}:page:${page}`;
  },

  // Article detail - cache per article (public)
  articleDetail: (req) => {
    const articleId = req.params.id;
    return `article:${articleId}`;
  },

  // User articles - cache per user
  userArticles: (req) => {
    const userId = req.params.userId || req.user?.userId;
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;
    return `user:${userId}:articles:limit:${limit}:offset:${offset}`;
  },
  // Explore/search - cache based on query
  explore: (req) => {
    const query = JSON.stringify(req.query);
    return `explore:${query}`;
  },

  // User profile - cache per user
  userProfile: (req) => {
    const userId = req.params.userId;
    return `user:profile:${userId}`;
  },

  // Notifications - cache per user
  notifications: (req) => {
    const userId = req.user?.userId;
    return `notifications:${userId}`;
  },

  // Comments - cache per article
  comments: (req) => {
    const articleId = req.params.newsId;
    return `comments:article:${articleId}`;
  }
};

module.exports = {
  cacheMiddleware,
  cacheKeys
};
