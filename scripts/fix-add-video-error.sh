#!/bin/bash
# Fix for 500 error when adding YouTube videos
# Run on server: bash fix-add-video-error.sh

set -e

echo "=== Fixing Add Video 500 Error ==="
echo ""

cd /root/haber-backend || exit 1

# Backup
BACKUP_DIR="/root/haber-backend-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp controllers/articleVideoController.js "$BACKUP_DIR/articleVideoController.js.bak"
echo "✓ Backup created"
echo ""

# Update the addVideo function
python3 << 'ENDPYTHON'
import re

filepath = '/root/haber-backend/controllers/articleVideoController.js'

with open(filepath, 'r') as f:
    content = f.read()

original = content

# Replace the addVideo function
old_add_video = r'async addVideo\(req, res\) \{.*?res\.status\(500\)\.json\(\{ error: \'Error adding video\' \}\);.*?\n  \},'

new_add_video = '''async addVideo(req, res) {
    try {
      const { articleId } = req.params;
      const { videoId } = req.body;
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!videoId) {
        return res.status(400).json({ error: 'Video ID is required' });
      }

      // Verify article exists and belongs to user
      const pool = require('../config/database');
      let articleResult = await pool.query(
        'SELECT id, user_id FROM drafts WHERE id = $1',
        [articleId]
      );

      if (articleResult.rows.length === 0) {
        articleResult = await pool.query(
          'SELECT id, user_id FROM user_news WHERE id = $1',
          [articleId]
        );
      }

      if (articleResult.rows.length === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }

      if (articleResult.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'You do not have permission to add videos to this article' });
      }

      // Check if article already has a video (1 video limit)
      const existingVideos = await ArticleVideo.getArticleVideos(articleId);
      if (existingVideos.length >= 1) {
        return res.status(400).json({
          error: 'This article already has a video. Please remove the current video first.'
        });
      }

      // Fetch and cache video metadata from YouTube if not already cached
      try {
        await YouTubeService.fetchAndCacheVideo(videoId);
      } catch (fetchError) {
        console.error('[ADD_VIDEO] Failed to fetch video metadata:', fetchError.message);
        console.error('[ADD_VIDEO] Fetch error stack:', fetchError.stack);
        return res.status(400).json({
          error: fetchError.message || 'Video not found or unavailable'
        });
      }

      const video = await ArticleVideo.addVideo(articleId, videoId);

      // Invalidate caches for this article and user's articles list (await to ensure completion)
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
      }

      res.status(201).json({
        message: 'Video added successfully',
        video
      });
    } catch (error) {
      console.error('[ADD_VIDEO] Error:', error);
      console.error('[ADD_VIDEO] Stack:', error.stack);
      console.error('[ADD_VIDEO] Error details:', {
        message: error.message,
        code: error.code,
        constraint: error.constraint
      });

      // Handle foreign key violations
      if (error.code === '23503') {
        if (error.constraint === 'fk_article_video_video') {
          return res.status(400).json({
            error: 'Video not found. Please select a valid video.'
          });
        }
      }

      res.status(500).json({ 
        error: 'Error adding video',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },'''

# Replace the function
content = re.sub(old_add_video, new_add_video, content, flags=re.DOTALL)

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
echo "The add video error should now be fixed."
echo "Test by adding a YouTube video to an article."

