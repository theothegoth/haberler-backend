const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'haber_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: 5432,
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', '023_add_user_roles.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 023_add_user_roles...');
    await pool.query(sql);
    console.log('✓ Migration completed successfully!');

    // Now ask for email to set as admin
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Enter email address to set as admin (or press Enter to skip): ', async (email) => {
      if (email && email.trim()) {
        const result = await pool.query(
          'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, username, email, role',
          ['admin', email.trim()]
        );

        if (result.rows.length > 0) {
          console.log('✓ User updated to admin:', result.rows[0]);
        } else {
          console.log('✗ No user found with that email');
        }
      }

      await pool.end();
      readline.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error running migration:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
