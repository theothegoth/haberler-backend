require('dotenv').config();
const { sendWeeklyDigests } = require('../jobs/weeklyDigest');
const { initializeRedis, closeRedis } = require('../config/cache');
const pool = require('../config/database');

async function run() {
  try {
    console.log('Initializing services...');
    await initializeRedis();
    
    console.log('Starting manual weekly digest...');
    await sendWeeklyDigests();
    console.log('Weekly digest completed.');

  } catch (error) {
    console.error('Error running manual digest:', error);
  } finally {
    await closeRedis();
    await pool.end();
    process.exit(0);
  }
}

run();

