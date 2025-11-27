# Fix Cache Issues on Server

## Quick Fix Instructions

### Option 1: Copy and Run Python Script (Recommended)

1. **Copy the script to your server:**
   ```powershell
   scp C:\Users\pc\haber-backend\scripts\fix-cache-server.py root@159.223.232.158:/root/
   ```

2. **SSH into your server and run:**
   ```bash
   ssh root@159.223.232.158
   cd /root
   python3 fix-cache-server.py
   ```

3. **Rebuild the backend:**
   ```bash
   cd /root
   docker-compose up -d --build backend
   ```

### Option 2: Run Commands Directly on Server

SSH into your server and run these commands one by one:

```bash
# Navigate to backend
cd /root/haber-backend

# Create backup directory
mkdir -p /root/haber-backend-backups/$(date +%Y%m%d_%H%M%S)

# Copy the Python script content and save it as fix-cache-server.py
# Then run:
python3 fix-cache-server.py

# Rebuild backend
cd /root
docker-compose up -d --build backend
```

## What This Fix Does

1. **Improves `deleteCachePattern`** - Uses Redis SCAN instead of KEYS (better performance)
2. **Adds `deleteUserArticleCaches`** - Helper function to clear all user article cache variations
3. **Updates all controllers** - Uses the new helper function for better cache invalidation

## After Running

1. Clear your browser cache (Ctrl+Shift+Delete)
2. Remove a video from an article
3. Add an image
4. Go to "My Articles" page
5. The thumbnail should update immediately!

## Troubleshooting

If the script fails:
- Check that Python 3 is installed: `python3 --version`
- Check file permissions: `ls -la /root/haber-backend/config/cache.js`
- Check Docker is running: `docker ps`

