const pool = require('../config/db');

async function listUsers() {
  try {
    const result = await pool.query(
      'SELECT id, email, username, created_at FROM users ORDER BY created_at DESC LIMIT 20'
    );

    console.log('\n📋 Users in database:\n');
    console.log('ID\tEmail\t\t\t\tUsername\tCreated At');
    console.log('─'.repeat(80));

    result.rows.forEach(user => {
      const date = new Date(user.created_at).toLocaleDateString();
      console.log(`${user.id}\t${user.email.padEnd(30)}\t${user.username}\t${date}`);
    });

    console.log('\n✅ Total users:', result.rows.length);

    process.exit(0);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listUsers();
