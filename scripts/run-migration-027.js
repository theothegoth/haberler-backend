const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../migrations/027_add_performance_indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('[MIGRATION] Running performance indexes migration (027)...');
    await pool.query(sql);
    console.log('[MIGRATION] ✓ Performance indexes added successfully!');

    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION] Error:', error.message);
    process.exit(1);
  }
}

runMigration();

