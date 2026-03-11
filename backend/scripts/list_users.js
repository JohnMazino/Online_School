const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

(async () => {
  console.log('DATABASE_URL=', process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT id, phone, phone_normalized, first_name, last_name, role, balance, created_at FROM users ORDER BY id DESC LIMIT 50');
    console.log('Total rows returned:', res.rows.length);
    console.table(res.rows);
  } catch (err) {
    console.error('Error querying users:', err);
  } finally {
    await pool.end();
  }
})();