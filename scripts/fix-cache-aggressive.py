#!/usr/bin/env python3
"""
Aggressive cache fix - ensures all caches are cleared properly
Run this on the server: python3 fix-cache-aggressive.py
"""

import os
import re
import shutil
from datetime import datetime

BACKEND_DIR = '/root/haber-backend'
BACKUP_DIR = f'/root/haber-backend-backups/{datetime.now().strftime("%Y%m%d_%H%M%S")}'

def backup_file(filepath):
    """Create backup of a file"""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    filename = os.path.basename(filepath)
    backup_path = os.path.join(BACKUP_DIR, filename)
    shutil.copy2(filepath, backup_path)
    print(f"  ✓ Backed up {filename}")

def update_cache_js():
    """Update cache.js with improved functions and better logging"""
    filepath = os.path.join(BACKEND_DIR, 'config/cache.js')
    
    if not os.path.exists(filepath):
        print(f"✗ File not found: {filepath}")
        return False
    
    backup_file(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Update deleteCachePattern to use SCAN with better logging
    new_delete_cache_pattern = '''async function deleteCachePattern(pattern) {
  if (!isRedisConnected || !redisClient) {
    console.log(`[CACHE] Redis not connected, skipping pattern: ${pattern}`);
    return 0;
  }

  try {
    // Use SCAN instead of KEYS for better performance
    const keys = [];
    let cursor = 0;
    let iterations = 0;
    const maxIterations = 1000; // Safety limit
    
    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      cursor = result.cursor;
      keys.push(...result.keys);
      iterations++;
      
      if (iterations > maxIterations) {
        console.warn(`[CACHE] Max iterations reached for pattern: ${pattern}`);
        break;
      }
    } while (cursor !== 0);

    if (keys.length > 0) {
      const deleted = await redisClient.del(keys);
      console.log(`[CACHE] Deleted ${deleted} keys matching pattern: ${pattern} (found ${keys.length} total)`);
      return deleted;
    } else {
      console.log(`[CACHE] No keys found matching pattern: ${pattern}`);
      return 0;
    }
  } catch (error) {
    console.error('[REDIS] Delete pattern error:', error.message);
    // Fallback to KEYS if SCAN fails
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        const deleted = await redisClient.del(keys);
        console.log(`[CACHE] Deleted ${deleted} keys (fallback) matching pattern: ${pattern}`);
        return deleted;
      }
    } catch (fallbackError) {
      console.error('[REDIS] Fallback delete pattern error:', fallbackError.message);
    }
    return 0;
  }
}'''
    
    # Replace deleteCachePattern function
    pattern = r'async function deleteCachePattern\(pattern\) \{.*?\n\}'
    content = re.sub(pattern, new_delete_cache_pattern, content, flags=re.DOTALL)
    
    # Add deleteUserArticleCaches function if not exists
    if 'deleteUserArticleCaches' not in content:
        user_cache_func = '''
/**
 * Delete all cache entries for a user's articles (all limit/offset variations)
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of keys deleted
 */
async function deleteUserArticleCaches(userId) {
  if (!isRedisConnected || !redisClient) {
    console.log(`[CACHE] Redis not connected, skipping user article caches for userId: ${userId}`);
    return 0;
  }

  try {
    const pattern = `user:${userId}:articles:*`;
    const deleted = await deleteCachePattern(pattern);
    console.log(`[CACHE] Cleared ${deleted} cache entries for user ${userId} articles`);
    return deleted;
  } catch (error) {
    console.error('[REDIS] Delete user article caches error:', error.message);
    return 0;
  }
}
'''
        # Insert before module.exports
        content = content.replace('module.exports = {', user_cache_func + '\nmodule.exports = {')
    
    # Update module.exports to include deleteUserArticleCaches
    if 'deleteUserArticleCaches,' not in content:
        content = content.replace(
            '  deleteCachePattern,',
            '  deleteCachePattern,\n  deleteUserArticleCaches,'
        )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print("✓ config/cache.js updated with aggressive cache clearing")
        return True
    else:
        print("- config/cache.js already up to date")
        return False

def update_controller(filepath, name):
    """Update a controller file to use deleteUserArticleCaches and add better cache clearing"""
    if not os.path.exists(filepath):
        print(f"✗ File not found: {filepath}")
        return False
    
    backup_file(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Add import if not present
    if 'deleteUserArticleCaches' not in content:
        content = content.replace(
            "const { deleteCachePattern, deleteCache } = require('../config/cache');",
            "const { deleteCachePattern, deleteCache, deleteUserArticleCaches } = require('../config/cache');"
        )
        # Also handle single import
        content = content.replace(
            "const { deleteCachePattern } = require('../config/cache');",
            "const { deleteCachePattern, deleteUserArticleCaches } = require('../config/cache');"
        )
    
    # Replace deleteCachePattern(`user:${userId}:articles:*`) with deleteUserArticleCaches(userId)
    replacements = [
        (r"deleteCachePattern\(`user:\$\{userId\}:articles:\*`\)", "deleteUserArticleCaches(userId)"),
        (r"deleteCachePattern\('user:\$\{userId\}:articles:\*'\)", "deleteUserArticleCaches(userId)"),
        (r'deleteCachePattern\("user:\$\{userId\}:articles:\*"\)', "deleteUserArticleCaches(userId)"),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    # Ensure we're awaiting the cache clearing and add a small delay to ensure it completes
    # This is a more aggressive approach - wait for cache to clear before responding
    if 'Promise.allSettled' in content:
        # Add logging to cache invalidation
        content = re.sub(
            r'await Promise\.allSettled\(\[(.*?)\]\)\.catch\(err => console\.error\(.*?\)\);',
            r'''await Promise.allSettled([
\1
]).then(results => {
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`[CACHE] Invalidation completed: ${successful} successful, ${failed} failed`);
}).catch(err => console.error('[CACHE] Invalidation error:', err));''',
            content,
            flags=re.DOTALL
        )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ {name} updated")
        return True
    else:
        print(f"- {name} already up to date")
        return False

def main():
    print("=== Aggressive Cache Fix ===")
    print("This will update cache clearing to be more thorough and add logging")
    print("")
    
    if not os.path.exists(BACKEND_DIR):
        print(f"✗ Backend directory not found: {BACKEND_DIR}")
        return
    
    print("Creating backups...")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    print(f"✓ Backups will be saved to: {BACKUP_DIR}")
    print("")
    
    # Update cache.js
    print("Updating config/cache.js...")
    update_cache_js()
    print("")
    
    # Update controllers
    print("Updating controllers...")
    controllers = [
        ('controllers/articleVideoController.js', 'articleVideoController.js'),
        ('controllers/articleImageController.js', 'articleImageController.js'),
        ('controllers/newsController.js', 'newsController.js'),
    ]
    
    for rel_path, name in controllers:
        filepath = os.path.join(BACKEND_DIR, rel_path)
        update_controller(filepath, name)
    
    # Also update cache middleware to add cache-control headers
    print("Updating cache middleware to add cache-control headers...")
    middleware_path = os.path.join(BACKEND_DIR, 'middleware/cacheMiddleware.js')
    if os.path.exists(middleware_path):
        backup_file(middleware_path)
        with open(middleware_path, 'r') as f:
            middleware_content = f.read()
        
        # Add cache-control headers to prevent browser caching
        if 'Cache-Control' not in middleware_content:
            # Update the res.json override to add headers
            old_json_override = r'res\.json = function \(data\) \{.*?return originalJson\(data\);'
            new_json_override = '''res.json = function (data) {
        // Add cache-control headers to prevent browser caching
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, data, ttl).catch(err => {
            console.error('[CACHE] Error setting cache:', err.message);
          });
        }
        return originalJson(data);
      };'''
            middleware_content = re.sub(old_json_override, new_json_override, middleware_content, flags=re.DOTALL)
            
            # Also add headers when returning cached data
            if 'if (cachedData)' in middleware_content:
                middleware_content = middleware_content.replace(
                    'if (cachedData) {\n        return res.json(cachedData);',
                    '''if (cachedData) {
        // Add cache-control headers even for cached responses
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        return res.json(cachedData);'''
                )
            
            with open(middleware_path, 'w') as f:
                f.write(middleware_content)
            print("✓ cacheMiddleware.js updated with cache-control headers")
        else:
            print("- cacheMiddleware.js already has cache-control headers")
    
    print("")
    print("=== Done! ===")
    print("Next steps:")
    print("1. Rebuild the backend: cd /root && docker-compose up -d --build backend")
    print("2. Check logs: docker-compose logs -f backend")
    print("3. When you delete image/add video, check logs for '[CACHE]' messages")
    print("4. Clear browser cache (Ctrl+Shift+Delete) and test again")
    print("")
    print("IMPORTANT: After rebuilding, do a hard refresh:")
    print("  - Chrome/Edge: Ctrl+Shift+R or Ctrl+F5")
    print("  - Firefox: Ctrl+Shift+R")

if __name__ == '__main__':
    main()

