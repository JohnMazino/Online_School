import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { testsApi } from '../api/tests';
import { quizzesApi } from '../api/quizzes';

import Sidebar from '../components/SideBar/SideBar';
import Background from '../components/Background/Background';

import styles from './Profile.module.scss';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    balance?: number;
}

interface AssignedTest {
    id: number;
    test_id: number;
    title: string;
    due_date: string | null;
    assigned_at: string;
    status: string;
    first_name: string;
    last_name: string;
    score?: number;        // баллы если тест пройден
    max_score?: number;    // максимум баллов
    completed_at?: string; // когда тест был завершен
}

interface QuizTopicInfo {
    id: number;
    name: string;
    description: string;
    teacher_id: number;
    first_name?: string;
    last_name?: string;
    question_count?: number;
}

export default function Profile() {
    const navigate = useNavigate();
    const { isAuthenticated, user: authUser, token } = useAuthStore();
    const [user, setUser] = useState<User | null>(authUser);
    const [avatar, setAvatar] = useState<string>('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200');
    const [loading, setLoading] = useState(true);
    const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
    const [quizTopics, setQuizTopics] = useState<QuizTopicInfo[]>([]);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/login');
            return;
        }

        const loadProfile = async () => {
            try {
                const data = await authApi.getProfile(token);
                setUser(data.user);
                
                // Загрузить назначенные тесты для студента
                if (data.user.role !== 'teacher') {
                    const tests = await testsApi.getStudentAssignments(token);
                    setAssignedTests(tests);

                    // Загрузить темы квизи для студента
                    try {
                        const topics = await quizzesApi.getAllTopics(token);
                        setQuizTopics(topics);
                    } catch (e) {
                        console.error('Failed to load quiz topics:', e);
                    }
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

    // Компонент для отображения профиля ученика с его назначенными тестами
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

                    {/* Лекции, тесты, срезы */}
                    {user.role !== 'teacher' && (
                        <section className={styles.section}>
                            <h2>Лекции, тесты, срезы</h2>

                            {assignedTests.length > 0 ? (
                                <div className={styles.testsContainer}>
                                    {assignedTests.map(test => (
                                        <div key={test.id} className={`${styles.testCard} ${styles[test.status]}`}>
                                            <div className={styles.testHeader}>
                                                <h3>{test.title}</h3>
                                                <span className={`${styles.testStatus} ${styles[test.status]}`}>
                                                    {test.status === 'pending' && '🆕 Новый'}
                                                    {test.status === 'started' && '⏳ В процессе'}
                                                    {test.status === 'completed' && (
                                                        <span>
                                                            ✓ {test.score}/{test.max_score} баллов
                                                        </span>
                                                    )}
                                                </span>
                                            </div>

                                            {test.due_date && (
                                                <p className={styles.testDeadline}>
                                                    <strong>Дедлайн:</strong> {new Date(test.due_date).toLocaleDateString('ru-RU')}
                                                </p>
                                            )}

                                            <p className={styles.teacherName}>
                                                <strong>Преподаватель:</strong> {test.first_name} {test.last_name}
                                            </p>

                                            {test.status === 'completed' && test.completed_at && (
                                                <p className={styles.completedDate}>
                                                    <strong>Завершено:</strong> {new Date(test.completed_at).toLocaleDateString('ru-RU')}
                                                </p>
                                            )}

                                            <div className={styles.testActions}>
                                                {(test.status === 'pending' || test.status === 'started') && (
                                                    <button className={styles.startTestBtn} onClick={() => navigate(`/test/${test.test_id}`)}>
                                                        {test.status === 'pending' ? 'Начать тест →' : 'Продолжить →'}
                                                    </button>
                                                )}
                                                {test.status === 'completed' && (
                                                    <button className={styles.viewResultsBtn} onClick={() => navigate(`/test/${test.test_id}/results`)}>
                                                        Посмотреть результаты
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.noTests}>Нет назначенных тестов</p>
                            )}
                        </section>
                    )}

                    {/* Игры — Квизи (для учеников) */}
                    {user.role !== 'teacher' && (
                        <section className={styles.section}>
                            <h2>Игры — Квизи</h2>
                            <p className={styles.gamesSubtitle}>Выберите тему и проверьте свои знания в увлекательном квизе!</p>

                            {quizTopics.length > 0 ? (
                                <div className={styles.gamesGrid}>
                                    {quizTopics.map(topic => (
                                        <div key={topic.id} className={styles.gameCard}>
                                            <div className={styles.gameInfo}>
                                                <h3 className={styles.gameTitle}>{topic.name}</h3>
                                                {topic.description && (
                                                    <p className={styles.gameDesc}>{topic.description}</p>
                                                )}
                                                <span className={styles.gameQuestions}>
                                                    📝 {topic.question_count ?? 0} вопросов
                                                </span>
                                                {(topic as any).first_name && (
                                                    <span className={styles.gameTeacher}>
                                                        👨‍🏫 {(topic as any).first_name} {(topic as any).last_name}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                className={styles.playBtn}
                                                disabled={!topic.question_count}
                                                onClick={() => navigate(`/quiz/${topic.id}`)}
                                            >
                                                {topic.question_count ? '▶ Играть' : '🔒 Нет вопросов'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.noTests}>Пока нет доступных тем для квизи</p>
                            )}
                        </section>
                    )}

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

                    {/* Конструктор тестов (только для репетиторов) */}
                    {user.role === 'teacher' && (
                        <section className={styles.section}>
                            <h2>Конструктор тестов</h2>
                            <div className={styles.constructorPlaceholder}>
                                <p>Создавайте тесты, управляйте ими и назначайте своим ученикам</p>
                                <Link to="/test-constructor">
                                    <button className={styles.constructorBtn}>🧪 Открыть конструктор</button>
                                </Link>
                            </div>
                        </section>
                    )}

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
