const pool = require('../../config/database');

// Get all reports with pagination and filters
const getAllReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = '', status = 'pending' } = req.query;
    const offset = (page - 1) * limit;

    let conditions = ['r.status = $1'];
    let params = [status];
    let paramIndex = 2;

    if (type && ['article', 'comment', 'user'].includes(type)) {
      conditions.push(`r.reported_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM reports r ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get reports
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT
        r.*,
        reporter.username as reporter_username,
        reporter.email as reporter_email,
        CASE
          WHEN r.reported_type = 'article' THEN un.title
          WHEN r.reported_type = 'comment' THEN c.content
          WHEN r.reported_type = 'user' THEN reported_user.username
        END as reported_content_preview,
        CASE
          WHEN r.reported_type = 'article' THEN author.username
          WHEN r.reported_type = 'comment' THEN comment_author.username
          WHEN r.reported_type = 'user' THEN reported_user.username
        END as content_author_username
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       LEFT JOIN user_news un ON r.reported_type = 'article' AND r.reported_id = un.id
       LEFT JOIN users author ON un.user_id = author.id
       LEFT JOIN comments c ON r.reported_type = 'comment' AND r.reported_id = c.id
       LEFT JOIN users comment_author ON c.user_id = comment_author.id
       LEFT JOIN users reported_user ON r.reported_type = 'user' AND r.reported_id = reported_user.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      reports: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Get report by ID with full details
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        r.*,
        reporter.username as reporter_username,
        reporter.email as reporter_email,
        reporter.id as reporter_id
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];
    let reportedContent = null;

    // Get reported content details based on type
    if (report.reported_type === 'article') {
      const articleResult = await pool.query(
        `SELECT un.*, u.username as author_username, u.email as author_email
         FROM user_news un
         JOIN users u ON un.user_id = u.id
         WHERE un.id = $1`,
        [report.reported_id]
      );
      reportedContent = articleResult.rows[0];
    } else if (report.reported_type === 'comment') {
      const commentResult = await pool.query(
        `SELECT c.*, u.username as author_username, u.email as author_email,
                un.title as article_title, un.id as article_id
         FROM comments c
         JOIN users u ON c.user_id = u.id
         JOIN user_news un ON c.news_id = un.id
         WHERE c.id = $1`,
        [report.reported_id]
      );
      reportedContent = commentResult.rows[0];
    } else if (report.reported_type === 'user') {
      const userResult = await pool.query(
        `SELECT id, username, email, bio, created_at,
                (SELECT COUNT(*) FROM user_news WHERE user_id = users.id) as article_count,
                (SELECT COUNT(*) FROM comments WHERE user_id = users.id) as comment_count
         FROM users
         WHERE id = $1`,
        [report.reported_id]
      );
      reportedContent = userResult.rows[0];
    }

    res.json({
      report,
      reportedContent
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({ error: 'Failed to fetch report details' });
  }
};

// Update report status (dismiss or resolve)
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action, adminNotes } = req.body;

    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update report status
    const result = await pool.query(
      `UPDATE reports
       SET status = $1, admin_notes = $2, resolved_at = CASE WHEN $1 != 'pending' THEN NOW() ELSE NULL END
       WHERE id = $3
       RETURNING *`,
      [status, adminNotes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];

    // If resolved with action, take the appropriate action
    if (status === 'resolved' && action) {
      if (action === 'delete_content') {
        if (report.reported_type === 'article') {
          await pool.query('DELETE FROM user_news WHERE id = $1', [report.reported_id]);
        } else if (report.reported_type === 'comment') {
          await pool.query('DELETE FROM comments WHERE id = $1', [report.reported_id]);
        }
      } else if (action === 'ban_user') {
        // Get the user ID of the content creator
        let userId;
        if (report.reported_type === 'article') {
          const articleResult = await pool.query('SELECT user_id FROM user_news WHERE id = $1', [report.reported_id]);
          userId = articleResult.rows[0]?.user_id;
        } else if (report.reported_type === 'comment') {
          const commentResult = await pool.query('SELECT user_id FROM comments WHERE id = $1', [report.reported_id]);
          userId = commentResult.rows[0]?.user_id;
        } else if (report.reported_type === 'user') {
          userId = report.reported_id;
        }

        // Ban the user if action is ban
        if (userId) {
          await pool.query(
            'UPDATE users SET is_banned = true, banned_at = NOW(), banned_by = $1, ban_reason = $2 WHERE id = $3',
            [req.user.id, `Banned due to resolved report: ${report.reason}`, userId]
          );
        }
      }
    }

    res.json({
      message: 'Report status updated successfully',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
};

// Get report statistics
const getReportStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM reports WHERE status = 'resolved') as resolved_reports,
        (SELECT COUNT(*) FROM reports WHERE status = 'dismissed') as dismissed_reports,
        (SELECT COUNT(*) FROM reports WHERE reported_type = 'article') as article_reports,
        (SELECT COUNT(*) FROM reports WHERE reported_type = 'comment') as comment_reports,
        (SELECT COUNT(*) FROM reports WHERE reported_type = 'user') as user_reports,
        (SELECT COUNT(*) FROM reports WHERE created_at >= NOW() - INTERVAL '7 days') as reports_this_week
    `);

    // Get top report reasons
    const topReasons = await pool.query(`
      SELECT reason, COUNT(*) as count
      FROM reports
      WHERE reason IS NOT NULL
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      stats: stats.rows[0],
      topReasons: topReasons.rows
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ error: 'Failed to fetch report statistics' });
  }
};

module.exports = {
  getAllReports,
  getReportById,
  updateReportStatus,
  getReportStats
};
