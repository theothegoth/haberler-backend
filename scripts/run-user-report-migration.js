const pool = require('../config/database');

async function runMigration() {
  try {
    console.log('Running migration: Add user to report types...');

    // Drop existing constraint
    await pool.query(`
      ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_type_check;
    `);
    console.log('✓ Dropped existing constraint');

    // Add new constraint with 'user' type
    await pool.query(`
      ALTER TABLE reports ADD CONSTRAINT reports_reported_type_check
        CHECK (reported_type IN ('article', 'comment', 'user'));
    `);
    console.log('✓ Added new constraint with user type');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
