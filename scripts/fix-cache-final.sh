#!/bin/bash
# Final aggressive cache fix - clears ALL related caches
# Run on server: bash fix-cache-final.sh

set -e

echo "=== Final Cache Fix - Clearing ALL Related Caches ==="
echo ""

cd /root/haber-backend || exit 1

# Backup
BACKUP_DIR="/root/haber-backend-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp controllers/articleVideoController.js "$BACKUP_DIR/articleVideoController.js.bak"
cp controllers/articleImageController.js "$BACKUP_DIR/articleImageController.js.bak"
echo "✓ Backups created"
echo ""

# Update controllers to clear ALL article caches, not just user-specific
echo "Updating controllers to clear ALL article caches..."

python3 << 'PYEOF'
import re
import os

def update_file(filepath, name):
    with open(filepath, 'r') as f:
        content = f.read()
    original = content
    
    # Replace cache invalidation to clear ALL article-related caches
    # This is more aggressive but ensures nothing is cached
    
    # Pattern 1: When adding/deleting video or image, clear:
    # - article:${id}
    # - user:${userId}:articles:* (all variations)
    # - news:feed:* (all feeds)
    # - article:${id} (specific article)
    
    # For articleVideoController and articleImageController
    # Replace the cache invalidation block
    old_pattern = r'// Invalidate caches for this article and user\'s articles list \(await to ensure completion\)\s+await Promise\.allSettled\(\[.*?\]\)\.catch\(err => console\.error\(.*?\)\);'
    
    new_invalidation = '''// Invalidate ALL caches for this article (aggressive clearing)
      await Promise.allSettled([
        deleteCache(`article:${articleId}`),
        deleteUserArticleCaches(userId),
        deleteCachePattern('news:feed:*'),
        deleteCachePattern(`article:${articleId}:*`),
        deleteCachePattern('api:/api/news/my-articles*')
      ]).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[CACHE] Cleared ${successful} cache patterns for article ${articleId}`);
      }).catch(err => console.error('[CACHE] Invalidation error:', err));'''
    
    # Try to replace
    content = re.sub(
        r'// Invalidate caches for this article and user\'s articles list.*?await Promise\.allSettled\(\[.*?\]\)\.catch\(err => console\.error\(.*?\)\);',
        new_invalidation,
        content,
        flags=re.DOTALL
    )
    
    # Also handle deleteVideo pattern
    content = re.sub(
        r'// Invalidate caches for this article and user\'s articles list.*?await Promise\.allSettled\(\[.*?deleteCache\(`article:\$\{video\.article_id\}`\).*?\]\)\.catch\(err => console\.error\(.*?\)\);',
        '''// Invalidate ALL caches for this article (aggressive clearing)
      await Promise.allSettled([
        deleteCache(`article:${video.article_id}`),
        deleteUserArticleCaches(userId),
        deleteCachePattern('news:feed:*'),
        deleteCachePattern(`article:${video.article_id}:*`),
        deleteCachePattern('api:/api/news/my-articles*')
      ]).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[CACHE] Cleared ${successful} cache patterns for article ${video.article_id}`);
      }).catch(err => console.error('[CACHE] Invalidation error:', err));''',
        content,
        flags=re.DOTALL
    )
    
    # Handle deleteArticleImage pattern
    content = re.sub(
        r'// Invalidate caches for this article and user\'s articles list.*?await Promise\.allSettled\(\[.*?deleteCache\(`article:\$\{image\.article_id\}`\).*?\]\)\.catch\(err => console\.error\(.*?\)\);',
        '''// Invalidate ALL caches for this article (aggressive clearing)
      await Promise.allSettled([
        deleteCache(`article:${image.article_id}`),
        deleteUserArticleCaches(userId),
        deleteCachePattern('news:feed:*'),
        deleteCachePattern(`article:${image.article_id}:*`),
        deleteCachePattern('api:/api/news/my-articles*')
      ]).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[CACHE] Cleared ${successful} cache patterns for article ${image.article_id}`);
      }).catch(err => console.error('[CACHE] Invalidation error:', err));''',
        content,
        flags=re.DOTALL
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"  ✓ {name} updated")
        return True
    else:
        print(f"  - {name} (no changes needed or pattern not found)")
        return False

files = [
    ('/root/haber-backend/controllers/articleVideoController.js', 'articleVideoController.js'),
    ('/root/haber-backend/controllers/articleImageController.js', 'articleImageController.js'),
]

for filepath, name in files:
    if os.path.exists(filepath):
        update_file(filepath, name)
    else:
        print(f"  ✗ {name} not found")

PYEOF

echo ""
echo "=== Rebuilding Backend ==="
cd /root
docker-compose up -d --build backend

echo ""
echo "=== Done! ==="
echo ""
echo "This fix clears ALL article-related caches when images/videos change."
echo "Test by:"
echo "1. Delete an image from an article"
echo "2. Add a video"
echo "3. Hard refresh browser (Ctrl+Shift+R)"
echo "4. Go to 'My Articles' - thumbnail should update immediately"

