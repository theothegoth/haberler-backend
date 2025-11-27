#!/usr/bin/env python3
"""
Script to fix cache invalidation issues on the server.
Run this on the server: python3 fix-cache-server.py
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
    """Update cache.js with improved functions"""
    filepath = os.path.join(BACKEND_DIR, 'config/cache.js')
    
    if not os.path.exists(filepath):
        print(f"✗ File not found: {filepath}")
        return False
    
    backup_file(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Update deleteCachePattern to use SCAN
    new_delete_cache_pattern = '''async function deleteCachePattern(pattern) {
  if (!isRedisConnected || !redisClient) {
    return 0;
  }

  try {
    // Use SCAN instead of KEYS for better performance
    const keys = [];
    let cursor = 0;
    
    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`[CACHE] Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }
    return keys.length;
  } catch (error) {
    console.error('[REDIS] Delete pattern error:', error.message);
    // Fallback to KEYS if SCAN fails
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`[CACHE] Deleted ${keys.length} keys (fallback) matching pattern: ${pattern}`);
        return keys.length;
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
    return 0;
  }

  try {
    const pattern = `user:${userId}:articles:*`;
    return await deleteCachePattern(pattern);
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
        print("✓ config/cache.js updated")
        return True
    else:
        print("- config/cache.js already up to date")
        return False

def update_controller(filepath, name):
    """Update a controller file to use deleteUserArticleCaches"""
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
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ {name} updated")
        return True
    else:
        print(f"- {name} already up to date")
        return False

def main():
    print("=== Fixing Cache Issues on Server ===")
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
    
    print("")
    print("=== Done! ===")
    print("Next step: Rebuild the backend container")
    print("Run: cd /root && docker-compose up -d --build backend")

if __name__ == '__main__':
    main()

