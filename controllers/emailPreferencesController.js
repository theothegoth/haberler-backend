const pool = require('../config/database');

// Get user's email preferences
const getEmailPreferences = async (req, res) => {
  try {
    // Support both old tokens (userId) and new tokens (id) for backward compatibility
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      console.error('User ID not found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(
      'SELECT weekly_digest, new_follower, new_comment, new_like, updated_at FROM email_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences if they don't exist
      const insertResult = await pool.query(
        `INSERT INTO email_preferences (user_id, weekly_digest, new_follower, new_comment, new_like)
         VALUES ($1, true, true, true, false)
         RETURNING weekly_digest, new_follower, new_comment, new_like, updated_at`,
        [userId]
      );
      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting email preferences:', error);
    res.status(500).json({ error: 'Failed to get email preferences' });
  }
};

// Update user's email preferences
const updateEmailPreferences = async (req, res) => {
  try {
    // Support both old tokens (userId) and new tokens (id) for backward compatibility
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      console.error('User ID not found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { weekly_digest, new_follower, new_comment, new_like } = req.body;

    // Validate boolean values
    if (typeof weekly_digest !== 'boolean' ||
        typeof new_follower !== 'boolean' ||
        typeof new_comment !== 'boolean' ||
        typeof new_like !== 'boolean') {
      return res.status(400).json({ error: 'All preferences must be boolean values' });
    }

    const result = await pool.query(
      `INSERT INTO email_preferences (user_id, weekly_digest, new_follower, new_comment, new_like)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         weekly_digest = $2,
         new_follower = $3,
         new_comment = $4,
         new_like = $5,
         updated_at = CURRENT_TIMESTAMP
       RETURNING weekly_digest, new_follower, new_comment, new_like, updated_at`,
      [userId, weekly_digest, new_follower, new_comment, new_like]
    );

    res.json({
      message: 'Email preferences updated successfully',
      preferences: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
};

// Check if user has specific notification enabled
const checkPreference = async (userId, preferenceType) => {
  try {
    const result = await pool.query(
      `SELECT ${preferenceType} FROM email_preferences WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default value if preferences don't exist
      const defaults = {
        weekly_digest: true,
        new_follower: true,
        new_comment: true,
        new_like: false
      };
      return defaults[preferenceType] !== undefined ? defaults[preferenceType] : false;
    }

    return result.rows[0][preferenceType];
  } catch (error) {
    console.error('Error checking preference:', error);
    return false;
  }
};

// Get all users with weekly digest enabled
const getUsersWithWeeklyDigest = async () => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email
       FROM users u
       JOIN email_preferences ep ON u.id = ep.user_id
       WHERE ep.weekly_digest = true AND u.email IS NOT NULL`
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting users with weekly digest:', error);
    return [];
  }
};

module.exports = {
  getEmailPreferences,
  updateEmailPreferences,
  checkPreference,
  getUsersWithWeeklyDigest
};
