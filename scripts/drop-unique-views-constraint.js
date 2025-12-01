const pool = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration to drop unique constraint on article_views...');
    
    // Drop the unique constraint
    await client.query(`
      ALTER TABLE article_views 
      DROP CONSTRAINT IF EXISTS article_views_news_id_user_id_ip_address_key;
    `);

    console.log('Successfully dropped unique constraint.');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end(); // Close the pool
  }
}

runMigration();

