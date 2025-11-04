const Bookmark = require('../models/Bookmark');

// Save/bookmark an article
const saveArticle = async (req, res) => {
  try {
    const { newsId } = req.params;
    const userId = req.user.userId;

    const bookmark = await Bookmark.save(userId, newsId);

    if (!bookmark) {
      return res.status(200).json({ message: 'Bu haber zaten kaydedilmiş' });
    }

    res.status(201).json({
      message: 'Haber başarıyla kaydedildi',
      bookmark
    });
  } catch (error) {
    console.error('Save article error:', error);
    res.status(500).json({ error: 'Haber kaydedilirken bir hata oluştu.' });
  }
};

// Remove bookmark/unsave an article
const unsaveArticle = async (req, res) => {
  try {
    const { newsId } = req.params;
    const userId = req.user.userId;

    const deletedBookmark = await Bookmark.unsave(userId, newsId);

    if (!deletedBookmark) {
      return res.status(404).json({ error: 'Kayıtlı haber bulunamadı.' });
    }

    res.json({ message: 'Haber kaydedilmekten çıkarıldı' });
  } catch (error) {
    console.error('Unsave article error:', error);
    res.status(500).json({ error: 'Haber kaldırılırken bir hata oluştu.' });
  }
};

// Check if article is saved
const checkSaved = async (req, res) => {
  try {
    const { newsId } = req.params;
    const userId = req.user.userId;

    const isSaved = await Bookmark.isSaved(userId, newsId);

    res.json({ isSaved });
  } catch (error) {
    console.error('Check saved error:', error);
    res.status(500).json({ error: 'Kontrol edilirken bir hata oluştu.' });
  }
};

// Get user's saved articles
const getSavedArticles = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const articles = await Bookmark.getSavedArticles(userId, limit, offset);
    const totalCount = await Bookmark.getCount(userId);

    res.json({
      articles,
      totalCount,
      hasMore: offset + articles.length < totalCount
    });
  } catch (error) {
    console.error('Get saved articles error:', error);
    res.status(500).json({ error: 'Kaydedilen haberler yüklenirken bir hata oluştu.' });
  }
};

module.exports = {
  saveArticle,
  unsaveArticle,
  checkSaved,
  getSavedArticles
};
