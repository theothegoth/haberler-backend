const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token bulunamadı. Lütfen giriş yapın.' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.' });
    }
    return res.status(401).json({ error: 'Geçersiz token.' });
  }
};

// Optional authentication - parses token if present, but doesn't reject if missing
const optionalAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without setting req.user
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    // Invalid token, but don't reject - just continue without req.user
    console.error('Optional auth failed:', error.message);
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate, JWT_SECRET };
