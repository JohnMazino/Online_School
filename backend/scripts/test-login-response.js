const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Симуляция для проверки что возвращает backend при входе учителя
async function testLogin() {
  const teacher = {
    id: 3,
    phone: '+7 (912) 000-00-02',
    first_name: 'Мария',
    last_name: 'Петрова',
    role: 'teacher',
    balance: 0
  };

  // Что вернёт backend при входе
  const responseData = {
    token: jwt.sign(
      { id: teacher.id, phone: teacher.phone, role: teacher.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    ),
    user: {
      id: teacher.id,
      phone: teacher.phone,
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      role: teacher.role,
      balance: teacher.balance,
    },
  };

  console.log('✓ Данные которые вернёт backend при входе учителя:');
  console.log(JSON.stringify(responseData, null, 2));
  console.log('\n✓ Роль пользователя:', responseData.user.role);
  console.log('✓ ID пользователя:', responseData.user.id);
}

testLogin();
