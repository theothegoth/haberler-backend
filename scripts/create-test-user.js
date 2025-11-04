const pool = require('../config/database');
const bcrypt = require('bcrypt');

async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['testuser2@test.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('Test user already exists!');
      console.log('===================================');
      console.log('Email: testuser2@test.com');
      console.log('Password: test123');
      console.log('Username:', existingUser.rows[0].username);
      console.log('User ID:', existingUser.rows[0].id);
      console.log('===================================');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 10);

    // Create test user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, email_verified, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, username, email`,
      ['testuser2', 'testuser2@test.com', hashedPassword, true]
    );

    console.log('Test user created successfully!');
    console.log('===================================');
    console.log('Email: testuser2@test.com');
    console.log('Password: test123');
    console.log('Username:', result.rows[0].username);
    console.log('User ID:', result.rows[0].id);
    console.log('===================================');
    console.log('You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
