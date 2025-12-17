const request = require('supertest');
const express = require('express');
const pool = require('../../config/database');
const authRoutes = require('../../routes/authRoutes');
const newsRoutes = require('../../routes/newsRoutes');
const commentRoutes = require('../../routes/commentRoutes');

// Create a minimal Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/comments', commentRoutes);

describe('Comments API Integration Tests', () => {
  let testUser = {
    username: '',
    email: '',
    password: 'Test123!@#'
  };
  let authToken = '';
  let userId = null;
  let newsId = null;
  let commentId = null;

  beforeAll(async () => {
    // Generate unique test credentials and create user
    const timestamp = Date.now();
    testUser.username = `commenttest${timestamp}`;
    testUser.email = `commenttest${timestamp}@test.com`;

    // Register test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    userId = registerResponse.body.user.id;
    authToken = registerResponse.body.token;

    // Create a test news article
    const newsResponse = await request(app)
      .post('/api/news')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Article for Comments',
        content: '<p>Test content</p>',
        category: 'Technology'
      });

    newsId = newsResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (newsId) {
        await pool.query('DELETE FROM user_news WHERE id = $1', [newsId]);
      }
      if (userId) {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await pool.end();
  });

  describe('POST /api/comments/:newsId', () => {
    it('should create a comment with valid data', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/comments/${newsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('comment');
      expect(response.body.comment).toHaveProperty('id');
      expect(response.body.comment).toHaveProperty('content', commentData.content);
      expect(response.body.comment).toHaveProperty('user_id', userId);
      expect(response.body.comment).toHaveProperty('news_id', newsId);

      // Save for future tests
      commentId = response.body.comment.id;
    });

    it('should reject comment creation without authentication', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/comments/${newsId}`)
        .send(commentData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject comment with missing content', async () => {
      const response = await request(app)
        .post(`/api/comments/${newsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject comment for non-existent news', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post('/api/comments/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect('Content-Type', /json/);

      expect([404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/comments/:newsId', () => {
    it('should get comments for a news article', async () => {
      const response = await request(app)
        .get(`/api/comments/${newsId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('username');
    });

    it('should return empty array for article with no comments', async () => {
      // Create another article without comments
      const newsResponse = await request(app)
        .post('/api/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Article Without Comments',
          content: '<p>Test content</p>',
          category: 'Technology'
        });

      const tempNewsId = newsResponse.body.id;

      const response = await request(app)
        .get(`/api/comments/${tempNewsId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);

      // Cleanup
      await pool.query('DELETE FROM user_news WHERE id = $1', [tempNewsId]);
    });
  });

  describe('POST /api/comments/:commentId/like', () => {
    let likeTestCommentId = null;

    beforeAll(async () => {
      // Create a comment for like tests
      const commentResponse = await request(app)
        .post(`/api/comments/${newsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test comment for like tests' });
      likeTestCommentId = commentResponse.body.comment.id;
    });

    afterAll(async () => {
      // Clean up like test comment
      if (likeTestCommentId) {
        await pool.query('DELETE FROM news_comments WHERE id = $1', [likeTestCommentId]);
      }
    });

    it('should like a comment', async () => {
      const response = await request(app)
        .post(`/api/comments/${likeTestCommentId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject like without authentication', async () => {
      const response = await request(app)
        .post(`/api/comments/${likeTestCommentId}/like`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-existent comment', async () => {
      const response = await request(app)
        .post('/api/comments/999999/like')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // Should return 404 or 500 (foreign key constraint error)
      expect([404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/comments/:commentId/like', () => {
    let unlikeTestCommentId = null;

    beforeAll(async () => {
      // Create a comment and like it first
      const commentResponse = await request(app)
        .post(`/api/comments/${newsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test comment for unlike tests' });
      unlikeTestCommentId = commentResponse.body.comment.id;

      // Like it
      await request(app)
        .post(`/api/comments/${unlikeTestCommentId}/like`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    afterAll(async () => {
      // Clean up unlike test comment
      if (unlikeTestCommentId) {
        await pool.query('DELETE FROM news_comments WHERE id = $1', [unlikeTestCommentId]);
      }
    });

    it('should unlike a comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${unlikeTestCommentId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject unlike without authentication', async () => {
      const response = await request(app)
        .delete(`/api/comments/${unlikeTestCommentId}/like`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    it('should delete own comment', async () => {
      // Create a fresh comment for this test
      const commentResponse = await request(app)
        .post(`/api/comments/${newsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test comment for deletion' });

      const deleteCommentId = commentResponse.body.comment.id;

      const response = await request(app)
        .delete(`/api/comments/${deleteCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject deletion without authentication', async () => {
      // Create another comment for this test
      const commentResponse = await request(app)
        .post(`/api/comments/${newsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test comment for deletion' });

      const tempCommentId = commentResponse.body.id;

      const response = await request(app)
        .delete(`/api/comments/${tempCommentId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');

      // Cleanup
      await pool.query('DELETE FROM news_comments WHERE id = $1', [tempCommentId]);
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .delete('/api/comments/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
