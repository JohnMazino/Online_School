import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import styles from './Tasks.module.scss';

interface Topic {
    id: number;
    name: string;
    subject_name?: string;
}

interface Task {
    id: number;
    topic_id: number;
    topic_name?: string;
    question_text: string;
    type: 'single' | 'multiple' | 'open' | 'match' | 'order';
    difficulty: number; // 1-5
    image_url?: string;
    explanation?: string;
    created_by: number;
    created_by_name?: string;
    is_active: boolean;
    variants_count: number;
}

interface Variant {
    id?: number;
    text: string;
    is_correct: boolean;
    order?: number;
}

// Временные API функции для заданий
const tasksApi = {
    getTasks: async (token: string, params?: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Моковые данные
        const mockTasks: Task[] = [
            { id: 1, topic_id: 1, topic_name: 'Алгебра', question_text: 'Решите уравнение: 2x + 5 = 15', type: 'single', difficulty: 2, created_by: 1, created_by_name: 'Администратор', is_active: true, variants_count: 4 },
            { id: 2, topic_id: 1, topic_name: 'Алгебра', question_text: 'Найдите производную функции f(x) = x² + 3x - 5', type: 'single', difficulty: 4, image_url: '', explanation: 'Используйте правило дифференцирования', created_by: 1, created_by_name: 'Администратор', is_active: true, variants_count: 4 },
            { id: 3, topic_id: 3, topic_name: 'Треугольники', question_text: 'Какие из утверждений верны для прямоугольного треугольника?', type: 'multiple', difficulty: 3, created_by: 1, created_by_name: 'Администратор', is_active: true, variants_count: 5 },
            { id: 4, topic_id: 5, topic_name: 'Синтаксис', question_text: 'Составьте предложение из данных слов', type: 'order', difficulty: 3, created_by: 2, created_by_name: 'Преподаватель', is_active: true, variants_count: 6 },
            { id: 5, topic_id: 7, topic_name: 'Механика', question_text: 'Что такое сила трения?', type: 'open', difficulty: 2, explanation: 'Сила, возникающая при движении одного тела по поверхности другого', created_by: 1, created_by_name: 'Администратор', is_active: true, variants_count: 0 },
            { id: 6, topic_id: 10, topic_name: 'Алгоритмы', question_text: 'Соответствие алгоритмов и их сложности', type: 'match', difficulty: 5, created_by: 1, created_by_name: 'Администратор', is_active: false, variants_count: 8 },
            { id: 7, topic_id: 2, topic_name: 'Геометрия', question_text: 'Найдите площадь круга радиусом 5 см', type: 'single', difficulty: 2, created_by: 1, created_by_name: 'Администратор', is_active: true, variants_count: 4 },
            { id: 8, topic_id: 6, topic_name: 'Пунктуация', question_text: 'Расставьте знаки препинания в предложении', type: 'open', difficulty: 3, created_by: 2, created_by_name: 'Преподаватель', is_active: true, variants_count: 0 },
            { id: 9, topic_id: 9, topic_name: 'Органическая химия', question_text: 'Выберите формулы углеводородов', type: 'multiple', difficulty: 4, created_by: 1, created_by_name: 'Администратор', is_active: true, variants_count: 6 },
            { id: 10, topic_id: 4, topic_name: 'Окружность', question_text: 'Найдите длину окружности диаметром 10 см', type: 'single', difficulty: 2, created_by: 1, created_by_name: 'Администратор', is_active: true, variants_count: 4 },
        ];

        let filtered = [...mockTasks];

        // Фильтрация по поиску
        if (params?.q) {
            const q = params.q.toLowerCase();
            filtered = filtered.filter(t =>
                t.question_text.toLowerCase().includes(q) ||
                t.topic_name?.toLowerCase().includes(q) ||
                t.created_by_name?.toLowerCase().includes(q)
            );
        }

        // Фильтрация по теме
        if (params?.topic_id) {
            filtered = filtered.filter(t => t.topic_id === Number(params.topic_id));
        }

        // Фильтрация по типу
        if (params?.type) {
            filtered = filtered.filter(t => t.type === params.type);
        }

        // Фильтрация по сложности
        if (params?.difficulty) {
            filtered = filtered.filter(t => t.difficulty === Number(params.difficulty));
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
            tasks: paginated,
            total: filtered.length,
            page,
            perPage,
            totalPages: Math.ceil(filtered.length / perPage)
        };
    },

    createTask: async (token: string, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Create task:', data);
        return { id: Date.now(), ...data };
    },

    updateTask: async (token: string, id: number, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Update task:', id, data);
        return { id, ...data };
    },

    deleteTask: async (token: string, id: number) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Delete task:', id);
        return { success: true };
    },

    toggleTaskActive: async (token: string, id: number, active: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Toggle task active:', id, active);
        return { id, is_active: active };
    }
};

export default function Tasks() {
    const { token, user } = useAuthStore();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({
        topic_id: '',
        type: '',
        difficulty: '',
        status: '',
    });
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [formData, setFormData] = useState({
        topic_id: '' as string | number,
        question_text: '',
        type: 'single' as 'single' | 'multiple' | 'open' | 'match' | 'order',
        difficulty: 3,
        image_url: '',
        explanation: '',
        is_active: true,
    });
    const [variants, setVariants] = useState<Variant[]>([
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
    ]);

    // Загрузка тем
    const loadTopics = useCallback(async () => {
        if (!token) return;

        try {
            // Моковые темы (можно заменить на реальные)
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

    // Загрузка заданий
    const loadTasks = useCallback(async () => {
        if (!token) {
            setError('Нет токена авторизации');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = {
                q: query || undefined,
                topic_id: filters.topic_id || undefined,
                type: filters.type || undefined,
                difficulty: filters.difficulty || undefined,
                status: filters.status || undefined,
                page,
                per_page: perPage,
            };

            const data = await tasksApi.getTasks(token, params);
            setTasks(data.tasks || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки заданий');
            setTasks([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, query, filters, page, perPage]);

    useEffect(() => {
        loadTopics();
        loadTasks();
    }, [loadTopics, loadTasks]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            setFormData(prev => ({
                ...prev,
                [name]: checkbox.checked
            }));
        } else if (name === 'difficulty') {
            setFormData(prev => ({
                ...prev,
                [name]: Number(value)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const openModal = (task?: Task) => {
        if (task) {
            setEditingTask(task);
            setFormData({
                topic_id: task.topic_id,
                question_text: task.question_text,
                type: task.type,
                difficulty: task.difficulty,
                image_url: task.image_url || '',
                explanation: task.explanation || '',
                is_active: task.is_active,
            });
            // Для демо - стандартные варианты
            setVariants([
                { text: 'Правильный ответ', is_correct: true },
                { text: 'Неправильный ответ 1', is_correct: false },
                { text: 'Неправильный ответ 2', is_correct: false },
                { text: 'Неправильный ответ 3', is_correct: false }
            ]);
        } else {
            setEditingTask(null);
            setFormData({
                topic_id: '',
                question_text: '',
                type: 'single',
                difficulty: 3,
                image_url: '',
                explanation: '',
                is_active: true,
            });
            setVariants([
                { text: '', is_correct: true },
                { text: '', is_correct: false },
                { text: '', is_correct: false },
                { text: '', is_correct: false }
            ]);
        }
        setModalOpen(true);
    };

    const addVariant = () => {
        setVariants([...variants, { text: '', is_correct: false }]);
    };

    const updateVariant = (index: number, field: 'text' | 'is_correct', value: string | boolean) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };

        // Для одиночного выбора - сбрасываем все остальные правильные варианты
        if (field === 'is_correct' && value === true && formData.type === 'single') {
            newVariants.forEach((v, i) => {
                if (i !== index) v.is_correct = false;
            });
        }

        setVariants(newVariants);
    };

    const removeVariant = (index: number) => {
        if (variants.length > 2) {
            setVariants(variants.filter((_, i) => i !== index));
        } else {
            setError('Должно быть минимум 2 варианта ответа');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            const payload = {
                ...formData,
                topic_id: Number(formData.topic_id),
                variants: variants.filter(v => v.text.trim() !== ''), // Убираем пустые варианты
                created_by: user?.id || 1,
            };

            if (editingTask) {
                await tasksApi.updateTask(token, editingTask.id, payload);
            } else {
                await tasksApi.createTask(token, payload);
            }

            setModalOpen(false);
            loadTasks();
        } catch (err: any) {
            setError(err.message || 'Ошибка сохранения задания');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить задание навсегда?')) return;
        if (!token) return;

        try {
            await tasksApi.deleteTask(token, id);
            loadTasks();
        } catch (err: any) {
            setError(err.message || 'Ошибка удаления');
        }
    };

    const handleToggleActive = async (id: number, current: boolean) => {
        if (!token) return;

        try {
            await tasksApi.toggleTaskActive(token, id, !current);
            loadTasks();
        } catch (err: any) {
            setError(err.message || 'Ошибка изменения статуса');
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingTask(null);
        setFormData({
            topic_id: '',
            question_text: '',
            type: 'single',
            difficulty: 3,
            image_url: '',
            explanation: '',
            is_active: true,
        });
        setVariants([
            { text: '', is_correct: true },
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false }
        ]);
    };

    const getTaskTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            'single': 'Одиночный выбор',
            'multiple': 'Множественный выбор',
            'open': 'Открытый ответ',
            'match': 'Соответствие',
            'order': 'Последовательность'
        };
        return types[type] || type;
    };

    const getDifficultyStars = (difficulty: number) => {
        return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
    };

    return (
        <div className={styles.tasksSection}>
            <div className={styles.headerRow}>
                <h1>Задания</h1>
                <button onClick={() => openModal()} className={styles.addBtn}>
                    📝 Добавить задание
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
                        placeholder="Поиск по тексту вопроса или теме"
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
                    value={filters.topic_id}
                    onChange={e => {
                        setFilters({ ...filters, topic_id: e.target.value });
                        setPage(1);
                    }}
                >
                    <option value="">Все темы</option>
                    {topics.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name} ({t.subject_name})
                        </option>
                    ))}
                </select>

                <select
                    className={styles.filterSelect}
                    value={filters.type}
                    onChange={e => {
                        setFilters({ ...filters, type: e.target.value });
                        setPage(1);
                    }}
                >
                    <option value="">Все типы</option>
                    <option value="single">Одиночный выбор</option>
                    <option value="multiple">Множественный выбор</option>
                    <option value="open">Открытый ответ</option>
                    <option value="match">Соответствие</option>
                    <option value="order">Последовательность</option>
                </select>

                <select
                    className={styles.filterSelect}
                    value={filters.difficulty}
                    onChange={e => {
                        setFilters({ ...filters, difficulty: e.target.value });
                        setPage(1);
                    }}
                >
                    <option value="">Любая сложность</option>
                    <option value="1">★☆☆☆☆ Легко</option>
                    <option value="2">★★☆☆☆</option>
                    <option value="3">★★★☆☆ Средне</option>
                    <option value="4">★★★★☆</option>
                    <option value="5">★★★★★ Сложно</option>
                </select>

                {(query || filters.topic_id || filters.type || filters.difficulty) && (
                    <button
                        className={styles.clearFiltersBtn}
                        onClick={() => {
                            setQuery('');
                            setFilters({ topic_id: '', type: '', difficulty: '', status: '' });
                            setPage(1);
                        }}
                    >
                        ✕ Очистить фильтры
                    </button>
                )}
            </div>

            {loading ? (
                <div className={styles.loading}>Загрузка заданий...</div>
            ) : tasks.length === 0 ? (
                <div className={styles.empty}>
                    {query || filters.topic_id || filters.type || filters.difficulty ?
                        'Задания по заданным фильтрам не найдены' :
                        'Задания не найдены'}
                    {(query || filters.topic_id || filters.type || filters.difficulty) && (
                        <button
                            className={styles.clearSearchBtn}
                            onClick={() => {
                                setQuery('');
                                setFilters({ topic_id: '', type: '', difficulty: '', status: '' });
                            }}
                        >
                            Очистить фильтры
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.taskTable}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Тема</th>
                                    <th>Вопрос</th>
                                    <th>Тип</th>
                                    <th>Сложность</th>
                                    <th>Автор</th>
                                    <th>Статус</th>
                                    <th>Вариантов</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(t => (
                                    <tr key={t.id} className={styles.taskRow}>
                                        <td>{t.id}</td>
                                        <td>
                                            <div className={styles.topicCell}>
                                                <strong>{t.topic_name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.questionCell}>
                                                {t.question_text.substring(0, 80)}
                                                {t.question_text.length > 80 && '...'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.typeBadge} ${styles[`type${t.type.charAt(0).toUpperCase() + t.type.slice(1)}`]}`}>
                                                {getTaskTypeLabel(t.type)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.difficultyCell}>
                                                <span className={styles.difficultyStars}>
                                                    {getDifficultyStars(t.difficulty)}
                                                </span>
                                                <span className={styles.difficultyNumber}>
                                                    {t.difficulty}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.authorCell}>
                                                {t.created_by_name || `ID: ${t.created_by}`}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={t.is_active ? styles.statusActive : styles.statusInactive}>
                                                {t.is_active ? '✅ Активно' : '❌ Скрыто'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.variantsCount}>
                                                {t.variants_count}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button
                                                    onClick={() => openModal(t)}
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
                                ))}
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
                            <h2>{editingTask ? 'Редактировать задание' : 'Добавить задание'}</h2>
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
                                    Тема *
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
                                                {t.name} ({t.subject_name})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Текст вопроса *
                                    <textarea
                                        name="question_text"
                                        value={formData.question_text}
                                        onChange={handleInputChange}
                                        className={styles.formTextarea}
                                        rows={4}
                                        required
                                        placeholder="Введите текст вопроса..."
                                    />
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Тип задания
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={(e) => {
                                            handleInputChange(e);
                                            // При смене типа сбрасываем правильные ответы
                                            if (e.target.value !== 'single') {
                                                setVariants(variants.map(v => ({ ...v, is_correct: false })));
                                            }
                                        }}
                                        className={styles.formSelect}
                                    >
                                        <option value="single">Одиночный выбор</option>
                                        <option value="multiple">Множественный выбор</option>
                                        <option value="open">Открытый ответ</option>
                                        <option value="match">Соответствие</option>
                                        <option value="order">Последовательность</option>
                                    </select>
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Сложность (1–5) *
                                    <div className={styles.difficultySelector}>
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <button
                                                key={num}
                                                type="button"
                                                className={`${styles.difficultyBtn} ${formData.difficulty === num ? styles.active : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, difficulty: num }))}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </label>
                            </div>

                            {/* Варианты ответа */}
                            {formData.type !== 'open' && (
                                <div className={styles.variantsBlock}>
                                    <div className={styles.variantsHeader}>
                                        <h3>Варианты ответа</h3>
                                        <button
                                            type="button"
                                            onClick={addVariant}
                                            className={styles.addVariantBtn}
                                        >
                                            + Добавить вариант
                                        </button>
                                    </div>

                                    {variants.map((v, index) => (
                                        <div key={index} className={styles.variantRow}>
                                            <textarea
                                                value={v.text}
                                                onChange={e => updateVariant(index, 'text', e.target.value)}
                                                className={styles.variantInput}
                                                placeholder="Текст варианта..."
                                                rows={2}
                                            />
                                            <div className={styles.variantControls}>
                                                <label className={styles.checkboxLabel}>
                                                    <input
                                                        type={formData.type === 'single' ? 'radio' : 'checkbox'}
                                                        name={`variant-correct-${index}`}
                                                        checked={v.is_correct}
                                                        onChange={e => updateVariant(index, 'is_correct', e.target.checked)}
                                                        className={styles.checkbox}
                                                    />
                                                    <span className={styles.checkboxText}>
                                                        {formData.type === 'single' ? 'Правильный' : 'Правильный'}
                                                    </span>
                                                </label>
                                                {variants.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVariant(index)}
                                                        className={styles.removeVariantBtn}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {formData.type === 'single' && (
                                        <small className={styles.formHint}>
                                            Для типа "Одиночный выбор" может быть только один правильный вариант
                                        </small>
                                    )}
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Объяснение правильного ответа
                                    <textarea
                                        name="explanation"
                                        value={formData.explanation}
                                        onChange={handleInputChange}
                                        className={styles.formTextarea}
                                        rows={3}
                                        placeholder="Пояснение к правильному ответу (опционально)..."
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
                                    <span className={styles.checkboxText}>Активно (отображается в заданиях)</span>
                                </label>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="submit"
                                    className={styles.saveBtn}
                                    disabled={variants.filter(v => v.text.trim() !== '').length < 2 && formData.type !== 'open'}
                                >
                                    💾 {editingTask ? 'Сохранить' : 'Добавить'}
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
