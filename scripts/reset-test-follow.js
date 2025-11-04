const pool = require('../config/database');

async function resetTestFollow() {
  try {
    console.log('Resetting test follow relationship...');

    // Delete the follow relationship between testuser2 (18) and Theodorich (16)
    const result = await pool.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND followed_id = $2 RETURNING *',
      [18, 16]
    );

    if (result.rowCount > 0) {
      console.log(`Deleted ${result.rowCount} follow relationship(s)`);
      console.log('You can now test the follow feature again with the correct notification code');
    } else {
      console.log('No matching follow relationship found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetTestFollow();
