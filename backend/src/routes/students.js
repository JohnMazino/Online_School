const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const studentRoutes = (pool) => {
  const router = express.Router();

  const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('No authorization header provided');
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      console.warn('Token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Получить всех студентов текущего преподавателя
  router.get('/', verifyToken, async (req, res) => {
    try {
      const teacherId = req.user.id;
      
      // Получить студентов этого преподавателя
      const result = await pool.query(
        `SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.email, u.phone
         FROM users u
         WHERE u.id IN (
           SELECT student_id FROM teacher_students WHERE teacher_id = $1
         )
         ORDER BY u.first_name, u.last_name`,
        [teacherId]
      );

      console.log(`Fetched ${result.rows.length} students for teacher ${teacherId}`);
      return res.json({ students: result.rows || [] });
    } catch (err) {
      console.error('Get students error:', err);
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

  // Поиск студентов по имени/email/телефону
  router.get('/search', verifyToken, async (req, res) => {
    try {
      const teacherId = req.user.id;
      const query = (req.query.q || '').toString().trim();
      
      if (!query) {
        return res.json({ students: [] });
      }

      const pattern = `%${query}%`;
      const result = await pool.query(
        `SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.email, u.phone
         FROM users u
         WHERE u.id IN (
           SELECT student_id FROM teacher_students WHERE teacher_id = $1
         )
         AND (u.first_name ILIKE $2 OR u.last_name ILIKE $2 OR u.email ILIKE $2 OR u.phone ILIKE $2)
         ORDER BY u.first_name, u.last_name
         LIMIT 100`,
        [teacherId, pattern]
      );

      console.log(`Found ${result.rows.length} students matching query: ${query}`);
      return res.json({ students: result.rows || [] });
    } catch (err) {
      console.error('Search students error:', err);
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

  return router;
};

module.exports = studentRoutes;
