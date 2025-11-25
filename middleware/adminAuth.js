const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const adminAuth = async (req, res, next) => {
  try {
    // First, verify the user is authenticated
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Get user from database to check role
    const result = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [decoded.id || decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Server error during authentication.' });
  }
};

module.exports = adminAuth;
