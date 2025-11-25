const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting migration 025: Add article_type column...');

    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/025_add_article_type.sql'),
      'utf8'
    );

    await client.query(sql);

    console.log('✓ Migration 025 completed successfully!');
    console.log('✓ Added article_type column with values: news, opinion, analysis, interview, editorial');
    console.log('✓ Set default value to "news" for all existing articles');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
