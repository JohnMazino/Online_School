const initializeDatabase = async (pool) => {
  const client = await pool.connect();
  try {
    // Создание таблицы пользователей если её нет
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(50) UNIQUE NOT NULL,
        phone_normalized VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        balance INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure balance column exists for older DBs
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INTEGER NOT NULL DEFAULT 0;`);
    
    // Ensure email column exists for older DBs
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);`);

    // Создание таблицы связи преподавателей и студентов
    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_students (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_id, student_id)
      );
    `);

    // Создание таблицы тестов
    await client.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        questions JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        time_limit INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Добавить колонку time_limit если её нет (для старых БД)
    await client.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 0;`);

    // Создание таблицы назначений тестов
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_assignments (
        id SERIAL PRIMARY KEY,
        test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        due_date TIMESTAMP,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        UNIQUE(test_id, student_id)
      );
    `);

    // Создание таблицы результатов тестов
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL REFERENCES test_assignments(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answers JSONB NOT NULL,
        score NUMERIC(10, 2),
        max_score NUMERIC(10, 2),
        time_taken INTEGER DEFAULT 0,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Миграция: добавить колонку time_taken если её нет
    try {
      await client.query(`
        ALTER TABLE test_results ADD COLUMN time_taken INTEGER DEFAULT 0;
      `);
      console.log('Added time_taken column to test_results');
    } catch (err) {
      // Колонка уже существует - это нормально
      if (!err.message.includes('already exists')) {
        console.warn('Could not add time_taken column:', err.message);
      }
    }

    // Миграция: изменить тип score и max_score с INTEGER на NUMERIC для поддержки partial credit
    try {
      await client.query(`
        ALTER TABLE test_results 
        ALTER COLUMN score TYPE NUMERIC(10, 2),
        ALTER COLUMN max_score TYPE NUMERIC(10, 2);
      `);
      console.log('Converted score and max_score columns to NUMERIC');
    } catch (err) {
      // Колонки уже NUMERIC или миграция уже выполнена - это нормально
      console.log('Score columns migration info:', err.message);
    }

    // Миграция: добавить колонку для randomized_test для корректного отображения результатов
    try {
      await client.query(`
        ALTER TABLE test_results ADD COLUMN randomized_test JSONB;
      `);
      console.log('Added randomized_test column to test_results');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn('Could not add randomized_test column:', err.message);
      }
    }

    // ===== ТАБЛИЦЫ ДЛЯ КВИЗИ (ИГРЫ) =====

    // Темы квизи
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_topics (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        game_type VARCHAR(20) NOT NULL DEFAULT 'quiz',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await client.query(`ALTER TABLE quiz_topics ADD COLUMN IF NOT EXISTS game_type VARCHAR(20) NOT NULL DEFAULT 'quiz';`);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn('Could not add quiz_topics.game_type column:', err.message);
      }
    }

    // Вопросы квизи
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER NOT NULL REFERENCES quiz_topics(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_index INTEGER DEFAULT 0,
        UNIQUE(topic_id, text)
      );
    `);

    try {
      await client.query(`ALTER TABLE quiz_questions ALTER COLUMN correct_index DROP NOT NULL;`);
    } catch (err) {
      if (!err.message.includes('does not exist')) {
        console.warn('Could not relax quiz_questions.correct_index constraint:', err.message);
      }
    }

    try {
      await client.query(`ALTER TABLE quiz_questions ALTER COLUMN correct_index SET DEFAULT 0;`);
    } catch (err) {
      console.warn('Could not set quiz_questions.correct_index default:', err.message);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };


