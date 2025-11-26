const pool = require('./config/database');

async function checkDraftMedia() {
  try {
    const draftId = process.argv[2] || 101;

    console.log(`\nChecking media for draft ID: ${draftId}\n`);

    // Check images
    const imageResult = await pool.query(
      'SELECT id, article_id, image_url, display_order FROM article_images WHERE article_id = $1',
      [draftId]
    );

    console.log('Images found:', imageResult.rows.length);
    if (imageResult.rows.length > 0) {
      console.table(imageResult.rows);
    }

    // Check videos
    const videoResult = await pool.query(
      'SELECT id, article_id, video_id FROM article_videos WHERE article_id = $1',
      [draftId]
    );

    console.log('\nVideos found:', videoResult.rows.length);
    if (videoResult.rows.length > 0) {
      console.table(videoResult.rows);
    }

    console.log('\nTotal media:', imageResult.rows.length + videoResult.rows.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDraftMedia();
