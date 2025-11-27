    const fs = require('fs');
    const path = require('path');

    // REVERT SCRIPT 2: Undo changes to upload configs
    const files = [
      'config/articleImageUpload.js',
      'config/upload.js'
    ];

    files.forEach(file => {
      const filePath = path.join(__dirname, file);
      const backupPath = path.join(__dirname, file + '.bak');

      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
        console.log(`✓ Reverted ${file} from backup`);
      } else {
        console.log(`! Backup not found for ${file}, attempting manual revert...`);
        
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf8');
          
          // Manual revert logic
          content = content.replace(
            /const userId = req\.user\.id \|\| req\.user\.userId;/g,
            "const userId = req.user.userId;"
          );

          fs.writeFileSync(filePath, content);
          console.log(`✓ Manually reverted ${file}`);
        } else {
          console.error(`! File not found: ${filePath}`);
        }
      }
    });

    console.log('Done! Please restart your server.');
