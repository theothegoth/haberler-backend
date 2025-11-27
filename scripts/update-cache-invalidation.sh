#!/bin/bash

# Script to update cache invalidation to use Promise.allSettled
# This ensures cache clearing completes before responses are sent

BACKEND_DIR="/root/haber-backend/controllers"

echo "Updating cache invalidation in controllers..."

# Update articleVideoController.js - addVideo function
sed -i 's/deleteCache(`article:\${articleId}`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/await Promise.allSettled([\n        deleteCache(`article:${articleId}`),/g' "$BACKEND_DIR/articleVideoController.js"
sed -i 's/deleteCachePattern(`user:\${userId}:articles:\*`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/        deleteCachePattern(`user:${userId}:articles:*`),/g' "$BACKEND_DIR/articleVideoController.js"
sed -i 's/deleteCachePattern('\''news:feed:\*'\'')\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/        deleteCachePattern('\''news:feed:*'\'')\n      ])\.catch(err => console\.error('\''[CACHE] Invalidation error:'\''\, err));/g' "$BACKEND_DIR/articleVideoController.js"

# Update articleVideoController.js - deleteVideo function  
sed -i 's/deleteCache(`article:\${video\.article_id}`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/await Promise.allSettled([\n        deleteCache(`article:${video.article_id}`),/g' "$BACKEND_DIR/articleVideoController.js"

# Update articleImageController.js - addArticleImage function
sed -i 's/deleteCache(`article:\${articleId}`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/await Promise.allSettled([\n        deleteCache(`article:${articleId}`),/g' "$BACKEND_DIR/articleImageController.js"

# Update articleImageController.js - deleteArticleImage function
sed -i 's/deleteCache(`article:\${image\.article_id}`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/await Promise.allSettled([\n        deleteCache(`article:${image.article_id}`),/g' "$BACKEND_DIR/articleImageController.js"

# Update articleImageController.js - updateImageCaption function
# This one needs special handling as it only had one deleteCache call
sed -i '/const updatedImage = await ArticleImage\.updateCaption(imageId, caption);/,/res\.json({/ {
  s/deleteCache(`article:\${image\.article_id}`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/await Promise.allSettled([\n        deleteCache(`article:${image.article_id}`),\n        deleteCachePattern(`user:${userId}:articles:*`),\n        deleteCachePattern('\''news:feed:*'\'')\n      ])\.catch(err => console\.error('\''[CACHE] Invalidation error:'\''\, err));/
}' "$BACKEND_DIR/articleImageController.js"

# Update newsController.js - updateNews function
sed -i 's/deleteCache(`article:\${id}`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/await Promise.allSettled([\n        deleteCache(`article:${id}`),/g' "$BACKEND_DIR/newsController.js"
sed -i 's/deleteCachePattern('\''news:feed:\*'\'')\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/        deleteCachePattern('\''news:feed:*'\''),/g' "$BACKEND_DIR/newsController.js"
sed -i 's/deleteCachePattern(`user:\${userId}:articles:\*`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/        deleteCachePattern(`user:${userId}:articles:*`)\n      ])\.catch(err => console\.error('\''[CACHE] Invalidation error:'\''\, err));/g' "$BACKEND_DIR/newsController.js"

# Update newsController.js - deleteNews function
sed -i 's/deleteCachePattern(`comments:article:\${id}`)\.catch(err => console\.error('\''Cache invalidation error:'\''\, err));/        deleteCachePattern(`comments:article:${id}`)\n      ])\.catch(err => console\.error('\''[CACHE] Invalidation error:'\''\, err));/g' "$BACKEND_DIR/newsController.js"

echo "Cache invalidation updates completed!"
echo "Please review the changes and rebuild: docker-compose up -d --build backend"

