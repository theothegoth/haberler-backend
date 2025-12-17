const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation hatası',
      details: err.details || err.message
    });
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Yetkilendirme hatası',
      message: err.message
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Bu kayıt zaten mevcut'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'İlişkili kayıt bulunamadı'
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Veritabanı bağlantısı kurulamadı'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Sunucu hatası';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    path: req.originalUrl
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
