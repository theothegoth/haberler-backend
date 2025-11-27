#!/bin/bash
# Script to deploy cache invalidation fixes to server
# Run this from your local machine: ssh root@159.223.232.158 'bash -s' < deploy-cache-fix.sh

echo "Deploying cache invalidation fixes..."

cd /root/haber-backend || exit 1

# Backup current files
echo "Creating backups..."
cp config/cache.js config/cache.js.bak.$(date +%Y%m%d_%H%M%S)
cp controllers/articleVideoController.js controllers/articleVideoController.js.bak.$(date +%Y%m%d_%H%M%S)
cp controllers/articleImageController.js controllers/articleImageController.js.bak.$(date +%Y%m%d_%H%M%S)
cp controllers/newsController.js controllers/newsController.js.bak.$(date +%Y%m%d_%H%M%S)

echo "Backups created. Please manually update the files with the new code, then run:"
echo "cd /root && docker-compose up -d --build backend"

