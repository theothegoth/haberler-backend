const pool = require('./config/database');

async function debugNotifications() {
  try {
    // 1. Get Admin User
    const userResult = await pool.query("SELECT id, username FROM users WHERE username = 'admin'");
    if (userResult.rows.length === 0) {
      console.log("User 'admin' not found!");
      return;
    }
    const userId = userResult.rows[0].id;
    console.log(`Checking notifications for user: admin (ID: ${userId})`);

    // 2. Check Unread Count (Raw Query)
    const countQuery = `
      SELECT COUNT(n.id) as count 
      FROM notifications n
      LEFT JOIN user_news un ON (n.entity_type = 'news' AND n.entity_id = un.id)
      WHERE n.user_id = $1 
      AND n.is_read = FALSE
      AND (
        n.entity_type != 'news' 
        OR (n.entity_type = 'news' AND un.id IS NOT NULL)
      )
    `;
    const countResult = await pool.query(countQuery, [userId]);
    console.log(`Unread Count (via SQL): ${countResult.rows[0].count}`);

    // 3. Check List (Raw Query)
    const listQuery = `
      SELECT n.*, u.username as actor_username
      FROM notifications n
      LEFT JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 20 OFFSET 0
    `;
    const listResult = await pool.query(listQuery, [userId]);
    console.log(`List Count (via SQL): ${listResult.rows.length}`);
    console.log("Notifications List:", JSON.stringify(listResult.rows, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}

debugNotifications();

