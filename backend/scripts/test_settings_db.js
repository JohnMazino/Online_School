const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const newSettings = { minPasswordLength: 12 };
    await pool.query(`INSERT INTO settings (key, value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`, ['platform_defaults', JSON.stringify(newSettings)]);
    const r = await pool.query("SELECT value FROM settings WHERE key = 'platform_defaults'");
    console.log('settings now:', r.rows[0].value);
  } catch (err) {
    console.error('DB test error:', err);
  } finally {
    await pool.end();
  }
})();