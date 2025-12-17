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
const testEmailRoutes = require('./routes/testEmailRoutes');
const articleImageRoutes = require('./routes/articleImageRoutes');
const articleVideoRoutes = require('./routes/articleVideoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const YouTubeService = require('./services/youtubeServiceNew');
const { scheduleWeeklyDigest } = require('./jobs/weeklyDigest');

const logger = new Logger('SERVER');

validateEnv();

const app = express();
const port = process.env.PORT || 5000;

// Serve uploaded files statically (enabled for production too)
// This replaces the restricted dev-only block
    // Serve uploaded files - Handle both with and without /api prefix
    const serveUploads = (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    };

    // Mount at /uploads (standard)
    app.use('/uploads', serveUploads, express.static(path.join(__dirname, 'uploads')));
    
    // Mount at /api/uploads (in case Nginx doesn't strip /api)
    app.use('/api/uploads', serveUploads, express.static(path.join(__dirname, 'uploads')));
// Security middleware - applied to all routes EXCEPT /uploads
app.use((req, res, next) => {
  if (req.path.startsWith('/uploads/')) return next();
  helmetConfig(req, res, next);
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

// CORS - skip for uploads
app.use((req, res, next) => {
  if (req.path.startsWith('/uploads/')) return next();
  cors(corsOptions)(req, res, next);
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitization
app.use(sanitizeData);
app.use(xssProtection);
app.use(preventHpp);

// Logging
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Routes
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
app.use('/api/articles', uploadLimiter, articleImageRoutes);
app.use('/api/articles', apiLimiter, articleVideoRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/test-emails', apiLimiter, testEmailRoutes);
  logger.info('Test email routes enabled');
}

app.use(notFound);
app.use(errorHandler);

// Cron jobs
scheduleWeeklyDigest();

cron.schedule('*/30 * * * *', async () => {
  try {
    logger.info('Starting scheduled video cleanup...');
    await YouTubeService.cleanOldVideos();
    logger.info('Scheduled video cleanup completed');
  } catch (error) {
    logger.error('Scheduled video cleanup failed:', error);
  }
});

// Start server
initializeRedis().catch(err => {
  logger.warn('Redis initialization failed:', err.message);
});

const server = app.listen(port, () => {
  logger.info(`Backend running on http://localhost:${port}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down...`);
  server.close(async () => {
    try {
      await closeRedis();
      const pool = require('./config/database');
      await pool.end();
    } catch (e) { logger.error(e); }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
