const pool = require('../config/database');

const addProfilePictureColumn = async () => {
  try {
    console.log('Adding profile_picture column to users table...');

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);
    `);

    console.log('✅ Profile picture column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding profile_picture column:', error.message);
    process.exit(1);
  }
};

addProfilePictureColumn();
