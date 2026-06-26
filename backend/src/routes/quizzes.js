const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const quizRoutes = (pool) => {
  const router = express.Router();

  const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // ===== ТЕМЫ КВИЗИ =====

  // Создать тему (только для учителей)
  router.post('/topics', verifyToken, async (req, res) => {
    try {
      const { name, description } = req.body;
      const teacherId = req.user.id;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Topic name is required' });
      }

      const result = await pool.query(
        `INSERT INTO quiz_topics (teacher_id, name, description, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING *`,
        [teacherId, name.trim(), description || '']
      );

      return res.status(201).json({ topic: result.rows[0] });
    } catch (err) {
      console.error('Create quiz topic error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить темы учителя
  router.get('/topics', verifyToken, async (req, res) => {
    try {
      const teacherId = req.user.id;

      const result = await pool.query(
        `SELECT qt.id, qt.teacher_id, qt.name, qt.description, qt.created_at,
                COUNT(qq.id) as question_count
         FROM quiz_topics qt
         LEFT JOIN quiz_questions qq ON qt.id = qq.topic_id
         WHERE qt.teacher_id = $1
         GROUP BY qt.id
         ORDER BY qt.created_at DESC`,
        [teacherId]
      );

      return res.json({ topics: result.rows });
    } catch (err) {
      console.error('Get quiz topics error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить все темы (для учеников)
  router.get('/topics/all', verifyToken, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT qt.id, qt.teacher_id, qt.name, qt.description, qt.created_at,
                u.first_name, u.last_name,
                COUNT(qq.id) as question_count
         FROM quiz_topics qt
         JOIN users u ON qt.teacher_id = u.id
         LEFT JOIN quiz_questions qq ON qt.id = qq.topic_id
         GROUP BY qt.id, u.first_name, u.last_name
         ORDER BY qt.created_at DESC`
      );

      return res.json({ topics: result.rows });
    } catch (err) {
      console.error('Get all quiz topics error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Обновить тему
  router.put('/topics/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const teacherId = req.user.id;

      const result = await pool.query(
        `UPDATE quiz_topics
         SET name = COALESCE($1, name),
             description = COALESCE($2, description)
         WHERE id = $3 AND teacher_id = $4
         RETURNING *`,
        [name, description, id, teacherId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      return res.json({ topic: result.rows[0] });
    } catch (err) {
      console.error('Update quiz topic error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Удалить тему (вместе со всеми вопросами)
  router.delete('/topics/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = req.user.id;

      const result = await pool.query(
        `DELETE FROM quiz_topics WHERE id = $1 AND teacher_id = $2 RETURNING id`,
        [id, teacherId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      return res.json({ message: 'Topic deleted' });
    } catch (err) {
      console.error('Delete quiz topic error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ===== ВОПРОСЫ КВИЗИ =====

  // Создать один вопрос
  router.post('/questions', verifyToken, async (req, res) => {
    try {
      const { topicId, text, options, correctIndex } = req.body;
      const teacherId = req.user.id;

      if (!topicId || !text || !options || correctIndex === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'At least 2 options required' });
      }

      if (correctIndex < 0 || correctIndex >= options.length) {
        return res.status(400).json({ error: 'Invalid correctIndex' });
      }

      // Проверить что тема принадлежит учителю
      const topicCheck = await pool.query(
        'SELECT id FROM quiz_topics WHERE id = $1 AND teacher_id = $2',
        [topicId, teacherId]
      );

      if (topicCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Topic not found or not yours' });
      }

      const result = await pool.query(
        `INSERT INTO quiz_questions (topic_id, text, options, correct_index)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [topicId, text, JSON.stringify(options), correctIndex]
      );

      const question = result.rows[0];
      question.options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;

      return res.status(201).json({ question });
    } catch (err) {
      console.error('Create quiz question error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Создать несколько вопросов сразу
  router.post('/questions/bulk', verifyToken, async (req, res) => {
    try {
      const { questions } = req.body;
      const teacherId = req.user.id;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Questions array is required' });
      }

      const createdQuestions = [];

      for (const q of questions) {
        const { topicId, text, options, correctIndex } = q;

        if (!topicId || !text || !options || correctIndex === undefined) {
          continue;
        }

        if (!Array.isArray(options) || options.length < 2) {
          continue;
        }

        if (correctIndex < 0 || correctIndex >= options.length) {
          continue;
        }

        // Проверить что тема принадлежит учителю
        const topicCheck = await pool.query(
          'SELECT id FROM quiz_topics WHERE id = $1 AND teacher_id = $2',
          [topicId, teacherId]
        );

        if (topicCheck.rows.length === 0) {
          continue;
        }

        const result = await pool.query(
          `INSERT INTO quiz_questions (topic_id, text, options, correct_index)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [topicId, text, JSON.stringify(options), correctIndex]
        );

        const question = result.rows[0];
        question.options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
        createdQuestions.push(question);
      }

      return res.status(201).json({ questions: createdQuestions });
    } catch (err) {
      console.error('Bulk create quiz questions error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить вопросы по теме
  router.get('/topics/:topicId/questions', verifyToken, async (req, res) => {
    try {
      const { topicId } = req.params;

      const result = await pool.query(
        `SELECT * FROM quiz_questions WHERE topic_id = $1 ORDER BY id`,
        [topicId]
      );

      const questions = result.rows.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      }));

      return res.json({ questions });
    } catch (err) {
      console.error('Get quiz questions error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Обновить вопрос
  router.put('/questions/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { text, options, correctIndex } = req.body;
      const teacherId = req.user.id;

      // Проверить что вопрос принадлежит теме учителя
      const checkResult = await pool.query(
        `SELECT qq.* FROM quiz_questions qq
         JOIN quiz_topics qt ON qq.topic_id = qt.id
         WHERE qq.id = $1 AND qt.teacher_id = $2`,
        [id, teacherId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      const result = await pool.query(
        `UPDATE quiz_questions
         SET text = COALESCE($1, text),
             options = COALESCE($2, options),
             correct_index = COALESCE($3, correct_index)
         WHERE id = $4
         RETURNING *`,
        [text, options ? JSON.stringify(options) : null, correctIndex !== undefined ? correctIndex : null, id]
      );

      const question = result.rows[0];
      question.options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;

      return res.json({ question });
    } catch (err) {
      console.error('Update quiz question error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Удалить вопрос
  router.delete('/questions/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = req.user.id;

      // Проверить что вопрос принадлежит теме учителя
      const checkResult = await pool.query(
        `SELECT qq.id FROM quiz_questions qq
         JOIN quiz_topics qt ON qq.topic_id = qt.id
         WHERE qq.id = $1 AND qt.teacher_id = $2`,
        [id, teacherId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      await pool.query('DELETE FROM quiz_questions WHERE id = $1', [id]);

      return res.json({ message: 'Question deleted' });
    } catch (err) {
      console.error('Delete quiz question error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = quizRoutes;