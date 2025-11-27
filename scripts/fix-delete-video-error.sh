#!/bin/bash
# Fix for 500 error when deleting videos
# Run on server: bash fix-delete-video-error.sh

set -e

echo "=== Fixing Delete Video 500 Error ==="
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
import shutil
from datetime import datetime

filepath = '/root/haber-backend/controllers/articleVideoController.js'

# Read current file
with open(filepath, 'r') as f:
    content = f.read()

original = content

# Replace the deleteVideo function with the fixed version
old_delete_video = r'async deleteVideo\(req, res\) \{.*?res\.status\(500\)\.json\(\{ error: \'Error deleting video\' \}\);.*?\n  \},'

new_delete_video = '''async deleteVideo(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get video first to get article_id before deletion
      const video = await ArticleVideo.getVideoById(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Verify user owns the article
      const pool = require('../config/database');
      let articleResult = await pool.query(
        'SELECT user_id FROM drafts WHERE id = $1',
        [video.article_id]
      );

      if (articleResult.rows.length === 0) {
        articleResult = await pool.query(
          'SELECT user_id FROM user_news WHERE id = $1',
          [video.article_id]
        );
      }

      if (articleResult.rows.length === 0 || articleResult.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'You do not have permission to delete this video' });
      }

      const articleId = video.article_id;

      // Delete the video
      const deletedVideo = await ArticleVideo.deleteVideo(videoId);

      if (!deletedVideo) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Invalidate caches for this article and user's articles list (await to ensure completion)
      await Promise.allSettled([
        deleteCache(`article:${articleId}`),
        deleteUserArticleCaches(userId),
        deleteCachePattern('news:feed:*')
      ]).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[CACHE] Cleared ${successful} cache patterns for article ${articleId}`);
      }).catch(err => console.error('[CACHE] Invalidation error:', err));

      res.json({
        message: 'Video deleted successfully',
        video: deletedVideo
      });
    } catch (error) {
      console.error('[DELETE_VIDEO] Error:', error);
      console.error('[DELETE_VIDEO] Stack:', error.stack);
      res.status(500).json({ error: 'Error deleting video', details: error.message });
    }
  },'''

# Replace the function
content = re.sub(old_delete_video, new_delete_video, content, flags=re.DOTALL)

if content != original:
    with open(filepath, 'w') as f:
        f.write(content)
    print("✓ articleVideoController.js updated")
else:
    print("- No changes needed (function might already be updated)")

ENDPYTHON

echo ""
echo "=== Rebuilding Backend ==="
cd /root
docker-compose up -d --build backend

echo ""
echo "=== Done! ==="
echo "The delete video error should now be fixed."
echo "Test by deleting a video from an article."

