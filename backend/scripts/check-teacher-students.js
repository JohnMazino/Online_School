const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const checkTeacherStudents = async () => {
  try {
    // Получить всех учителей
    const teachers = await pool.query(
      'SELECT id, phone, first_name, last_name FROM users WHERE role = $1',
      ['teacher']
    );

    console.log('✓ УЧИТЕЛЯ В БД:');
    console.log('─'.repeat(80));
    
    for (const teacher of teachers.rows) {
      console.log(`\n${teacher.first_name} ${teacher.last_name} (ID: ${teacher.id}, Phone: ${teacher.phone})`);
      
      // Получить студентов этого учителя
      const students = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.phone, ts.assigned_at
         FROM teacher_students ts
         JOIN users u ON ts.student_id = u.id
         WHERE ts.teacher_id = $1
         ORDER BY u.first_name, u.last_name`,
        [teacher.id]
      );
      
      if (students.rows.length === 0) {
        console.log('  ❌ Нет назначенных студентов');
      } else {
        console.log(`  ✓ Студентов: ${students.rows.length}`);
        students.rows.forEach(s => {
          console.log(`    - ${s.first_name} ${s.last_name} (ID: ${s.id}, Phone: ${s.phone})`);
        });
      }
    }
    
    console.log('\n' + '─'.repeat(80));
    
  } catch (error) {
    console.error('✗ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
};

checkTeacherStudents();
