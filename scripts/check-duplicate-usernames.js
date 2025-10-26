const pool = require('../config/database');

async function checkDuplicates() {
  const client = await pool.connect();

  try {
    console.log('Checking for duplicate usernames...\n');

    const duplicates = await client.query(`
      SELECT username, COUNT(*) as count
      FROM users
      GROUP BY username
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    if (duplicates.rows.length === 0) {
      console.log('✓ No duplicate usernames found');
    } else {
      console.log(`⚠ Found ${duplicates.rows.length} duplicate username(s):\n`);
      duplicates.rows.forEach(row => {
        console.log(`  - "${row.username}" appears ${row.count} times`);
      });

      // Show all users with duplicate usernames
      console.log('\n📋 Users with duplicate usernames:');
      for (const dup of duplicates.rows) {
        const users = await client.query(
          'SELECT id, username, email, created_at FROM users WHERE username = $1 ORDER BY created_at',
          [dup.username]
        );
        console.log(`\n  Username: "${dup.username}"`);
        users.rows.forEach(user => {
          console.log(`    - ID: ${user.id}, Email: ${user.email}, Created: ${user.created_at}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDuplicates();
