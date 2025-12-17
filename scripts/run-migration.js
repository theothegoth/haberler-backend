const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../migrations/004_add_email_verification.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('[MIGRATION] Running email verification migration...');
    await pool.query(sql);
    console.log('[MIGRATION] ✓ Email verification columns added successfully');

    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION] Error:', error.message);
    process.exit(1);
  }
}

runMigration();
