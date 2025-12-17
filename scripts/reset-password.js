const bcrypt = require('bcrypt');
const pool = require('../config/db');

// Usage: node scripts/reset-password.js your-email@example.com newpassword

async function resetPassword(email, newPassword) {
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, username',
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    console.log('✅ Password reset successful!');
    console.log('User:', result.rows[0]);
    console.log('New password:', newPassword);

    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

// Get command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node scripts/reset-password.js <email> <new-password>');
  console.log('Example: node scripts/reset-password.js user@example.com MyNewPass123');
  process.exit(1);
}

resetPassword(email, newPassword);
