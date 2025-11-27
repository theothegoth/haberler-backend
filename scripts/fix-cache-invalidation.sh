#!/bin/bash

# Simple script to update cache invalidation patterns
# Run this on the server: bash fix-cache-invalidation.sh

CONTROLLERS_DIR="/root/haber-backend/controllers"

echo "Fixing cache invalidation in controllers..."

cd "$CONTROLLERS_DIR" || exit 1

# Create backup
echo "Creating backups..."
cp articleVideoController.js articleVideoController.js.bak
cp articleImageController.js articleImageController.js.bak
cp newsController.js newsController.js.bak

# Function to replace pattern in file
replace_pattern() {
    local file=$1
    local old_pattern=$2
    local new_pattern=$3
    
    # Use perl for better multi-line handling
    perl -i -pe "$old_pattern" "$file" 2>/dev/null || {
        echo "Warning: Could not update $file with perl, trying sed..."
        sed -i "$old_pattern" "$file" 2>/dev/null
    }
}

# Update articleVideoController.js - addVideo
echo "Updating articleVideoController.js (addVideo)..."
perl -i -pe 's/(const video = await ArticleVideo\.addVideo\(articleId, videoId\);)\n\n\s*(\/\/ Invalidate caches[^\n]*)\n\s*(deleteCache\(`article:\$\{articleId\}`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\(`user:\$\{userId\}:articles:\*`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\('\''news:feed:\*'\''\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)/$1\n\n      $2 (await to ensure completion)\n      await Promise.allSettled([\n        deleteCache(`article:${articleId}`),\n        deleteCachePattern(`user:${userId}:articles:*`),\n        deleteCachePattern('\''news:feed:*'\'')\n      ]).catch(err => console.error('\''[CACHE] Invalidation error:'\''\, err));/g' articleVideoController.js

# Update articleVideoController.js - deleteVideo
echo "Updating articleVideoController.js (deleteVideo)..."
perl -i -pe 's/(if \(!video\) \{\n\s*return res\.status\(404\)\.json\(\{ error: '\''Video not found'\'' \}\);)\n\s*\}\n\n\s*(\/\/ Invalidate caches[^\n]*)\n\s*(deleteCache\(`article:\$\{video\.article_id\}`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\(`user:\$\{userId\}:articles:\*`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\('\''news:feed:\*'\''\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)/$1\n      }\n\n      $2 (await to ensure completion)\n      await Promise.allSettled([\n        deleteCache(`article:${video.article_id}`),\n        deleteCachePattern(`user:${userId}:articles:*`),\n        deleteCachePattern('\''news:feed:*'\'')\n      ]).catch(err => console.error('\''[CACHE] Invalidation error:'\''\, err));/g' articleVideoController.js

# Update articleImageController.js - addArticleImage
echo "Updating articleImageController.js (addArticleImage)..."
perl -i -pe 's/(const image = await ArticleImage\.addImage\([^)]+\);)\n\n\s*(\/\/ Invalidate caches[^\n]*)\n\s*(deleteCache\(`article:\$\{articleId\}`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\(`user:\$\{userId\}:articles:\*`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\('\''news:feed:\*'\''\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)/$1\n\n    $2 (await to ensure completion)\n    await Promise.allSettled([\n      deleteCache(`article:${articleId}`),\n      deleteCachePattern(`user:${userId}:articles:*`),\n      deleteCachePattern('\''news:feed:*'\'')\n    ]).catch(err => console.error('\''[CACHE] Invalidation error:'\''\, err));/g' articleImageController.js

# Update articleImageController.js - deleteArticleImage
echo "Updating articleImageController.js (deleteArticleImage)..."
perl -i -pe 's/(await ArticleImage\.deleteImage\(imageId\);)\n\n\s*(\/\/ Invalidate caches[^\n]*)\n\s*(deleteCache\(`article:\$\{image\.article_id\}`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\(`user:\$\{userId\}:articles:\*`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\('\''news:feed:\*'\''\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)/$1\n\n    $2 (await to ensure completion)\n    await Promise.allSettled([\n      deleteCache(`article:${image.article_id}`),\n      deleteCachePattern(`user:${userId}:articles:*`),\n      deleteCachePattern('\''news:feed:*'\'')\n    ]).catch(err => console.error('\''[CACHE] Invalidation error:'\''\, err));/g' articleImageController.js

# Update articleImageController.js - updateImageCaption
echo "Updating articleImageController.js (updateImageCaption)..."
perl -i -pe 's/(const updatedImage = await ArticleImage\.updateCaption\(imageId, caption\);)\n\n\s*(\/\/ Invalidate caches[^\n]*)\n\s*(deleteCache\(`article:\$\{image\.article_id\}`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)/$1\n\n    $2 (await to ensure completion)\n    await Promise.allSettled([\n      deleteCache(`article:${image.article_id}`),\n      deleteCachePattern(`user:${userId}:articles:*`),\n      deleteCachePattern('\''news:feed:*'\'')\n    ]).catch(err => console.error('\''[CACHE] Invalidation error:'\''\, err));/g' articleImageController.js

# Update newsController.js - updateNews
echo "Updating newsController.js (updateNews)..."
perl -i -pe 's/(\/\/ Invalidate relevant caches)\n\s*(deleteCache\(`article:\$\{id\}`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\('\''news:feed:\*'\''\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\(`user:\$\{userId\}:articles:\*`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)/\/\/ Invalidate relevant caches (await to ensure completion)\n      await Promise.allSettled([\n        deleteCache(`article:${id}`),\n        deleteCachePattern('\''news:feed:*'\''),\n        deleteCachePattern(`user:${userId}:articles:*`)\n      ]).catch(err => console.error('\''[CACHE] Invalidation error:'\''\, err));/g' newsController.js

# Update newsController.js - deleteNews
echo "Updating newsController.js (deleteNews)..."
perl -i -pe 's/(\/\/ Invalidate relevant caches)\n\s*(deleteCache\(`article:\$\{id\}`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\('\''news:feed:\*'\''\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\(`user:\$\{userId\}:articles:\*`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)\n\s*(deleteCachePattern\(`comments:article:\$\{id\}`\)\.catch\(err => console\.error\('\''Cache invalidation error:'\''\, err\)\);)/\/\/ Invalidate relevant caches (await to ensure completion)\n      await Promise.allSettled([\n        deleteCache(`article:${id}`),\n        deleteCachePattern('\''news:feed:*'\''),\n        deleteCachePattern(`user:${userId}:articles:*`),\n        deleteCachePattern(`comments:article:${id}`)\n      ]).catch(err => console.error('\''[CACHE] Invalidation error:'\''\, err));/g' newsController.js

echo ""
echo "✅ Cache invalidation updates completed!"
echo ""
echo "Backups created:"
echo "  - articleVideoController.js.bak"
echo "  - articleImageController.js.bak"
echo "  - newsController.js.bak"
echo ""
echo "Next step: Rebuild the backend:"
echo "  docker-compose up -d --build backend"

