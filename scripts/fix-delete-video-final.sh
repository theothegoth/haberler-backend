#!/bin/bash
# Final fix for delete video 500 error
# Run on server: bash fix-delete-video-final.sh

set -e

echo "=== Fixing Delete Video 500 Error (Final) ==="
echo ""

cd /root/haber-backend || exit 1

# Backup
BACKUP_DIR="/root/haber-backend-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp controllers/articleVideoController.js "$BACKUP_DIR/articleVideoController.js.bak"
echo "✓ Backup created"
echo ""

# Update the deleteVideo function
python3 << 'ENDPYTHON'
import re

filepath = '/root/haber-backend/controllers/articleVideoController.js'

with open(filepath, 'r') as f:
    content = f.read()

original = content

# Fix cache invalidation to add fallback for deleteUserArticleCaches
content = re.sub(
    r"deleteUserArticleCaches\(userId\)",
    "(deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`))",
    content
)

# Update error response to include details only in development
content = re.sub(
    r"res\.status\(500\)\.json\(\{ error: 'Error deleting video', details: error\.message \}\);",
    "res.status(500).json({ error: 'Error deleting video', details: process.env.NODE_ENV === 'development' ? error.message : undefined });",
    content
)

# Wrap cache invalidation in try-catch
old_cache = r"// Invalidate caches for this article and user's articles list \(await to ensure completion\)\s+await Promise\.allSettled\(\[.*?\]\)\.then\(results => \{.*?\}\)\.catch\(err => console\.error\('\[CACHE\] Invalidation error:', err\)\);"

new_cache = '''// Invalidate caches for this article and user's articles list (await to ensure completion)
      try {
        await Promise.allSettled([
          deleteCache(`article:${articleId}`),
          deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`),
          deleteCachePattern('news:feed:*')
        ]).then(results => {
          const successful = results.filter(r => r.status === 'fulfilled').length;
          console.log(`[CACHE] Cleared ${successful} cache patterns for article ${articleId}`);
        });
      } catch (cacheError) {
        console.error('[CACHE] Invalidation error:', cacheError);
        // Don't fail the request if cache invalidation fails
      }'''

content = re.sub(old_cache, new_cache, content, flags=re.DOTALL)

if content != original:
    with open(filepath, 'w') as f:
        f.write(content)
    print("✓ articleVideoController.js updated")
else:
    print("- No changes needed")

ENDPYTHON

echo ""
echo "=== Rebuilding Backend ==="
cd /root
docker-compose up -d --build backend

echo ""
echo "=== Done! ==="
echo "The delete video error should now be fixed."
echo "Test by deleting a video from an article."

