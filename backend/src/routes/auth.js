const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { normalizePhone } = require('../utils/phone');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const authRoutes = (pool) => {
  const router = express.Router();

  // Регистрация
  router.post('/register', async (req, res) => {
    try {
      const { phone, password, firstName, lastName } = req.body;

      // Проверка обязательных полей
      if (!phone || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Normalize phone
      const normalizedPhone = normalizePhone(phone);

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Вставка пользователя в БД
      const result = await pool.query(
        'INSERT INTO users (phone, phone_normalized, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, phone, first_name, last_name',
        [phone, normalizedPhone, hashedPassword, firstName, lastName]
      );

      const user = result.rows[0];

      // Генерация JWT токена
      const token = jwt.sign(
        { id: user.id, phone: user.phone },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        token,
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Вход в систему
  router.post('/login', async (req, res) => {
    try {
      const { phone, password } = req.body;

      // Проверка обязательных полей
      if (!phone || !password) {
        return res.status(400).json({ error: 'Missing phone or password' });
      }

      // Normalize phone
      const normalizedPhone = normalizePhone(phone);

      // Find user by normalized phone
      const result = await pool.query(
        'SELECT id, phone, password_hash, first_name, last_name FROM users WHERE phone_normalized = $1',
        [normalizedPhone]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid phone or password' });
      }

      const user = result.rows[0];

      // Проверка пароля
      const passwordMatch = await bcryptjs.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid phone or password' });
      }

      // Генерация JWT токена
      const token = jwt.sign(
        { id: user.id, phone: user.phone },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получение профиля
  router.get('/profile', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      const result = await pool.query(
        'SELECT id, phone, first_name, last_name FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      return res.json({
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    } catch (error) {
      console.error('Profile error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
};

module.exports = authRoutes;
