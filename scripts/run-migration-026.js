const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting migration 026: Add article_type to drafts...');

    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/026_add_article_type_to_drafts.sql'),
      'utf8'
    );

    await client.query(sql);

    console.log('✓ Migration 026 completed successfully!');
    console.log('✓ Added article_type column to drafts table');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
