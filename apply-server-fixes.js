    const fs = require('fs');
    const path = require('path');

    const fixes = [
      {
        path: 'middleware/cacheMiddleware.js',
        replacements: [
          {
            from: /const userId = req\.user\?\.userId \|\| 'guest';/g,
            to: "const userId = req.user?.id || req.user?.userId || 'guest';"
          },
          {
            from: /const userId = req\.params\.userId \|\| req\.user\?\.userId;/g,
            to: "const userId = req.params.userId || req.user?.id || req.user?.userId;"
          },
          {
            from: /const userId = req\.user\?\.userId;/g,
            to: "const userId = req.user?.id || req.user?.userId;"
          }
        ]
      },
      {
        path: 'config/articleImageUpload.js',
        replacements: [
          {
            from: /const userId = req\.user\.userId;/g,
            to: "const userId = req.user.id || req.user.userId;"
          }
        ]
      },
      {
        path: 'config/upload.js',
        replacements: [
          {
            from: /const userId = req\.user\.userId;/g,
            to: "const userId = req.user.id || req.user.userId;"
          }
        ]
      }
    ];

    console.log('Starting fixes...');

    fixes.forEach(fix => {
      const filePath = path.join(__dirname, fix.path);
      
      if (fs.existsSync(filePath)) {
        console.log(`Processing ${fix.path}...`);
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        fix.replacements.forEach(replacement => {
          content = content.replace(replacement.from, replacement.to);
        });

        if (content !== originalContent) {
          fs.writeFileSync(`${filePath}.bak`, originalContent);
          fs.writeFileSync(filePath, content);
          console.log(`✓ Fixed ${fix.path} (Backup created at ${fix.path}.bak)`);
        } else {
          console.log(`- No changes needed for ${fix.path} (or already fixed)`);
        }
      } else {
        console.error(`! File not found: ${filePath}`);
      }
    });

    console.log('Done! Please restart your server.');
