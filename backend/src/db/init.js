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
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        balance INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure balance column exists for older DBs
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INTEGER NOT NULL DEFAULT 0;`);

    // Таблицы для тестов
    await client.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100),
        grade VARCHAR(10),
        exam_type VARCHAR(20),
        description TEXT,
        total_questions INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        max_points INTEGER,
        time_limit INTEGER,
        position INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        text TEXT,
        points INTEGER DEFAULT 1,
        time_limit INTEGER,
        meta JSONB,
        position INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
        assigned_to INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'assigned'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attempts (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        score NUMERIC,
        result JSONB
      );
    `);

    // Backwards-compat: ensure common missing columns exist if DB pre-dates these changes
    // Ensure questions table has expected columns (some older DBs lacked these)
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS meta JSONB;`);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1;`);

    // Back-compat: some older schemas used `question_text` and `extra` instead of `text` and `meta`
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS text TEXT;`);
    await client.query(`UPDATE questions SET text = question_text WHERE text IS NULL AND question_text IS NOT NULL;`);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS meta JSONB;`);
    await client.query(`UPDATE questions SET meta = extra WHERE (meta IS NULL OR meta = '{}'::jsonb) AND extra IS NOT NULL;`);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS time_limit INTEGER;`);
    // Make legacy `question_text` nullable and keep it in sync with `text`
    await client.query(`ALTER TABLE questions ALTER COLUMN question_text DROP NOT NULL`);
    await client.query(`UPDATE questions SET question_text = text WHERE question_text IS NULL AND text IS NOT NULL;`);

    await client.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS description TEXT;`);
    await client.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'assigned';`);

    await client.query(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await client.query(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;`);
    await client.query(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS score NUMERIC;`);
    await client.query(`ALTER TABLE answers ADD COLUMN IF NOT EXISTS attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE answers ADD COLUMN IF NOT EXISTS question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);
    await client.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        answer JSONB,
        points_awarded NUMERIC
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };
