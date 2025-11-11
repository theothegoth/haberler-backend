# Testing Documentation

## Overview

This document describes the testing suite for the Haber (News Platform) backend API. The testing infrastructure uses Jest and Supertest to ensure code reliability and maintainability.

## Testing Stack

- **Jest 29.7.0**: JavaScript testing framework
- **Supertest 7.1.4**: HTTP assertion library for API testing
- **Node.js**: Test environment

## Test Structure

```
__tests__/
├── setup.js                    # Global test configuration
├── unit/                       # Unit tests
│   └── validators.test.js      # Validator utility tests (32 tests)
└── integration/                # Integration tests
    ├── auth.test.js            # Authentication API tests (23 tests)
    └── news.test.js            # News/Articles API tests (21 tests)
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Auto-rerun on changes)
```bash
npm run test:watch
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Coverage

### Unit Tests (32 tests)

**File**: `__tests__/unit/validators.test.js`

Tests for utility functions in `utils/validators.js`:

- `sanitizeInput()` - 3 tests
  - HTML/script tag escaping
  - Non-string input handling
  - Special character escaping

- `sanitizeObject()` - 3 tests
  - Nested object sanitization
  - Non-object input handling
  - Non-string value preservation

- `isValidEmail()` - 2 tests
  - Valid email formats
  - Invalid email rejection

- `isValidURL()` - 3 tests
  - Valid URLs with protocols
  - URLs without protocols
  - Invalid URL rejection

- `isValidChannelId()` - 2 tests
  - Valid YouTube channel IDs
  - Invalid channel ID rejection

- `isValidVideoId()` - 2 tests
  - Valid YouTube video IDs
  - Invalid video ID rejection

- `isValidCountryCode()` - 2 tests
  - Valid ISO country codes
  - Invalid country code rejection

- `extractChannelIdFromURL()` - 5 tests
  - youtube.com/channel/ URLs
  - youtube.com/@ (handle) URLs
  - youtube.com/c/ URLs
  - youtube.com/user/ URLs
  - Invalid URL handling

- `extractVideoIdFromURL()` - 4 tests
  - youtube.com/watch URLs
  - youtu.be short URLs
  - youtube.com/embed URLs
  - Invalid URL handling

- `validatePagination()` - 6 tests
  - Default values
  - Valid page and limit parsing
  - Minimum value enforcement
  - Maximum limit enforcement
  - Invalid input handling
  - Offset calculation

### Integration Tests (44 tests)

#### Authentication API (23 tests)

**File**: `__tests__/integration/auth.test.js`

**POST /api/auth/register** (8 tests)
- ✓ Register new user with valid data
- ✓ Reject registration with missing username
- ✓ Reject registration with missing email
- ✓ Reject registration with missing password
- ✓ Reject registration with invalid email format
- ✓ Reject registration with weak password
- ✓ Reject registration with duplicate username
- ✓ Reject registration with duplicate email

**POST /api/auth/login** (5 tests)
- ✓ Login with valid credentials
- ✓ Reject login with missing email
- ✓ Reject login with missing password
- ✓ Reject login with invalid email
- ✓ Reject login with wrong password

**GET /api/auth/profile** (3 tests)
- ✓ Get user profile with valid token
- ✓ Reject request without token
- ✓ Reject request with invalid token

**PUT /api/auth/profile** (3 tests)
- ✓ Update user profile with valid data
- ✓ Reject profile update without token
- ✓ Reject profile update with invalid token

**POST /api/auth/forgot-password** (4 tests)
- ✓ Send password reset email for valid email
- ✓ Reject request with missing email
- ✓ Reject request with invalid email format
- ✓ Handle non-existent email gracefully (security)

#### News/Articles API (21 tests)

**File**: `__tests__/integration/news.test.js`

**POST /api/news** (4 tests)
- ✓ Create news article with valid data
- ✓ Reject creation without authentication
- ✓ Reject creation with missing title
- ✓ Reject creation with missing content

**GET /api/news/:id** (2 tests)
- ✓ Get news article by ID
- ✓ Return 404 for non-existent news

**GET /api/news/all** (1 test)
- ✓ Get all news articles with pagination

**GET /api/news/my/articles** (2 tests)
- ✓ Get articles by authenticated user
- ✓ Reject request without authentication

**PUT /api/news/:id** (3 tests)
- ✓ Update own news article
- ✓ Reject update without authentication
- ✓ Return 404 for non-existent news

**POST /api/news/:id/like** (2 tests)
- ✓ Like a news article
- ✓ Reject like without authentication

**DELETE /api/news/:id/like** (2 tests)
- ✓ Unlike a news article
- ✓ Reject unlike without authentication

**GET /api/news/search** (2 tests)
- ✓ Search news articles by query
- ✓ Return empty results for non-matching query

**DELETE /api/news/:id** (3 tests)
- ✓ Delete own news article
- ✓ Reject deletion without authentication
- ✓ Return 404 for non-existent news

## Test Configuration

### jest.config.js

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/config/initDatabase.js'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  verbose: true,
  testTimeout: 10000
};
```

### Test Environment

Tests run with:
- `NODE_ENV=test`
- Separate test database
- Mock console methods (optional)
- Test-specific JWT secret

## Writing New Tests

### Unit Test Example

```javascript
describe('MyFunction', () => {
  it('should handle valid input', () => {
    const result = myFunction('valid input');
    expect(result).toBe('expected output');
  });

  it('should reject invalid input', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Integration Test Example

```javascript
describe('POST /api/endpoint', () => {
  let authToken;

  beforeAll(async () => {
    // Setup: create test user and get auth token
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test', email: 'test@test.com', password: 'Test123!' });
    authToken = response.body.token;
  });

  afterAll(async () => {
    // Cleanup: remove test data
    await pool.query('DELETE FROM users WHERE email = $1', ['test@test.com']);
    await pool.end();
  });

  it('should create resource with valid data', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ data: 'test' })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data in `afterAll` or `afterEach` hooks
3. **Unique Data**: Use timestamps or random values for test data to avoid conflicts
4. **Descriptive Names**: Test names should clearly describe what they test
5. **Arrange-Act-Assert**: Follow AAA pattern in test structure
6. **Error Cases**: Always test both success and failure scenarios
7. **Authentication**: Test both authenticated and unauthenticated requests
8. **Edge Cases**: Test boundary conditions and edge cases

## Common Issues

### Database Connection

If tests fail with database connection errors:
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify test database exists

### Rate Limiting

Some endpoints have rate limiting. Tests account for this by:
- Accepting 429 status codes where appropriate
- Using separate test instances
- Spacing out requests

### Port Conflicts

Tests use port 5001 by default. If this port is in use:
- Update `PORT` in `__tests__/setup.js`
- Ensure no other services are running on that port

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: haber_db_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Future Improvements

- [ ] Add tests for comment endpoints
- [ ] Add tests for follow/unfollow functionality
- [ ] Add tests for draft management
- [ ] Add tests for notification system
- [ ] Add tests for bookmark functionality
- [ ] Add tests for user blocking
- [ ] Add tests for reporting system
- [ ] Increase code coverage to 80%+
- [ ] Add E2E tests with Playwright or Cypress
- [ ] Add performance/load testing
- [ ] Add security testing (SQL injection, XSS, etc.)

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
