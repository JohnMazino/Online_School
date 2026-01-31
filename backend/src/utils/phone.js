const normalizePhone = (phone) => {
  // Удаление всех не-цифровых символов
  const digits = phone.replace(/\D/g, '');
  
  // Обработка разных форматов
  if (digits.startsWith('7')) {
    // Формат +7 или 7
    return '7' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    // Российский формат 8
    return '7' + digits.slice(1);
  } else {
    // Уже нормализованный или другой формат
    return digits;
  }
};

module.exports = { normalizePhone };
