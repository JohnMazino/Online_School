const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'lectures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

const lectureRoutes = (pool) => {
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

  const teacherOrAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'teacher')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  // Получить все лекции (публично)
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, title, file_name, file_path, file_size, description, teacher_id, created_at FROM lectures ORDER BY created_at DESC'
      );
      return res.json({ lectures: result.rows });
    } catch (err) {
      console.error('Get lectures error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Загрузить лекцию (только teacher/admin)
  router.post('/', verifyToken, teacherOrAdmin, upload.single('file'), async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title || !req.file) {
        return res.status(400).json({ error: 'Title and file are required' });
      }
      const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const filePath = `/uploads/lectures/${req.file.filename}`;
      const result = await pool.query(
        'INSERT INTO lectures (title, file_name, file_path, file_size, description, teacher_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, file_name, file_path, file_size, description, teacher_id, created_at',
        [title, fileName, filePath, req.file.size, description || '', req.user.id]
      );
      return res.status(201).json({ lecture: result.rows[0] });
    } catch (err) {
      console.error('Upload lecture error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Удалить лекцию (только teacher/admin)
  router.delete('/:id', verifyToken, teacherOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM lectures WHERE id = $1 RETURNING id',
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Lecture not found' });
      return res.json({ deleted: true });
    } catch (err) {
      console.error('Delete lecture error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Порядок лекций (teacher/admin)
  router.put('/reorder', verifyToken, teacherOrAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
      for (let i = 0; i < ids.length; i++) {
        await pool.query('UPDATE lectures SET created_at = NOW() - (interval \'1 day\' * $1) WHERE id = $2', [i, ids[i]]);
      }
      return res.json({ reordered: true });
    } catch (err) {
      console.error('Reorder lectures error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = lectureRoutes;