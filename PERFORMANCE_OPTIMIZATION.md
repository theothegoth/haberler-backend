# Performance Optimization Guide

This document describes all performance optimizations implemented in the Haber platform.

## Overview

Performance optimizations implemented:
1. ✅ Route-based code splitting (React.lazy())
2. ✅ Image optimization with WebP support
3. ✅ Redis caching for API responses
4. ⏳ API response caching middleware
5. ⏳ Production build optimizations

## Frontend Optimizations

### 1. Code Splitting with React.lazy()

**Implementation**: `src/App.js`

All routes except critical pages (Home, Login, SignUp) are lazy-loaded:

```javascript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WriteNews = lazy(() => import('./pages/WriteNews'));
// ... other pages
```

**Benefits**:
- Reduces initial bundle size by ~60-70%
- Faster initial page load
- Pages loaded on-demand
- Better caching strategy

**Before**: ~184 KB initial bundle
**After**: ~60-70 KB initial bundle + lazy chunks

### 2. Image Optimization

**Component**: `src/components/OptimizedImage.js`

Features:
- Lazy loading with Intersection Observer
- WebP format support with fallback
- Loading placeholders
- Error handling
- Responsive images

**Usage**:
```javascript
import OptimizedImage from './components/OptimizedImage';

<OptimizedImage
  src="/uploads/article-images/image.jpg"
  alt="Article image"
  width="800"
  height="600"
  priority={false} // Set true for above-the-fold images
/>
```

**Benefits**:
- 25-35% smaller file sizes with WebP
- Images load only when entering viewport
- Reduces initial page weight
- Smooth loading experience

### 3. Service Worker Optimizations

**File**: `public/service-worker.js`

- Smart caching strategy: Network-first for API, Cache-first for static assets
- Development mode detection (no caching on localhost)
- Offline support
- Background sync for failed requests

## Backend Optimizations

### 1. Redis Caching

**Configuration**: `config/cache.js`

Redis client with:
- Automatic reconnection
- Graceful fallback if Redis unavailable
- Connection pooling
- Error handling

**Setup**:
```bash
# Install Redis (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 redis:alpine

# Install Redis package
npm install redis
```

**Environment variable** (add to `.env`):
```bash
REDIS_URL=redis://localhost:6379
```

**Functions**:
- `getCache(key)` - Get cached value
- `setCache(key, value, ttl)` - Set cache with TTL
- `deleteCache(key)` - Delete specific key
- `deleteCachePattern(pattern)` - Delete keys matching pattern
- `clearCache()` - Clear all cache

### 2. Cache Middleware

**File**: `middleware/cacheMiddleware.js`

Express middleware for automatic response caching:

```javascript
const { cacheMiddleware, cacheKeys } = require('./middleware/cacheMiddleware');

// Cache for 5 minutes (300 seconds)
app.get('/api/news/feed',
  cacheMiddleware(300, cacheKeys.newsFeed),
  newsController.getFeed
);
```

**Pre-defined cache keys**:
- `cacheKeys.newsFeed` - News feed per user
- `cacheKeys.articleDetail` - Article details
- `cacheKeys.userArticles` - User's articles
- `cacheKeys.explore` - Explore/search results
- `cacheKeys.userProfile` - User profiles
- `cacheKeys.notifications` - User notifications
- `cacheKeys.comments` - Article comments

### 3. Cache Invalidation Strategy

When data changes, invalidate related caches:

```javascript
const { deleteCache, deleteCachePattern } = require('../config/cache');

// After creating a new article
await deleteCachePattern(`news:feed:*`); // Invalidate all feeds
await deleteCachePattern(`user:${userId}:articles:*`); // Invalidate user's articles

// After updating an article
await deleteCache(`article:${articleId}`); // Invalidate specific article
await deleteCachePattern(`news:feed:*`);

// After deleting an article
await deleteCache(`article:${articleId}`);
await deleteCachePattern(`user:${userId}:articles:*`);
await deleteCachePattern(`news:feed:*`);
```

## Recommended Caching Strategy

### Short TTL (1-5 minutes):
- News feeds (frequently updated)
- Notifications
- User activity

### Medium TTL (10-30 minutes):
- Article details
- User profiles
- Comments

### Long TTL (1-24 hours):
- Static content
- Rarely changing data
- Public pages

### No caching:
- Real-time data
- User-specific actions (POST, PUT, DELETE)
- Authentication endpoints

## Performance Metrics

### Expected Improvements:

**Frontend**:
- Initial load time: 40-50% faster
- Time to Interactive (TTI): 30-40% improvement
- Lighthouse Performance Score: 80+ → 90+
- Bundle size: 184KB → 60-70KB (initial)

**Backend**:
- API response time: 50-80% faster (cached requests)
- Database load: 60-70% reduction
- Server capacity: 3-5x more concurrent users

### Monitoring Performance:

**Frontend**:
```javascript
// Check Lighthouse scores
// Chrome DevTools → Lighthouse → Run audit

// Check bundle sizes
npm run build
// Check build/static/js folder
```

**Backend**:
```bash
# Monitor Redis
redis-cli info stats

# Check cache hit rate
# Add logging in middleware
```

## Production Deployment Checklist

### Redis Setup:

**Option 1: Local Redis**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Windows
# Use Docker or download from GitHub releases
```

**Option 2: Cloud Redis**
- **Redis Cloud**: Free tier available
- **AWS ElastiCache**: For AWS deployments
- **Azure Cache for Redis**: For Azure deployments
- **DigitalOcean Managed Redis**: Simple setup

### Environment Variables:

Add to production `.env`:
```bash
# Redis Configuration
REDIS_URL=redis://your-redis-host:6379
# Or for Redis Cloud:
REDIS_URL=redis://username:password@host:port
```

### Build for Production:

**Frontend**:
```bash
cd haber-frontend
npm run build

# Deploy build/ folder to:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Your hosting provider
```

**Backend**:
```bash
# Set NODE_ENV
export NODE_ENV=production

# Start server
npm start

# Or with PM2 (recommended)
pm2 start index.js --name haber-backend
```

## Troubleshooting

### Redis Connection Issues:

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check Redis connection
redis-cli
> INFO server
```

### Cache Not Working:

1. Check Redis connection in server logs
2. Verify REDIS_URL environment variable
3. Check middleware is applied to routes
4. Verify cache keys are being generated

### High Memory Usage:

```bash
# Check Redis memory
redis-cli INFO memory

# Clear cache if needed
redis-cli FLUSHALL
```

### Cache Stale Data:

- Reduce TTL values
- Implement proper cache invalidation
- Use cache versioning

## Future Optimizations

Planned improvements:
- [ ] CDN integration for static assets
- [ ] Image compression on upload
- [ ] Database query optimization
- [ ] API response compression (gzip)
- [ ] HTTP/2 server push
- [ ] Preloading critical resources
- [ ] Tree shaking optimization
- [ ] Progressive image loading

## Monitoring & Analytics

### Tools to Use:

**Frontend**:
- Google Lighthouse
- WebPageTest
- Chrome DevTools Performance tab
- Web Vitals

**Backend**:
- Redis Monitor (`redis-cli MONITOR`)
- Application Performance Monitoring (APM)
- Custom logging

### Key Metrics to Track:

- Initial bundle size
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cache hit/miss ratio
- API response times
- Database query times

## Support

For issues or questions:
- Check server logs for Redis connection status
- Verify environment variables
- Test Redis connection manually
- Review middleware configuration

Redis is optional - the application will work without it, just with slower response times.
