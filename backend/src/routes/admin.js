const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const adminRoutes = (pool) => {
  const router = express.Router();

  const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  // Получить список пользователей (поддерживает поиск по q + пагинацию)
  // Public endpoint: allow anyone to view non-sensitive user info (id, phone, name, created_at)
  router.get('/users', async (req, res) => {
    try {
      const q = (req.query.q || '').toString().trim();
      const page = Math.max(1, parseInt(req.query.page || '1'));
      const perPage = Math.min(100, parseInt(req.query.per_page || '10'));
      const offset = (page - 1) * perPage;

      let rowsResult;
      let total = 0;

      if (q) {
        const pattern = `%${q}%`;
        const countRes = await pool.query(
          `SELECT COUNT(*) AS count FROM users WHERE phone ILIKE $1 OR phone_normalized ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`,
          [pattern]
        );
        total = parseInt(countRes.rows[0].count, 10);

        rowsResult = await pool.query(
          `SELECT id, phone, first_name, last_name, created_at
           FROM users
           WHERE phone ILIKE $1 OR phone_normalized ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
           ORDER BY id DESC
           LIMIT $2 OFFSET $3`,
          [pattern, perPage, offset]
        );
      } else {
        const countRes = await pool.query('SELECT COUNT(*) AS count FROM users');
        total = parseInt(countRes.rows[0].count, 10);

        rowsResult = await pool.query(
          'SELECT id, phone, first_name, last_name, created_at FROM users ORDER BY id DESC LIMIT $1 OFFSET $2',
          [perPage, offset]
        );
      }

      return res.json({ users: rowsResult.rows, total });
    } catch (err) {
      console.error('Admin get users error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Назначить роль (например, teacher)
  router.post('/assign-role', verifyToken, adminOnly, async (req, res) => {
    try {
      const { userId, role } = req.body;
      if (!userId || !role) return res.status(400).json({ error: 'Missing userId or role' });

      const result = await pool.query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, phone, first_name, last_name, role, balance',
        [role, userId]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      return res.json({ user: result.rows[0] });
    } catch (err) {
      console.error('Admin assign role error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = adminRoutes;
