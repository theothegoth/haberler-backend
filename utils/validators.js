const validator = require('validator');

const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  return validator.trim(validator.escape(input));
};

const isValidEmail = (email) => {
  return validator.isEmail(email);
};

const isValidURL = (url) => {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
};

const isValidChannelId = (channelId) => {
  return /^[a-zA-Z0-9_-]{24}$/.test(channelId);
};

const isValidVideoId = (videoId) => {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
};

const isValidCountryCode = (code) => {
  return /^[A-Z]{2}$/.test(code);
};

const extractChannelIdFromURL = (url) => {
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/,
    /youtube\.com\/@([\w\-]+)/,
    /youtube\.com\/c\/([\w\-]+)/,
    /youtube\.com\/user\/([\w\-]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

const extractVideoIdFromURL = (url) => {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

const validatePagination = (page, limit, maxLimit = 100) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));

  return {
    page: validPage,
    limit: validLimit,
    offset: (validPage - 1) * validLimit
  };
};

const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

module.exports = {
  sanitizeInput,
  sanitizeObject,
  isValidEmail,
  isValidURL,
  isValidChannelId,
  isValidVideoId,
  isValidCountryCode,
  extractChannelIdFromURL,
  extractVideoIdFromURL,
  validatePagination
};
