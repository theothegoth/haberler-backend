const pool = require('./config/database');

async function checkDraftContent() {
  try {
    const draftId = process.argv[2] || 101;

    console.log(`\nChecking content for draft ID: ${draftId}\n`);

    // Check draft
    const draftResult = await pool.query(
      'SELECT id, user_id, title, LENGTH(title) as title_length, LENGTH(content) as content_length, category, article_type FROM drafts WHERE id = $1',
      [draftId]
    );

    if (draftResult.rows.length === 0) {
      console.log('Draft not found!');
    } else {
      console.log('Draft found:');
      console.table(draftResult.rows);

      const draft = draftResult.rows[0];
      console.log('\nTitle:', draft.title);
      console.log('Title length:', draft.title_length);
      console.log('Title trimmed length:', draft.title.trim().length);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDraftContent();
