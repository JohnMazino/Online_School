import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

import Sidebar from '../components/SideBar/SideBar';
import Background from '../components/Background/Background';

import styles from './Profile.module.scss';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    role?: string;
    balance?: number;
}

export default function Profile() {
    const navigate = useNavigate();
    const { isAuthenticated, user: authUser, token } = useAuthStore();
    const [user, setUser] = useState<User | null>(authUser);
    const [avatar, setAvatar] = useState<string>('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/login');
            return;
        }

        const loadProfile = async () => {
            try {
                const data = await authApi.getProfile(token);
                setUser(data.user);
            } catch (error) {
                console.error('Failed to load profile');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [isAuthenticated, token, navigate]);

    if (loading) {
        return <div>Загрузка...</div>;
    }

    if (!user) {
        return <div>Ошибка загрузки профиля</div>;
    }

    const courses = [
        { id: 1, name: 'Математика ЕГЭ 2026', group: true, expires: '2025-08-31', price: 3800 },
        { id: 2, name: 'Физика ОГЭ', group: true, expires: '2025-07-15', price: 3800 },
        { id: 3, name: 'Информатика (индивидуально)', group: false, expires: null, price: 1200 },
    ];

    const assignedTasks = [
        { type: 'лекция', title: 'Лекция по алгебре №5', deadline: '2025-07-10', link: '/lecture/5' },
        { type: 'тест', title: 'Тест по геометрии', deadline: '2025-07-11', link: '/test/3' },
        { type: 'срез', title: 'Срез знаний по физике', deadline: '2025-07-12', link: '/test/4' },
    ];

    const completedTasks = [
        { type: 'лекция', title: 'Лекция по алгебре №4', date: '2025-07-05' },
        { type: 'тест', title: 'Тест по тригонометрии', date: '2025-07-03', score: '95%' },
    ];

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setAvatar(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleTopUp = () => {
        alert('Переход к пополнению баланса (в будущем — платёжная форма)');
    };

    const handleExtend = (courseId: number) => {
        alert(`Продление курса #${courseId} на месяц (в будущем — оплата)`);
    };

    return (
        <>
            {/* Фон добавляем здесь, как Sidebar */}
            <Background />

            <div className={styles.profilePage}>
                {/* Сайдбар уже добавлен */}
                <Sidebar />

                {/* Основной контент профиля */}
                <div className={styles.profileContent}>
                    <div className={styles.profileHeader}>
                        <div className={styles.avatarWrapper}>
                            <img src={avatar} alt="Аватар" className={styles.avatar} />
                            <label className={styles.avatarUpload}>
                                Изменить фото
                                <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                            </label>
                        </div>

                        <div className={styles.userInfo}>
                            <h1>{user.firstName} {user.lastName}</h1>
                            <p className={styles.phone}>{user.phone}</p>
                            {user.role !== 'teacher' && (
                                <p className={styles.balance}>
                                    Баланс: <span>{user.balance ?? 0} ₽</span>
                                    <button className={styles.topUpBtn} onClick={handleTopUp}>
                                        Пополнить
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Купленные курсы */}
                    <section className={styles.section}>
                        <h2>Купленные курсы</h2>
                        <div className={styles.coursesGrid}>
                            {courses.map(course => (
                                <div key={course.id} className={styles.courseCard}>
                                    <h3>{course.name}</h3>
                                    <p>Тип: {course.group ? 'Групповой' : 'Индивидуальный'}</p>
                                    {course.expires && <p>Действует до: {course.expires}</p>}
                                    <p>Стоимость: {course.price} ₽</p>

                                    {course.group && (
                                        <button className={styles.extendBtn} onClick={() => handleExtend(course.id)}>
                                            Продлить на месяц
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Лекции, тесты, срезы */}
                    <section className={styles.section}>
                        <h2>Лекции, тесты, срезы</h2>

                        <div className={styles.tasksContainer}>
                            <div className={styles.taskColumn}>
                                <h3>Назначенные</h3>
                                {assignedTasks.map(task => (
                                    <div key={task.title} className={styles.taskItem}>
                                        <span className={styles.taskType}>{task.type.toUpperCase()}</span>
                                        <Link to={task.link} className={styles.taskLink}>
                                            {task.title}
                                        </Link>
                                        <p className={styles.deadline}>Дедлайн: {task.deadline}</p>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.taskColumn}>
                                <h3>Прошедшие</h3>
                                {completedTasks.map(task => (
                                    <div key={task.title} className={styles.taskItem}>
                                        <span className={styles.taskType}>{task.type.toUpperCase()}</span>
                                        <span>{task.title}</span>
                                        <p className={styles.completedDate}>Пройдено: {task.date} {task.score ? `(${task.score})` : ''}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Интерактивная доска */}
                    <section className={styles.section}>
                        <h2>Интерактивная доска</h2>
                        <div className={styles.boardPlaceholder}>
                            <button
                                className={styles.openBoardBtn}
                                onClick={() => window.open(`/draw?userId=${user.id}`, '_blank', 'noopener')}
                            >
                                Открыть доску
                            </button>
                        </div>
                    </section>

                    {/* Обратная связь */}
                    <section className={styles.section}>
                        <h2>Обратная связь с репетитором</h2>
                        <div className={styles.feedbackPlaceholder}>
                            <p>Здесь будет форма обратной связи или чат с репетитором</p>
                            <button>Написать репетитору</button>
                        </div>
                    </section>

                    {/* Чат с поддержкой */}
                    <section className={styles.section}>
                        <h2>Чат с поддержкой</h2>
                        <Link to="/support" className={styles.supportLink}>
                            <button className={styles.supportBtn}>Открыть чат</button>
                        </Link>
                    </section>
                </div>
            </div>
        </>
    );
}
