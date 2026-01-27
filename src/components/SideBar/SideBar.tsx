import styles from './Sidebar.module.scss';
import { Link } from 'react-router-dom';

export default function Sidebar() {
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
                </ul>
            </nav>
        </aside>
    );
}
