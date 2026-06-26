const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const assignStudentsToTeachers = async () => {
  const client = await pool.connect();
  try {
    // Получить учителей и студентов
    const teachers = await client.query('SELECT id FROM users WHERE role = $1 ORDER BY id', ['teacher']);
    const students = await client.query('SELECT id FROM users WHERE role = $1 ORDER BY id', ['student']);

    console.log(`✓ Найдено учителей: ${teachers.rows.length}`);
    console.log(`✓ Найдено студентов: ${students.rows.length}`);

    if (students.rows.length === 0 || teachers.rows.length === 0) {
      console.log('❌ Нет студентов или учителей в БД');
      return;
    }

    let assignedCount = 0;

    // Распределить студентов среди учителей
    for (let i = 0; i < students.rows.length; i++) {
      const studentId = students.rows[i].id;
      const teacherId = teachers.rows[i % teachers.rows.length].id;

      try {
        await client.query(
          'INSERT INTO teacher_students (teacher_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [teacherId, studentId]
        );
        assignedCount++;
      } catch (error) {
        // Игнорируем дублирующиеся записи
        console.log(`  ⚠️ Студент ${studentId} уже назначен учителю ${teacherId}`);
      }
    }

    console.log(`\n✓ Успешно загвоздено: ${assignedCount} назначений студентов`);

    // Показать результат
    const result = await client.query(`
      SELECT ts.teacher_id, 
             COUNT(*) as student_count,
             STRING_AGG(u.first_name || ' ' || u.last_name, ', ') as student_names
      FROM teacher_students ts
      JOIN users u ON ts.student_id = u.id
      GROUP BY ts.teacher_id
      ORDER BY ts.teacher_id
    `);

    console.log('\n✓ РАСПРЕДЕЛЕНИЕ СТУДЕНТОВ ПО УЧИТЕЛЯМ:');
    console.log('─'.repeat(80));
    
    for (const row of result.rows) {
      const teacher = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [row.teacher_id]);
      if (teacher.rows.length > 0) {
        const t = teacher.rows[0];
        console.log(`${t.first_name} ${t.last_name} (ID: ${row.teacher_id})`);
        console.log(`  Студентов: ${row.student_count}`);
        console.log(`  ${row.student_names}\n`);
      }
    }

  } catch (error) {
    console.error('✗ Ошибка:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

assignStudentsToTeachers();
