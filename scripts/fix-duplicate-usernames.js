const pool = require('../config/database');

async function fixDuplicates() {
  const client = await pool.connect();

  try {
    console.log('Finding and fixing duplicate usernames...\n');

    await client.query('BEGIN');

    // Find duplicates
    const duplicates = await client.query(`
      SELECT username, array_agg(id ORDER BY created_at) as user_ids
      FROM users
      GROUP BY username
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length === 0) {
      console.log('✓ No duplicates to fix');
      await client.query('COMMIT');
      return;
    }

    console.log(`Found ${duplicates.rows.length} duplicate username(s). Fixing...\n`);

    let fixedCount = 0;

    for (const dup of duplicates.rows) {
      const username = dup.username;
      const userIds = dup.user_ids;

      // Keep the first user as-is, rename the others
      for (let i = 1; i < userIds.length; i++) {
        const userId = userIds[i];
        const newUsername = `${username}_${i}`;

        await client.query(
          'UPDATE users SET username = $1 WHERE id = $2',
          [newUsername, userId]
        );

        console.log(`  ✓ Renamed user ID ${userId}: "${username}" → "${newUsername}"`);
        fixedCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`\n✓ Successfully fixed ${fixedCount} duplicate username(s)`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDuplicates()
  .then(() => {
    console.log('\n✓ Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Fix failed:', error.message);
    process.exit(1);
  });
