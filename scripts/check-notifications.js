const pool = require('../config/database');

async function checkNotifications() {
  try {
    console.log('=== Checking Notification System ===\n');

    // Get user IDs
    const usersResult = await pool.query(
      "SELECT id, username FROM users WHERE username IN ('Theodorich', 'testuser2')"
    );
    console.log('Users:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.username}: ID ${user.id}`);
    });
    console.log();

    const theodorichId = usersResult.rows.find(u => u.username === 'Theodorich')?.id;
    const testuser2Id = usersResult.rows.find(u => u.username === 'testuser2')?.id;

    if (!theodorichId || !testuser2Id) {
      console.log('Error: Could not find both users');
      process.exit(1);
    }

    // Check follow relationship
    const followResult = await pool.query(
      'SELECT * FROM user_follows WHERE follower_id = $1 AND followed_id = $2',
      [testuser2Id, theodorichId]
    );
    console.log(`Follow relationship (testuser2 -> Theodorich):`);
    if (followResult.rows.length > 0) {
      console.log(`  ✓ Exists (created at: ${followResult.rows[0].created_at})`);
    } else {
      console.log('  ✗ Does not exist');
    }
    console.log();

    // Check notifications for Theodorich
    const notificationsResult = await pool.query(
      `SELECT n.*, u.username as actor_username
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 10`,
      [theodorichId]
    );
    console.log(`Recent notifications for Theodorich (User ID: ${theodorichId}):`);
    if (notificationsResult.rows.length === 0) {
      console.log('  (No notifications found)');
    } else {
      notificationsResult.rows.forEach(n => {
        console.log(`  - [${n.type}] ${n.message}`);
        console.log(`    Actor: ${n.actor_username} (ID: ${n.actor_id})`);
        console.log(`    Created: ${n.created_at}`);
        console.log(`    Read: ${n.is_read}`);
        console.log();
      });
    }

    // Check all recent notifications
    console.log('All recent notifications:');
    const allNotificationsResult = await pool.query(
      `SELECT n.*, u1.username as user_username, u2.username as actor_username
       FROM notifications n
       LEFT JOIN users u1 ON n.user_id = u1.id
       LEFT JOIN users u2 ON n.actor_id = u2.id
       ORDER BY n.created_at DESC
       LIMIT 5`
    );
    if (allNotificationsResult.rows.length === 0) {
      console.log('  (No notifications in system)');
    } else {
      allNotificationsResult.rows.forEach(n => {
        console.log(`  - [${n.type}] For: ${n.user_username}, From: ${n.actor_username}`);
        console.log(`    Message: ${n.message}`);
        console.log(`    Created: ${n.created_at}`);
        console.log();
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkNotifications();
