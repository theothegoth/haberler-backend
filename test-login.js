    try {
      const { login } = require('./controllers/authController');
      console.log('✅ AuthController loaded successfully');

      const { JWT_SECRET } = require('./middleware/auth');
      console.log('ℹ️  JWT_SECRET is:', typeof JWT_SECRET === 'string' ? 'Present' : 'MISSING');

      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ foo: 'bar' }, JWT_SECRET || 'secret');
      console.log('✅ JWT Sign test passed');
    } catch (e) {
      console.error('❌ ERROR:', e.message);
      console.error(e.stack);
    }
