const request = require('supertest');
const express = require('express');
const pool = require('../../config/database');
const authRoutes = require('../../routes/authRoutes');
const newsRoutes = require('../../routes/newsRoutes');

// Create a minimal Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);

describe('News API Integration Tests', () => {
  let testUser = {
    username: '',
    email: '',
    password: 'Test123!@#'
  };
  let authToken = '';
  let userId = null;
  let newsId = null;

  beforeAll(async () => {
    // Generate unique test credentials and create user
    const timestamp = Date.now();
    testUser.username = `newstest${timestamp}`;
    testUser.email = `newstest${timestamp}@test.com`;

    // Register test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    userId = registerResponse.body.user.id;
    authToken = registerResponse.body.token;
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

  describe('POST /api/news', () => {
    it('should create a news article with valid data', async () => {
      const newsData = {
        title: 'Test News Article',
        content: '<p>This is a test news article content.</p>',
        category: 'Technology'
      };

      const response = await request(app)
        .post('/api/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newsData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', newsData.title);
      expect(response.body).toHaveProperty('content', newsData.content);
      expect(response.body).toHaveProperty('user_id', userId);

      // Save for cleanup and future tests
      newsId = response.body.id;
    });

    it('should reject creation without authentication', async () => {
      const newsData = {
        title: 'Test News Article',
        content: '<p>This is a test news article content.</p>'
      };

      const response = await request(app)
        .post('/api/news')
        .send(newsData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject creation with missing title', async () => {
      const newsData = {
        content: '<p>This is a test news article content.</p>'
      };

      const response = await request(app)
        .post('/api/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newsData)
        .expect('Content-Type', /json/);

      // Should return 400 or 500 (depending on validation)
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject creation with missing content', async () => {
      const newsData = {
        title: 'Test News Article'
      };

      const response = await request(app)
        .post('/api/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newsData)
        .expect('Content-Type', /json/);

      // Should return 400 or 500 (depending on validation)
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/news/:id', () => {
    it('should get a news article by id', async () => {
      const response = await request(app)
        .get(`/api/news/${newsId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', newsId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('user_id', userId);
    });

    it('should return 404 for non-existent news', async () => {
      const response = await request(app)
        .get('/api/news/999999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/news/all', () => {
    it('should get all news articles with pagination', async () => {
      const response = await request(app)
        .get('/api/news/all?limit=10&offset=0')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/news/my/articles', () => {
    it('should get articles by authenticated user', async () => {
      const response = await request(app)
        .get('/api/news/my/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('user_id', userId);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/news/my/articles')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/news/:id', () => {
    it('should update own news article', async () => {
      const updatedData = {
        title: 'Updated Test News Article',
        content: '<p>This is updated content.</p>',
        category: 'Technology'
      };

      const response = await request(app)
        .put(`/api/news/${newsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', newsId);
      expect(response.body).toHaveProperty('title', updatedData.title);
      expect(response.body).toHaveProperty('content', updatedData.content);
    });

    it('should reject update without authentication', async () => {
      const updatedData = {
        title: 'Updated Test News Article'
      };

      const response = await request(app)
        .put(`/api/news/${newsId}`)
        .send(updatedData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent news', async () => {
      const updatedData = {
        title: 'Updated Test News Article'
      };

      const response = await request(app)
        .put('/api/news/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/news/:id/like', () => {
    it('should like a news article', async () => {
      const response = await request(app)
        .post(`/api/news/${newsId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject like without authentication', async () => {
      const response = await request(app)
        .post(`/api/news/${newsId}/like`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/news/:id/like', () => {
    it('should unlike a news article', async () => {
      const response = await request(app)
        .delete(`/api/news/${newsId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject unlike without authentication', async () => {
      const response = await request(app)
        .delete(`/api/news/${newsId}/like`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/news/search', () => {
    it('should search news articles by query', async () => {
      const response = await request(app)
        .get('/api/news/search?q=Test')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(app)
        .get('/api/news/search?q=nonexistentkeyword12345')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('DELETE /api/news/:id', () => {
    it('should delete own news article', async () => {
      const response = await request(app)
        .delete(`/api/news/${newsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Mark as deleted for cleanup purposes
      newsId = null;
    });

    it('should reject deletion without authentication', async () => {
      // Create another article for this test
      const newsData = {
        title: 'Test News for Deletion',
        content: '<p>Test content</p>'
      };

      const createResponse = await request(app)
        .post('/api/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newsData);

      const tempNewsId = createResponse.body.id;

      const response = await request(app)
        .delete(`/api/news/${tempNewsId}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');

      // Clean up
      await pool.query('DELETE FROM user_news WHERE id = $1', [tempNewsId]);
    });

    it('should return 404 for non-existent news', async () => {
      const response = await request(app)
        .delete('/api/news/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
