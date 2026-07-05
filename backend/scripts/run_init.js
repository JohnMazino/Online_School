const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });
const { initializeDatabase } = require('../src/db/init');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await initializeDatabase(pool);
    console.log('Init script finished');
  } catch (err) {
    console.error('Init script error:', err);
  } finally {
    await pool.end();
  }
})();