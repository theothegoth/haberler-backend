#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = '/root/haber-backend/controllers';

console.log('Updating cache invalidation in controllers...\n');

// Function to replace cache invalidation patterns
function updateCacheInvalidation(filePath, fileName) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern 1: Replace three separate deleteCache/deleteCachePattern calls with Promise.allSettled
    const pattern1 = /(\s+)(\/\/ Invalidate caches?[^\n]*\n)(\s+)(deleteCache\([^)]+\)\.catch\(err => console\.error\('Cache invalidation error:', err\)\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\('Cache invalidation error:', err\)\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\('Cache invalidation error:', err\)\);)/g;
    
    const replacement1 = (match, indent1, comment, indent2, line1, indent3, line2, indent4, line3) => {
      // Extract the actual cache keys from the lines
      const cache1 = line1.match(/deleteCache\(([^)]+)\)/)?.[1] || '';
      const cache2 = line2.match(/deleteCachePattern\(([^)]+)\)/)?.[1] || '';
      const cache3 = line3.match(/deleteCachePattern\(([^)]+)\)/)?.[1] || '';
      
      return `${indent1}${comment.trim()} (await to ensure completion)\n${indent1}await Promise.allSettled([\n${indent1}  deleteCache(${cache1}),\n${indent1}  deleteCachePattern(${cache2}),\n${indent1}  deleteCachePattern(${cache3})\n${indent1}]).catch(err => console.error('[CACHE] Invalidation error:', err));`;
    };

    if (pattern1.test(content)) {
      content = content.replace(pattern1, replacement1);
      modified = true;
      console.log(`  ✓ Updated multi-line cache invalidation in ${fileName}`);
    }

    // Pattern 2: Replace single deleteCache with Promise.allSettled (for updateImageCaption)
    const pattern2 = /(\s+)(const updatedImage = await ArticleImage\.updateCaption\([^)]+\);)\n(\s+)(\/\/ Invalidate caches?[^\n]*\n)(\s+)(deleteCache\([^)]+\)\.catch\(err => console\.error\('Cache invalidation error:', err\)\);)/g;
    
    const replacement2 = (match, indent1, updateLine, indent2, comment, indent3, deleteLine) => {
      const cacheKey = deleteLine.match(/deleteCache\(([^)]+)\)/)?.[1] || '';
      // Extract userId from context (it should be available in the function)
      return `${indent1}${updateLine}\n${indent1}${comment.trim()} (await to ensure completion)\n${indent1}await Promise.allSettled([\n${indent1}  deleteCache(${cacheKey}),\n${indent1}  deleteCachePattern(\`user:\${userId}:articles:*\`),\n${indent1}  deleteCachePattern('news:feed:*')\n${indent1}]).catch(err => console.error('[CACHE] Invalidation error:', err));`;
    };

    if (pattern2.test(content)) {
      content = content.replace(pattern2, replacement2);
      modified = true;
      console.log(`  ✓ Updated single cache invalidation in ${fileName}`);
    }

    // Pattern 3: Handle deleteNews with 4 cache invalidation calls
    const pattern3 = /(\s+)(\/\/ Invalidate relevant caches?\n)(\s+)(deleteCache\([^)]+\)\.catch\(err => console\.error\('Cache invalidation error:', err\)\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\('Cache invalidation error:', err\)\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\('Cache invalidation error:', err\)\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\('Cache invalidation error:', err\)\);)/g;
    
    const replacement3 = (match, indent1, comment, indent2, line1, indent3, line2, indent4, line3, indent5, line4) => {
      const cache1 = line1.match(/deleteCache\(([^)]+)\)/)?.[1] || '';
      const cache2 = line2.match(/deleteCachePattern\(([^)]+)\)/)?.[1] || '';
      const cache3 = line3.match(/deleteCachePattern\(([^)]+)\)/)?.[1] || '';
      const cache4 = line4.match(/deleteCachePattern\(([^)]+)\)/)?.[1] || '';
      
      return `${indent1}${comment.trim()} (await to ensure completion)\n${indent1}await Promise.allSettled([\n${indent1}  deleteCache(${cache1}),\n${indent1}  deleteCachePattern(${cache2}),\n${indent1}  deleteCachePattern(${cache3}),\n${indent1}  deleteCachePattern(${cache4})\n${indent1}]).catch(err => console.error('[CACHE] Invalidation error:', err));`;
    };

    if (pattern3.test(content)) {
      content = content.replace(pattern3, replacement3);
      modified = true;
      console.log(`  ✓ Updated 4-line cache invalidation in ${fileName}`);
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ✗ Error updating ${fileName}:`, error.message);
    return false;
  }
}

// Update each controller file
const files = [
  'articleVideoController.js',
  'articleImageController.js',
  'newsController.js'
];

let updatedCount = 0;

files.forEach(file => {
  const filePath = path.join(BACKEND_DIR, file);
  if (fs.existsSync(filePath)) {
    if (updateCacheInvalidation(filePath, file)) {
      updatedCount++;
    } else {
      console.log(`  - No changes needed in ${file}`);
    }
  } else {
    console.error(`  ✗ File not found: ${filePath}`);
  }
});

console.log(`\n✅ Updated ${updatedCount} file(s).`);
console.log('\nNext step: Rebuild the backend container:');
console.log('  docker-compose up -d --build backend');

