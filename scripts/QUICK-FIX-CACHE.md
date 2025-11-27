# Quick Fix for Cache Issues

## The Problem
When you delete an image and add a video (or vice versa), the old thumbnail still shows on the article card.

## The Solution

### Step 1: Run the aggressive fix script on your server

**Copy this command and run it on your server via SSH:**

```bash
cd /root/haber-backend && python3 << 'ENDPYTHON'
import os, re

# Update articleVideoController.js - make cache clearing more aggressive
filepath = '/root/haber-backend/controllers/articleVideoController.js'
with open(filepath, 'r') as f:
    content = f.read()

# Replace cache invalidation to clear MORE caches
content = re.sub(
    r"deleteCachePattern\('news:feed:\*'\)",
    "deleteCachePattern('news:feed:*'),\n        deleteCachePattern('api:/api/news/my-articles*'),\n        deleteCachePattern('api:/api/news/feed*')",
    content
)

with open(filepath, 'w') as f:
    f.write(content)
print("✓ articleVideoController.js updated")

# Update articleImageController.js
filepath = '/root/haber-backend/controllers/articleImageController.js'
with open(filepath, 'r') as f:
    content = f.read()

content = re.sub(
    r"deleteCachePattern\('news:feed:\*'\)",
    "deleteCachePattern('news:feed:*'),\n        deleteCachePattern('api:/api/news/my-articles*'),\n        deleteCachePattern('api:/api/news/feed*')",
    content
)

with open(filepath, 'w') as f:
    f.write(content)
print("✓ articleImageController.js updated")

print("\nDone! Now rebuild: cd /root && docker-compose up -d --build backend")
ENDPYTHON
```

### Step 2: Rebuild the backend

```bash
cd /root
docker-compose up -d --build backend
```

### Step 3: Clear Redis cache manually (for immediate fix)

```bash
# Connect to Redis container
docker exec -it haber-backend-redis-1 redis-cli

# Then inside Redis, run:
FLUSHALL
exit
```

### Step 4: Clear browser cache

- **Chrome/Edge**: Press `Ctrl+Shift+Delete`, select "Cached images and files", click "Clear data"
- **Firefox**: Press `Ctrl+Shift+Delete`, select "Cache", click "Clear Now"

### Step 5: Test

1. Delete an image from an article
2. Add a video
3. **Hard refresh** the page: `Ctrl+Shift+R` (or `Ctrl+F5`)
4. Go to "My Articles" page
5. The thumbnail should now show the video thumbnail

## If It Still Doesn't Work

Check the backend logs to see if cache is being cleared:

```bash
docker-compose logs -f backend | grep CACHE
```

You should see messages like:
```
[CACHE] Deleted X keys matching pattern: user:Y:articles:*
[CACHE] Cleared X cache patterns for article Z
```

If you don't see these messages, the cache isn't being cleared properly.

