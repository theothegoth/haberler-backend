#!/bin/bash
# Quick fix script - run this on your server
# SSH: ssh root@159.223.232.158
# Then: bash <(curl -s) OR copy-paste this entire script

echo "Checking and fixing cache invalidation..."

cd /root/haber-backend/controllers || exit 1

# Check if Promise.allSettled is already used
if grep -q "Promise.allSettled" articleVideoController.js articleImageController.js newsController.js 2>/dev/null; then
    echo "✓ Cache invalidation already updated!"
    echo "Rebuilding backend..."
    cd /root && docker-compose up -d --build backend
    exit 0
fi

echo "Updating files..."

# Backup
cp articleVideoController.js articleVideoController.js.bak.$(date +%Y%m%d_%H%M%S)
cp articleImageController.js articleImageController.js.bak.$(date +%Y%m%d_%H%M%S)
cp newsController.js newsController.js.bak.$(date +%Y%m%d_%H%M%S)

# Simple Python one-liner to fix
python3 << 'PYEOF'
import re, os

def fix(content):
    # Replace 3 separate deleteCache calls with Promise.allSettled
    pattern = r'(\s+)(// Invalidate[^\n]*)\n(\s+)(deleteCache\([^)]+\)\.catch\([^)]+\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\([^)]+\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\([^)]+\);)'
    
    def repl(m):
        indent = m.group(1)
        comment = m.group(2).strip()
        d1, d2, d3 = m.group(4), m.group(6), m.group(8)
        k1 = re.search(r'deleteCache\(([^)]+)\)', d1).group(1)
        k2 = re.search(r'deleteCachePattern\(([^)]+)\)', d2).group(1)
        k3 = re.search(r'deleteCachePattern\(([^)]+)\)', d3).group(1)
        return f'{indent}{comment} (await to ensure completion)\n{indent}await Promise.allSettled([\n{indent}  deleteCache({k1}),\n{indent}  deleteCachePattern({k2}),\n{indent}  deleteCachePattern({k3})\n{indent}]).catch(err => console.error("[CACHE] Invalidation error:", err));'
    
    content = re.sub(pattern, repl, content, flags=re.MULTILINE)
    
    # Single deleteCache (updateImageCaption)
    pattern2 = r'(\s+)(const updatedImage = await ArticleImage\.updateCaption\([^)]+\);)\n(\s+)(// Invalidate[^\n]*)\n(\s+)(deleteCache\([^)]+\)\.catch\([^)]+\);)'
    def repl2(m):
        indent, update, _, comment, _, d = m.groups()
        k = re.search(r'deleteCache\(([^)]+)\)', d).group(1)
        return f'{indent}{update}\n{indent}{comment.strip()} (await to ensure completion)\n{indent}await Promise.allSettled([\n{indent}  deleteCache({k}),\n{indent}  deleteCachePattern(`user:${{userId}}:articles:*`),\n{indent}  deleteCachePattern("news:feed:*")\n{indent}]).catch(err => console.error("[CACHE] Invalidation error:", err));'
    content = re.sub(pattern2, repl2, content, flags=re.MULTILINE)
    
    # 4-line pattern (deleteNews)
    pattern3 = r'(\s+)(// Invalidate relevant caches)\n(\s+)(deleteCache\([^)]+\)\.catch\([^)]+\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\([^)]+\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\([^)]+\);)\n(\s+)(deleteCachePattern\([^)]+\)\.catch\([^)]+\);)'
    def repl3(m):
        indent, comment = m.group(1), m.group(2)
        d1, d2, d3, d4 = m.group(4), m.group(6), m.group(8), m.group(10)
        k1 = re.search(r'deleteCache\(([^)]+)\)', d1).group(1)
        k2 = re.search(r'deleteCachePattern\(([^)]+)\)', d2).group(1)
        k3 = re.search(r'deleteCachePattern\(([^)]+)\)', d3).group(1)
        k4 = re.search(r'deleteCachePattern\(([^)]+)\)', d4).group(1)
        return f'{indent}{comment} (await to ensure completion)\n{indent}await Promise.allSettled([\n{indent}  deleteCache({k1}),\n{indent}  deleteCachePattern({k2}),\n{indent}  deleteCachePattern({k3}),\n{indent}  deleteCachePattern({k4})\n{indent}]).catch(err => console.error("[CACHE] Invalidation error:", err));'
    content = re.sub(pattern3, repl3, content, flags=re.MULTILINE)
    
    return content

for f in ['articleVideoController.js', 'articleImageController.js', 'newsController.js']:
    path = f'/root/haber-backend/controllers/{f}'
    if os.path.exists(path):
        with open(path, 'r') as file:
            content = file.read()
        new_content = fix(content)
        if new_content != content:
            with open(path, 'w') as file:
                file.write(new_content)
            print(f'✓ Updated {f}')
        else:
            print(f'- No changes needed in {f}')
PYEOF

echo ""
echo "✅ Done! Rebuilding backend..."
cd /root && docker-compose up -d --build backend

echo ""
echo "After rebuild, clear your browser cache (Ctrl+Shift+Delete) and refresh the page."

