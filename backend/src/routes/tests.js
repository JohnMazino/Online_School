const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const testRoutes = (pool) => {
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

  // Создать тест
  router.post('/', verifyToken, async (req, res) => {
    try {
      const { title, description, questions, status, timeLimit } = req.body;
      const teacherId = req.user.id;

      if (!title || !questions) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await pool.query(
        `INSERT INTO tests (teacher_id, title, description, questions, status, time_limit, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING *`,
        [teacherId, title, description || '', JSON.stringify(questions), status || 'draft', timeLimit || 0]
      );

      return res.status(201).json({ test: result.rows[0] });
    } catch (err) {
      console.error('Create test error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить все тесты преподавателя
  router.get('/', verifyToken, async (req, res) => {
    try {
      const teacherId = req.user.id;

      const result = await pool.query(
        `SELECT id, teacher_id, title, description, questions, status, time_limit, created_at
         FROM tests
         WHERE teacher_id = $1
         ORDER BY created_at DESC`,
        [teacherId]
      );

      const tests = result.rows.map(row => ({
        ...row,
        questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions
      }));

      return res.json({ tests });
    } catch (err) {
      console.error('Get tests error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Назначить тест студенту
  router.post('/assign', verifyToken, async (req, res) => {
    try {
      const { testId, studentId, dueDate } = req.body;
      const teacherId = req.user.id;

      if (!testId || !studentId) {
        return res.status(400).json({ error: 'Missing testId or studentId' });
      }

      // Проверить, что тест принадлежит преподавателю
      const testCheck = await pool.query(
        'SELECT id FROM tests WHERE id = $1 AND teacher_id = $2',
        [testId, teacherId]
      );

      if (testCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Test not found or not your test' });
      }

      const result = await pool.query(
        `INSERT INTO test_assignments (test_id, teacher_id, student_id, due_date, assigned_at, status)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'pending')
         RETURNING *`,
        [testId, teacherId, studentId, dueDate || null]
      );

      return res.status(201).json({ assignment: result.rows[0] });
    } catch (err) {
      console.error('Assign test error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить назначенные тесты для студента
  router.get('/student/assignments', verifyToken, async (req, res) => {
    try {
      const studentId = req.user.id;

      const result = await pool.query(
        `SELECT ta.id, ta.test_id, ta.due_date, ta.assigned_at, ta.status,
                t.title, t.description, t.questions, t.time_limit,
                u.first_name, u.last_name,
                tr.score, tr.max_score, tr.completed_at
         FROM test_assignments ta
         JOIN tests t ON ta.test_id = t.id
         JOIN users u ON t.teacher_id = u.id
         LEFT JOIN test_results tr ON ta.id = tr.assignment_id
         WHERE ta.student_id = $1
         ORDER BY ta.assigned_at DESC`,
        [studentId]
      );

      return res.json({ assignments: result.rows });
    } catch (err) {
      console.error('Get student assignments error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить один тест (для учителя владельца или студента при наличии назначения)
  router.get('/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Если это учитель, то может получить только свои тесты
      if (userRole === 'teacher') {
        const result = await pool.query(
          `SELECT id, teacher_id, title, description, questions, status, time_limit, created_at
           FROM tests
           WHERE id = $1 AND teacher_id = $2`,
          [id, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Test not found' });
        }

        const test = result.rows[0];
        test.questions = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions;
        return res.json({ test });
      }

      // Если это студент, то может получить только назначенные тесты
      if (userRole === 'student') {
        const result = await pool.query(
          `SELECT t.id, t.teacher_id, t.title, t.description, t.questions, t.status, t.time_limit, t.created_at
           FROM tests t
           JOIN test_assignments ta ON t.id = ta.test_id
           WHERE t.id = $1 AND ta.student_id = $2`,
          [id, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Test not found or not assigned to you' });
        }

        const test = result.rows[0];
        test.questions = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions;
        return res.json({ test });
      }

      return res.status(403).json({ error: 'Unauthorized' });
    } catch (err) {
      console.error('Get test error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Обновить тест
  router.put('/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, questions, status, timeLimit } = req.body;
      const teacherId = req.user.id;

      const result = await pool.query(
        `UPDATE tests
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             questions = COALESCE($3, questions),
             status = COALESCE($4, status),
             time_limit = COALESCE($5, time_limit)
         WHERE id = $6 AND teacher_id = $7
         RETURNING *`,
        [title, description, questions ? JSON.stringify(questions) : null, status, timeLimit || null, id, teacherId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const test = result.rows[0];
      test.questions = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions;

      return res.json({ test });
    } catch (err) {
      console.error('Update test error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Отменить назначение теста
  router.delete('/assignments/:assignmentId', verifyToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const teacherId = req.user.id;

      // Проверить, что назначение принадлежит преподавателю
      const result = await pool.query(
        `DELETE FROM test_assignments 
         WHERE id = $1 AND teacher_id = $2 
         RETURNING id`,
        [assignmentId, teacherId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Assignment not found or not authorized' });
      }

      return res.json({ message: 'Assignment cancelled', id: result.rows[0].id });
    } catch (err) {
      console.error('Cancel assignment error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
});

  // Удалить тест
  router.delete('/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = req.user.id;

      const result = await pool.query(
        `DELETE FROM tests WHERE id = $1 AND teacher_id = $2 RETURNING id`,
        [id, teacherId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      return res.json({ message: 'Test deleted' });
    } catch (err) {
      console.error('Delete test error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Назначить тест студенту
  router.post('/assign', verifyToken, async (req, res) => {
    try {
      const { testId, studentId, dueDate } = req.body;
      const teacherId = req.user.id;

      if (!testId || !studentId) {
        return res.status(400).json({ error: 'Missing testId or studentId' });
      }

      // Проверить, что тест принадлежит преподавателю
      const testCheck = await pool.query(
        'SELECT id FROM tests WHERE id = $1 AND teacher_id = $2',
        [testId, teacherId]
      );

      if (testCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Test not found or not your test' });
      }

      const result = await pool.query(
        `INSERT INTO test_assignments (test_id, teacher_id, student_id, due_date, assigned_at, status)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'pending')
         RETURNING *`,
        [testId, teacherId, studentId, dueDate || null]
      );

      return res.status(201).json({ assignment: result.rows[0] });
    } catch (err) {
      console.error('Assign test error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить назначения теста (для преподавателя)
  router.get('/:id/assignments', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = req.user.id;

      // Проверить, что тест принадлежит преподавателю
      const testCheck = await pool.query(
        'SELECT id FROM tests WHERE id = $1 AND teacher_id = $2',
        [id, teacherId]
      );

      if (testCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Test not found or not your test' });
      }

      const result = await pool.query(
        `SELECT ta.id, ta.test_id, ta.student_id, ta.due_date, ta.assigned_at, ta.status,
                u.first_name, u.last_name, u.email
         FROM test_assignments ta
         JOIN users u ON ta.student_id = u.id
         WHERE ta.test_id = $1
         ORDER BY ta.assigned_at DESC`,
        [id]
      );

      return res.json({ assignments: result.rows });
    } catch (err) {
      console.error('Get assignments error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получить все назначения преподавателя
  // Получить все назначения преподавателя
router.get('/teacher/assignments-all', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;

        const result = await pool.query(
            `SELECT ta.id, ta.test_id, ta.student_id, ta.due_date, ta.assigned_at, ta.status,
                    u.first_name, u.last_name
             FROM test_assignments ta
             JOIN users u ON ta.student_id = u.id
             WHERE ta.teacher_id = $1
             ORDER BY ta.assigned_at DESC`,
            [teacherId]
        );

        // Трансформируем данные в удобный формат
        const assignments = result.rows.map(row => ({
            id: row.id,
            test_id: row.test_id,
            student_id: row.student_id,
            student_name: `${row.first_name} ${row.last_name}`,
            due_date: row.due_date,
            assigned_at: row.assigned_at,
            status: row.status
        }));

        return res.json({ assignments });
    } catch (err) {
        console.error('Get all assignments error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

  // ===== РЕЗУЛЬТАТЫ ТЕСТОВ =====

  // Сохранить результаты тестирования студента
  router.post('/results', verifyToken, async (req, res) => {
    try {
      const { testId, answers, timeTaken, randomizedTest } = req.body;
      const studentId = req.user.id;

      if (!testId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Проверить что тест назначен студенту
      const assignmentCheck = await pool.query(
        'SELECT id FROM test_assignments WHERE test_id = $1 AND student_id = $2',
        [testId, studentId]
      );

      if (assignmentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Test not assigned to you' });
      }

      const assignmentId = assignmentCheck.rows[0].id;

      // Получить тест для подсчета баллов
      const testResult = await pool.query(
        'SELECT id, questions FROM tests WHERE id = $1',
        [testId]
      );

      if (testResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const test = testResult.rows[0];
      let questions;
      try {
        questions = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions;
      } catch (parseErr) {
        console.error('Failed to parse questions:', parseErr);
        return res.status(500).json({ error: 'Invalid test data format' });
      }

      // Если есть randomizedTest от фронтенда, используем его для сравнения matching вопросов
      let randomizedQuestions = questions;
      console.log('\n=== RANDOMIZED TEST INFO ===');
      console.log('randomizedTest keys:', randomizedTest ? Object.keys(randomizedTest) : 'N/A');
      if (randomizedTest && randomizedTest.questions) {
        try {
          const randQuestions = typeof randomizedTest.questions === 'string' 
            ? JSON.parse(randomizedTest.questions) 
            : randomizedTest.questions;
          randomizedQuestions = randQuestions;
          console.log('✓ Using randomizedTest questions for matching comparison');
          console.log('  Randomized questions count:', randQuestions.length);
          randQuestions.forEach((q, idx) => {
            if (q.type === 'matching') {
              console.log(`  Randomized Q${q.id}: correctAnswers = [${q.correctAnswers}]`);
            }
          });
        } catch (randErr) {
          console.error('Could not parse randomizedTest.questions:', randErr.message);
        }
      } else {
        console.log('✗ No randomizedTest.questions, using original test');
      }

      // Подсчитать баллы
      let score = 0;
      let maxScore = 0;

      console.log('\n=== TEST SUBMISSION DEBUG ===');
      console.log('Test ID:', testId);
      console.log('Total questions:', questions.length);
      console.log('Student answers count:', answers.length);
      console.log('Using randomizedTest:', !!randomizedTest);

      for (const question of questions) {
        try {
          maxScore += question.points || 0;
          
          // Найти ответ студента на этот вопрос
          const studentAnswer = answers.find(a => a.questionId === question.id);
          
          if (!studentAnswer) continue;
          
          // Для matching вопросов используем randomizedQuestions если доступны
          let comparisonQuestion = question;
          if (question.type === 'matching' && randomizedTest) {
            const randQ = randomizedQuestions.find(q => q.id === question.id);
            comparisonQuestion = randQ || question;
            console.log('MATCHING: Using randomized version for Q', question.id);
          }

          // Сравнить ответы в зависимости от типа вопроса
          let isCorrect = false;
          let partialScore = 0; // для partial credit

          if (question.type === 'single') {
            // Для single: все или ничего
            const correctSorted = (question.correctAnswers || []).sort();
            const selectedSorted = (studentAnswer.selectedAnswers || []).sort();
            
            if (JSON.stringify(correctSorted) === JSON.stringify(selectedSorted)) {
              isCorrect = true;
            }
          } else if (question.type === 'multiple') {
            // Для multiple: поддержка partial credit
            const correctAnswers = question.correctAnswers || [];
            const selectedAnswers = studentAnswer.selectedAnswers || [];
            
            // Проверить если все правильные ответы совпадают
            const correctSorted = correctAnswers.slice().sort();
            const selectedSorted = selectedAnswers.slice().sort();
            
            if (JSON.stringify(correctSorted) === JSON.stringify(selectedSorted)) {
              // Полный балл - все ответы правильные
              isCorrect = true;
            } else {
              // Проверить partial credit
              // Подсчитать сколько выбранных ответов правильные
              const correctSelectedCount = selectedAnswers.filter(ans => correctAnswers.includes(ans)).length;
              // Подсчитать сколько неправильных выбрано
              const incorrectSelected = selectedAnswers.filter(ans => !correctAnswers.includes(ans)).length;
              
              // Partial credit только если:
              // 1. Нет неправильных ответов
              // 2. Выбраны хотя бы одни правильные
              if (incorrectSelected === 0 && correctSelectedCount > 0) {
                // Баллы = (правильные выбранные / всего правильных) * точки вопроса
                partialScore = (correctSelectedCount / correctAnswers.length) * (question.points || 0);
              }
            }
          } else if (question.type === 'matching') {
            // Для сопоставления: поддержка partial credit
            // Используем comparisonQuestion которая может быть randomized версией
            const matchingCorrectAnswers = comparisonQuestion.correctAnswers || [];
            const selectedAnswers = studentAnswer.selectedAnswers || [];
            
            // correctAnswers для matching это массив индексов правильного сопоставления
            // Важен порядок! selectedAnswers[i] должен быть === matchingCorrectAnswers[i]
            console.log('MATCHING DEBUG Q:', question.id);
            console.log('  Using comparisonQuestion type:', comparisonQuestion === question ? 'original' : 'randomized');
            console.log('  correctAnswers:', matchingCorrectAnswers);
            console.log('  selectedAnswers:', selectedAnswers);
            console.log('  comparison:', JSON.stringify(matchingCorrectAnswers) === JSON.stringify(selectedAnswers));
            
            if (JSON.stringify(matchingCorrectAnswers) === JSON.stringify(selectedAnswers)) {
              // Полный балл - все пары правильны
              isCorrect = true;
            } else {
              // Проверить partial credit
              // Подсчитать сколько пар сопоставлены правильно (по позиции)
              const correctMatchCount = selectedAnswers.filter((val, idx) => val === matchingCorrectAnswers[idx]).length;
              const totalPairs = matchingCorrectAnswers.length || 1;
              
              if (correctMatchCount > 0) {
                // Partial credit: (правильные пары / всего пар) * баллы
                partialScore = (correctMatchCount / totalPairs) * (question.points || 0);
                console.log('  MATCHING PARTIAL:', correctMatchCount, '/', totalPairs, '=', partialScore);
              }
            }
          }

          if (isCorrect) {
            score += question.points || 0;
          } else if (partialScore > 0) {
            score += partialScore;
          }
        } catch (questionErr) {
          console.error('Error processing question', question.id, ':', questionErr);
          // Continue с следующего вопроса, не падаем на этом
        }
      }

      // Округляем баллы до 2 знаков после запятой
      score = Math.round(score * 100) / 100;
      maxScore = Math.round(maxScore * 100) / 100;

      console.log('Final score:', score, '/', maxScore);

      // Сохранить результаты с баллами
      const result = await pool.query(
        `INSERT INTO test_results (assignment_id, student_id, answers, score, max_score, time_taken, randomized_test)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, assignment_id, student_id, answers, score, max_score, time_taken, completed_at, randomized_test`,
        [assignmentId, studentId, JSON.stringify(answers), score, maxScore, timeTaken || 0, 
         randomizedTest ? JSON.stringify(randomizedTest) : null]
      );

      if (result.rows.length === 0) {
        return res.status(500).json({ error: 'Failed to save test result' });
      }

      // Обновить статус назначения на "completed"
      await pool.query(
        `UPDATE test_assignments 
         SET status = 'completed'
         WHERE id = $1`,
        [assignmentId]
      );

      // Получить имя студента
      const studentData = await pool.query(
        `SELECT first_name, last_name FROM users WHERE id = $1`,
        [studentId]
      );

      const studentName = `${studentData.rows[0].first_name} ${studentData.rows[0].last_name}`;

      // Сформировать ответ в требуемом формате
      const formattedResult = {
        id: result.rows[0].id,
        testId: testId,
        studentId: studentId,
        studentName: studentName,
        answers: result.rows[0].answers,
        score: result.rows[0].score,
        maxScore: result.rows[0].max_score,
        completedAt: result.rows[0].completed_at.toISOString(),
        timeTaken: timeTaken || 0,
        // Отправляем обратно randomizedTest если он был отправлен
        // для правильного отображения результатов
        randomizedTest: randomizedTest || undefined,
      };

      return res.status(201).json({ result: formattedResult });
    } catch (err) {
      console.error('Submit test result error:', err);
      console.error('Error details:', err.message, err.stack);
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

  // Получить результат теста если студент его уже прошел
  router.get('/result/:testId', verifyToken, async (req, res) => {
    try {
      const { testId } = req.params;
      const studentId = req.user.id;

      // Найти результат через назначение теста
      const result = await pool.query(
        `SELECT tr.id, tr.assignment_id, tr.student_id, tr.answers, tr.score, tr.max_score, tr.completed_at, tr.time_taken, tr.randomized_test,
                ta.test_id
         FROM test_results tr
         JOIN test_assignments ta ON tr.assignment_id = ta.id
         WHERE ta.test_id = $1 AND tr.student_id = $2`,
        [testId, studentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No result found for this test' });
      }

      const testResult = result.rows[0];

      // Получить имя студента
      const studentData = await pool.query(
        `SELECT first_name, last_name FROM users WHERE id = $1`,
        [studentId]
      );

      const studentName = `${studentData.rows[0].first_name} ${studentData.rows[0].last_name}`;

      // Получить информацию о тесте для показа вопросов с ответами
      const testData = await pool.query(
        `SELECT questions FROM tests WHERE id = $1`,
        [testId]
      );

      const questions = typeof testData.rows[0].questions === 'string' 
        ? JSON.parse(testData.rows[0].questions) 
        : testData.rows[0].questions;

      // Восстановить randomizedTest если он сохранён
      let randomizedTest = null;
      if (testResult.randomized_test) {
        randomizedTest = typeof testResult.randomized_test === 'string'
          ? JSON.parse(testResult.randomized_test)
          : testResult.randomized_test;
      }

      const formattedResult = {
        id: testResult.id,
        testId: testResult.test_id,
        studentId: testResult.student_id,
        studentName: studentName,
        answers: testResult.answers,
        score: testResult.score,
        maxScore: testResult.max_score,
        completedAt: testResult.completed_at.toISOString(),
        timeTaken: testResult.time_taken || 0,
        randomizedTest: randomizedTest, // для правильного отображения результатов
      };

      return res.json({ result: formattedResult });
    } catch (err) {
      console.error('Get test result error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = testRoutes;
