import { useState, useEffect } from 'react';

import styles from './Sidebar.module.scss';

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// импорт иконок
import HomeIcon from '../../assets/icons/home.svg?react';
import ProfileIcon from '../../assets/icons/profile.svg?react';
import TeacherIcon from '../../assets/icons/teacher.svg?react';
import QuestionIcon from '../../assets/icons/question.svg?react';
import ChatIcon from '../../assets/icons/chat.svg?react';
import MoonIcon from '../../assets/icons/moon.svg?react';
import SunIcon from '../../assets/icons/sun.svg?react';
import ExitIcon from '../../assets/icons/exit.svg?react';

export default function Sidebar() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Функция для прокрутки к секции репетиторов
    const scrollToTutors = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        
        if (location.pathname === '/') {
            // Если уже на главной, просто прокручиваем к секции
            const tutorsSection = document.getElementById('tutors-section');
            if (tutorsSection) {
                tutorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            // Если на другой странице, переходим на главную и затем прокручиваем
            navigate('/');
            setTimeout(() => {
                const tutorsSection = document.getElementById('tutors-section');
                if (tutorsSection) {
                    tutorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    };

    // Функция для перехода на главную с прокруткой вверх
    const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        
        if (location.pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            navigate('/');
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    };

    useEffect(() => {
        const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | null) || null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(savedTheme);
            return;
        }

        if (document.documentElement.classList.contains('dark')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <ul className={styles.menu}>
                    <li className={styles.menuItem}>
                        <Link to="/" className={styles.menuLink} onClick={handleHomeClick}>
                            <HomeIcon className={styles.icon} />
                            <span className={styles.text}>Главная</span>
                        </Link>
                    </li>

                    <li className={styles.menuItem}>
                        <Link to="/profile" className={styles.menuLink}>
                            <ProfileIcon className={styles.icon} />
                            <span className={styles.text}>Профиль</span>
                        </Link>
                    </li>

                    {/* Кнопка "Репетиторы" с прокруткой к секции */}
                    <li className={styles.menuItem}>
                        <a href="#tutors-section" className={styles.menuLink} onClick={scrollToTutors}>
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

                    <li className={`${styles.menuItem} ${styles.themeToggle}`}>
                        <button onClick={toggleTheme} className={styles.themeButton}>
                            {theme === 'light' ? <MoonIcon className={styles.icon} /> : <SunIcon className={styles.icon} />}
                            <span className={styles.text}>
                                {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                            </span>
                        </button>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}