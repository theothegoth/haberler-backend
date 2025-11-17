require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const validateEnv = require('./config/validateEnv');
const corsOptions = require('./config/corsOptions');
const { requestLogger, Logger } = require('./utils/logger');
const { errorHandler, notFound} = require('./middleware/errorHandler');
const {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  createLimiter,
  passwordResetLimiter
} = require('./middleware/rateLimiter');
const { initializeRedis, closeRedis } = require('./config/cache');
const {
  helmetConfig,
  sanitizeData,
  preventHpp,
  xssProtection,
  securityHeaders,
  httpsRedirect,
  requestSizeLimiter,
  attackPatternDetection
} = require('./middleware/security');

const authRoutes = require('./routes/authRoutes');
const channelRoutes = require('./routes/channelRoutes');
const videoRoutes = require('./routes/videoRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');
const newsRoutes = require('./routes/newsRoutes');
const followRoutes = require('./routes/followRoutes');
const commentRoutes = require('./routes/commentRoutes');
const draftRoutes = require('./routes/draftRoutes');
const emailVerificationRoutes = require('./routes/emailVerification');
const notificationRoutes = require('./routes/notificationRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const blockRoutes = require('./routes/blockRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analytics');
const recommendationRoutes = require('./routes/recommendationRoutes');
const emailPreferencesRoutes = require('./routes/emailPreferencesRoutes');
const YouTubeService = require('./services/youtubeServiceNew');

const logger = new Logger('SERVER');

validateEnv();

const app = express();
const port = process.env.PORT || 5000;

// Serve uploaded files with explicit route handler to bypass all middleware
app.get('/uploads/:folder/:filename', (req, res) => {
  // Set CORS headers explicitly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  // Build file path
  const filePath = path.join(__dirname, 'uploads', req.params.folder, req.params.filename);

  // Send file
  res.sendFile(filePath, (err) => {
    if (err) {
      logger.error('Error serving file:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// Security middleware - applied to all routes EXCEPT /uploads
app.use((req, res, next) => {
  // Skip all security middleware for uploads
  if (req.path.startsWith('/uploads/')) {
    return next();
  }
  helmetConfig(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/uploads/')) return next();
  httpsRedirect(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/uploads/')) return next();
  securityHeaders(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/uploads/')) return next();
  requestSizeLimiter(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/uploads/')) return next();
  attackPatternDetection(req, res, next);
});

// CORS - skip for uploads as we set headers manually
app.use((req, res, next) => {
  if (req.path.startsWith('/uploads/')) return next();
  cors(corsOptions)(req, res, next);
});

// Body parsers with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization (must be after body parsers)
app.use(sanitizeData); // NoSQL injection protection
app.use(xssProtection); // XSS protection
app.use(preventHpp); // HTTP parameter pollution protection

// Request logging
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/channels', apiLimiter, channelRoutes);
app.use('/api/videos', apiLimiter, videoRoutes);
app.use('/api/youtube', apiLimiter, youtubeRoutes);
app.use('/api/news', apiLimiter, newsRoutes);
app.use('/api/follow', apiLimiter, followRoutes);
app.use('/api/comments', apiLimiter, commentRoutes);
app.use('/api/drafts', apiLimiter, draftRoutes);
app.use('/api/email', emailVerificationRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/blocks', apiLimiter, blockRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/bookmarks', apiLimiter, bookmarkRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/recommendations', apiLimiter, recommendationRoutes);
app.use('/api/email-preferences', apiLimiter, emailPreferencesRoutes);

app.use(notFound);
app.use(errorHandler);

cron.schedule('*/30 * * * *', async () => {
  try {
    logger.info('Starting scheduled video cleanup...');
    await YouTubeService.cleanOldVideos();
    logger.info('Scheduled video cleanup completed');
  } catch (error) {
    logger.error('Scheduled video cleanup failed:', error);
  }
});

// Initialize Redis cache
initializeRedis().catch(err => {
  logger.warn('Redis initialization failed, continuing without cache:', err.message);
});

const server = app.listen(port, () => {
  logger.info(`Backend running on http://localhost:${port}`);
  logger.info(`Health check available at http://localhost:${port}/api/health`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close Redis connection
      await closeRedis();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }

    try {
      const pool = require('./config/database');
      await pool.end();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
    }

    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcefully shutting down after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
