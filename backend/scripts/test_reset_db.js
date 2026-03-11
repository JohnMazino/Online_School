const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' });

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'platform_defaults' LIMIT 1");
    const defaults = settingsRes.rows.length ? settingsRes.rows[0].value : { minPasswordLength: 8 };
    const minLen = defaults.minPasswordLength || 8;
    const genTempPass = (len) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let out = '';
      for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
      return out;
    };
    const tempPass = genTempPass(Math.max(8, minLen));
    const hash = await bcrypt.hash(tempPass, 10);
    const result = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, phone, first_name, last_name', [hash, 4]);
    console.log('updated user', result.rows[0]);
    console.log('tempPass len', tempPass.length);
  } catch (err) {
    console.error('DB reset test error', err);
  } finally {
    await pool.end();
  }
})();