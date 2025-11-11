const pool = require('../config/database');

class Report {
  // Create a new report
  static async create(reporterId, reportedType, reportedId, reason, description = null) {
    try {
      const result = await pool.query(
        `INSERT INTO reports (reporter_id, reported_type, reported_id, reason, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [reporterId, reportedType, reportedId, reason, description]
      );
      return result.rows[0];
    } catch (err) {
      // If unique constraint violation (already reported)
      if (err.code === '23505') {
        throw new Error('You have already reported this content');
      }
      throw err;
    }
  }

  // Get all reports (for admin)
  static async getAll(status = null, limit = 50, offset = 0) {
    let query = `
      SELECT
        r.*,
        reporter.username as reporter_username,
        reviewer.username as reviewer_username
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
    `;

    const params = [];
    if (status) {
      query += ' WHERE r.status = $1';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get report count by status (for admin dashboard)
  static async getCountByStatus() {
    const result = await pool.query(
      `SELECT status, COUNT(*)::int as count
       FROM reports
       GROUP BY status`
    );

    const counts = {
      pending: 0,
      reviewed: 0,
      action_taken: 0,
      dismissed: 0
    };

    result.rows.forEach(row => {
      counts[row.status] = row.count;
    });

    return counts;
  }

  // Get a single report by ID (for admin)
  static async getById(reportId) {
    const result = await pool.query(
      `SELECT
        r.*,
        reporter.username as reporter_username,
        reporter.email as reporter_email,
        reviewer.username as reviewer_username
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
       WHERE r.id = $1`,
      [reportId]
    );
    return result.rows[0] || null;
  }

  // Get reported content details
  static async getReportedContent(reportedType, reportedId) {
    if (reportedType === 'article') {
      const result = await pool.query(
        `SELECT
          un.id,
          un.title,
          LEFT(un.content, 500) as content_preview,
          un.user_id,
          u.username as author_username,
          un.created_at
         FROM user_news un
         JOIN users u ON un.user_id = u.id
         WHERE un.id = $1`,
        [reportedId]
      );
      return result.rows[0] || null;
    } else if (reportedType === 'comment') {
      const result = await pool.query(
        `SELECT
          c.id,
          c.content,
          c.user_id,
          u.username as author_username,
          c.news_id,
          c.created_at
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = $1`,
        [reportedId]
      );
      return result.rows[0] || null;
    } else if (reportedType === 'user') {
      const result = await pool.query(
        `SELECT
          u.id,
          u.username,
          u.email,
          u.created_at,
          (SELECT COUNT(*)::int FROM user_news WHERE user_id = u.id) as article_count,
          (SELECT COUNT(*)::int FROM comments WHERE user_id = u.id) as comment_count
         FROM users u
         WHERE u.id = $1`,
        [reportedId]
      );
      return result.rows[0] || null;
    }
    return null;
  }

  // Update report status (for admin)
  static async updateStatus(reportId, status, reviewedBy, adminNotes = null) {
    const result = await pool.query(
      `UPDATE reports
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           admin_notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, reviewedBy, adminNotes, reportId]
    );
    return result.rows[0] || null;
  }

  // Get reports by user (for checking if user already reported)
  static async getByReporter(reporterId, limit = 20) {
    const result = await pool.query(
      `SELECT * FROM reports
       WHERE reporter_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [reporterId, limit]
    );
    return result.rows;
  }

  // Delete a report
  static async delete(reportId) {
    const result = await pool.query(
      'DELETE FROM reports WHERE id = $1 RETURNING *',
      [reportId]
    );
    return result.rows[0] || null;
  }
}

module.exports = Report;
