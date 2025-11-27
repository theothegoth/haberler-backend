#!/bin/bash
# Fix for 500 error when deleting images
# Run on server: bash fix-delete-image-error.sh

set -e

echo "=== Fixing Delete Image 500 Error ==="
echo ""

cd /root/haber-backend || exit 1

# Backup
BACKUP_DIR="/root/haber-backend-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp controllers/articleImageController.js "$BACKUP_DIR/articleImageController.js.bak"
echo "✓ Backup created"
echo ""

# Update the deleteArticleImage function
python3 << 'ENDPYTHON'
import re

filepath = '/root/haber-backend/controllers/articleImageController.js'

with open(filepath, 'r') as f:
    content = f.read()

original = content

# Fix deleteArticleImage function - add fallback and better error handling
old_delete = r"// Delete from database\s+await ArticleImage\.deleteImage\(imageId\);\s+// Invalidate caches for this article and user's articles list \(await to ensure completion\)\s+await Promise\.allSettled\(\[.*?deleteCache\(`article:\$\{image\.article_id\}`\).*?deleteUserArticleCaches\(userId\).*?deleteCachePattern\('news:feed:\*'\).*?\]\)\.catch\(err => console\.error\('\[CACHE\] Invalidation error:', err\)\);\s+res\.json\(\{ message: 'Image deleted successfully' \}\);\s+\} catch \(error\) \{\s+res\.status\(500\)\.json\(\{ error: 'Failed to delete image' \}\);"

new_delete = '''// Delete from database
    await ArticleImage.deleteImage(imageId);

    const articleId = image.article_id;

    // Invalidate ALL caches for this article (comprehensive clearing)
    try {
      await Promise.allSettled([
        deleteCache(`article:${articleId}`),
        deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`),
        deleteCachePattern('news:feed:*'),
        deleteCachePattern(`api:/api/news/my-articles:${userId}:*`),
        deleteCachePattern(`api:/api/news/my/articles:${userId}:*`)
      ]).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[CACHE] Cleared ${successful} cache patterns for article ${articleId} (image deleted)`);
      });
    } catch (cacheError) {
      console.error('[CACHE] Invalidation error:', cacheError);
      // Don't fail the request if cache invalidation fails
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('[DELETE_IMAGE] Error:', error);
    console.error('[DELETE_IMAGE] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to delete image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });'''

content = re.sub(old_delete, new_delete, content, flags=re.DOTALL)

if content != original:
    with open(filepath, 'w') as f:
        f.write(content)
    print("✓ articleImageController.js updated")
else:
    print("- No changes needed")

ENDPYTHON

echo ""
echo "=== Rebuilding Backend ==="
cd /root
docker-compose up -d --build backend

echo ""
echo "=== Done! ==="
echo "The delete image error should now be fixed."

