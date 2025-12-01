const pool = require('../config/database');

async function checkDatabase() {
  try {
    console.log('Checking database tables...');

    // Check table existence
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Found tables:', tables.rows.map(t => t.table_name).sort().join(', '));

    // Check article_views definition
    const articleViews = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'article_views'
    `);
    console.log('article_views columns:', articleViews.rows);

    // Check if unique constraint exists on article_views
    const constraints = await pool.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'article_views'::regclass
    `);
    console.log('article_views constraints:', constraints.rows.map(r => r.conname));

    // Check news_likes table
    const newsLikes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'news_likes'
    `);
    
    if (newsLikes.rows.length === 0) {
        console.log('!!! CRITICAL: news_likes TABLE DOES NOT EXIST !!!');
    } else {
        console.log('news_likes table exists.');
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    pool.end();
  }
}

checkDatabase();

