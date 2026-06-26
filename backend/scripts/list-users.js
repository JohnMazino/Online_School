const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const listUsers = async () => {
  try {
    const result = await pool.query(
      'SELECT id, phone, first_name, last_name, role, created_at FROM users ORDER BY id ASC'
    );

    if (result.rows.length === 0) {
      console.log('✗ В базе нет пользователей');
    } else {
      console.log('✓ Пользователи в базе:');
      console.log('─'.repeat(80));
      result.rows.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`  Phone: ${user.phone}`);
        console.log(`  Name: ${user.first_name} ${user.last_name}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Created: ${user.created_at}`);
        console.log('─'.repeat(80));
      });
    }
  } catch (error) {
    console.error('✗ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
};

listUsers();
