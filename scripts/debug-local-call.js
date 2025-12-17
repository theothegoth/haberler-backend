const Notification = require('../models/Notification');
const pool = require('../config/database');

async function run() {
  try {
    // Get a user ID that has unread notifications
    const userRes = await pool.query('SELECT user_id FROM notifications WHERE is_read=false LIMIT 1');
    if (userRes.rows.length === 0) {
        console.log('No unread notifications found for ANY user.');
        return;
    }
    const userId = userRes.rows[0].user_id;
    console.log(`Testing with User ID: ${userId}`);

    console.log('--- Calling getUnreadCount ---');
    const count = await Notification.getUnreadCount(userId);
    console.log('Count Result:', count);

    console.log('--- Calling getUserNotifications ---');
    const list = await Notification.getUserNotifications(userId, 10, 0);
    console.log('List Result Length:', list.length);
    console.log('First Item:', list[0]);

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();

