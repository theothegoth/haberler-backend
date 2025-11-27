const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'middleware/rateLimiter.js');

if (fs.existsSync(filePath)) {
  console.log('Reading rateLimiter.js...');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Backup
  fs.writeFileSync(filePath + '.bak_rate', content);

  // 1. Relax API Limiter (was 100, change to 300)
  // const apiLimiter = createRateLimiter(15 * 60 * 1000, 100)
  content = content.replace(
    /const apiLimiter = createRateLimiter\(\s*15 \* 60 \* 1000,\s*\/\/ 15 minutes\s*100\s*\/\/ 100 requests\s*\);/g,
    `const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  500 // INCREASED: 500 requests (was 100)
);`
  );
  
  // Try simpler replace if exact match fails
  if (!content.includes('INCREASED')) {
      content = content.replace(
        /const apiLimiter = createRateLimiter\(\s*15 \* 60 \* 1000,\s*\/\/ 15 minutes\s*100\s*\/\/ 100 requests\s*\);/s,
        `const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  500 // INCREASED: 500 requests
);`
      );
  }

  // 2. Relax Upload Limiter (was 20, change to 100)
  content = content.replace(
    /const uploadLimiter = createRateLimiter\(\s*60 \* 60 \* 1000,\s*\/\/ 1 hour\s*20,\s*\/\/ 20 uploads/s,
    `const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  100, // INCREASED: 100 uploads`
  );

  // 3. Relax Create Limiter (was 10, change to 30)
  content = content.replace(
    /const createLimiter = createRateLimiter\(\s*60 \* 1000,\s*\/\/ 1 minute\s*10,\s*\/\/ 10 creates per minute/s,
    `const createLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  30, // INCREASED: 30 creates per minute`
  );

  fs.writeFileSync(filePath, content);
  console.log('✓ Successfully relaxed rate limits');
} else {
  console.error('File not found: ' + filePath);
}

