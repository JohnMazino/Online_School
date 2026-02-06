const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Создать тест (включая разделы и вопросы)
  router.post('/create', async (req, res) => {
    const client = await pool.connect();
    try {
      const { title, subject, grade, exam_type, description, sections, created_by } = req.body;

      await client.query('BEGIN');

      const testRes = await client.query(
        `INSERT INTO tests (title, subject, grade, exam_type, description, created_by, total_questions, total_points)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [title, subject, grade, exam_type, description || null, created_by || null,
          (sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0),
          (sections || []).reduce((p, sec) => p + (sec.questions?.reduce((qsum, q) => qsum + (q.points || 0), 0) || 0), 0)
        ]
      );

      const test = testRes.rows[0];

      if (sections && sections.length) {
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const secRes = await client.query(
            `INSERT INTO sections (test_id, title, description, max_points, time_limit, position)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [test.id, sec.title || `Раздел ${i+1}`, sec.description || null, sec.max_points || null, sec.time_limit || null, i]
          );

          const section = secRes.rows[0];

          if (sec.questions && sec.questions.length) {
            for (let j = 0; j < sec.questions.length; j++) {
              const q = sec.questions[j];
              const meta = {};
              if (q.variants) meta.variants = q.variants;
              if (q.matches) meta.matches = q.matches;
              if (q.orderItems) meta.orderItems = q.orderItems;
              if (q.correctAnswer) meta.correctAnswer = q.correctAnswer;
              if (q.fileTypes) meta.fileTypes = q.fileTypes;
              if (q.explanation) meta.explanation = q.explanation;

              await client.query(
                `INSERT INTO questions (section_id, type, text, points, time_limit, meta, position)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [section.id, q.type, q.text || null, q.points || 1, q.time || null, meta, j]
              );
            }
          }
        }
      }

      await client.query('COMMIT');

      res.json({ success: true, test_id: test.id });
    } catch (err) {
      await client.query('ROLLBACK').catch(()=>{});
      console.error('Create test error', err);
      res.status(500).json({ error: 'Failed to create test' });
    } finally {
      client.release();
    }
  });

  // Получить тест с секциями и вопросами
  router.get('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
      const id = Number(req.params.id);
      const testRes = await client.query('SELECT * FROM tests WHERE id=$1', [id]);
      if (testRes.rowCount === 0) return res.status(404).json({ error: 'Test not found' });
      const test = testRes.rows[0];

      const sectionsRes = await client.query('SELECT * FROM sections WHERE test_id=$1 ORDER BY position', [id]);
      const sections = [];
      for (const s of sectionsRes.rows) {
        const qs = await client.query('SELECT * FROM questions WHERE section_id=$1 ORDER BY position', [s.id]);
        sections.push({ ...s, questions: qs.rows });
      }

      res.json({ ...test, sections });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch test' });
    } finally {
      client.release();
    }
  });

  // Назначить тест пользователю
  router.post('/assign', async (req, res) => {
    const client = await pool.connect();
    try {
      const { test_id, assigned_to, assigned_by, due_date } = req.body;
      const q = await client.query(
        `INSERT INTO assignments (test_id, assigned_to, assigned_by, due_date) VALUES ($1,$2,$3,$4) RETURNING *`,
        [test_id, assigned_to, assigned_by || null, due_date || null]
      );
      res.json(q.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to assign test' });
    } finally {
      client.release();
    }
  });

  // Назначить тест нескольким пользователям (batch)
  router.post('/assign/batch', async (req, res) => {
    const client = await pool.connect();
    try {
      const { test_id, assigned_to, assigned_by, due_date } = req.body; // assigned_to: [userId]
      if (!Array.isArray(assigned_to)) return res.status(400).json({ error: 'assigned_to must be array' });
      await client.query('BEGIN');
      const inserted = [];
      for (const userId of assigned_to) {
        const q = await client.query(`INSERT INTO assignments (test_id, assigned_to, assigned_by, due_date) VALUES ($1,$2,$3,$4) RETURNING *`, [test_id, userId, assigned_by || null, due_date || null]);
        inserted.push(q.rows[0]);
      }
      await client.query('COMMIT');
      res.json({ inserted });
    } catch (err) {
      await client.query('ROLLBACK').catch(()=>{});
      console.error(err);
      res.status(500).json({ error: 'Failed to assign batch' });
    } finally {
      client.release();
    }
  });

  // Список назначенных тестов для пользователя
  router.get('/assigned/user/:userId', async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = Number(req.params.userId);
      const q = await client.query(
        `SELECT a.*, t.title, t.description, t.is_active FROM assignments a JOIN tests t ON a.test_id = t.id WHERE a.assigned_to=$1 ORDER BY a.assigned_at DESC`,
        [userId]
      );
      res.json(q.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    } finally {
      client.release();
    }
  });

  // Отправить попытку прохождения теста
  router.post('/submit', async (req, res) => {
    const client = await pool.connect();
    try {
      const { test_id, user_id, answers } = req.body; // answers: [{ question_id, answer }]
      await client.query('BEGIN');

      const attRes = await client.query(
        `INSERT INTO attempts (test_id, user_id, started_at) VALUES ($1,$2,NOW()) RETURNING *`,
        [test_id, user_id]
      );
      const attempt = attRes.rows[0];

      // Load correct answers
      const qRes = await client.query(`SELECT q.id, q.type, q.points, q.meta FROM questions q JOIN sections s ON q.section_id = s.id WHERE s.test_id=$1`, [test_id]);
      const questionMap = new Map();
      for (const r of qRes.rows) questionMap.set(r.id, r);

      let totalScore = 0;
      for (const a of answers) {
        const q = questionMap.get(a.question_id);
        let awarded = 0;
        try {
          const meta = q.meta || {};
          if (q.type === 'single') {
            const correct = (meta.variants || []).find(v => v.isCorrect);
            if (correct && String(a.answer) === String(correct.id || correct.text)) awarded = q.points;
          } else if (q.type === 'multiple') {
            const correctIds = (meta.variants || []).filter(v=>v.isCorrect).map(v=>String(v.id || v.text));
            const given = (a.answer || []).map(String);
            const intersect = given.filter(x=>correctIds.includes(x)).length;
            const precision = intersect / Math.max(1, correctIds.length);
            awarded = Number((q.points * precision).toFixed(2));
          } else if (q.type === 'match') {
            const correctMap = {};
            (meta.matches || []).forEach(m => { correctMap[m.left] = m.right; });
            let ok = 0;
            for (const pair of (a.answer || [])) {
              if (correctMap[pair.left] && String(correctMap[pair.left]) === String(pair.right)) ok++;
            }
            awarded = Number(((q.points * ok) / Math.max(1, (meta.matches||[]).length)).toFixed(2));
          } else if (q.type === 'order') {
            const correct = (meta.orderItems || []).map(o => o.id);
            const given = (a.answer || []).map(String);
            let ok = 0;
            for (let i=0;i<Math.min(correct.length, given.length);i++) if (String(correct[i]) === given[i]) ok++;
            awarded = Number(((q.points * ok) / Math.max(1, correct.length)).toFixed(2));
          } else if (q.type === 'open' || q.type === 'file') {
            awarded = 0; // require manual grading
          }
        } catch (e) {
          console.warn('grading error', e);
        }

        totalScore += awarded;
        // Ensure answer is stored as valid JSON (JSONB column) — accept primitive values from client
        const answerVal = (a.answer === undefined || a.answer === null) ? null : JSON.stringify(a.answer);
        await client.query(`INSERT INTO answers (attempt_id, question_id, answer, points_awarded) VALUES ($1,$2,$3,$4)`, [attempt.id, a.question_id, answerVal, awarded]);
      }

      await client.query(`UPDATE attempts SET finished_at = NOW(), score=$1 WHERE id=$2`, [totalScore, attempt.id]);

      // Отметим назначение как пройденное
      try {
        await client.query(`UPDATE assignments SET status='completed' WHERE test_id=$1 AND assigned_to=$2 AND status!='completed'`, [test_id, user_id]);
      } catch (e) {
        console.warn('Failed to update assignment status', e);
      }

      await client.query('COMMIT');
      res.json({ attempt_id: attempt.id, score: totalScore });
    } catch (err) {
      await client.query('ROLLBACK').catch(()=>{});
      console.error(err);
      res.status(500).json({ error: 'Failed to submit attempt' });
    } finally {
      client.release();
    }
  });

  // Получить все попытки пользователя
  router.get('/attempts/user/:userId', async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = Number(req.params.userId);
      const q = await client.query(`SELECT a.*, t.title as test_title, t.description as test_description FROM attempts a JOIN tests t ON a.test_id = t.id WHERE a.user_id=$1 ORDER BY a.finished_at DESC`, [userId]);
      res.json(q.rows.map(r => ({ id: r.id, test_id: r.test_id, title: r.test_title, finished_at: r.finished_at, score: r.score })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch attempts' });
    } finally {
      client.release();
    }
  });

  return router;
};
