const Bookmark = require('./models/Bookmark');

async function testSavedArticles() {
  try {
    // Test with user ID 16 (adjust if needed)
    const userId = 16;
    console.log(`\nFetching saved articles for user ${userId}...\n`);

    const articles = await Bookmark.getSavedArticles(userId, 5, 0);

    console.log(`Found ${articles.length} saved articles\n`);

    if (articles.length > 0) {
      console.log('First article data:');
      console.log('ID:', articles[0].id);
      console.log('Title:', articles[0].title);
      console.log('Category:', articles[0].category);
      console.log('Article Type:', articles[0].article_type);
      console.log('Has article_type field?', 'article_type' in articles[0]);
      console.log('\nAll fields:', Object.keys(articles[0]));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSavedArticles();
