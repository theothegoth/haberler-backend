const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'haber_db',
  password: 'password',
  port: 5432,
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../migrations/011_create_saved_articles_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('✅ saved_articles table created successfully!');

    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'saved_articles'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: saved_articles table exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
