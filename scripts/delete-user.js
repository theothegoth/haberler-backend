const pool = require('../config/database');

const deleteUser = async (email) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE email = $1 RETURNING *',
      [email]
    );

    if (result.rowCount > 0) {
      console.log(`✅ Successfully deleted user: ${email}`);
      console.log('Deleted user data:', result.rows[0]);
    } else {
      console.log(`❌ No user found with email: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    process.exit(1);
  }
};

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node delete-user.js <email>');
  process.exit(1);
}

deleteUser(email);
