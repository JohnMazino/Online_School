import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import styles from './Tests.module.scss'; // Создайте отдельный файл стилей

interface Topic {
    id: number;
    name: string;
    subject_name?: string;
}

interface Test {
    id: number;
    title: string;
    topic_id: number;
    topic_name?: string;
    question_count: number;
    duration_minutes: number;
    passing_score: number;
    is_active: boolean;
    attempts_count: number;
    created_at: string;
    description?: string;
}

// Временные API функции для тестов
const testsApi = {
    getTests: async (token: string, params?: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Моковые данные
        const mockTests: Test[] = [
            { id: 1, title: 'Алгебра: базовый тест', topic_id: 1, topic_name: 'Алгебра', question_count: 20, duration_minutes: 60, passing_score: 70, is_active: true, attempts_count: 45, created_at: '2024-01-15' },
            { id: 2, title: 'Геометрия: треугольники', topic_id: 3, topic_name: 'Треугольники', question_count: 15, duration_minutes: 45, passing_score: 75, is_active: true, attempts_count: 32, created_at: '2024-01-20' },
            { id: 3, title: 'Русский язык: синтаксис', topic_id: 5, topic_name: 'Синтаксис', question_count: 25, duration_minutes: 75, passing_score: 80, is_active: true, attempts_count: 28, created_at: '2024-01-25' },
            { id: 4, title: 'Физика: механика', topic_id: 7, topic_name: 'Механика', question_count: 30, duration_minutes: 90, passing_score: 65, is_active: false, attempts_count: 18, created_at: '2024-02-01' },
            { id: 5, title: 'Химия: органическая', topic_id: 9, topic_name: 'Органическая химия', question_count: 20, duration_minutes: 60, passing_score: 70, is_active: true, attempts_count: 22, created_at: '2024-02-05' },
            { id: 6, title: 'Информатика: алгоритмы', topic_id: 10, topic_name: 'Алгоритмы', question_count: 35, duration_minutes: 120, passing_score: 85, is_active: true, attempts_count: 15, created_at: '2024-02-10' },
            { id: 7, title: 'Геометрия: окружность', topic_id: 4, topic_name: 'Окружность', question_count: 18, duration_minutes: 50, passing_score: 75, is_active: true, attempts_count: 29, created_at: '2024-02-12' },
            { id: 8, title: 'Русский язык: пунктуация', topic_id: 6, topic_name: 'Пунктуация', question_count: 22, duration_minutes: 65, passing_score: 80, is_active: true, attempts_count: 35, created_at: '2024-02-15' },
        ];

        let filtered = [...mockTests];

        // Фильтрация по поиску
        if (params?.q) {
            const q = params.q.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.topic_name?.toLowerCase().includes(q)
            );
        }

        // Фильтрация по теме
        if (params?.topic_id) {
            filtered = filtered.filter(t => t.topic_id === Number(params.topic_id));
        }

        // Фильтрация по статусу
        if (params?.status) {
            const isActive = params.status === 'active';
            filtered = filtered.filter(t => t.is_active === isActive);
        }

        // Пагинация
        const page = params?.page || 1;
        const perPage = params?.per_page || 10;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const paginated = filtered.slice(start, end);

        return {
            tests: paginated,
            total: filtered.length,
            page,
            perPage,
            totalPages: Math.ceil(filtered.length / perPage)
        };
    },

    createTest: async (token: string, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Create test:', data);
        return { id: Date.now(), ...data };
    },

    updateTest: async (token: string, id: number, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Update test:', id, data);
        return { id, ...data };
    },

    deleteTest: async (token: string, id: number) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Delete test:', id);
        return { success: true };
    },

    toggleTestActive: async (token: string, id: number, active: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Toggle test active:', id, active);
        return { id, is_active: active };
    }
};

export default function Tests() {
    const { token } = useAuthStore();

    const [tests, setTests] = useState<Test[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [topicFilter, setTopicFilter] = useState<number | ''>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<Test | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        topic_id: '' as string | number,
        question_count: 20,
        duration_minutes: 60,
        passing_score: 70,
        is_active: true,
        description: '',
    });

    // Загрузка тем
    const loadTopics = useCallback(async () => {
        if (!token) return;

        try {
            // Моковые темы
            const mockTopics: Topic[] = [
                { id: 1, name: 'Алгебра', subject_name: 'Математика' },
                { id: 2, name: 'Геометрия', subject_name: 'Математика' },
                { id: 3, name: 'Треугольники', subject_name: 'Математика' },
                { id: 4, name: 'Окружность', subject_name: 'Математика' },
                { id: 5, name: 'Синтаксис', subject_name: 'Русский язык' },
                { id: 6, name: 'Пунктуация', subject_name: 'Русский язык' },
                { id: 7, name: 'Механика', subject_name: 'Физика' },
                { id: 8, name: 'Оптика', subject_name: 'Физика' },
                { id: 9, name: 'Органическая химия', subject_name: 'Химия' },
                { id: 10, name: 'Алгоритмы', subject_name: 'Информатика' },
            ];

            await new Promise(resolve => setTimeout(resolve, 300));
            setTopics(mockTopics);
        } catch (err) {
            console.error('Ошибка загрузки тем:', err);
        }
    }, [token]);

    // Загрузка тестов
    const loadTests = useCallback(async () => {
        if (!token) {
            setError('Нет токена авторизации');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = {
                q: query || undefined,
                topic_id: topicFilter || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                page,
                per_page: perPage,
            };

            const data = await testsApi.getTests(token, params);
            setTests(data.tests || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки тестов');
            setTests([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, query, topicFilter, statusFilter, page, perPage]);

    useEffect(() => {
        loadTopics();
        loadTests();
    }, [loadTopics, loadTests]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            setFormData(prev => ({
                ...prev,
                [name]: checkbox.checked
            }));
        } else if (name === 'question_count' || name === 'duration_minutes' || name === 'passing_score') {
            setFormData(prev => ({
                ...prev,
                [name]: Math.max(1, Number(value) || 1) // Минимум 1
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            const payload = {
                ...formData,
                topic_id: Number(formData.topic_id),
            };

            if (editingTest) {
                await testsApi.updateTest(token, editingTest.id, payload);
            } else {
                await testsApi.createTest(token, payload);
            }

            handleCloseModal();
            loadTests();
        } catch (err: any) {
            setError(err.message || 'Ошибка сохранения теста');
        }
    };

    const handleEdit = (test: Test) => {
        setEditingTest(test);
        setFormData({
            title: test.title,
            topic_id: test.topic_id,
            question_count: test.question_count,
            duration_minutes: test.duration_minutes,
            passing_score: test.passing_score,
            is_active: test.is_active,
            description: test.description || '',
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить тест? Это удалит все связанные попытки!')) return;
        if (!token) return;

        try {
            await testsApi.deleteTest(token, id);
            loadTests();
        } catch (err: any) {
            setError(err.message || 'Ошибка удаления');
        }
    };

    const handleToggleActive = async (id: number, current: boolean) => {
        if (!token) return;

        try {
            await testsApi.toggleTestActive(token, id, !current);
            loadTests();
        } catch (err: any) {
            setError(err.message || 'Ошибка изменения статуса');
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingTest(null);
        setFormData({
            title: '',
            topic_id: '',
            question_count: 20,
            duration_minutes: 60,
            passing_score: 70,
            is_active: true,
            description: '',
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU');
    };

    const getPassingScoreColor = (score: number) => {
        if (score >= 80) return '#e74c3c';
        if (score >= 70) return '#f39c12';
        return '#27ae60';
    };

    return (
        <div className={styles.testsSection}>
            <div className={styles.headerRow}>
                <h1>Тесты</h1>
                <button
                    onClick={() => {
                        setEditingTest(null);
                        setFormData({
                            title: '',
                            topic_id: '',
                            question_count: 20,
                            duration_minutes: 60,
                            passing_score: 70,
                            is_active: true,
                            description: '',
                        });
                        setModalOpen(true);
                    }}
                    className={styles.addBtn}
                >
                    📋 Создать тест
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Фильтры */}
            <div className={styles.filters}>
                <div className={styles.searchContainer}>
                    <input
                        className={styles.searchInput}
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Поиск по названию теста или теме"
                    />
                    {query && (
                        <button
                            className={styles.clearSearch}
                            onClick={() => setQuery('')}
                        >
                            ✕
                        </button>
                    )}
                </div>

                <select
                    className={styles.filterSelect}
                    value={topicFilter}
                    onChange={e => {
                        setTopicFilter(e.target.value ? Number(e.target.value) : '');
                        setPage(1);
                    }}
                >
                    <option value="">Все темы</option>
                    {topics.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name} {t.subject_name && `(${t.subject_name})`}
                        </option>
                    ))}
                </select>

                <select
                    className={styles.filterSelect}
                    value={statusFilter}
                    onChange={e => {
                        setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                        setPage(1);
                    }}
                >
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="inactive">Скрытые</option>
                </select>

                {(query || topicFilter || statusFilter !== 'all') && (
                    <button
                        className={styles.clearFiltersBtn}
                        onClick={() => {
                            setQuery('');
                            setTopicFilter('');
                            setStatusFilter('all');
                            setPage(1);
                        }}
                    >
                        ✕ Очистить фильтры
                    </button>
                )}
            </div>

            {loading ? (
                <div className={styles.loading}>Загрузка тестов...</div>
            ) : tests.length === 0 ? (
                <div className={styles.empty}>
                    {query || topicFilter || statusFilter !== 'all' ?
                        'Тесты по заданным фильтрам не найдены' :
                        'Тесты не найдены'}
                    {(query || topicFilter || statusFilter !== 'all') && (
                        <button
                            className={styles.clearSearchBtn}
                            onClick={() => {
                                setQuery('');
                                setTopicFilter('');
                                setStatusFilter('all');
                            }}
                        >
                            Очистить фильтры
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.testTable}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Название</th>
                                    <th>Тема</th>
                                    <th>Вопросов</th>
                                    <th>Длительность</th>
                                    <th>Проходной балл</th>
                                    <th>Статус</th>
                                    <th>Попыток</th>
                                    <th>Создан</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tests.map(t => {
                                    const passingScoreColor = getPassingScoreColor(t.passing_score);
                                    return (
                                        <tr key={t.id} className={styles.testRow}>
                                            <td>{t.id}</td>
                                            <td>
                                                <strong>{t.title}</strong>
                                            </td>
                                            <td>
                                                <span className={styles.topicCell}>
                                                    {t.topic_name}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.questionCount}>
                                                    {t.question_count}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.durationCell}>
                                                    <span className={styles.durationIcon}>⏱️</span>
                                                    {t.duration_minutes} мин
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    className={styles.passingScore}
                                                    style={{ color: passingScoreColor, borderColor: `${passingScoreColor}40` }}
                                                >
                                                    {t.passing_score}%
                                                </span>
                                            </td>
                                            <td>
                                                <span className={t.is_active ? styles.statusActive : styles.statusInactive}>
                                                    {t.is_active ? '✅ Активен' : '❌ Скрыт'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.attemptsCount}>
                                                    {t.attempts_count}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.dateCell}>
                                                    {formatDate(t.created_at)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.actionButtons}>
                                                    <button
                                                        onClick={() => handleEdit(t)}
                                                        className={styles.editBtn}
                                                        title="Редактировать"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(t.id, t.is_active)}
                                                        className={t.is_active ? styles.hideBtn : styles.showBtn}
                                                        title={t.is_active ? 'Скрыть' : 'Показать'}
                                                    >
                                                        {t.is_active ? '👁️' : '👁️‍🗨️'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        className={styles.deleteBtn}
                                                        title="Удалить"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.pagination}>
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className={styles.paginationBtn}
                        >
                            ← Назад
                        </button>
                        <span className={styles.pageInfo}>
                            Страница {page} из {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className={styles.paginationBtn}
                        >
                            Вперед →
                        </button>
                        <span className={styles.totalInfo}>Всего: {total}</span>
                    </div>
                </>
            )}

            {/* Модальное окно */}
            {modalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingTest ? 'Редактировать тест' : 'Создать тест'}</h2>
                            <button
                                className={styles.closeModal}
                                onClick={handleCloseModal}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Название теста *
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        required
                                        placeholder="Например: Алгебра: базовый тест"
                                    />
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Тема теста *
                                    <select
                                        name="topic_id"
                                        value={formData.topic_id}
                                        onChange={handleInputChange}
                                        className={styles.formSelect}
                                        required
                                    >
                                        <option value="">Выберите тему</option>
                                        {topics.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} {t.subject_name && `(${t.subject_name})`}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Количество вопросов *
                                        <input
                                            type="number"
                                            name="question_count"
                                            value={formData.question_count}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            min="1"
                                            max="100"
                                            required
                                        />
                                    </label>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Длительность (минуты) *
                                        <input
                                            type="number"
                                            name="duration_minutes"
                                            value={formData.duration_minutes}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            min="5"
                                            max="300"
                                            required
                                        />
                                    </label>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Проходной балл (%) *
                                        <input
                                            type="number"
                                            name="passing_score"
                                            value={formData.passing_score}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            min="0"
                                            max="100"
                                            required
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Описание / инструкция
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className={styles.formTextarea}
                                        rows={4}
                                        placeholder="Описание теста и инструкции для пользователей (опционально)..."
                                    />
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleInputChange}
                                        className={styles.checkbox}
                                    />
                                    <span className={styles.checkboxText}>Активен (доступен для прохождения)</span>
                                </label>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="submit"
                                    className={styles.saveBtn}
                                >
                                    💾 {editingTest ? 'Сохранить' : 'Создать'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className={styles.cancelBtn}
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
