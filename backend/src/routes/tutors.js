const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'tutors');
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

const tutorRoutes = (pool) => {
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

  router.get('/', verifyToken, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name, specialty, bio, education, documents, img_url, created_at FROM tutors ORDER BY id DESC'
      );
      return res.json({ tutors: result.rows });
    } catch (err) {
      console.error('Admin get tutors error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', verifyToken, adminOnly, upload.single('photo'), async (req, res) => {
    try {
      const { name, specialty, bio, education, documents } = req.body;
      if (!name || !specialty) {
        return res.status(400).json({ error: 'Name and specialty are required' });
      }
      const imgUrl = req.file ? `/uploads/tutors/${req.file.filename}` : '';
      const result = await pool.query(
        'INSERT INTO tutors (name, specialty, bio, education, documents, img_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, specialty, bio, education, documents, img_url, created_at',
        [name, specialty, bio || '', education || '', documents || '', imgUrl]
      );
      return res.status(201).json({ tutor: result.rows[0] });
    } catch (err) {
      console.error('Admin add tutor error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM tutors WHERE id = $1 RETURNING id',
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Tutor not found' });
      return res.json({ deleted: true });
    } catch (err) {
      console.error('Admin delete tutor error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = tutorRoutes;