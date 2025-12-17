const pool = require('../config/database');

async function cleanWrongNotification() {
  try {
    console.log('Deleting incorrect follow notification...');

    const result = await pool.query(
      'DELETE FROM notifications WHERE user_id = $1 AND actor_id = $2 AND type = $3 RETURNING *',
      [18, 16, 'follow']
    );

    if (result.rowCount > 0) {
      console.log(`Deleted ${result.rowCount} incorrect notification(s)`);
      console.log('Deleted:', result.rows[0]);
    } else {
      console.log('No matching notifications found to delete');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

cleanWrongNotification();
