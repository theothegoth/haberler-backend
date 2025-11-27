#!/bin/bash
# Fix for 500 errors on edit article page
# Run on server: bash fix-edit-page-500-errors.sh

set -e

echo "=== Fixing Edit Page 500 Errors ==="
echo ""

cd /root/haber-backend || exit 1

# Backup
BACKUP_DIR="/root/haber-backend-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp models/ArticleVideo.js "$BACKUP_DIR/ArticleVideo.js.bak"
cp controllers/articleVideoController.js "$BACKUP_DIR/articleVideoController.js.bak"
cp controllers/articleImageController.js "$BACKUP_DIR/articleImageController.js.bak"
cp controllers/newsController.js "$BACKUP_DIR/newsController.js.bak"
echo "✓ Backups created"
echo ""

# Update files
python3 << 'ENDPYTHON'
import re

# 1. Fix ArticleVideo.js - change INNER JOIN to LEFT JOIN
video_model = '/root/haber-backend/models/ArticleVideo.js'
with open(video_model, 'r') as f:
    content = f.read()

content = content.replace(
    'JOIN videos_cache vc ON av.video_id = vc.video_id',
    'LEFT JOIN videos_cache vc ON av.video_id = vc.video_id'
)

with open(video_model, 'w') as f:
    f.write(content)
print("✓ Fixed ArticleVideo.js (changed to LEFT JOIN)")

# 2. Improve error handling in controllers
files = [
    ('/root/haber-backend/controllers/articleVideoController.js', 'getArticleVideos'),
    ('/root/haber-backend/controllers/articleImageController.js', 'getArticleImages'),
    ('/root/haber-backend/controllers/newsController.js', 'getNews')
]

for filepath, func_name in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Add better error logging
    if 'console.error' in content and 'Stack' not in content:
        # Find error handling blocks and add stack trace
        content = re.sub(
            r"console\.error\('\[GET_VIDEOS\] Error:', error\);",
            "console.error('[GET_VIDEOS] Error:', error);\n      console.error('[GET_VIDEOS] Stack:', error.stack);",
            content
        )
        content = re.sub(
            r"console\.error\('\[GET_ARTICLE_IMAGES\] Error:', error\);",
            "console.error('[GET_ARTICLE_IMAGES] Error:', error);\n    console.error('[GET_ARTICLE_IMAGES] Stack:', error.stack);",
            content
        )
        content = re.sub(
            r"console\.error\('Error getting news:', error\);",
            "console.error('Error getting news:', error);\n      console.error('Error getting news - Stack:', error.stack);",
            content
        )
    
    # Add details to error responses
    content = re.sub(
        r"res\.status\(500\)\.json\(\{ error: 'Error loading videos' \}\);",
        "res.status(500).json({ error: 'Error loading videos', details: process.env.NODE_ENV === 'development' ? error.message : undefined });",
        content
    )
    content = re.sub(
        r"res\.status\(500\)\.json\(\{ error: 'Failed to get article images' \}\);",
        "res.status(500).json({ error: 'Failed to get article images', details: process.env.NODE_ENV === 'development' ? error.message : undefined });",
        content
    )
    content = re.sub(
        r"res\.status\(500\)\.json\(\{ error: 'Haber getirilirken bir hata oluştu' \}\);",
        "res.status(500).json({ error: 'Haber getirilirken bir hata oluştu', details: process.env.NODE_ENV === 'development' ? error.message : undefined });",
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✓ Updated {func_name} error handling")

print("\n✓ All files updated!")
ENDPYTHON

echo ""
echo "=== Rebuilding Backend ==="
cd /root
docker-compose up -d --build backend

echo ""
echo "=== Done! ==="
echo "The 500 errors on edit page should now be fixed."
echo "The main fix: Changed INNER JOIN to LEFT JOIN in getArticleVideos"

