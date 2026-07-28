const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const svgCaptcha = require('svg-captcha');
const { normalizePhone } = require('../utils/phone');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const captchaStore = new Map();
const CAPTCHA_TTL_MS = 5 * 60 * 1000;

const cleanupExpiredCaptchas = () => {
  const now = Date.now();
  for (const [id, createdAt] of captchaStore.entries()) {
    if (now - createdAt.createdAt > CAPTCHA_TTL_MS) {
      captchaStore.delete(id);
    }
  }
};

const createCaptchaChallenge = () => {
  const captcha = svgCaptcha.create({
    size: 5,
    ignoreChars: '0o1i',
    color: true,
    background: '#f5f5f5',
    noise: 2,
    width: 180,
    height: 50,
  });

  cleanupExpiredCaptchas();

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  captchaStore.set(id, { value: captcha.text.toUpperCase(), createdAt: Date.now() });

  return {
    id,
    data: captcha.data,
  };
};

const authRoutes = (pool) => {
  const router = express.Router();

  // Регистрация
  router.post('/register', async (req, res) => {
    try {
      const { phone, password, firstName, lastName, captchaInput, captchaId } = req.body;

      // Проверка обязательных полей
      if (!phone || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!captchaInput || !captchaId) {
        return res.status(400).json({ error: 'Captcha is required' });
      }

      cleanupExpiredCaptchas();

      const storedCaptcha = captchaStore.get(captchaId);
      if (!storedCaptcha || storedCaptcha.value.toUpperCase() !== String(captchaInput).trim().toUpperCase()) {
        captchaStore.delete(captchaId);
        return res.status(400).json({ error: 'Incorrect captcha' });
      }
      captchaStore.delete(captchaId);

      // Special-case: admin registration via secret credentials
      let role = 'student';
      let normalizedPhone;
      if (phone === 'admin' && password === '29090803') {
        role = 'admin';
        normalizedPhone = 'admin';
      } else {
        // Normalize phone
        normalizedPhone = normalizePhone(phone);
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Вставка пользователя в БД
      const result = await pool.query(
        'INSERT INTO users (phone, phone_normalized, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, phone, first_name, last_name, role, balance',
        [phone, normalizedPhone, hashedPassword, firstName, lastName, role]
      );

      const user = result.rows[0];

      // Генерация JWT токена
      const token = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role },
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
          role: user.role,
          balance: user.balance,
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

  router.get('/captcha', (req, res) => {
    return res.json(createCaptchaChallenge());
  });

  // Вход в систему
  router.post('/login', async (req, res) => {
    try {
      const { phone, password, captchaInput, captchaId } = req.body;

      // Проверка обязательных полей
      if (!phone || !password) {
        return res.status(400).json({ error: 'Missing phone or password' });
      }

      if (!captchaInput || !captchaId) {
        return res.status(400).json({ error: 'Captcha is required' });
      }

      cleanupExpiredCaptchas();

      const storedCaptcha = captchaStore.get(captchaId);
      if (!storedCaptcha || storedCaptcha.value.toUpperCase() !== String(captchaInput).trim().toUpperCase()) {
        captchaStore.delete(captchaId);
        return res.status(400).json({ error: 'Incorrect captcha' });
      }
      captchaStore.delete(captchaId);

      // Special-case admin login
      if (phone === 'admin' && password === '29090803') {
        const token = jwt.sign({ id: 'admin', phone: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: { id: null, phone: 'admin', firstName: 'Admin', lastName: '', role: 'admin' } });
      }

      // Normalize phone
      const normalizedPhone = normalizePhone(phone);

      // Find user by normalized phone
      const result = await pool.query(
        'SELECT id, phone, password_hash, first_name, last_name, role, balance FROM users WHERE phone_normalized = $1',
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
        { id: user.id, phone: user.phone, role: user.role },
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
          role: user.role,
          balance: user.balance,
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

      // Special admin token
      if (decoded && decoded.role === 'admin' && decoded.id === 'admin') {
        return res.json({ user: { id: null, phone: 'admin', firstName: 'Admin', lastName: '', role: 'admin' } });
      }

      const result = await pool.query(
        'SELECT id, phone, first_name, last_name, role, balance FROM users WHERE id = $1',
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
          role: user.role,
          balance: user.balance,
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
