const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const checkAdmin = async () => {
  try {
    const result = await pool.query(
      'SELECT id, phone, first_name, last_name, role FROM users WHERE role = $1',
      ['admin']
    );

    if (result.rows.length > 0) {
      console.log('✓ Администраторы в базе:');
      result.rows.forEach(admin => {
        console.log(`  - ID: ${admin.id}, Phone: ${admin.phone}, ${admin.first_name} ${admin.last_name}`);
      });
    } else {
      console.log('✗ Администраторов не найдено');
    }
  } catch (error) {
    console.error('✗ Ошибка при проверке:', error.message);
  } finally {
    await pool.end();
  }
};

checkAdmin();
