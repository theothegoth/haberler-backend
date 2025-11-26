const redis = require('redis');

// Redis client configuration
let redisClient = null;
let isRedisConnected = false;

/**
 * Initialize Redis client
 * Falls back gracefully if Redis is not available
 */
async function initializeRedis() {
  try {
    // Create Redis client
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            return false; // Stop retrying
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // Error handling
    redisClient.on('error', (err) => {
      console.error('[REDIS] Error:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      // Connecting...
    });

    redisClient.on('ready', () => {
      isRedisConnected = true;
    });

    redisClient.on('end', () => {
      isRedisConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();
    isRedisConnected = true;

    return redisClient;
  } catch (error) {
    console.error('[REDIS] Failed to connect:', error.message);
    isRedisConnected = false;
    return null;
  }
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
async function getCache(key) {
  if (!isRedisConnected || !redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    console.error('[REDIS] Get error:', error.message);
    return null;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<boolean>} Success status
 */
async function setCache(key, value, ttl = 300) {
  if (!isRedisConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('[REDIS] Set error:', error.message);
    return false;
  }
}

/**
 * Delete key from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function deleteCache(key) {
  if (!isRedisConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('[REDIS] Delete error:', error.message);
    return false;
  }
}

/**
 * Delete keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., 'user:*')
 * @returns {Promise<boolean>} Success status
 */
async function deleteCachePattern(pattern) {
  if (!isRedisConnected || !redisClient) {
    return false;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error('[REDIS] Delete pattern error:', error.message);
    return false;
  }
}

/**
 * Clear all cache
 * @returns {Promise<boolean>} Success status
 */
async function clearCache() {
  if (!isRedisConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.flushAll();
    return true;
  } catch (error) {
    console.error('[REDIS] Clear error:', error.message);
    return false;
  }
}

/**
 * Check if Redis is connected
 * @returns {boolean} Connection status
 */
function isConnected() {
  return isRedisConnected;
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      console.error('[REDIS] Error closing connection:', error.message);
    }
  }
}

module.exports = {
  initializeRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  clearCache,
  isConnected,
  closeRedis,
  client: () => redisClient
};
