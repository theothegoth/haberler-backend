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
  const client = await pool.connect();

  try {
    console.log('Running migration: Add comment replies and likes...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/013_add_comment_replies_and_likes.sql'),
      'utf8'
    );

    await client.query(migrationSQL);

    console.log('✓ Comment replies and likes migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
