ssh root@159.223.232.158 'mkdir -p /root/haber-backend/scripts && cat > /root/haber-backend/scripts/fix-cache.py << '\''ENDOFFILE'\''
#!/usr/bin/env python3
import os
import re
import shutil
from datetime import datetime

CONTROLLERS_DIR = "/root/haber-backend/controllers"

def backup_file(filepath):
    backup_path = f"{filepath}.bak.{datetime.now().strftime('\''%Y%m%d_%H%M%S'\'')}"
    shutil.copy2(filepath, backup_path)
    return backup_path

def update_file(filepath, filename):
    try:
        with open(filepath, '\''r'\'', encoding='\''utf-8'\'') as f:
            content = f.read()
        original_content = content
        modified = False
        
        # Pattern 1: Three separate cache invalidation calls
        pattern1 = re.compile(
            r'\''(\s+)(// Invalidate caches?[^\n]*)\n\'' +
            r'\''(\s+)(deleteCache\([^)]+\)\.catch\(err => console\.error\(\'\''\'\''Cache invalidation error:\'\''\'\'', err\)\);)\n\'' +
            r'\''(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\(\'\''\'\''Cache invalidation error:\'\''\'\'', err\)\);)\n\'' +
            r'\''(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\(\'\''\'\''Cache invalidation error:\'\''\'\'', err\)\);\''',
            re.MULTILINE
        )
        
        def replace1(match):
            indent = match.group(1)
            comment = match.group(2).strip()
            cache1 = match.group(4)
            cache2 = match.group(6)
            cache3 = match.group(8)
            key1 = re.search(r'\''deleteCache\(([^)]+)\)\''', cache1).group(1) if re.search(r'\''deleteCache\(([^)]+)\)\''', cache1) else '\'''\''
            key2 = re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache2).group(1) if re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache2) else '\'''\''
            key3 = re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache3).group(1) if re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache3) else '\'''\''
            return f"{indent}{comment} (await to ensure completion)\n{indent}await Promise.allSettled([\n{indent}  deleteCache({key1}),\n{indent}  deleteCachePattern({key2}),\n{indent}  deleteCachePattern({key3})\n{indent}]).catch(err => console.error('\''[CACHE] Invalidation error:'\'', err));"
        
        if pattern1.search(content):
            content = pattern1.sub(replace1, content)
            modified = True
            print(f"  Updated 3-line cache invalidation in {filename}")
        
        # Pattern 2: Single deleteCache
        pattern2 = re.compile(
            r'\''(\s+)(const updatedImage = await ArticleImage\.updateCaption\([^)]+\);)\n\'' +
            r'\''(\s+)(// Invalidate caches?[^\n]*)\n\'' +
            r'\''(\s+)(deleteCache\([^)]+\)\.catch\(err => console\.error\(\'\''\'\''Cache invalidation error:\'\''\'\'', err\)\);\''',
            re.MULTILINE
        )
        
        def replace2(match):
            indent = match.group(1)
            update_line = match.group(2)
            comment = match.group(4).strip()
            cache_line = match.group(6)
            key = re.search(r'\''deleteCache\(([^)]+)\)\''', cache_line).group(1) if re.search(r'\''deleteCache\(([^)]+)\)\''', cache_line) else '\'''\''
            return f"{indent}{update_line}\n{indent}{comment} (await to ensure completion)\n{indent}await Promise.allSettled([\n{indent}  deleteCache({key}),\n{indent}  deleteCachePattern(`user:${{userId}}:articles:*`),\n{indent}  deleteCachePattern('\''news:feed:*'\'')\n{indent}]).catch(err => console.error('\''[CACHE] Invalidation error:'\'', err));"
        
        if pattern2.search(content):
            content = pattern2.sub(replace2, content)
            modified = True
            print(f"  Updated single cache invalidation in {filename}")
        
        # Pattern 3: Four cache invalidation calls
        pattern3 = re.compile(
            r'\''(\s+)(// Invalidate relevant caches?)\n\'' +
            r'\''(\s+)(deleteCache\([^)]+\)\.catch\(err => console\.error\(\'\''\'\''Cache invalidation error:\'\''\'\'', err\)\);)\n\'' +
            r'\''(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\(\'\''\'\''Cache invalidation error:\'\''\'\'', err\)\);)\n\'' +
            r'\''(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\(\'\''\'\''Cache invalidation error:\'\''\'\'', err\)\);)\n\'' +
            r'\''(\s+)(deleteCachePattern\([^)]+\)\.catch\(err => console\.error\(\'\''\'\''Cache invalidation error:\'\''\'\'', err\)\);\''',
            re.MULTILINE
        )
        
        def replace3(match):
            indent = match.group(1)
            comment = match.group(2)
            cache1 = match.group(4)
            cache2 = match.group(6)
            cache3 = match.group(8)
            cache4 = match.group(10)
            key1 = re.search(r'\''deleteCache\(([^)]+)\)\''', cache1).group(1) if re.search(r'\''deleteCache\(([^)]+)\)\''', cache1) else '\'''\''
            key2 = re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache2).group(1) if re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache2) else '\'''\''
            key3 = re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache3).group(1) if re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache3) else '\'''\''
            key4 = re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache4).group(1) if re.search(r'\''deleteCachePattern\(([^)]+)\)\''', cache4) else '\'''\''
            return f"{indent}{comment} (await to ensure completion)\n{indent}await Promise.allSettled([\n{indent}  deleteCache({key1}),\n{indent}  deleteCachePattern({key2}),\n{indent}  deleteCachePattern({key3}),\n{indent}  deleteCachePattern({key4})\n{indent}]).catch(err => console.error('\''[CACHE] Invalidation error:'\'', err));"
        
        if pattern3.search(content):
            content = pattern3.sub(replace3, content)
            modified = True
            print(f"  Updated 4-line cache invalidation in {filename}")
        
        if modified and content != original_content:
            backup_path = backup_file(filepath)
            with open(filepath, '\''w'\'', encoding='\''utf-8'\'') as f:
                f.write(content)
            print(f"  Backup created: {os.path.basename(backup_path)}")
            return True
        else:
            print(f"  - No changes needed in {filename}")
            return False
    except Exception as e:
        print(f"  Error updating {filename}: {e}")
        return False

def main():
    print("Updating cache invalidation in controllers...\n")
    if not os.path.exists(CONTROLLERS_DIR):
        print(f"Error: Controllers directory not found: {CONTROLLERS_DIR}")
        return
    files = ['\''articleVideoController.js'\'', '\''articleImageController.js'\'', '\''newsController.js'\'']
    updated_count = 0
    for filename in files:
        filepath = os.path.join(CONTROLLERS_DIR, filename)
        if os.path.exists(filepath):
            if update_file(filepath, filename):
                updated_count += 1
        else:
            print(f"  File not found: {filepath}")
    print(f"\nUpdated {updated_count} file(s).")
    print("\nRebuilding backend...")
    os.system('\''cd /root && docker-compose up -d --build backend'\'')

if __name__ == '\''__main__'\'':
    main()
ENDOFFILE
python3 /root/haber-backend/scripts/fix-cache.py'

