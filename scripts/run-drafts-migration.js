const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'haber_db',
  password: 'postgres',
  port: 5432,
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', '009_create_drafts_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('✓ Drafts table created successfully!');

    // Check if table exists
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'drafts'
    `);

    if (result.rows.length > 0) {
      console.log('✓ Drafts table exists in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
