    const fs = require('fs');
    const path = require('path');

    // REVERT: Undo changes to cacheMiddleware.js
    const cachePath = path.join(__dirname, 'middleware/cacheMiddleware.js');
    const cacheBackupPath = path.join(__dirname, 'middleware/cacheMiddleware.js.bak');

    if (fs.existsSync(cacheBackupPath)) {
      fs.copyFileSync(cacheBackupPath, cachePath);
      console.log('✓ Reverted middleware/cacheMiddleware.js');
    } else {
      console.log('! Backup not found for middleware/cacheMiddleware.js, attempting manual revert...');
      
      // Manual revert logic if backup is missing
      let content = fs.readFileSync(cachePath, 'utf8');
      
      // Revert generateCacheKey
      content = content.replace(
        /const userId = req\.user\?\.id \|\| req\.user\?\.userId \|\| 'guest';/g,
        "const userId = req.user?.userId || 'guest';"
      );

      // Revert newsFeed
      content = content.replace(
        /const userId = req\.user\?\.id \|\| req\.user\?\.userId \|\| 'guest';/g,
        "const userId = req.user?.userId || 'guest';"
      );

      // Revert userArticles
      content = content.replace(
        /const userId = req\.params\.userId \|\| req\.user\?\.id \|\| req\.user\?\.userId;/g,
        "const userId = req.params.userId || req.user?.userId;"
      );
      
      // Revert notifications
      content = content.replace(
        /const userId = req\.user\?\.id \|\| req\.user\?\.userId;/g,
        "const userId = req.user?.userId;"
      );

      fs.writeFileSync(cachePath, content);
      console.log('✓ Manually reverted middleware/cacheMiddleware.js');
    }

    console.log('Done! Please restart your server immediately.');
