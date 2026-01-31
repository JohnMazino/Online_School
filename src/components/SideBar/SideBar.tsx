import { useState, useEffect } from 'react';

import styles from './Sidebar.module.scss';

import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
    // Состояние темы: 'light' или 'dark'
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Загружаем сохранённую тему при монтировании компонента
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.className = savedTheme; // применяем к <html>
        }
    }, []);

    // Функция переключения темы
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.className = newTheme; // меняем класс на <html>
        localStorage.setItem('theme', newTheme); // сохраняем в localStorage
    };


    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <ul className={styles.menu}>
                    {/* Кнопка "Главная" — первая в списке */}
                    <li className={styles.menuItem}>
                        <Link to="/" className={styles.menuLink}>
                            <span className={styles.icon}>🏠</span>
                            <span className={styles.text}>Главная</span>
                        </Link>
                    </li>

                    {/* Профиль — теперь ссылка на /profile */}
                    <li className={styles.menuItem}>
                        <Link to="/profile" className={styles.menuLink}>
                            <span className={styles.icon}>👤</span>
                            <span className={styles.text}>Профиль</span>
                        </Link>
                    </li>

                    <li className={styles.menuItem}>
                        <a href="#" className={styles.menuLink}>
                            <span className={styles.icon}>👨‍🏫</span>
                            <span className={styles.text}>Репетиторы</span>
                        </a>
                    </li>

                    <li className={styles.menuItem}>
                        <a href="#" className={styles.menuLink}>
                            <span className={styles.icon}>❓</span>
                            <span className={styles.text}>Дополнительная <br />информация</span>
                        </a>
                    </li>

                    <li className={styles.menuItem}>
                        <a href="#" className={styles.menuLink}>
                            <span className={styles.icon}>💬</span>
                            <span className={styles.text}>Чат поддержки</span>
                        </a>
                    </li>


                    {isAuthenticated && (
                        <li className={styles.menuItem}>
                            <button onClick={handleLogout} className={styles.logoutBtn}>
                                <span className={styles.icon}>🚪</span>
                                <span className={styles.text}>Выход</span>
                            </button>
                        </li>
                    )}

                    {/* Кнопка смены темы — всегда внизу */}
                    <li className={`${styles.menuItem} ${styles.themeToggle}`}>
                        <button onClick={toggleTheme} className={styles.themeButton}>
                            <span className={styles.icon}>
                                {theme === 'light' ? '🌙' : '☀️'}
                            </span>
                            <span className={styles.text}>
                                {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                            </span>
                        </button>
                    </li>

                </ul >
            </nav >
        </aside >
    );
}
