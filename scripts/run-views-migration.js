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
    const migrationPath = path.join(__dirname, '..', 'migrations', '012_create_article_views.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('✓ Article views migration completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
