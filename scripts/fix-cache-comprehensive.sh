#!/bin/bash
# Comprehensive cache fix - clears ALL related caches
# Run on server: bash fix-cache-comprehensive.sh

set -e

echo "=== Comprehensive Cache Fix ==="
echo "This will fix the thumbnail cache issue once and for all"
echo ""

cd /root/haber-backend || exit 1

# Backup
BACKUP_DIR="/root/haber-backend-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp controllers/articleVideoController.js "$BACKUP_DIR/articleVideoController.js.bak"
cp controllers/articleImageController.js "$BACKUP_DIR/articleImageController.js.bak"
cp config/cache.js "$BACKUP_DIR/cache.js.bak"
echo "✓ Backups created"
echo ""

# Update files
python3 << 'ENDPYTHON'
import re
import os

# 1. First, ensure deleteUserArticleCaches exists in cache.js
cache_file = '/root/haber-backend/config/cache.js'
with open(cache_file, 'r') as f:
    cache_content = f.read()

# Add deleteUserArticleCaches if it doesn't exist
if 'deleteUserArticleCaches' not in cache_content:
    # Add the function before module.exports
    func = '''
/**
 * Delete all cache entries for a user's articles (all limit/offset variations)
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of keys deleted
 */
async function deleteUserArticleCaches(userId) {
  if (!isRedisConnected || !redisClient) {
    return 0;
  }

  try {
    const pattern = `user:${userId}:articles:*`;
    return await deleteCachePattern(pattern);
  } catch (error) {
    console.error('[REDIS] Delete user article caches error:', error.message);
    return 0;
  }
}
'''
    cache_content = cache_content.replace('module.exports = {', func + '\nmodule.exports = {')
    
    # Add to exports
    if 'deleteUserArticleCaches,' not in cache_content:
        cache_content = cache_content.replace(
            '  deleteCachePattern,',
            '  deleteCachePattern,\n  deleteUserArticleCaches,'
        )
    
    with open(cache_file, 'w') as f:
        f.write(cache_content)
    print("✓ Added deleteUserArticleCaches to cache.js")

# 2. Update articleImageController.js - make cache clearing more aggressive
image_file = '/root/haber-backend/controllers/articleImageController.js'
with open(image_file, 'r') as f:
    image_content = f.read()

# Ensure deleteUserArticleCaches is imported
if 'deleteUserArticleCaches' not in image_content:
    image_content = image_content.replace(
        "const { deleteCachePattern, deleteCache } = require('../config/cache');",
        "const { deleteCachePattern, deleteCache, deleteUserArticleCaches } = require('../config/cache');"
    )

# Replace all cache invalidation to clear MORE patterns
# For deleteArticleImage
image_content = re.sub(
    r"// Invalidate caches for this article and user's articles list \(await to ensure completion\)\s+await Promise\.allSettled\(\[.*?deleteCache\(`article:\$\{image\.article_id\}`\).*?deleteUserArticleCaches\(userId\).*?deleteCachePattern\('news:feed:\*'\).*?\]\)\.catch\(err => console\.error\('\[CACHE\] Invalidation error:', err\)\);",
    '''// Invalidate ALL caches for this article (comprehensive clearing)
    try {
      const articleId = image.article_id;
      await Promise.allSettled([
        deleteCache(`article:${articleId}`),
        deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`),
        deleteCachePattern('news:feed:*'),
        deleteCachePattern(`api:/api/news/my-articles*`),
        deleteCachePattern(`api:/api/news/feed*`),
        deleteCachePattern(`api:/api/articles/${articleId}*`)
      ]).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[CACHE] Cleared ${successful} cache patterns for article ${articleId} (image deleted)`);
      });
    } catch (cacheError) {
      console.error('[CACHE] Invalidation error:', cacheError);
    }''',
    image_content,
    flags=re.DOTALL
)

# For addArticleImage
image_content = re.sub(
    r"// Invalidate caches for this article and user's articles list \(await to ensure completion\)\s+await Promise\.allSettled\(\[.*?deleteCache\(`article:\$\{articleId\}`\).*?deleteUserArticleCaches\(userId\).*?deleteCachePattern\('news:feed:\*'\).*?\]\)\.catch\(err => console\.error\('\[CACHE\] Invalidation error:', err\)\);",
    '''// Invalidate ALL caches for this article (comprehensive clearing)
    try {
      await Promise.allSettled([
        deleteCache(`article:${articleId}`),
        deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`),
        deleteCachePattern('news:feed:*'),
        deleteCachePattern(`api:/api/news/my-articles*`),
        deleteCachePattern(`api:/api/news/feed*`),
        deleteCachePattern(`api:/api/articles/${articleId}*`)
      ]).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[CACHE] Cleared ${successful} cache patterns for article ${articleId} (image added)`);
      });
    } catch (cacheError) {
      console.error('[CACHE] Invalidation error:', cacheError);
    }''',
    image_content,
    flags=re.DOTALL
)

with open(image_file, 'w') as f:
    f.write(image_content)
print("✓ Updated articleImageController.js")

# 3. Update articleVideoController.js - make cache clearing more aggressive
video_file = '/root/haber-backend/controllers/articleVideoController.js'
with open(video_file, 'r') as f:
    video_content = f.read()

# Ensure deleteUserArticleCaches is imported
if 'deleteUserArticleCaches' not in video_content:
    video_content = video_content.replace(
        "const { deleteCachePattern, deleteCache } = require('../config/cache');",
        "const { deleteCachePattern, deleteCache, deleteUserArticleCaches } = require('../config/cache');"
    )

# Replace cache invalidation in addVideo
video_content = re.sub(
    r"// Invalidate caches for this article and user's articles list \(await to ensure completion\)\s+try \{.*?await Promise\.allSettled\(\[.*?deleteCache\(`article:\$\{articleId\}`\).*?deleteUserArticleCaches \? deleteUserArticleCaches\(userId\) : deleteCachePattern\(`user:\$\{userId\}:articles:\*`\).*?deleteCachePattern\('news:feed:\*'\).*?\]\)\.then\(results => \{.*?\}\);.*?\} catch \(cacheError\) \{.*?\}",
    '''// Invalidate ALL caches for this article (comprehensive clearing)
      try {
        await Promise.allSettled([
          deleteCache(`article:${articleId}`),
          deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`),
          deleteCachePattern('news:feed:*'),
          deleteCachePattern(`api:/api/news/my-articles*`),
          deleteCachePattern(`api:/api/news/feed*`),
          deleteCachePattern(`api:/api/articles/${articleId}*`)
        ]).then(results => {
          const successful = results.filter(r => r.status === 'fulfilled').length;
          console.log(`[CACHE] Cleared ${successful} cache patterns for article ${articleId} (video added)`);
        });
      } catch (cacheError) {
        console.error('[CACHE] Invalidation error:', cacheError);
      }''',
    video_content,
    flags=re.DOTALL
)

# Replace cache invalidation in deleteVideo
video_content = re.sub(
    r"// Invalidate caches for this article and user's articles list \(await to ensure completion\)\s+try \{.*?await Promise\.allSettled\(\[.*?deleteCache\(`article:\$\{articleId\}`\).*?deleteUserArticleCaches \? deleteUserArticleCaches\(userId\) : deleteCachePattern\(`user:\$\{userId\}:articles:\*`\).*?deleteCachePattern\('news:feed:\*'\).*?\]\)\.then\(results => \{.*?\}\);.*?\} catch \(cacheError\) \{.*?\}",
    '''// Invalidate ALL caches for this article (comprehensive clearing)
      try {
        await Promise.allSettled([
          deleteCache(`article:${articleId}`),
          deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`),
          deleteCachePattern('news:feed:*'),
          deleteCachePattern(`api:/api/news/my-articles*`),
          deleteCachePattern(`api:/api/news/feed*`),
          deleteCachePattern(`api:/api/articles/${articleId}*`)
        ]).then(results => {
          const successful = results.filter(r => r.status === 'fulfilled').length;
          console.log(`[CACHE] Cleared ${successful} cache patterns for article ${articleId} (video deleted)`);
        });
      } catch (cacheError) {
        console.error('[CACHE] Invalidation error:', cacheError);
      }''',
    video_content,
    flags=re.DOTALL
)

with open(video_file, 'w') as f:
    f.write(video_content)
print("✓ Updated articleVideoController.js")

print("\n✓ All files updated!")
print("Now run: cd /root && docker-compose up -d --build backend")
print("Then clear Redis cache: docker exec -it haber-backend-redis-1 redis-cli FLUSHALL")
ENDPYTHON

echo ""
echo "=== Rebuilding Backend ==="
cd /root
docker-compose up -d --build backend

echo ""
echo "=== Clearing Redis Cache ==="
docker exec -it haber-backend-redis-1 redis-cli FLUSHALL || echo "Redis container name might be different, clear manually"

echo ""
echo "=== Done! ==="
echo ""
echo "The cache issue should now be fixed. The fix:"
echo "1. Added deleteUserArticleCaches function to cache.js"
echo "2. Updated all controllers to clear ALL cache patterns (including API routes)"
echo "3. Cleared all Redis cache"
echo ""
echo "Test by:"
echo "1. Remove an image from an article"
echo "2. Add a video"
echo "3. Hard refresh browser (Ctrl+Shift+R)"
echo "4. Go to 'My Articles' - thumbnail should update immediately"

