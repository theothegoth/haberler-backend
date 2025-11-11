const rateLimit = require('express-rate-limit');

/**
 * Enhanced rate limiting with Redis store support
 * Falls back to memory store if Redis unavailable
 */

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
  console.log('[RATE LIMIT] Redis store not available, using memory store');
}

const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = null) => {
  const config = {
    windowMs,
    max,
    message: message || {
      error: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for localhost in development
      return process.env.NODE_ENV === 'development' && req.ip === '::1';
    },
    // Handler for when limit is exceeded
    handler: (req, res) => {
      console.warn(`[RATE LIMIT] ${req.ip} exceeded limit on ${req.path}`);
      res.status(429).json({
        error: 'Çok fazla istek gönderildi',
        message: 'Lütfen daha sonra tekrar deneyin',
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
      console.log('[RATE LIMIT] Using Redis store');
    } catch (err) {
      console.warn('[RATE LIMIT] Failed to initialize Redis store:', err.message);
    }
  }

  return rateLimit(config);
};

// Authentication endpoints - strict limiting to prevent brute force
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  {
    error: 'Çok fazla giriş denemesi',
    message: '15 dakika sonra tekrar deneyin',
    retryAfter: 900
  }
);

// Password reset - very strict to prevent abuse
const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  {
    error: 'Çok fazla şifre sıfırlama denemesi',
    message: '1 saat sonra tekrar deneyin',
    retryAfter: 3600
  }
);

// General API endpoints
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100 // 100 requests
);

// Strict limiter for sensitive operations
const strictLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10 // 10 requests
);

// File upload limiter
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // 20 uploads
  {
    error: 'Çok fazla dosya yükleme denemesi',
    message: '1 saat sonra tekrar deneyin',
    retryAfter: 3600
  }
);

// Create/write operations limiter (prevent spam)
const createLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 creates per minute
  {
    error: 'Çok hızlı içerik oluşturuyorsunuz',
    message: 'Lütfen biraz bekleyin',
    retryAfter: 60
  }
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
