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
      'SELECT id, email, username, country_code, created_at FROM users WHERE id = $1',
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
}

module.exports = User;
