const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('Running blocking and reporting migrations...');

    // Run blocked_users migration
    const blockedUsersSql = fs.readFileSync(
      path.join(__dirname, '../migrations/014_create_blocked_users_table.sql'),
      'utf8'
    );
    await pool.query(blockedUsersSql);
    console.log('✓ Created blocked_users table');

    // Run reports migration
    const reportsSql = fs.readFileSync(
      path.join(__dirname, '../migrations/015_create_reports_table.sql'),
      'utf8'
    );
    await pool.query(reportsSql);
    console.log('✓ Created reports table');

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
