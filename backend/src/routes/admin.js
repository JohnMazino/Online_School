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

  // Получить список пользователей (поддерживает поиск по q + фильтры + пагинацию + сортировку)
  router.get('/users', verifyToken, adminOnly, async (req, res) => {
    try {
      const q = (req.query.q || '').toString().trim();
      const role = req.query.role ? req.query.role.toString() : null;
      const status = req.query.status ? req.query.status.toString() : null; // active/blocked
      const dateFrom = req.query.date_from ? new Date(req.query.date_from) : null;
      const dateTo = req.query.date_to ? new Date(req.query.date_to) : null;
      const sort_by = req.query.sort_by ? req.query.sort_by.toString() : 'id';
      const sort_order = req.query.sort_order && req.query.sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const page = Math.max(1, parseInt(req.query.page || '1'));
      const perPage = Math.min(100, parseInt(req.query.per_page || '15'));
      const offset = (page - 1) * perPage;

      const whereParts = [];
      const params = [];

      if (q) {
        params.push(`%${q}%`);
        whereParts.push(`(u.phone ILIKE $${params.length} OR u.phone_normalized ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`);
      }

      if (role) {
        params.push(role);
        whereParts.push(`u.role = $${params.length}`);
      }

      if (status) {
        params.push(status === 'active');
        whereParts.push(`u.is_active = $${params.length}`);
      }

      if (dateFrom) {
        params.push(dateFrom);
        whereParts.push(`u.created_at >= $${params.length}`);
      }

      if (dateTo) {
        dateTo.setHours(23,59,59,999);
        params.push(dateTo);
        whereParts.push(`u.created_at <= $${params.length}`);
      }

      const whereSql = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';

      // Count
      const countQuery = `SELECT COUNT(*) AS count FROM users u ${whereSql}`;
      const countRes = await pool.query(countQuery, params);
      const total = parseInt(countRes.rows[0].count, 10);

      // Main data (including class, is_active, last_login, test_attempts as tasks created by user)
      const dataQuery = `SELECT u.id, u.phone, u.first_name, u.last_name, u.role, u.balance, u.class, u.is_active, u.created_at AS registration_date, u.last_login, COALESCE(count(t.id),0) AS test_attempts
        FROM users u
        LEFT JOIN tasks t ON t.created_by = u.id
        ${whereSql}
        GROUP BY u.id
        ORDER BY ${sort_by} ${sort_order}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      params.push(perPage, offset);
      const dataRes = await pool.query(dataQuery, params);

      // Map rows to frontend-friendly field names
      const users = dataRes.rows.map(r => ({
        id: r.id,
        phone: r.phone,
        first_name: r.first_name,
        last_name: r.last_name,
        class: r.class,
        role: r.role,
        registration_date: r.registration_date,
        last_login: r.last_login,
        is_active: r.is_active,
        test_attempts: parseInt(r.test_attempts, 10),
        balance: r.balance
      }));

      return res.json({ users, total });
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

  // Получить журнал действий (фильтры + пагинация)
  router.get('/audit-logs', verifyToken, adminOnly, async (req, res) => {
    try {
      const q = (req.query.q || '').toString().trim();
      const admin_id = req.query.admin_id ? Number(req.query.admin_id) : null;
      const action_type = req.query.action_type ? req.query.action_type.toString() : null;
      const entity_type = req.query.entity_type ? req.query.entity_type.toString() : null;
      const date_from = req.query.date_from ? new Date(req.query.date_from) : null;
      const date_to = req.query.date_to ? new Date(req.query.date_to) : null;

      const page = Math.max(1, parseInt(req.query.page || '1'));
      const perPage = Math.min(100, parseInt(req.query.per_page || '20'));
      const offset = (page - 1) * perPage;

      const whereParts = [];
      const params = [];

      if (q) {
        params.push(`%${q}%`);
        whereParts.push(`(description ILIKE $${params.length} OR admin_name ILIKE $${params.length} OR entity_name ILIKE $${params.length} OR entity_type ILIKE $${params.length} OR action_type ILIKE $${params.length})`);
      }

      if (admin_id) {
        params.push(admin_id);
        whereParts.push(`admin_id = $${params.length}`);
      }

      if (action_type) {
        params.push(action_type);
        whereParts.push(`action_type = $${params.length}`);
      }

      if (entity_type) {
        params.push(entity_type);
        whereParts.push(`entity_type = $${params.length}`);
      }

      if (date_from) {
        params.push(date_from);
        whereParts.push(`created_at >= $${params.length}`);
      }

      if (date_to) {
        // include the day
        date_to.setHours(23, 59, 59, 999);
        params.push(date_to);
        whereParts.push(`created_at <= $${params.length}`);
      }

      const whereSql = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';

      const countQuery = `SELECT COUNT(*) AS count FROM audit_logs ${whereSql}`;
      const countRes = await pool.query(countQuery, params);
      const total = parseInt(countRes.rows[0].count, 10);

      const dataQuery = `SELECT id, admin_id, admin_name, action_type, entity_type, entity_id, entity_name, old_value, new_value, ip_address, description, created_at FROM audit_logs ${whereSql} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(perPage, offset);

      const dataRes = await pool.query(dataQuery, params);

      return res.json({ logs: dataRes.rows, total, page, perPage, totalPages: Math.ceil(total / perPage) });
    } catch (err) {
      console.error('Admin get audit logs error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get aggregated stats for dashboard and charts
  router.get('/stats', verifyToken, adminOnly, async (req, res) => {
    try {
      // Total users
      const totalRes = await pool.query('SELECT COUNT(*) AS count FROM users');
      const usersTotal = parseInt(totalRes.rows[0].count, 10);

      // Active last 24h - users with last_login OR created_at OR attempts in last 24h
      const active24Res = await pool.query("SELECT COUNT(DISTINCT u.id) AS count FROM users u LEFT JOIN attempts a ON a.user_id = u.id AND a.created_at >= NOW() - INTERVAL '24 hours' WHERE u.last_login >= NOW() - INTERVAL '24 hours' OR u.created_at >= NOW() - INTERVAL '24 hours' OR a.created_at >= NOW() - INTERVAL '24 hours'");
      const active24h = parseInt(active24Res.rows[0].count, 10);

      // New users in last 7 days
      const newWeekRes = await pool.query("SELECT COUNT(*) AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'");
      const newWeek = parseInt(newWeekRes.rows[0].count, 10);

      // Tasks created
      const tasksRes = await pool.query('SELECT COUNT(*) AS count FROM tasks');
      const tasksCreated = parseInt(tasksRes.rows[0].count, 10);

      // Total attempts and average score
      const attemptsRes = await pool.query('SELECT COUNT(*) AS total_attempts, COALESCE(ROUND(AVG(score)::numeric,2),0) AS avg_score FROM attempts');
      const totalAttempts = parseInt(attemptsRes.rows[0].total_attempts, 10);
      const avgScore = parseFloat(attemptsRes.rows[0].avg_score) || 0;

      // Registrations per month (last 12 months) - include months with 0
      const regRes = await pool.query(`
        SELECT TO_CHAR(month, 'Mon YYYY') AS month, COALESCE(t.cnt,0) AS registrations
        FROM generate_series(date_trunc('month', NOW()) - INTERVAL '11 months', date_trunc('month', NOW()), INTERVAL '1 month') month
        LEFT JOIN (
          SELECT date_trunc('month', created_at) AS m, COUNT(*) AS cnt
          FROM users
          WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '11 months'
          GROUP BY 1
        ) t ON t.m = month
        ORDER BY month
      `);

      const registrationStats = regRes.rows.map(r => ({ month: r.month, registrations: parseInt(r.registrations, 10) }));

      // Top subjects by attempts count
      const topSubjRes = await pool.query(`SELECT s.name AS subject, COUNT(a.id) AS count FROM subjects s LEFT JOIN tasks t ON t.subject_id = s.id LEFT JOIN attempts a ON a.task_id = t.id GROUP BY s.name ORDER BY count DESC LIMIT 5`);
      const topSubjects = topSubjRes.rows.map(r => ({ subject: r.subject, count: parseInt(r.count, 10) }));

      // Class distribution
      const classRes = await pool.query(`SELECT class, COUNT(*) AS users FROM users WHERE class IS NOT NULL GROUP BY class ORDER BY users DESC`);
      const classDistribution = classRes.rows.map(r => ({ class: r.class, users: parseInt(r.users, 10) }));

      return res.json({ usersTotal, active24h, newWeek, tasksCreated, totalAttempts, avgScore, registrationStats, topSubjects, classDistribution });
    } catch (err) {
      console.error('Admin stats error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Block/unblock user
  router.post('/block-user', verifyToken, adminOnly, async (req, res) => {
    try {
      const { userId, block } = req.body;
      if (typeof userId === 'undefined' || typeof block === 'undefined') return res.status(400).json({ error: 'Missing userId or block flag' });

      const result = await pool.query('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, phone, first_name, last_name, role, is_active', [!block ? true : false, userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      // Insert audit log
      const adminName = req.user && req.user.phone ? req.user.phone : 'admin';
      await pool.query('INSERT INTO audit_logs (admin_id, admin_name, action_type, entity_type, entity_id, entity_name, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())', [Number.isInteger(req.user && req.user.id) ? req.user.id : null, adminName, block ? 'block' : 'unblock', 'user', userId, `${result.rows[0].first_name} ${result.rows[0].last_name}`, block ? 'Пользователь заблокирован' : 'Пользователь разблокирован']);

      return res.json({ user: result.rows[0] });
    } catch (err) {
      console.error('Block user error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Reset user password (returns temporary password for dev/testing)
  router.post('/reset-password', verifyToken, adminOnly, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      // Read platform settings to enforce min password length
      const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'platform_defaults' LIMIT 1");
      const defaults = settingsRes.rows.length ? settingsRes.rows[0].value : { minPasswordLength: 8 };
      const minLen = defaults.minPasswordLength || 8;

      const bcrypt = require('bcryptjs');

      // Generate temp password that respects min length
      const genTempPass = (len) => {
        // ensure alphanumeric with sufficient length
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let out = '';
        for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      };

      const tempPass = genTempPass(Math.max(8, minLen));
      const hash = await bcrypt.hash(tempPass, 10);

      const result = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, phone, first_name, last_name', [hash, userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      // Insert audit log (don't fail if audit insert fails)
      try {
        const adminName = req.user && req.user.phone ? req.user.phone : 'admin';
        await pool.query('INSERT INTO audit_logs (admin_id, admin_name, action_type, entity_type, entity_id, entity_name, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())', [Number.isInteger(req.user && req.user.id) ? req.user.id : null, adminName, 'reset_password', 'user', userId, `${result.rows[0].first_name} ${result.rows[0].last_name}`, 'Сброшен пароль пользователя']);
      } catch (err) {
        console.warn('Failed to insert audit log for reset-password', err);
      }

      return res.json({ tempPassword: tempPass });
    } catch (err) {
      console.error('Reset password error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Export users in multiple formats (csv / xlsx)
  router.get('/export', verifyToken, adminOnly, async (req, res) => {
    try {
      const format = (req.query.format || 'csv').toString();

      // Get users
      const usersRes = await pool.query('SELECT id, phone, first_name, last_name, role, balance, class, created_at FROM users ORDER BY id DESC');
      const rows = usersRes.rows;

      if (format === 'csv') {
        let csv = 'id,phone,first_name,last_name,role,balance,class,created_at\n';
        for (const r of rows) {
          csv += `${r.id},"${r.phone}","${r.first_name}","${r.last_name}",${r.role},${r.balance},"${r.class || ''}",${r.created_at.toISOString()}\n`;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
        return res.send(csv);
      }

      if (format === 'xlsx') {
        // lazy require to avoid load when not used
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Users');
        sheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Phone', key: 'phone', width: 20 },
          { header: 'First Name', key: 'first_name', width: 20 },
          { header: 'Last Name', key: 'last_name', width: 20 },
          { header: 'Role', key: 'role', width: 12 },
          { header: 'Balance', key: 'balance', width: 12 },
          { header: 'Class', key: 'class', width: 15 },
          { header: 'Created At', key: 'created_at', width: 25 }
        ];

        rows.forEach(r => sheet.addRow({ ...r, created_at: r.created_at.toISOString() }));
        const buf = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');
        return res.send(Buffer.from(buf));
      }

      // Note: PDF export removed. Unsupported formats will fall through to the error response below.


      return res.status(400).json({ error: 'Unsupported format' });
    } catch (err) {
      console.error('Export error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get platform settings
  router.get('/settings', verifyToken, adminOnly, async (req, res) => {
    try {
      const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'platform_defaults' LIMIT 1");
      const defaults = settingsRes.rows.length ? settingsRes.rows[0].value : { minPasswordLength: 8 };
      return res.json(defaults);
    } catch (err) {
      console.error('Get settings error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // New simplified reset password endpoint (fallback) that returns a temp password
  router.post('/reset-password-v2', verifyToken, adminOnly, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'platform_defaults' LIMIT 1");
      const defaults = settingsRes.rows.length ? settingsRes.rows[0].value : { minPasswordLength: 8 };
      const minLen = defaults.minPasswordLength || 8;

      const bcrypt = require('bcryptjs');
      const genTempPass = (len) => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let out = '';
        for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      };

      const tempPass = genTempPass(Math.max(8, minLen));
      const hash = await bcrypt.hash(tempPass, 10);

      const result = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, phone, first_name, last_name', [hash, userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      // Try to log action but don't fail on error
      try {
        const adminName = req.user && req.user.phone ? req.user.phone : 'admin';
        await pool.query('INSERT INTO audit_logs (admin_id, admin_name, action_type, entity_type, entity_id, entity_name, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())', [Number.isInteger(req.user && req.user.id) ? req.user.id : null, adminName, 'reset_password', 'user', userId, `${result.rows[0].first_name} ${result.rows[0].last_name}`, 'Сброшен пароль пользователя']);
      } catch (err) {
        console.warn('Failed to insert audit log for reset-password-v2', err);
      }

      return res.json({ tempPassword: tempPass });
    } catch (err) {
      console.error('Reset password-v2 error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update platform settings
  router.post('/settings', verifyToken, adminOnly, async (req, res) => {
    try {
      const newSettings = req.body;
      if (!newSettings || typeof newSettings !== 'object') return res.status(400).json({ error: 'Invalid settings payload' });

      try {
        await pool.query(`INSERT INTO settings (key, value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`, ['platform_defaults', JSON.stringify(newSettings)]);
      } catch (err) {
        console.error('Upsert settings error:', err);
        return res.status(500).json({ error: 'Failed to save settings' });
      }

      // Audit log (don't fail the whole request if audit insert fails)
      try {
        const adminName = req.user && req.user.phone ? req.user.phone : 'admin';
        await pool.query('INSERT INTO audit_logs (admin_id, admin_name, action_type, entity_type, entity_id, entity_name, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())', [Number.isInteger(req.user && req.user.id) ? req.user.id : null, adminName, 'update_settings', 'settings', null, 'platform_defaults', 'Обновлены настройки платформы']);
      } catch (err) {
        console.warn('Failed to insert audit log for settings update', err);
      }

      return res.json(newSettings);
    } catch (err) {
      console.error('Update settings error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = adminRoutes;
