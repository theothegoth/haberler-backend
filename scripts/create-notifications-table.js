const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createNotificationsTable() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/010_create_notifications_table.sql'),
      'utf8'
    );

    await pool.query(sql);
    console.log('✓ Notifications table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating notifications table:', error);
    process.exit(1);
  }
}

createNotificationsTable();
