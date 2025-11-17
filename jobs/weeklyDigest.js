const cron = require('node-cron');
const pool = require('../config/database');
const { sendWeeklyDigestEmail } = require('../services/emailService');
const { getUsersWithWeeklyDigest } = require('../controllers/emailPreferencesController');
const Logger = require('../utils/logger');

const logger = new Logger('WEEKLY_DIGEST');

/**
 * Get top articles from the past week
 * Based on engagement (views, likes, comments)
 */
async function getTopArticlesOfWeek(limit = 5) {
  try {
    const query = `
      SELECT
        un.id,
        un.title,
        un.content,
        un.category,
        un.view_count,
        un.created_at,
        u.username,
        COUNT(DISTINCT nl.id) as like_count,
        COUNT(DISTINCT c.id) as comment_count,
        (
          un.view_count +
          COUNT(DISTINCT nl.id) * 3 +
          COUNT(DISTINCT c.id) * 5
        ) as engagement_score
      FROM user_news un
      JOIN users u ON un.user_id = u.id
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      WHERE un.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY un.id, un.title, un.content, un.category, un.view_count, un.created_at, u.username
      HAVING (
        un.view_count +
        COUNT(DISTINCT nl.id) * 3 +
        COUNT(DISTINCT c.id) * 5
      ) > 0
      ORDER BY engagement_score DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching top articles:', error);
    return [];
  }
}

/**
 * Send weekly digest to all subscribed users
 */
async function sendWeeklyDigests() {
  try {
    logger.info('Starting weekly digest job...');

    // Get top articles of the week
    const topArticles = await getTopArticlesOfWeek(5);

    if (topArticles.length === 0) {
      logger.info('No articles to send in weekly digest');
      return;
    }

    logger.info(`Found ${topArticles.length} top articles for the week`);

    // Get all users with weekly digest enabled
    const users = await getUsersWithWeeklyDigest();
    logger.info(`Sending weekly digest to ${users.length} users`);

    let successCount = 0;
    let failCount = 0;

    // Send emails to all subscribed users
    for (const user of users) {
      try {
        const result = await sendWeeklyDigestEmail(
          user.email,
          user.username,
          topArticles
        );

        if (result.success) {
          successCount++;
          logger.info(`Sent digest to ${user.username} (${user.email})`);
        } else {
          failCount++;
          logger.error(`Failed to send digest to ${user.username}: ${result.error}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failCount++;
        logger.error(`Error sending digest to ${user.username}:`, error);
      }
    }

    logger.info(`Weekly digest job completed: ${successCount} sent, ${failCount} failed`);
  } catch (error) {
    logger.error('Error in weekly digest job:', error);
  }
}

/**
 * Schedule the weekly digest job
 * Runs every Monday at 9:00 AM
 */
function scheduleWeeklyDigest() {
  // Cron format: minute hour day-of-month month day-of-week
  // '0 9 * * 1' = Every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    logger.info('Weekly digest cron job triggered');
    await sendWeeklyDigests();
  }, {
    scheduled: true,
    timezone: "Europe/Istanbul" // Adjust timezone as needed
  });

  logger.info('Weekly digest job scheduled: Every Monday at 9:00 AM (Europe/Istanbul)');
}

// For manual testing
async function runManualDigest() {
  logger.info('Running manual weekly digest...');
  await sendWeeklyDigests();
}

module.exports = {
  scheduleWeeklyDigest,
  sendWeeklyDigests,
  runManualDigest
};
