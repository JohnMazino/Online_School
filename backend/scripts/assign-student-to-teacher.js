const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const assignStudentToTeacher = async () => {
  const client = await pool.connect();
  try {
    // Найти студента по номеру телефона
    const student = await client.query(
      'SELECT id, first_name, last_name, phone FROM users WHERE phone = $1 AND role = $2',
      ['+79530816149', 'student']
    );

    if (student.rows.length === 0) {
      console.log('❌ Студент с номером +79530816149 не найден');
      return;
    }

    const studentId = student.rows[0].id;
    const studentName = `${student.rows[0].first_name} ${student.rows[0].last_name}`;

    // Найти учителя по номеру телефона
    const teacher = await client.query(
      'SELECT id, first_name, last_name, phone FROM users WHERE phone = $1 AND role = $2',
      ['+79530816148', 'teacher']
    );

    if (teacher.rows.length === 0) {
      console.log('❌ Учитель с номером +79530816148 не найден');
      return;
    }

    const teacherId = teacher.rows[0].id;
    const teacherName = `${teacher.rows[0].first_name} ${teacher.rows[0].last_name}`;

    // Проверить, не назначен ли уже
    const existing = await client.query(
      'SELECT id FROM teacher_students WHERE teacher_id = $1 AND student_id = $2',
      [teacherId, studentId]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️ Студент уже назначен этому учителю');
      return;
    }

    // Назначить студента учителю
    await client.query(
      'INSERT INTO teacher_students (teacher_id, student_id) VALUES ($1, $2)',
      [teacherId, studentId]
    );

    console.log('✓ Студент успешно назначен учителю');
    console.log(`  Студент: ${studentName} (ID: ${studentId}, Phone: ${student.rows[0].phone})`);
    console.log(`  Учитель: ${teacherName} (ID: ${teacherId}, Phone: ${teacher.rows[0].phone})`);

  } catch (error) {
    console.error('✗ Ошибка:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

assignStudentToTeacher();
