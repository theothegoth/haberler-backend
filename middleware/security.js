const helmet = require('helmet');
const hpp = require('hpp');

/**
 * Security middleware configuration
 * Implements various security best practices
 */

/**
 * Helmet configuration for security headers
 * Protects against common web vulnerabilities
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // TinyMCE requires unsafe-eval
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.rss2json.com"], // For RSS feeds
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // X-Content-Type-Options: nosniff
  // Prevents MIME type sniffing
  contentTypeOptions: {
    nosniff: true,
  },

  // X-DNS-Prefetch-Control: off
  // Controls browser DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Frame-Options: DENY
  // Prevents clickjacking attacks
  frameguard: {
    action: 'deny',
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Strict-Transport-Security
  // Forces HTTPS in production
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Permitted-Cross-Domain-Policies: none
  ieNoOpen: true,

  // Referrer-Policy: no-referrer
  referrerPolicy: {
    policy: 'no-referrer',
  },

  // X-XSS-Protection: 0
  // Modern browsers use CSP instead
  xssFilter: true,
});

/**
 * Sanitize data to prevent MongoDB/NoSQL injection attacks
 * Custom implementation to remove $ and . from user input
 */
const sanitizeData = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }

    const sanitized = {};
    for (const key in obj) {
      // Remove keys starting with $ or containing .
      if (key.startsWith('$') || key.includes('.')) {
        const cleanKey = key.replace(/\$/g, '_').replace(/\./g, '_');
        sanitized[cleanKey] = typeof obj[key] === 'object' ? sanitizeObject(obj[key]) : obj[key];
      } else {
        sanitized[key] = typeof obj[key] === 'object' ? sanitizeObject(obj[key]) : obj[key];
      }
    }
    return sanitized;
  };

  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
};

/**
 * HTTP Parameter Pollution protection
 * Prevents duplicate parameters in query strings
 */
const preventHpp = hpp({
  whitelist: ['tags', 'category'], // Allow arrays for these params
});

/**
 * XSS Protection middleware
 * Sanitizes user input to prevent XSS attacks
 */
const xssProtection = (req, res, next) => {
  // Clean request body
  if (req.body) {
    req.body = cleanXSS(req.body);
  }

  // Clean query parameters
  if (req.query) {
    req.query = cleanXSS(req.query);
  }

  // Clean URL parameters
  if (req.params) {
    req.params = cleanXSS(req.params);
  }

  next();
};

/**
 * Recursively clean XSS from objects
 */
function cleanXSS(obj) {
  if (typeof obj === 'string') {
    // Remove dangerous patterns
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanXSS(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanXSS(value);
    }
    return cleaned;
  }

  return obj;
}

/**
 * Security headers middleware
 * Adds additional custom security headers
 */
const securityHeaders = (req, res, next) => {
  // Prevent information disclosure
  res.removeHeader('X-Powered-By');

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  next();
};

/**
 * HTTPS redirect middleware (production only)
 */
const httpsRedirect = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

/**
 * Request size limiter
 * Prevents large payload attacks
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      maxSize: '10MB'
    });
  }

  next();
};

/**
 * Detect and block common attack patterns
 */
const attackPatternDetection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\.\.|\/etc\/passwd|\/windows\/system32)/i, // Path traversal
    /(union.*select|insert.*into|drop.*table)/i,  // SQL injection
    /(<script|javascript:|onerror=|onload=)/i,     // XSS attempts
    /(\.\.\/|\.\.\\)/g,                             // Directory traversal
  ];

  const checkString = `${req.url} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.error(`[SECURITY] Attack detected from ${req.ip}: ${pattern}`);
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  next();
};

module.exports = {
  helmetConfig,
  sanitizeData,
  preventHpp,
  xssProtection,
  securityHeaders,
  httpsRedirect,
  requestSizeLimiter,
  attackPatternDetection,
};
