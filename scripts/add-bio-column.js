const pool = require('../config/database');

const addBioColumn = async () => {
  try {
    console.log('Adding bio column to users table...');

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    `);

    console.log('✅ Bio column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding bio column:', error.message);
    process.exit(1);
  }
};

addBioColumn();
