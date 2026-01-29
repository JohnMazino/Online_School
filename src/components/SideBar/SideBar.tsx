import styles from './Sidebar.module.scss';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <ul className={styles.menu}>
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
                </ul>
            </nav>
        </aside>
    );
}
