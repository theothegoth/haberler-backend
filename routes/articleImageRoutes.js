const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FileType = require('file-type'); // Import file-type for magic byte validation
const { authenticate } = require('../middleware/auth');
const {
  addArticleImage,
  getArticleImages,
  updateImageCaption,
  deleteArticleImage,
  reorderImages
} = require('../controllers/articleImageController');

// Ensure temp directory exists
const tempDir = 'uploads/temp/';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
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


// Reorder images (authenticated) - MUST come before /:articleId/images routes!
router.put('/:articleId/images/reorder', authenticate, reorderImages);

// Add image to article (authenticated, with file upload)
router.post('/:articleId/images', authenticate, upload.single('image'), handleMulterError, async (req, res, next) => {
  // Security Check: Validate file magic bytes using file-type
  if (req.file) {
    try {
      const fileType = await FileType.fromFile(req.file.path);
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      if (!fileType || !allowedMimes.includes(fileType.mime)) {
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
}, addArticleImage);

// Get all images for an article (public)
router.get('/:articleId/images', getArticleImages);

// Update image caption (authenticated)
router.patch('/images/:imageId/caption', authenticate, updateImageCaption);

// Delete image (authenticated)
router.delete('/images/:imageId', authenticate, deleteArticleImage);

module.exports = router;
