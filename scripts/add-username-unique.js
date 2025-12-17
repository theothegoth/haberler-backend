const pool = require('../config/database');

async function addUsernameUniqueConstraint() {
  const client = await pool.connect();

  try {
    console.log('Adding UNIQUE constraint to username column...');

    // First check if constraint already exists
    const checkConstraint = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'users_username_key'
    `);

    if (checkConstraint.rows.length > 0) {
      console.log('✓ Username UNIQUE constraint already exists');
      return;
    }

    // Add the constraint
    await client.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_username_key UNIQUE (username)
    `);

    console.log('✓ Successfully added UNIQUE constraint to username column');

    // Add index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);

    console.log('✓ Successfully added index on username column');

  } catch (error) {
    if (error.code === '23505') {
      console.log('⚠ Duplicate usernames found. Please clean up duplicates first.');
      console.log('Error:', error.message);
    } else {
      console.error('Error adding constraint:', error);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addUsernameUniqueConstraint()
  .then(() => {
    console.log('✓ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  });
