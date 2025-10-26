const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return process.env.NODE_ENV === 'development' && req.ip === '::1';
    }
  });
};

const authLimiter = createRateLimiter(15 * 60 * 1000, 5);

const apiLimiter = createRateLimiter(15 * 60 * 1000, 100);

const strictLimiter = createRateLimiter(60 * 60 * 1000, 10);

module.exports = {
  createRateLimiter,
  authLimiter,
  apiLimiter,
  strictLimiter
};
