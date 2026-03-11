import { useState, useEffect } from 'react';

import styles from './Sidebar.module.scss';

import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// импорт иконок
// Импорт иконок как React-компонентов (с ?react — обязательно!)
import HomeIcon from '../../assets/icons/home.svg?react';
import ProfileIcon from '../../assets/icons/profile.svg?react';
import TeacherIcon from '../../assets/icons/teacher.svg?react';
import QuestionIcon from '../../assets/icons/question.svg?react';
import ChatIcon from '../../assets/icons/chat.svg?react';
import MoonIcon from '../../assets/icons/moon.svg?react';
import SunIcon from '../../assets/icons/sun.svg?react';
import ExitIcon from '../../assets/icons/exit.svg?react';


export default function Sidebar() {
    // Состояние темы: 'light' или 'dark'
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Загружаем сохранённую тему при монтировании компонента или читаем класс html
    useEffect(() => {
        const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | null) || null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(savedTheme);
            return;
        }

        // Если в localStorage нет значения, прочитаем класс html (если кто-то уже установил)
        if (document.documentElement.classList.contains('dark')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }, []);

    // Функция переключения темы
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        // Меняем класс бережно — удаляем возможные и ставим нужный
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newTheme);
        localStorage.setItem('theme', newTheme); // сохраняем в localStorage
    };


    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <ul className={styles.menu}>
                    {/* Кнопка "Главная" — первая в списке */}
                    <li className={styles.menuItem}>
                        <Link to="/" className={styles.menuLink}>
                            <HomeIcon className={styles.icon} />
                            <span className={styles.text}>Главная</span>
                        </Link>
                    </li>

                    {/* Профиль — теперь ссылка на /profile */}
                    <li className={styles.menuItem}>
                        <Link to="/profile" className={styles.menuLink}>
                            <ProfileIcon className={styles.icon} />
                            <span className={styles.text}>Профиль</span>
                        </Link>
                    </li>

                    <li className={styles.menuItem}>
                        <a href="#" className={styles.menuLink}>
                            <TeacherIcon className={styles.icon} />
                            <span className={styles.text}>Репетиторы</span>
                        </a>
                    </li>

                    <li className={styles.menuItem}>
                        <a href="#" className={styles.menuLink}>
                            <QuestionIcon className={styles.icon} />
                            <span className={styles.text}>Дополнительная <br />информация</span>
                        </a>
                    </li>

                    <li className={styles.menuItem}>
                        <a href="#" className={styles.menuLink}>
                            <ChatIcon className={styles.icon} />
                            <span className={styles.text}>Чат поддержки</span>
                        </a>
                    </li>


                    {isAuthenticated && (
                        <li className={styles.menuItem}>
                            <button onClick={handleLogout} className={styles.logoutBtn}>
                                <ExitIcon className={styles.icon} />
                                <span className={styles.text}>Выход</span>
                            </button>
                        </li>
                    )}

                    {/* Кнопка смены темы — всегда внизу */}
                    <li className={`${styles.menuItem} ${styles.themeToggle}`}>
                        <button onClick={toggleTheme} className={styles.themeButton}>
                            <span className={styles.icon}>
                                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
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
