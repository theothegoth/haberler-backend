#!/bin/bash
# REAL FIX - Clears the ACTUAL cache keys being used
# Run on server: bash fix-cache-REAL-FIX.sh

set -e

echo "=== REAL Cache Fix - Clearing ACTUAL Cache Keys ==="
echo ""

cd /root/haber-backend || exit 1

python3 << 'ENDPYTHON'
import re
import os

# Update cache.js to add a function that clears ALL user article cache variations
cache_file = '/root/haber-backend/config/cache.js'
with open(cache_file, 'r') as f:
    content = f.read()

# Add comprehensive cache clearing function
if 'clearAllUserArticleCaches' not in content:
    func = '''
/**
 * Clear ALL cache entries for a user's articles - ALL possible key formats
 * This clears both the cacheKeys format and the default generateCacheKey format
 * @param {number} userId - User ID
 * @returns {Promise<number>} Total number of keys deleted
 */
async function clearAllUserArticleCaches(userId) {
  if (!isRedisConnected || !redisClient) {
    return 0;
  }

  try {
    const patterns = [
      `user:${userId}:articles:*`,           // From cacheKeys.userArticles
      `api:/api/news/my-articles:${userId}:*`, // From default generateCacheKey
      `api:/api/news/my/articles:${userId}:*`, // Alternative path format
      `api:/api/news/user/${userId}:*`        // User articles by ID
    ];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await deleteCachePattern(pattern);
      totalDeleted += deleted;
    }
    
    console.log(`[CACHE] Cleared ${totalDeleted} total cache entries for user ${userId} articles`);
    return totalDeleted;
  } catch (error) {
    console.error('[REDIS] Clear all user article caches error:', error.message);
    return 0;
  }
}
'''
    content = content.replace('module.exports = {', func + '\nmodule.exports = {')
    if 'clearAllUserArticleCaches,' not in content:
        content = content.replace('  deleteUserArticleCaches,', '  deleteUserArticleCaches,\n  clearAllUserArticleCaches,')
    with open(cache_file, 'w') as f:
        f.write(content)
    print("✓ Added clearAllUserArticleCaches to cache.js")

# Update controllers to use the new function
files = [
    ('/root/haber-backend/controllers/articleImageController.js', 'articleImageController'),
    ('/root/haber-backend/controllers/articleVideoController.js', 'articleVideoController')
]

for filepath, name in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Add import
    if 'clearAllUserArticleCaches' not in content:
        content = content.replace(
            "const { deleteCachePattern, deleteCache, deleteUserArticleCaches } = require('../config/cache');",
            "const { deleteCachePattern, deleteCache, deleteUserArticleCaches, clearAllUserArticleCaches } = require('../config/cache');"
        )
        # Handle case where deleteUserArticleCaches might not be imported
        if 'clearAllUserArticleCaches' not in content:
            content = content.replace(
                "const { deleteCachePattern, deleteCache } = require('../config/cache');",
                "const { deleteCachePattern, deleteCache, clearAllUserArticleCaches } = require('../config/cache');"
            )
    
    # Replace ALL cache invalidation calls to use clearAllUserArticleCaches
    # This will clear BOTH cache key formats
    content = re.sub(
        r"(deleteUserArticleCaches \? deleteUserArticleCaches\(userId\) : deleteCachePattern\(`user:\$\{userId\}:articles:\*`\))|(deleteUserArticleCaches\(userId\))|(deleteCachePattern\(`user:\$\{userId\}:articles:\*`\))",
        "clearAllUserArticleCaches(userId)",
        content
    )
    
    # Also add article-specific cache clearing
    content = re.sub(
        r"deleteCache\(`article:\$\{articleId\}`\)",
        "deleteCache(`article:${articleId}`),\n        clearAllUserArticleCaches(userId)",
        content
    )
    
    # Remove duplicate clearAllUserArticleCaches calls
    content = re.sub(
        r"clearAllUserArticleCaches\(userId\),\s+clearAllUserArticleCaches\(userId\)",
        "clearAllUserArticleCaches(userId)",
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✓ Updated {name}.js to use clearAllUserArticleCaches")

print("\n✓ All files updated!")
ENDPYTHON

echo ""
echo "=== Rebuilding Backend ==="
cd /root
docker-compose up -d --build backend

echo ""
echo "=== Clearing ALL Redis Cache ==="
docker exec -it haber-backend-redis-1 redis-cli FLUSHALL 2>/dev/null || \
docker exec -it $(docker ps | grep redis | awk '{print $1}') redis-cli FLUSHALL 2>/dev/null || \
echo "Could not clear Redis automatically - clear manually: docker exec -it <redis-container> redis-cli FLUSHALL"

echo ""
echo "=== Done! ==="
echo ""
echo "This fix:"
echo "1. Clears BOTH cache key formats (user:userId:articles:* AND api:/api/news/my-articles:userId:*)"
echo "2. Clears all Redis cache immediately"
echo ""
echo "Test NOW:"
echo "1. Remove image from article"
echo "2. Add video"
echo "3. Hard refresh browser (Ctrl+Shift+R)"
echo "4. Go to My Articles - thumbnail MUST update now!"

