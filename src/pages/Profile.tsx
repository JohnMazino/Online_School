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

interface StudentAssignmentApiResponse {
    id: number;
    test_id: number;
    title: string;
    due_date: string | null;
    assigned_at: string;
    status: 'assigned' | 'in_progress' | 'completed' | string;
    first_name?: string;
    last_name?: string;
    score?: number;
    max_score?: number;
    completed_at?: string;
}

interface QuizTopicApiResponse {
    id: number;
    name: string;
    description: string;
    teacherId: number;
    createdAt: string;
    gameType?: 'quiz' | 'matching';
    question_count?: number;
}

interface QuizTopicInfo {
    id: number;
    name: string;
    description: string;
    teacherId: number;
    createdAt: string;
    gameType: 'quiz' | 'matching';
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
    const [currentFolder, setCurrentFolder] = useState<'root' | 'lectures' | 'tests' | 'games'>('root');

    const enterFolder = (folder: 'lectures' | 'tests' | 'games') => setCurrentFolder(folder);
    const goBack = () => setCurrentFolder('root');

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
                    const tests = await testsApi.getStudentAssignments(token) as StudentAssignmentApiResponse[];
                    const normalizedTests: AssignedTest[] = tests.map(assignment => {
                        const teacherNames = `${assignment.first_name || ''} ${assignment.last_name || ''}`.trim().split(' ');

                        return {
                            id: assignment.id,
                            test_id: assignment.test_id,
                            title: assignment.title,
                            due_date: assignment.due_date ?? null,
                            assigned_at: assignment.assigned_at,
                            status: assignment.status === 'assigned' ? 'pending'
                                : assignment.status === 'in_progress' ? 'started'
                                    : assignment.status === 'completed' ? 'completed'
                                        : 'pending',
                            first_name: teacherNames[0] || '',
                            last_name: teacherNames.slice(1).join(' ') || '',
                            score: assignment.score,
                            max_score: assignment.max_score,
                            completed_at: assignment.completed_at,
                        };
                    });
                    setAssignedTests(normalizedTests);

                    // Загрузить темы квизи и игры для студента
                    try {
                        const topics = await quizzesApi.getAllTopics(token) as QuizTopicApiResponse[];
                        setQuizTopics(topics.map(topic => ({
                            ...topic,
                            gameType: topic.gameType || 'quiz',
                            question_count: topic.question_count ?? 0,
                        })));
                    } catch (e) {
                        console.error('Failed to load quiz topics:', e);
                    }
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
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

                    {/* Файловая система: лекции, тесты и игры */}
                    {user.role !== 'teacher' && (
                        <section className={styles.section}>
                            <div className={styles.folderToolbar}>
                                {currentFolder !== 'root' ? (
                                    <button type="button" className={`${styles.backButton} ${styles.backButtonFolder}`} onClick={goBack}>
                                        ← Назад
                                    </button>
                                ) : (
                                    <div className={styles.folderBreadcrumb}>Тесты, лекции, квизи</div>
                                )}

                                {currentFolder !== 'root' && (
                                    <div className={styles.currentFolderLabel}>
                                        {currentFolder === 'lectures' && 'Лекции'}
                                        {currentFolder === 'tests' && 'Тесты'}
                                        {currentFolder === 'games' && 'Игры'}
                                    </div>
                                )}
                            </div>

                            {currentFolder === 'root' ? (
                                <div className={styles.folderGrid}>
                                    <article className={styles.folderCard} onClick={() => enterFolder('lectures')}>
                                        <div className={styles.folderHeader}>
                                            <span className={styles.folderTitle}>📁 Лекции</span>
                                            <span className={styles.folderMeta}>
                                                <span className={styles.folderCounter}>0</span>
                                                <span className={styles.folderArrow}>▸</span>
                                            </span>
                                        </div>
                                        <p className={styles.folderHint}>Пустая папка для материалов и лекций</p>
                                    </article>

                                    <article className={styles.folderCard} onClick={() => enterFolder('tests')}>
                                        <div className={styles.folderHeader}>
                                            <span className={styles.folderTitle}>📁 Тесты</span>
                                            <span className={styles.folderMeta}>
                                                <span className={styles.folderCounter}>{assignedTests.length} {assignedTests.length === 1 ? 'файл' : 'файла'}</span>
                                                <span className={styles.folderArrow}>▸</span>
                                            </span>
                                        </div>
                                        <p className={styles.folderHint}>Открыть назначенные тесты</p>
                                    </article>

                                    <article className={styles.folderCard} onClick={() => enterFolder('games')}>
                                        <div className={styles.folderHeader}>
                                            <span className={styles.folderTitle}>📁 Игры</span>
                                            <span className={styles.folderMeta}>
                                                <span className={styles.folderCounter}>{quizTopics.length + 1} {quizTopics.length + 1 === 1 ? 'файл' : 'файла'}</span>
                                                <span className={styles.folderArrow}>▸</span>
                                            </span>
                                        </div>
                                        <p className={styles.folderHint}>Открыть доступные квизы и мини-игры</p>
                                    </article>
                                </div>
                            ) : (
                                <div className={styles.folderContent}>
                                    {currentFolder === 'lectures' && (
                                        <p className={styles.emptyFolder}>Папка пуста — добавьте сюда материалы позже.</p>
                                    )}

                                    {currentFolder === 'tests' && (
                                        assignedTests.length > 0 ? (
                                            assignedTests.map(test => {
                                                const targetPath = test.status === 'completed'
                                                    ? `/test/${test.test_id}/results`
                                                    : `/test/${test.test_id}`;
                                                const statusLabel = test.status === 'pending'
                                                    ? 'Новый'
                                                    : test.status === 'started'
                                                        ? 'В процессе'
                                                        : 'Завершён';

                                                return (
                                                    <button
                                                        key={test.id}
                                                        type="button"
                                                        className={styles.fileItem}
                                                        onClick={() => navigate(targetPath)}
                                                    >
                                                        <div className={styles.fileInfo}>
                                                            <span className={styles.fileName}>📄 {test.title}</span>
                                                            <span className={styles.fileSubtitle}>
                                                                {test.first_name} {test.last_name}
                                                                {test.due_date ? ` · дедлайн ${new Date(test.due_date).toLocaleDateString('ru-RU')}` : ''}
                                                            </span>
                                                        </div>
                                                        <span className={styles.fileTag}>{statusLabel}</span>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p className={styles.emptyFolder}>Нет назначенных тестов</p>
                                        )
                                    )}

                                    {currentFolder === 'games' && (
                                        <>
                                            {quizTopics.length > 0 && quizTopics.map(topic => {
                                                const isMatching = topic.gameType === 'matching';
                                                const icon = isMatching ? '🧩' : '🎯';
                                                const routePath = isMatching ? `/matching/${topic.id}` : `/quiz/${topic.id}`;

                                                return (
                                                    <button
                                                        key={topic.id}
                                                        type="button"
                                                        className={styles.fileItem}
                                                        onClick={() => navigate(routePath)}
                                                        disabled={!topic.question_count}
                                                    >
                                                        <div className={styles.fileInfo}>
                                                            <span className={styles.fileName}>{icon} {topic.name}</span>
                                                            <span className={styles.fileSubtitle}>
                                                                {topic.description || (isMatching ? 'Игра сопоставления' : 'Квиз')}
                                                            </span>
                                                        </div>
                                                        <span className={styles.fileTag}>
                                                            {topic.question_count ? `${topic.question_count} вопроса` : 'Нет вопросов'}
                                                            {isMatching ? ' · Сопоставление' : ''}
                                                        </span>
                                                    </button>
                                                );
                                            })}

                                            <button
                                                type="button"
                                                className={styles.fileItem}
                                                onClick={() => navigate('/blockblast')}
                                            >
                                                <div className={styles.fileInfo}>
                                                    <span className={styles.fileName}>🧱 Block Blast</span>
                                                    <span className={styles.fileSubtitle}>Мини-игра 8×8 с блоками</span>
                                                </div>
                                                <span className={styles.fileTag}>Игровое поле 8×8 · 3 фигуры за раунд</span>
                                            </button>

                                            {quizTopics.length === 0 && (
                                                <p className={styles.emptyFolder}>Пока нет доступных тем для квизи</p>
                                            )}
                                        </>
                                    )}
                                </div>
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
