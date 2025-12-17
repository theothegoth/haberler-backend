    const rateLimit = require('express-rate-limit');

    let RedisStore;
    let redisClient;

    // Try to use Redis store for distributed rate limiting
    try {
      const { client } = require('../config/cache');
      redisClient = client();

      if (redisClient) {
        const RedisStoreModule = require('rate-limit-redis');
        RedisStore = RedisStoreModule.default || RedisStoreModule;
      }
    } catch (err) {
      // Redis store not available, using memory store
    }

    const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = null) => {
      const config = {
        windowMs,
        max,
        message: message || {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
          // Skip rate limiting for localhost in development
          return process.env.NODE_ENV === 'development' && req.ip === '::1';
        },
        handler: (req, res) => {
          console.warn(`[RATE LIMIT] ${req.ip} exceeded limit on ${req.path}`);
          res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later',
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }
      };

      // Use Redis store if available
      if (RedisStore && redisClient) {
        try {
          config.store = new RedisStore({
            client: redisClient,
            prefix: 'rl:',
          });
        } catch (err) {
          console.warn('[RATE LIMIT] Failed to initialize Redis store:', err.message);
        }
      }

      return rateLimit(config);
    };

    // --- RELAXED LIMITS ---

    // Auth endpoints: 100 requests per 15 mins (was 5)
    const authLimiter = createRateLimiter(
      15 * 60 * 1000,
      100,
      { error: 'Too many login attempts, please wait.' }
    );

    // Password reset: 10 attempts per hour (was 3)
    const passwordResetLimiter = createRateLimiter(
      60 * 60 * 1000,
      10,
      { error: 'Too many password reset attempts.' }
    );

    // General API: 2000 requests per 15 mins (was 100)
    const apiLimiter = createRateLimiter(
      15 * 60 * 1000,
      2000
    );

    // Sensitive operations: 60 requests per hour (was 10)
    const strictLimiter = createRateLimiter(
      60 * 60 * 1000,
      60
    );

    // File uploads: 200 uploads per hour (was 20)
    const uploadLimiter = createRateLimiter(
      60 * 60 * 1000,
      200,
      { error: 'Upload limit exceeded.' }
    );

    // Content creation: 60 per minute (was 10)
    const createLimiter = createRateLimiter(
      60 * 1000,
      60,
      { error: 'You are posting too fast.' }
    );

    module.exports = {
      createRateLimiter,
      authLimiter,
      passwordResetLimiter,
      apiLimiter,
      strictLimiter,
      uploadLimiter,
      createLimiter
    };
