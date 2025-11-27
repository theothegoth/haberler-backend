const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'models/ArticleVideo.js');

if (fs.existsSync(filePath)) {
  console.log('Reading ArticleVideo.js...');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Backup
  fs.writeFileSync(filePath + '.bak_thumb', content);

  // Fix getArticleVideos to include best quality thumbnail
  // We need to select max_res_thumbnail if available, otherwise thumbnail
  
  const oldQuery = `
      SELECT
        av.*,
        vc.channel_id,
        vc.channel_title,
        vc.title,
        vc.thumbnail,
        vc.published_at,
        vc.like_count,
        vc.category_id
       FROM article_videos av
       LEFT JOIN videos_cache vc ON av.video_id = vc.video_id
       WHERE av.article_id = $1
       ORDER BY av.display_order ASC, av.created_at ASC`;

  const newQuery = `
      SELECT
        av.*,
        vc.channel_id,
        vc.channel_title,
        vc.title,
        COALESCE(vc.max_res_thumbnail, vc.thumbnail) as thumbnail,
        vc.published_at,
        vc.like_count,
        vc.category_id
       FROM article_videos av
       LEFT JOIN videos_cache vc ON av.video_id = vc.video_id
       WHERE av.article_id = $1
       ORDER BY av.display_order ASC, av.created_at ASC`;

  // Use a more flexible replacement to handle whitespace
  if (content.includes('vc.thumbnail,')) {
      content = content.replace(/vc\.thumbnail,/g, 'COALESCE(vc.max_res_thumbnail, vc.thumbnail) as thumbnail,');
      console.log('✓ Updated thumbnail selection to use max resolution');
      fs.writeFileSync(filePath, content);
  } else {
      console.error('Could not find thumbnail selection in query');
  }

} else {
  console.error('File not found: ' + filePath);
}

