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

    // Ensure is_active and last_login columns exist
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;`);

    // Seed users with realistic test data (insert only missing records)
    const bcrypt = require('bcryptjs');
    const { normalizePhone } = require('../utils/phone');

    const countRes = await client.query('SELECT COUNT(*) AS count FROM users');
    const userCount = parseInt(countRes.rows[0].count, 10);

    console.log('Existing users in DB:', userCount);

    console.log('Ensuring initial user set...');

    const seeds = [
      { phone: 'admin', password: '29090803', first_name: 'Супер', last_name: 'Админ', role: 'admin', balance: 0, daysAgo: 90 },

      // Teachers
      { phone: '+7 (912) 000-00-02', password: 'teacher123', first_name: 'Мария', last_name: 'Петрова', role: 'teacher', balance: 500, daysAgo: 75 },
      { phone: '+7 (912) 000-00-03', password: 'teacher123', first_name: 'Алексей', last_name: 'Смирнов', role: 'teacher', balance: 450, daysAgo: 60 },
      { phone: '+7 (912) 000-00-04', password: 'teacher123', first_name: 'Ольга', last_name: 'Кузнецова', role: 'teacher', balance: 300, daysAgo: 55 },
      { phone: '+7 (912) 000-00-05', password: 'teacher123', first_name: 'Дмитрий', last_name: 'Попов', role: 'teacher', balance: 350, daysAgo: 50 },

      // Students (assign classes)
      { phone: '+7 (912) 345-67-01', password: 'student123', first_name: 'Иван', last_name: 'Иванов', role: 'student', balance: 120, daysAgo: 30, class: '11 класс' },
      { phone: '+7 (912) 345-67-02', password: 'student123', first_name: 'Анна', last_name: 'Сидорова', role: 'student', balance: 80, daysAgo: 25, class: '11 класс' },
      { phone: '+7 (912) 345-67-03', password: 'student123', first_name: 'Пётр', last_name: 'Петров', role: 'student', balance: 0, daysAgo: 20, class: '10 класс' },
      { phone: '+7 (912) 345-67-04', password: 'student123', first_name: 'Елена', last_name: 'Ковалёва', role: 'student', balance: 40, daysAgo: 18, class: '10 класс' },
      { phone: '+7 (912) 345-67-05', password: 'student123', first_name: 'Никита', last_name: 'Смирнов', role: 'student', balance: 10, daysAgo: 15, class: '9 класс' },
      { phone: '+7 (912) 345-67-06', password: 'student123', first_name: 'Марина', last_name: 'Орлова', role: 'student', balance: 200, daysAgo: 12, class: '9 класс' },
      { phone: '+7 (912) 345-67-07', password: 'student123', first_name: 'Владимир', last_name: 'Морозов', role: 'student', balance: 60, daysAgo: 10, class: '8 класс' },
      { phone: '+7 (912) 345-67-08', password: 'student123', first_name: 'Оксана', last_name: 'Соколова', role: 'student', balance: 5, daysAgo: 8, class: '8 класс' },
      { phone: '+7 (912) 345-67-09', password: 'student123', first_name: 'Сергей', last_name: 'Лебедев', role: 'student', balance: 15, daysAgo: 5, class: '11 класс' },
      { phone: '+7 (912) 345-67-10', password: 'student123', first_name: 'Дарья', last_name: 'Федорова', role: 'student', balance: 95, daysAgo: 2, class: '11 класс' }
    ];

    // Get existing normalized phones to avoid duplicates
    const existingRes = await client.query('SELECT phone_normalized FROM users');
    const existingSet = new Set(existingRes.rows.map(r => r.phone_normalized));

    let inserted = 0;
    for (const u of seeds) {
      const normalized = u.phone === 'admin' ? 'admin' : normalizePhone(u.phone);
      if (existingSet.has(normalized)) {
        console.log('Skipping existing user:', u.phone);
        continue;
      }

      const hash = await bcrypt.hash(u.password, 10);
      const createdAt = new Date(Date.now() - (u.daysAgo || 0) * 24 * 60 * 60 * 1000).toISOString();
      const lastLogin = new Date(Date.now() - ((u.daysAgo || 0) / 2) * 24 * 60 * 60 * 1000).toISOString();

      try {
        await client.query(
          'INSERT INTO users (phone, phone_normalized, password_hash, first_name, last_name, role, balance, created_at, class, last_login) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [u.phone, normalized, hash, u.first_name, u.last_name, u.role, u.balance, createdAt, u.class || null, lastLogin]
        );
        inserted++;
      } catch (err) {
        console.error('Seeding user failed:', u.phone, err);
      }
    }

    console.log('Seeding finished. Inserted:', inserted);

    // Add `class` column to users (for stats) if not exists
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS class VARCHAR(50);`);

    // Create subjects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed subjects if empty
    const subjCountRes = await client.query('SELECT COUNT(*) AS count FROM subjects');
    const subjCount = parseInt(subjCountRes.rows[0].count, 10);
    if (subjCount === 0) {
      console.log('Seeding subjects...');
      const subjSeeds = [
        { name: 'Математика', slug: 'mathematics' },
        { name: 'Русский язык', slug: 'russian' },
        { name: 'Физика', slug: 'physics' },
        { name: 'Информатика', slug: 'informatics' },
        { name: 'Химия', slug: 'chemistry' }
      ];
      for (const s of subjSeeds) {
        try {
          await client.query('INSERT INTO subjects (name, slug) VALUES ($1,$2)', [s.name, s.slug]);
        } catch (err) { console.error('Seeding subject failed:', err); }
      }
    }

    // Create tasks table (basic)
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        title VARCHAR(300),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed some tasks if none
    const taskCountRes = await client.query('SELECT COUNT(*) AS count FROM tasks');
    const taskCount = parseInt(taskCountRes.rows[0].count, 10);
    if (taskCount === 0) {
      console.log('Seeding tasks...');
      const subjectsRes = await client.query('SELECT id FROM subjects');
      const subjectIds = subjectsRes.rows.map(r => r.id);
      for (let i = 0; i < 30; i++) {
        const subj = subjectIds[i % subjectIds.length];
        const creator = (await client.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['teacher'])).rows[0];
        const createdBy = creator ? creator.id : null;
        const createdAt = new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString();
        try {
          await client.query('INSERT INTO tasks (subject_id, title, created_by, created_at) VALUES ($1,$2,$3,$4)', [subj, `Тестовое задание ${i+1}`, createdBy, createdAt]);
        } catch (err) { console.error('Seeding task failed:', err); }
      }
    }

    // Create attempts table to store test/task attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed attempts (random for students)
    const attemptCountRes = await client.query('SELECT COUNT(*) AS count FROM attempts');
    const attemptCount = parseInt(attemptCountRes.rows[0].count, 10);
    if (attemptCount === 0) {
      console.log('Seeding attempts...');
      const studentRes = await client.query("SELECT id FROM users WHERE role = 'student'");
      const students = studentRes.rows.map(r => r.id);
      const tasksResAll = await client.query('SELECT id FROM tasks');
      const tasks = tasksResAll.rows.map(r => r.id);

      // create some attempts for last 60 days
      for (let d = 0; d < 60; d++) {
        const day = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
        const attemptsPerDay = Math.floor(Math.random() * 6) + 1; // 1..6 attempts per day
        for (let a = 0; a < attemptsPerDay; a++) {
          const user = students[Math.floor(Math.random() * students.length)];
          const task = tasks[Math.floor(Math.random() * tasks.length)];
          const score = Math.floor(Math.random() * 101); // 0..100
          const createdAt = new Date(day.getTime() + Math.floor(Math.random() * 86400000)).toISOString();
          try {
            await client.query('INSERT INTO attempts (user_id, task_id, score, created_at) VALUES ($1,$2,$3,$4)', [user, task, score, createdAt]);
          } catch (err) { console.error('Seeding attempt failed:', err); }
        }
      }
    }

    // Update some users with class assignments
    await client.query(`UPDATE users SET class = '11 класс' WHERE phone_normalized LIKE '7912345670%';`);
    await client.query(`UPDATE users SET class = '10 класс' WHERE phone_normalized LIKE '7912000000%';`);

    // Create audit_logs table and seed it with sample entries if needed
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        admin_name VARCHAR(200),
        action_type VARCHAR(50),
        entity_type VARCHAR(50),
        entity_id INTEGER,
        entity_name VARCHAR(255),
        old_value TEXT,
        new_value TEXT,
        ip_address VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const auditCountRes = await client.query('SELECT COUNT(*) AS count FROM audit_logs');
    const auditCount = parseInt(auditCountRes.rows[0].count, 10);

    if (auditCount === 0) {
      console.log('Seeding audit logs...');
      const adminRow = (await client.query("SELECT id, (first_name || ' ' || last_name) AS name FROM users WHERE role = 'admin' LIMIT 1")).rows[0];
      const adminId = adminRow ? adminRow.id : null;
      const adminName = adminRow ? adminRow.name : 'Администратор';

      const sampleLogs = [
        { action_type: 'create', entity_type: 'user', entity_id: 1001, entity_name: 'Иван Иванов', old_value: null, new_value: '{"role":"student"}', description: 'Создан новый пользователь', daysAgo: 10 },
        { action_type: 'role_change', entity_type: 'user', entity_id: 1002, entity_name: 'Анна Сидорова', old_value: '{"role":"student"}', new_value: '{"role":"teacher"}', description: 'Назначена роль преподавателя', daysAgo: 9 },
        { action_type: 'create', entity_type: 'subject', entity_id: 201, entity_name: 'Математика', old_value: null, new_value: '{"name":"Математика"}', description: 'Создан предмет', daysAgo: 7 },
        { action_type: 'update', entity_type: 'test', entity_id: 301, entity_name: 'Тест по алгебре', old_value: '{"duration":60}', new_value: '{"duration":90}', description: 'Изменена длительность теста', daysAgo: 6 },
        { action_type: 'delete', entity_type: 'task', entity_id: 401, entity_name: 'Старое задание', old_value: '{"active":true}', new_value: null, description: 'Удалено задание', daysAgo: 5 },
        { action_type: 'block', entity_type: 'user', entity_id: 1003, entity_name: 'Пётр Петров', old_value: '{"status":"active"}', new_value: '{"status":"blocked"}', description: 'Пользователь заблокирован', daysAgo: 4 }
      ];

      for (const l of sampleLogs) {
        const createdAt = new Date(Date.now() - (l.daysAgo || 0) * 24 * 60 * 60 * 1000).toISOString();
        try {
          await client.query(
            'INSERT INTO audit_logs (admin_id, admin_name, action_type, entity_type, entity_id, entity_name, old_value, new_value, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
            [adminId, adminName, l.action_type, l.entity_type, l.entity_id, l.entity_name, l.old_value, l.new_value, l.description, createdAt]
          );
        } catch (err) {
          console.error('Seeding audit log failed:', err);
        }
      }

      console.log('Audit logs seeded');
    }

    // Create settings table to store platform-wide settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default settings if not present
    const settingsCountRes = await client.query("SELECT COUNT(*) AS count FROM settings WHERE key = 'platform_defaults'");
    const settingsCount = parseInt(settingsCountRes.rows[0].count, 10);
    if (settingsCount === 0) {
      console.log('Seeding default settings...');
      const defaults = {
        minPasswordLength: 8,
        minTopUpAmount: 500,
        enable2FA: false
      };
      try {
        await client.query('INSERT INTO settings (key, value) VALUES ($1,$2)', ['platform_defaults', defaults]);
        console.log('Default settings seeded');
      } catch (err) { console.error('Seeding settings failed:', err); }
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
