const pool = require('../config/database');

async function cleanupTestData() {
  try {
    console.log('Cleaning up all test notifications and follow relationships...\n');

    // Delete all notifications between testuser2 (18) and Theodorich (16)
    const notifResult = await pool.query(
      'DELETE FROM notifications WHERE (user_id = $1 AND actor_id = $2) OR (user_id = $2 AND actor_id = $1) RETURNING *',
      [16, 18]
    );
    console.log(`Deleted ${notifResult.rowCount} notification(s)`);
    if (notifResult.rowCount > 0) {
      notifResult.rows.forEach(n => {
        console.log(`  - [${n.type}] For: ${n.user_id}, From: ${n.actor_id}`);
      });
    }

    // Delete the follow relationship
    const followResult = await pool.query(
      'DELETE FROM user_follows WHERE (follower_id = $1 AND followed_id = $2) OR (follower_id = $2 AND followed_id = $1) RETURNING *',
      [16, 18]
    );
    console.log(`\nDeleted ${followResult.rowCount} follow relationship(s)`);
    if (followResult.rowCount > 0) {
      followResult.rows.forEach(f => {
        console.log(`  - Follower: ${f.follower_id}, Followed: ${f.followed_id}`);
      });
    }

    console.log('\n✅ Cleanup complete! You can now test the follow feature fresh.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

cleanupTestData();
