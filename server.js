const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-super-secret-jwt-key-2025'; // В дальнейшем — .env

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// === MongoDB ===
mongoose.connect('mongodb://localhost:27017/online-school')
  .then(() => console.log('MongoDB подключена'))
  .catch(err => console.error('Ошибка MongoDB:', err));

// === Схема пользователя ===
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, default: 'Ученик' },
    role: { type: String, default: 'student' },
    avatar: { type: String, default: 'https://ui-avatars.com/api/?name=U&background=3498db&color=fff' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// === Проверка JWT ===
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Неверный токен' });
    }
};

// === Регистрация ===
app.post('/api/register', async (req, res) => {
    const { email, password, name = 'Ученик' } = req.body;

    try {
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: 'Email уже используется' });

        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashed, name });
        await user.save();

        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar }
        });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// === Логин ===
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Неверный email или пароль' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Неверный email или пароль' });

        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar }
        });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// === Получить текущего пользователя ===
app.get('/api/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// === Выход (клиентская сторона) ===
app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Сервер: http://localhost:${PORT}`);
});
