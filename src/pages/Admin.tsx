import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import styles from './Admin.module.scss';

import Dashboard from './admin/Dashboard'; // Импортируем компонент Dashboard
import Users from './admin/Users';
import Subjects from './admin/Subjects';
import Topics from './admin/Topics';
import Tasks from './admin/Tasks';
import Tests from './admin/Tests';
import AuditLog from './admin/AuditLog';
import Statistics from './admin/Statistics';
import Settings from './admin/Settings';


export default function Admin() {
    const { isAuthenticated, user, token, logout } = useAuthStore();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('dashboard');

    // Статистика для Dashboard
    const [stats] = useState({
        usersTotal: 1250,
        active24h: 342,
        newWeek: 87,
        tasksCreated: 420,
    });

    // Проверка доступа
    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/login');
            return;
        }
        if (user?.role !== 'admin') {
            navigate('/');
        }
    }, [isAuthenticated, token, user, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard stats={stats} />;

            case 'users':
                return <Users />;

            // Пустые заглушки для остальных разделов
            case 'subjects':
                return <Subjects />;
            case 'topics':
                return <Topics />;
            case 'tasks':
                return <Tasks />;
            case 'tests':
                return <Tests />;
            case 'audit':
                return <AuditLog />;
            case 'statistics':
                return <Statistics />;
            case 'settings':
                return <Settings />;

            default:
                return <h1>Выберите раздел</h1>;
        }
    };

    return (
        <div className={styles.adminPage}>
            {/* Боковая панель */}
            <aside className={styles.adminSidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <div className={styles.logoPlaceholder}>
                            <img src="src/assets/logo.svg" alt="" />
                        </div>
                        <span className={styles.logoText}>Платформа</span>
                    </div>
                    <div className={styles.adminInfo}>
                        <span className={styles.adminName}>{user?.firstName} {user?.lastName}</span>
                        <span className={styles.role}>Администратор</span>
                    </div>
                </div>

                <nav className={styles.nav}>
                    <ul className={styles.navList}>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'dashboard' ? styles.active : ''}`}
                                onClick={() => setActiveTab('dashboard')}
                            >
                                <span className={styles.navIcon}>📊</span>
                                <span>Дашборд</span>
                            </button>
                        </li>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'users' ? styles.active : ''}`}
                                onClick={() => setActiveTab('users')}
                            >
                                <span className={styles.navIcon}>👥</span>
                                <span>Пользователи</span>
                            </button>
                        </li>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'subjects' ? styles.active : ''}`}
                                onClick={() => setActiveTab('subjects')}
                            >
                                <span className={styles.navIcon}>📚</span>
                                <span>Предметы</span>
                            </button>
                        </li>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'topics' ? styles.active : ''}`}
                                onClick={() => setActiveTab('topics')}
                            >
                                <span className={styles.navIcon}>📖</span>
                                <span>Темы</span>
                            </button>
                        </li>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'tasks' ? styles.active : ''}`}
                                onClick={() => setActiveTab('tasks')}
                            >
                                <span className={styles.navIcon}>📝</span>
                                <span>Задания</span>
                            </button>
                        </li>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'tests' ? styles.active : ''}`}
                                onClick={() => setActiveTab('tests')}
                            >
                                <span className={styles.navIcon}>✅</span>
                                <span>Тесты</span>
                            </button>
                        </li>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'audit' ? styles.active : ''}`}
                                onClick={() => setActiveTab('audit')}
                            >
                                <span className={styles.navIcon}>📋</span>
                                <span>Журнал действий</span>
                            </button>
                        </li>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'statistics' ? styles.active : ''}`}
                                onClick={() => setActiveTab('statistics')}
                            >
                                <span className={styles.navIcon}>📈</span>
                                <span>Статистика</span>
                            </button>
                        </li>
                        <li className={styles.navItem}>
                            <button
                                className={`${styles.navLink} ${activeTab === 'settings' ? styles.active : ''}`}
                                onClick={() => setActiveTab('settings')}
                            >
                                <span className={styles.navIcon}>⚙️</span>
                                <span>Настройки</span>
                            </button>
                        </li>
                    </ul>
                </nav>

                <button onClick={handleLogout} className={styles.logoutBtn}>
                    <span className={styles.logoutIcon}>🚪</span>
                    <span>Выйти</span>
                </button>
            </aside>

            {/* Основной контент */}
            <main className={styles.adminMain}>
                {renderContent()}
            </main>
        </div>
    );
}
