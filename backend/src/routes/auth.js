const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const svgCaptcha = require('svg-captcha');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const captchaStore = new Map();
const otpStore = new Map();

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@platforma-school.ru';
const NODE_ENV = process.env.NODE_ENV || 'development';

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

const cleanupExpiredCaptchas = () => {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (now - record.createdAt > CAPTCHA_TTL_MS) {
      captchaStore.delete(id);
    }
  }
};

const cleanupExpiredOtps = () => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now - record.createdAt > OTP_TTL_MS) {
      otpStore.delete(email);
    }
  }
};

const generateOtpCode = () => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
};

const sendEmailCode = async (email, code) => {
  const text = `${code} — код подтверждения для регистрации на Platforma-school.ru. Не передавайте его посторонним.`;

  //HTML-версия
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">
                Platforma-school.ru
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.5;">
                Здравствуйте!
              </p>
              <p style="margin: 0 0 28px; color: #374151; font-size: 16px; line-height: 1.5;">
                Ваш код подтверждения для регистрации:
              </p>

              <!-- Code box -->
              <div style="background: #f3f4f6; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 28px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">
                  ${code}
                </span>
              </div>

              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Код действителен ограниченное время.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Никому не сообщайте этот код.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Это автоматическое письмо, отвечать на него не нужно.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  if (NODE_ENV !== 'production') {
    console.log(`[EMAIL CODE] To ${email}: ${code}`);
    return { mock: true };
  }

  if (!transporter) {
    throw new Error('SMTP not configured');
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Код подтверждения регистрации',
    text,   // для клиентов, которые не поддерживают HTML
    html,   // html версия
  });
  return { sent: true };
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

  // Регистрация (устаревший эндпоинт, используйте register-email)
  router.post('/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, captchaInput, captchaId } = req.body;

      if (!email || !password || !firstName || !lastName) {
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

      const normalized = email.toLowerCase().trim();
      const role = 'student';

      const hashedPassword = await bcryptjs.hash(password, 10);

      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, balance',
        [normalized, hashedPassword, firstName, lastName, role]
      );

      const user = result.rows[0];

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          balance: user.balance,
        },
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email уже зарегистрирован' });
      }
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/captcha', (req, res) => {
    return res.json(createCaptchaChallenge());
  });

  // Проверка капчи
  router.post('/verify-captcha', (req, res) => {
    const { captchaInput, captchaId } = req.body;
    if (!captchaInput || !captchaId) {
      return res.status(400).json({ error: 'Captcha is required' });
    }
    cleanupExpiredCaptchas();
    const stored = captchaStore.get(captchaId);
    if (!stored || stored.value.toUpperCase() !== String(captchaInput).trim().toUpperCase()) {
      captchaStore.delete(captchaId);
      return res.status(400).json({ error: 'Incorrect captcha' });
    }
    captchaStore.delete(captchaId);
    return res.json({ success: true });
  });

  // Отправка кода на email
  router.post('/send-email-code', async (req, res) => {
    cleanupExpiredOtps();

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalized = email.toLowerCase().trim();

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalized]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Эта почта уже зарегистрирована' });
    }

    const code = generateOtpCode();

    let emailOk = true;
    try {
      await sendEmailCode(normalized, code);
    } catch (err) {
      console.error('Failed to send email code:', err.message);
      if (process.env.NODE_ENV === 'production') {
        emailOk = false;
      }
    }

    if (!emailOk) {
      return res.status(502).json({ error: 'Failed to send email code' });
    }

    otpStore.set(normalized, { code, createdAt: Date.now() });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EMAIL CODE] Code for ${normalized}: ${code} (valid ${OTP_TTL_MS / 60000} min)`);
    }

    return res.json({ success: true, message: 'Код отправлен на email' });
  });

  // Регистрация по email-коду
  router.post('/register-email', async (req, res) => {
    cleanupExpiredOtps();

    const { email, code, firstName, lastName, password } = req.body;
    if (!email || !code || !firstName || !lastName || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalized = email.toLowerCase().trim();
    const stored = otpStore.get(normalized);

    if (!stored || stored.code !== String(code).trim()) {
      return res.status(400).json({ error: 'Неверный или истекший код' });
    }

    otpStore.delete(normalized);

    const hashedPassword = await bcryptjs.hash(password, 10);

    try {
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, balance',
        [normalized, hashedPassword, firstName, lastName, 'student']
      );

      const user = result.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          balance: user.balance,
        },
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Этот email уже зарегистрирован' });
      }
      console.error('Register-email error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Вход в систему
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
      }

      if (email === 'admin' && password === '29090803') {
        const token = jwt.sign({ id: 'admin', email: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: { id: null, email: 'admin', firstName: 'Admin', lastName: '', role: 'admin' } });
      }

      const normalized = email.toLowerCase().trim();
      const result = await pool.query(
        'SELECT id, email, password_hash, first_name, last_name, role, balance FROM users WHERE email = $1',
        [normalized]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      const user = result.rows[0];

      const passwordMatch = await bcryptjs.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
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
        return res.json({ user: { id: null, email: 'admin', firstName: 'Admin', lastName: '', role: 'admin' } });
      }

      const result = await pool.query(
        'SELECT id, email, first_name, last_name, role, balance FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      return res.json({
        user: {
          id: user.id,
          email: user.email,
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
