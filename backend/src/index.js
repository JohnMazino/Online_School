const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const { initializeDatabase } = require('./db/init');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Настройка базы данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;

// Маршруты
app.use('/api/auth', authRoutes(pool));
app.use('/api/admin', adminRoutes(pool));

// Запуск сервера
const startServer = async () => {
  try {
    // Инициализация базы данных
    await initializeDatabase(pool);
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
