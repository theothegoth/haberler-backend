const pool = require('../../config/database');

// Get all users with pagination and search
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role && (role === 'admin' || role === 'user')) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get users
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT
        u.id, u.username, u.email, u.role, u.country_code, u.created_at, u.email_verified,
        u.profile_picture, u.bio, u.is_banned, u.banned_at, u.ban_reason,
        (SELECT COUNT(*) FROM user_news WHERE user_id = u.id) as article_count,
        (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count,
        (SELECT COUNT(*) FROM news_likes WHERE user_id = u.id) as like_count
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      users: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user details by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        u.id, u.username, u.email, u.role, u.country_code, u.created_at, u.email_verified,
        u.profile_picture, u.bio, u.is_banned, u.banned_at, u.ban_reason,
        (SELECT COUNT(*) FROM user_news WHERE user_id = u.id) as article_count,
        (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count,
        (SELECT COUNT(*) FROM news_likes WHERE user_id = u.id) as like_count,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM user_follows WHERE followed_id = u.id) as followers_count
       FROM users u
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's recent articles
    const articlesResult = await pool.query(
      `SELECT id, title, category, created_at,
              (SELECT COUNT(*) FROM news_likes WHERE news_id = id) as like_count,
              (SELECT COUNT(*) FROM comments WHERE news_id = id) as comment_count
       FROM user_news
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [id]
    );

    // Get user's recent comments
    const commentsResult = await pool.query(
      `SELECT c.id, c.content, c.created_at, un.title as article_title, un.id as article_id
       FROM comments c
       JOIN user_news un ON c.news_id = un.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT 5`,
      [id]
    );

    res.json({
      user: result.rows[0],
      recentArticles: articlesResult.rows,
      recentComments: commentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// Ban/unban user
const toggleUserBan = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Prevent admin from banning themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot ban yourself' });
    }

    // Get current ban status and role
    const userResult = await pool.query(
      'SELECT is_banned, username, role FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from banning other admins
    if (userResult.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'You cannot ban other administrators' });
    }

    const currentStatus = userResult.rows[0].is_banned;
    const newStatus = !currentStatus;

    // Update ban status
    let result;
    if (newStatus) {
      // Banning user
      result = await pool.query(
        `UPDATE users
         SET is_banned = $1, banned_at = NOW(), banned_by = $2, ban_reason = $3
         WHERE id = $4
         RETURNING id, username, email, is_banned, banned_at, ban_reason`,
        [newStatus, req.user.id, reason || 'No reason provided', id]
      );
    } else {
      // Unbanning user
      result = await pool.query(
        `UPDATE users
         SET is_banned = $1, banned_at = NULL, banned_by = NULL, ban_reason = NULL
         WHERE id = $2
         RETURNING id, username, email, is_banned`,
        [newStatus, id]
      );
    }

    res.json({
      message: newStatus ? 'User banned successfully' : 'User unbanned successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling user ban:', error);
    res.status(500).json({ error: 'Failed to update user ban status' });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    // Prevent admin from demoting themselves
    if (req.user.id === parseInt(id) && role === 'user') {
      return res.status(400).json({ error: 'You cannot demote yourself from admin' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Delete user (soft delete by banning permanently)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // TODO: Implement actual user deletion or soft delete when ban system is added
    // For now, return not implemented
    return res.status(501).json({ error: 'User deletion not yet implemented' });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  toggleUserBan,
  updateUserRole,
  deleteUser
};
