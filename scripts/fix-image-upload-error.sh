#!/bin/bash
# Fix for 500 error when uploading images
# Run on server: bash fix-image-upload-error.sh

set -e

echo "=== Fixing Image Upload 500 Error ==="
echo ""

cd /root/haber-backend || exit 1

# Backup
BACKUP_DIR="/root/haber-backend-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp routes/articleImageRoutes.js "$BACKUP_DIR/articleImageRoutes.js.bak"
cp controllers/articleImageController.js "$BACKUP_DIR/articleImageController.js.bak"
echo "✓ Backups created"
echo ""

# Update files
python3 << 'ENDPYTHON'
import re
import os

# Fix articleImageRoutes.js
routes_file = '/root/haber-backend/routes/articleImageRoutes.js'
with open(routes_file, 'r') as f:
    content = f.read()

# Add multer error handler
if 'handleMulterError' not in content:
    # Add after upload definition
    content = content.replace(
        'const upload = multer({',
        '''const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

const upload = multer({'''
    )

# Fix the route to use async/await properly
old_route = r"router\.post\('/:articleId/images',.*?addArticleImage\);"

new_route = '''router.post('/:articleId/images', authenticate, upload.single('image'), handleMulterError, async (req, res, next) => {
  // Handle multer errors
  if (req.fileValidationError) {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(400).json({ error: req.fileValidationError });
  }
  
  // Security Check: Validate file magic bytes using file-type
  if (req.file) {
    try {
      const fileType = await FileType.fromFile(req.file.path);
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      if (!fileType || !allowedMimes.includes(fileType.mime)) {
        // Delete the file immediately
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Invalid file type detected (magic byte mismatch)' });
      }
      next();
    } catch (validationError) {
      console.error('[FILE_VALIDATION_ERROR]', validationError);
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(500).json({ error: 'File validation failed', details: validationError.message });
    }
  } else {
    next();
  }
}, addArticleImage);'''

content = re.sub(old_route, new_route, content, flags=re.DOTALL)

with open(routes_file, 'w') as f:
    f.write(content)
print("✓ articleImageRoutes.js updated")

# Fix articleImageController.js - add fallback for deleteUserArticleCaches
controller_file = '/root/haber-backend/controllers/articleImageController.js'
with open(controller_file, 'r') as f:
    content = f.read()

# Update cache invalidation to handle missing deleteUserArticleCaches
content = re.sub(
    r"deleteUserArticleCaches\(userId\)",
    "deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`)",
    content
)

# Improve error handling
if 'Error details:' not in content:
    content = re.sub(
        r"res\.status\(500\)\.json\(\{ error: 'Failed to add image' \}\);",
        r"res.status(500).json({ \n      error: 'Failed to add image',\n      details: process.env.NODE_ENV === 'development' ? error.message : undefined\n    });",
        content
    )

with open(controller_file, 'w') as f:
    f.write(content)
print("✓ articleImageController.js updated")

print("\nDone! Now rebuild: cd /root && docker-compose up -d --build backend")
ENDPYTHON

echo ""
echo "=== Rebuilding Backend ==="
cd /root
docker-compose up -d --build backend

echo ""
echo "=== Done! ==="
echo "The image upload error should now be fixed."
echo "Test by uploading an image to an article."

