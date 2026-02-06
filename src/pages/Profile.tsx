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
    const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
    const [completedTasks, setCompletedTasks] = useState<any[]>([]);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/login');
            return;
        }

        const loadProfile = async () => {
            try {
                const data = await authApi.getProfile(token);
                setUser(data.user);

                // Load assigned tests and completed attempts
                const userId = data.user.id;
                try {
                    const assigned = await (await fetch(`http://localhost:5000/api/tests/assigned/user/${userId}`)).json();
                    setAssignedTasks(assigned || []);
                } catch (e) {
                    console.warn('Failed to load assigned tasks', e);
                }

                try {
                    const attempts = await (await fetch(`http://localhost:5000/api/tests/attempts/user/${userId}`)).json();
                    setCompletedTasks(attempts || []);
                } catch (e) {
                    console.warn('Failed to load attempts', e);
                }

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
                                {assignedTasks.length === 0 && <div className={styles.empty}>Нет назначенных заданий</div>}
                                {assignedTasks.map((task:any) => (
                                    <div key={task.id} className={styles.taskItem}>
                                        <span className={styles.taskType}>{task.is_active ? 'ТЕСТ' : 'ТЕСТ (скрыт)'}</span>
                                        <Link to={`/student/test/${task.test_id}`} className={styles.taskLink}>
                                            {task.title || task.test_title}
                                        </Link>
                                        <p className={styles.deadline}>Дедлайн: {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : new Date(task.assigned_at).toLocaleDateString('ru-RU')}</p>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.taskColumn}>
                                <h3>Прошедшие</h3>
                                {completedTasks.length === 0 && <div className={styles.empty}>Нет пройденных</div>}
                                {completedTasks.map((task:any) => (
                                    <div key={task.id} className={styles.taskItem}>
                                        <span className={styles.taskType}>ТЕСТ</span>
                                        <span>{task.title}</span>
                                        <p className={styles.completedDate}>Пройдено: {task.finished_at ? new Date(task.finished_at).toLocaleDateString('ru-RU') : ''} {task.score ? `(${task.score})` : ''}</p>
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

                    {/* Конструктор тестов */}
                    <section className={styles.section}>
                        <h2>Конструктор тестов</h2>
                        {/* {user.role === 'student' && ( */}
                        <Link to="/teacher/tests" className={styles.testConstructorBtn}>
                            Конструктор тестов и материалов
                        </Link>
                        {/* )} */}
                    </section>
                </div>
            </div>
        </>
    );
}
