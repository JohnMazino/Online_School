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
      const { name, description, gameType } = req.body;
      const teacherId = req.user.id;
      const normalizedGameType = gameType === 'matching' ? 'matching' : 'quiz';

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Topic name is required' });
      }

      const result = await pool.query(
        `INSERT INTO quiz_topics (teacher_id, name, description, game_type, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING *`,
        [teacherId, name.trim(), description || '', normalizedGameType]
      );

      const topic = result.rows[0];
      topic.gameType = topic.game_type || 'quiz';
      delete topic.game_type;

      return res.status(201).json({ topic });
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
        `SELECT qt.id, qt.teacher_id, qt.name, qt.description, qt.created_at, qt.game_type,
                COUNT(qq.id) as question_count
         FROM quiz_topics qt
         LEFT JOIN quiz_questions qq ON qt.id = qq.topic_id
         WHERE qt.teacher_id = $1
         GROUP BY qt.id
         ORDER BY qt.created_at DESC`,
        [teacherId]
      );

      const topics = result.rows.map(topic => ({
        ...topic,
        gameType: topic.game_type || 'quiz',
      }));

      return res.json({ topics });
    } catch (err) {
      console.error('Get quiz topics error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить все темы (для учеников)
  router.get('/topics/all', verifyToken, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT qt.id, qt.teacher_id, qt.name, qt.description, qt.created_at, qt.game_type,
                u.first_name, u.last_name,
                COUNT(qq.id) as question_count
         FROM quiz_topics qt
         JOIN users u ON qt.teacher_id = u.id
         LEFT JOIN quiz_questions qq ON qt.id = qq.topic_id
         GROUP BY qt.id, u.first_name, u.last_name
         ORDER BY qt.created_at DESC`
      );

      const topics = result.rows.map(topic => ({
        ...topic,
        gameType: topic.game_type || 'quiz',
      }));

      return res.json({ topics });
    } catch (err) {
      console.error('Get all quiz topics error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Обновить тему
  router.put('/topics/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, gameType } = req.body;
      const teacherId = req.user.id;
      const normalizedGameType = gameType === 'matching' ? 'matching' : null;

      const result = await pool.query(
        `UPDATE quiz_topics
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             game_type = COALESCE($3, game_type)
         WHERE id = $4 AND teacher_id = $5
         RETURNING *`,
        [name, description, normalizedGameType, id, teacherId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      const topic = result.rows[0];
      topic.gameType = topic.game_type || 'quiz';
      delete topic.game_type;

      return res.json({ topic });
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
      const { topicId, text, options, correctIndex, type, matchingPairs } = req.body;
      const teacherId = req.user.id;

      if (!topicId || !text) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      let normalizedPairs = [];
      let storedOptions = [];
      let storedCorrectIndex = null;

      // Infer question type: prefer explicit `type`, but if missing and `matchingPairs` provided - treat as matching
      const inferredType = type === 'matching' || (Array.isArray(matchingPairs) && matchingPairs.length > 0)
        ? 'matching'
        : (type === 'single' ? 'single' : type);

      if (inferredType === 'matching') {
        normalizedPairs = (matchingPairs || [])
          .filter(pair => pair && pair.left && pair.right)
          .map(pair => ({
            id: pair.id || Date.now(),
            left: String(pair.left).trim(),
            right: String(pair.right).trim(),
          }));

        if (normalizedPairs.length < 2) {
          return res.status(400).json({ error: 'At least 2 matching pairs required' });
        }

        storedOptions = { type: 'matching', pairs: normalizedPairs };
      } else {
        if (!Array.isArray(options) || options.length < 2) {
          return res.status(400).json({ error: 'At least 2 options required' });
        }

        if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= options.length) {
          return res.status(400).json({ error: 'Invalid correctIndex' });
        }

        storedOptions = options.filter(Boolean).map(String);
        storedCorrectIndex = correctIndex;
      }

      // Проверить что тема принадлежит учителю
      const topicCheck = await pool.query(
        'SELECT id, game_type FROM quiz_topics WHERE id = $1 AND teacher_id = $2',
        [topicId, teacherId]
      );

      if (topicCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Topic not found or not yours' });
      }

      const topicGameType = topicCheck.rows[0].game_type || 'quiz';
      if (topicGameType === 'matching' && type !== 'matching') {
        return res.status(400).json({ error: 'Matching topic only accepts matching questions' });
      }
      if (topicGameType === 'quiz' && type === 'matching') {
        return res.status(400).json({ error: 'Quiz topic does not accept matching questions' });
      }

      if (topicCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Topic not found or not yours' });
      }

      const result = await pool.query(
        `INSERT INTO quiz_questions (topic_id, text, options, correct_index)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [topicId, text, JSON.stringify(storedOptions), storedCorrectIndex ?? 0]
      );

      const question = result.rows[0];
      const parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      question.options = type === 'matching' ? normalizedPairs.map(pair => pair.right) : (Array.isArray(parsedOptions) ? parsedOptions : []);
      question.matchingPairs = type === 'matching' ? normalizedPairs : [];
      question.type = type === 'matching' ? 'matching' : 'single';

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
        const { topicId, text, options, correctIndex, type, matchingPairs } = q;

        if (!topicId || !text) {
          continue;
        }

        let normalizedPairs = [];
        let storedOptions = [];
        let storedCorrectIndex = null;

        // Infer type for bulk items: prefer explicit `type`, but if missing and `matchingPairs` provided - treat as matching
        const itemInferredType = type === 'matching' || (Array.isArray(matchingPairs) && matchingPairs.length > 0)
          ? 'matching'
          : (type === 'single' ? 'single' : type);

        if (itemInferredType === 'matching') {
          normalizedPairs = (matchingPairs || [])
            .filter(pair => pair && pair.left && pair.right)
            .map(pair => ({
              id: pair.id || Date.now(),
              left: String(pair.left).trim(),
              right: String(pair.right).trim(),
            }));

          if (normalizedPairs.length < 2) {
            continue;
          }

          storedOptions = { type: 'matching', pairs: normalizedPairs };
        } else {
          if (!Array.isArray(options) || options.length < 2) {
            continue;
          }

          if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= options.length) {
            continue;
          }

          storedOptions = options.filter(Boolean).map(String);
          storedCorrectIndex = correctIndex;
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
          [topicId, text, JSON.stringify(storedOptions), storedCorrectIndex ?? 0]
        );

        const question = result.rows[0];
        const parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
        question.options = type === 'matching' ? normalizedPairs.map(pair => pair.right) : (Array.isArray(parsedOptions) ? parsedOptions : []);
        question.matchingPairs = type === 'matching' ? normalizedPairs : [];
        question.type = type === 'matching' ? 'matching' : 'single';
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

      const questions = result.rows.map(q => {
        const parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        const isMatching = parsedOptions && typeof parsedOptions === 'object' && parsedOptions.type === 'matching' && Array.isArray(parsedOptions.pairs);

        return {
          ...q,
          type: isMatching ? 'matching' : 'single',
          matchingPairs: isMatching ? parsedOptions.pairs : [],
          options: isMatching ? parsedOptions.pairs.map(pair => pair.right) : (Array.isArray(parsedOptions) ? parsedOptions : []),
        };
      });

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
      const { text, options, correctIndex, type, matchingPairs } = req.body;
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

      let storedOptions = options;
      let storedCorrectIndex = correctIndex;

      if (type === 'matching') {
        const normalizedPairs = (matchingPairs || [])
          .filter(pair => pair && pair.left && pair.right)
          .map(pair => ({
            id: pair.id || Date.now(),
            left: String(pair.left).trim(),
            right: String(pair.right).trim(),
          }));

        storedOptions = { type: 'matching', pairs: normalizedPairs };
        storedCorrectIndex = null;
      }

      const result = await pool.query(
        `UPDATE quiz_questions
         SET text = COALESCE($1, text),
             options = COALESCE($2, options),
             correct_index = COALESCE($3, correct_index)
         WHERE id = $4
         RETURNING *`,
        [text, storedOptions ? JSON.stringify(storedOptions) : null, storedCorrectIndex ?? 0, id]
      );

      const question = result.rows[0];
      const parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      const isMatching = parsedOptions && typeof parsedOptions === 'object' && parsedOptions.type === 'matching' && Array.isArray(parsedOptions.pairs);
      question.type = isMatching ? 'matching' : 'single';
      question.matchingPairs = isMatching ? parsedOptions.pairs : [];
      question.options = isMatching ? parsedOptions.pairs.map(pair => pair.right) : (Array.isArray(parsedOptions) ? parsedOptions : []);

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