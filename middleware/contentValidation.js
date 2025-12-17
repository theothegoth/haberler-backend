const { body } = require('express-validator');
const pool = require('../config/database');

/**
 * Count paragraphs by splitting on double line breaks or block-level HTML elements
 */
function countParagraphs(content) {
  if (!content) return 0;

  // Remove HTML tags but keep line breaks
  const textOnly = content.replace(/<[^>]*>/g, '\n');

  // Split by multiple newlines (2 or more) or <p> tags
  const paragraphs = textOnly
    .split(/\n{2,}/)
    .filter(p => p.trim().length > 0);

  return paragraphs.length;
}

/**
 * Strip HTML tags and get plain text length
 */
function getPlainTextLength(html) {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, '').trim().length;
}

/**
 * Validation rules for article creation and update
 * - Title: minimum 20 characters
 * - Content: minimum 500 characters (plain text)
 * - Content: minimum 2 paragraphs
 */
const articleValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('VALIDATION.TITLE_REQUIRED')
    .isLength({ min: 20 })
    .withMessage('VALIDATION.TITLE_TOO_SHORT')
    .isLength({ max: 200 })
    .withMessage('VALIDATION.TITLE_TOO_LONG'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('VALIDATION.CONTENT_REQUIRED')
    .custom((value) => {
      const plainTextLength = getPlainTextLength(value);
      if (plainTextLength < 500) {
        throw new Error('VALIDATION.CONTENT_TOO_SHORT');
      }
      return true;
    })
    .custom((value) => {
      const paragraphCount = countParagraphs(value);
      if (paragraphCount < 2) {
        throw new Error('VALIDATION.CONTENT_NEEDS_PARAGRAPHS');
      }
      return true;
    })
];

/**
 * Validation rules for draft creation and update (more lenient)
 * - Title: optional, but if provided minimum 1 character
 * - Content: optional, but if provided minimum 1 character
 * - Category: optional
 * - Very lenient to allow auto-save as user types
 */
const draftValidation = [
  body('title')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('VALIDATION.TITLE_TOO_LONG'),

  body('content')
    .optional({ checkFalsy: true })
    .trim(),

  body('category')
    .optional({ checkFalsy: true })
    .trim()
];

/**
 * Get content quality analysis for frontend warnings
 * This doesn't block submission, just provides feedback
 */
function analyzeContentQuality(title, content) {
  const warnings = [];
  const plainTextLength = getPlainTextLength(content);
  const paragraphCount = countParagraphs(content);

  // Title warnings
  if (title.length < 20) {
    warnings.push({
      type: 'title',
      message: `Title is only ${title.length} characters. Recommended: at least 20 characters`
    });
  }

  // Content length warnings
  if (plainTextLength < 500) {
    warnings.push({
      type: 'content_length',
      message: `Content is only ${plainTextLength} characters. Recommended: at least 500 characters`
    });
  } else if (plainTextLength < 800) {
    warnings.push({
      type: 'content_length',
      message: `Content is ${plainTextLength} characters. Consider adding more detail (recommended: 800+ characters)`
    });
  }

  // Paragraph warnings
  if (paragraphCount < 2) {
    warnings.push({
      type: 'paragraphs',
      message: `Content has only ${paragraphCount} paragraph. Recommended: at least 2 paragraphs for better readability`
    });
  }

  return {
    stats: {
      titleLength: title.length,
      contentLength: plainTextLength,
      paragraphCount: paragraphCount
    },
    warnings: warnings,
    passesMinimum: title.length >= 20 && plainTextLength >= 500 && paragraphCount >= 2
  };
}

/**
 * Middleware to check if article has at least one image OR video
 * This runs after validation and requires the article ID to be present
 */
const checkMediaRequirement = async (req, res, next) => {
  try {
    // For draft publishing, the article ID is in params
    // For news updates, the article ID is also in params
    const articleId = req.params.id;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    // Check for images
    const imageResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM article_images WHERE article_id = $1',
      [articleId]
    );
    const imageCount = imageResult.rows[0].count;

    // Check for videos
    const videoResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM article_videos WHERE article_id = $1',
      [articleId]
    );
    const videoCount = videoResult.rows[0].count;

    // Require at least one image OR one video
    if (imageCount === 0 && videoCount === 0) {
      return res.status(400).json({
        error: 'VALIDATION.MEDIA_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking media requirement:', error);
    return res.status(500).json({ error: 'Failed to validate media requirement' });
  }
};

module.exports = {
  articleValidation,
  draftValidation,
  analyzeContentQuality,
  getPlainTextLength,
  countParagraphs,
  checkMediaRequirement
};
