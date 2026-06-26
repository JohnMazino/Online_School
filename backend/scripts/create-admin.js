const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createAdmin = async () => {
  const client = await pool.connect();
  try {
    const hashedPassword = await bcryptjs.hash('29090803', 10);
    
    const result = await pool.query(
      'INSERT INTO users (phone, phone_normalized, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, phone, first_name, last_name, role',
      ['admin', 'admin', hashedPassword, 'Admin', 'User', 'admin']
    );

    console.log('✓ Админ успешно создан:', result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      console.log('⚠ Админ уже существует в базе');
    } else {
      console.error('✗ Ошибка при создании админа:', error.message);
    }
  } finally {
    client.release();
    await pool.end();
  }
};

createAdmin();
