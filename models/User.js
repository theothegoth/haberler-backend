const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  static async create({ email, password, username, countryCode = 'TR' }) {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, username, country_code) VALUES ($1, $2, $3, $4) RETURNING id, email, username, country_code, created_at',
      [email, passwordHash, username, countryCode]
    );

    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT id, email, username, bio, profile_picture, country_code, created_at, email_verified FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findPublicProfile(id) {
    const result = await pool.query(
      'SELECT id, username, bio, profile_picture, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByIdWithPassword(id) {
    const result = await pool.query(
      'SELECT id, email, username, password_hash, country_code, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  static async updateCountryCode(userId, countryCode) {
    const result = await pool.query(
      'UPDATE users SET country_code = $1 WHERE id = $2 RETURNING *',
      [countryCode, userId]
    );
    return result.rows[0];
  }

  static async setVerificationToken(userId, token, expiresIn = 24) {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiresIn);

    const result = await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3 RETURNING id, email, username',
      [token, expiryDate, userId]
    );
    return result.rows[0];
  }

  static async findByVerificationToken(token) {
    const result = await pool.query(
      'SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()',
      [token]
    );
    return result.rows[0];
  }

  static async verifyEmail(userId) {
    const result = await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1 RETURNING id, email, username, email_verified',
      [userId]
    );
    return result.rows[0];
  }

  static async isEmailVerified(userId) {
    const result = await pool.query(
      'SELECT email_verified FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.email_verified || false;
  }

  static async updateProfile(userId, { username, email, bio }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, username, bio, country_code, email_verified, created_at`,
      values
    );
    return result.rows[0];
  }

  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [passwordHash, userId]
    );
    return result.rows[0];
  }

  static async updateProfilePicture(userId, profilePictureUrl) {
    const result = await pool.query(
      'UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING id, email, username, bio, profile_picture, country_code, email_verified, created_at',
      [profilePictureUrl, userId]
    );
    return result.rows[0];
  }

  static async setResetToken(email, token, expiresIn = 1) {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiresIn);

    const result = await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3 RETURNING id, email, username',
      [token, expiryDate, email]
    );
    return result.rows[0];
  }

  static async findByResetToken(token) {
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    return result.rows[0];
  }

  static async resetPassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2 RETURNING id, email, username',
      [passwordHash, userId]
    );
    return result.rows[0];
  }
}

module.exports = User;
