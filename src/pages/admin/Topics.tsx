import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import styles from './Topics.module.scss';

interface Subject {
    id: number;
    name: string;
}

interface Topic {
    id: number;
    name: string;
    slug: string;
    subject_id: number;
    subject_name?: string;
    parent_id?: number | null;
    parent_name?: string;
    order: number;
    is_active: boolean;
    tasks_count: number;
}

// Временные API функции для тем
const topicsApi = {
    getTopics: async (token: string, params?: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Моковые данные
        const mockTopics: Topic[] = [
            { id: 1, name: 'Алгебра', slug: 'algebra', subject_id: 1, subject_name: 'Математика', parent_id: null, order: 1, is_active: true, tasks_count: 45 },
            { id: 2, name: 'Геометрия', slug: 'geometry', subject_id: 1, subject_name: 'Математика', parent_id: null, order: 2, is_active: true, tasks_count: 38 },
            { id: 3, name: 'Треугольники', slug: 'triangles', subject_id: 1, subject_name: 'Математика', parent_id: 2, parent_name: 'Геометрия', order: 1, is_active: true, tasks_count: 25 },
            { id: 4, name: 'Окружность', slug: 'circle', subject_id: 1, subject_name: 'Математика', parent_id: 2, parent_name: 'Геометрия', order: 2, is_active: true, tasks_count: 20 },
            { id: 5, name: 'Синтаксис', slug: 'syntax', subject_id: 2, subject_name: 'Русский язык', parent_id: null, order: 1, is_active: true, tasks_count: 30 },
            { id: 6, name: 'Пунктуация', slug: 'punctuation', subject_id: 2, subject_name: 'Русский язык', parent_id: null, order: 2, is_active: true, tasks_count: 28 },
            { id: 7, name: 'Механика', slug: 'mechanics', subject_id: 3, subject_name: 'Физика', parent_id: null, order: 1, is_active: true, tasks_count: 35 },
            { id: 8, name: 'Оптика', slug: 'optics', subject_id: 3, subject_name: 'Физика', parent_id: null, order: 2, is_active: false, tasks_count: 22 },
            { id: 9, name: 'Органическая химия', slug: 'organic-chemistry', subject_id: 4, subject_name: 'Химия', parent_id: null, order: 1, is_active: true, tasks_count: 18 },
            { id: 10, name: 'Алгоритмы', slug: 'algorithms', subject_id: 5, subject_name: 'Информатика', parent_id: null, order: 1, is_active: true, tasks_count: 42 },
        ];

        let filtered = [...mockTopics];

        // Фильтрация по поиску
        if (params?.q) {
            const q = params.q.toLowerCase();
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.slug.toLowerCase().includes(q) ||
                t.subject_name?.toLowerCase().includes(q)
            );
        }

        // Фильтрация по предмету
        if (params?.subject_id) {
            filtered = filtered.filter(t => t.subject_id === Number(params.subject_id));
        }

        // Пагинация
        const page = params?.page || 1;
        const perPage = params?.per_page || 15;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const paginated = filtered.slice(start, end);

        return {
            topics: paginated,
            total: filtered.length,
            page,
            perPage,
            totalPages: Math.ceil(filtered.length / perPage)
        };
    },

    createTopic: async (token: string, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Create topic:', data);
        return { id: Date.now(), ...data };
    },

    updateTopic: async (token: string, id: number, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Update topic:', id, data);
        return { id, ...data };
    },

    deleteTopic: async (token: string, id: number) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Delete topic:', id);
        return { success: true };
    },

    toggleTopicActive: async (token: string, id: number, active: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Toggle topic active:', id, active);
        return { id, is_active: active };
    }
};

export default function Topics() {
    const { token } = useAuthStore();

    const [topics, setTopics] = useState<Topic[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState<number | ''>('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(15);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        subject_id: '' as string | number,
        parent_id: '' as number | '',
        order: 0,
        is_active: true,
    });

    // Загрузка предметов
    const loadSubjects = useCallback(async () => {
        if (!token) return;

        try {
            // Моковые предметы
            const mockSubjects: Subject[] = [
                { id: 1, name: 'Математика' },
                { id: 2, name: 'Русский язык' },
                { id: 3, name: 'Физика' },
                { id: 4, name: 'Химия' },
                { id: 5, name: 'Информатика' },
                { id: 6, name: 'Биология' },
                { id: 7, name: 'История' },
                { id: 8, name: 'География' },
            ];

            await new Promise(resolve => setTimeout(resolve, 300));
            setSubjects(mockSubjects);
        } catch (err) {
            console.error('Ошибка загрузки предметов:', err);
        }
    }, [token]);

    // Загрузка тем
    const loadTopics = useCallback(async () => {
        if (!token) {
            setError('Нет токена авторизации');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = {
                q: query || undefined,
                subject_id: subjectFilter || undefined,
                page,
                per_page: perPage,
            };

            const data = await topicsApi.getTopics(token, params);
            setTopics(data.topics || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки тем');
            setTopics([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, query, subjectFilter, page, perPage]);

    useEffect(() => {
        loadSubjects();
        loadTopics();
    }, [loadSubjects, loadTopics]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            setFormData(prev => ({
                ...prev,
                [name]: checkbox.checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'order' ? Number(value) || 0 :
                    name === 'subject_id' || name === 'parent_id' ? (value === '' ? '' : Number(value)) :
                        value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            const payload = {
                ...formData,
                subject_id: Number(formData.subject_id),
                parent_id: formData.parent_id || null,
            };

            if (editingTopic) {
                await topicsApi.updateTopic(token, editingTopic.id, payload);
            } else {
                await topicsApi.createTopic(token, payload);
            }

            handleCloseModal();
            loadTopics();
        } catch (err: any) {
            setError(err.message || 'Ошибка сохранения темы');
        }
    };

    const handleEdit = (topic: Topic) => {
        setEditingTopic(topic);
        setFormData({
            name: topic.name,
            slug: topic.slug,
            subject_id: topic.subject_id,
            parent_id: topic.parent_id || '',
            order: topic.order,
            is_active: topic.is_active,
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить тему? Это удалит все связанные задания!')) return;
        if (!token) return;

        try {
            await topicsApi.deleteTopic(token, id);
            loadTopics();
        } catch (err: any) {
            setError(err.message || 'Ошибка удаления');
        }
    };

    const handleToggleActive = async (id: number, current: boolean) => {
        if (!token) return;

        try {
            await topicsApi.toggleTopicActive(token, id, !current);
            loadTopics();
        } catch (err: any) {
            setError(err.message || 'Ошибка изменения статуса');
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingTopic(null);
        setFormData({
            name: '',
            slug: '',
            subject_id: '',
            parent_id: '',
            order: 0,
            is_active: true
        });
    };

    // Получение тем для выбранного предмета (для родительского селекта)
    const getFilteredTopics = () => {
        if (!formData.subject_id) return [];
        return topics.filter(t =>
            t.subject_id === Number(formData.subject_id) &&
            (!editingTopic || t.id !== editingTopic.id) // Исключаем редактируемую тему из родительских
        );
    };

    const getSubjectColor = (subjectId: number) => {
        const colors = [
            '#3498db', // Математика
            '#2ecc71', // Русский
            '#e74c3c', // Физика
            '#9b59b6', // Химия
            '#f39c12', // Информатика
            '#1abc9c', // Биология
            '#34495e', // История
            '#95a5a6', // География
        ];
        return colors[(subjectId - 1) % colors.length];
    };

    return (
        <div className={styles.topicsSection}>
            <div className={styles.headerRow}>
                <h1>Темы</h1>
                <button
                    onClick={() => {
                        setEditingTopic(null);
                        setFormData({
                            name: '',
                            slug: '',
                            subject_id: '',
                            parent_id: '',
                            order: 0,
                            is_active: true
                        });
                        setModalOpen(true);
                    }}
                    className={styles.addBtn}
                >
                    📚 Добавить тему
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
                        placeholder="Поиск по названию темы или slug"
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
                    value={subjectFilter}
                    onChange={e => {
                        setSubjectFilter(e.target.value ? Number(e.target.value) : '');
                        setPage(1);
                    }}
                >
                    <option value="">Все предметы</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>

                {(query || subjectFilter) && (
                    <button
                        className={styles.clearFiltersBtn}
                        onClick={() => {
                            setQuery('');
                            setSubjectFilter('');
                            setPage(1);
                        }}
                    >
                        ✕ Очистить фильтры
                    </button>
                )}
            </div>

            {loading ? (
                <div className={styles.loading}>Загрузка тем...</div>
            ) : topics.length === 0 ? (
                <div className={styles.empty}>
                    {query || subjectFilter ? 'Темы по заданным фильтрам не найдены' : 'Темы не найдены'}
                    {(query || subjectFilter) && (
                        <button
                            className={styles.clearSearchBtn}
                            onClick={() => {
                                setQuery('');
                                setSubjectFilter('');
                            }}
                        >
                            Очистить фильтры
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.topicTable}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Название</th>
                                    <th>Slug</th>
                                    <th>Предмет</th>
                                    <th>Родительская тема</th>
                                    <th>Порядок</th>
                                    <th>Статус</th>
                                    <th>Заданий</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topics.map(t => {
                                    const subjectColor = getSubjectColor(t.subject_id);
                                    return (
                                        <tr key={t.id} className={styles.topicRow}>
                                            <td>{t.id}</td>
                                            <td>
                                                <strong>{t.name}</strong>
                                                {t.parent_name && (
                                                    <div className={styles.parentIndicator}>
                                                        ← {t.parent_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <code className={styles.slugCell}>{t.slug}</code>
                                            </td>
                                            <td>
                                                <span
                                                    className={styles.subjectBadge}
                                                    style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}
                                                >
                                                    {t.subject_name}
                                                </span>
                                            </td>
                                            <td>{t.parent_name || '—'}</td>
                                            <td>
                                                <span className={styles.orderBadge}>{t.order}</span>
                                            </td>
                                            <td>
                                                <span className={t.is_active ? styles.statusActive : styles.statusInactive}>
                                                    {t.is_active ? '✅ Активна' : '❌ Скрыта'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.tasksCount}>{t.tasks_count}</span>
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
                            <h2>{editingTopic ? 'Редактировать тему' : 'Добавить тему'}</h2>
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
                                    Название темы *
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        required
                                        placeholder="Например: Алгебра"
                                    />
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Slug (URL) *
                                    <input
                                        type="text"
                                        name="slug"
                                        value={formData.slug}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        required
                                        placeholder="Например: algebra"
                                    />
                                    <small className={styles.formHint}>
                                        Только латинские буквы, цифры и дефисы
                                    </small>
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Предмет *
                                    <select
                                        name="subject_id"
                                        value={formData.subject_id}
                                        onChange={handleInputChange}
                                        className={styles.formSelect}
                                        required
                                    >
                                        <option value="">Выберите предмет</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            {formData.subject_id && (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Родительская тема
                                        <select
                                            name="parent_id"
                                            value={formData.parent_id}
                                            onChange={handleInputChange}
                                            className={styles.formSelect}
                                        >
                                            <option value="">Нет (основная тема)</option>
                                            {getFilteredTopics().map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                        <small className={styles.formHint}>
                                            Если тема является подтемой
                                        </small>
                                    </label>
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Порядок отображения
                                    <input
                                        type="number"
                                        name="order"
                                        value={formData.order}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        min="0"
                                        placeholder="0"
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
                                    <span className={styles.checkboxText}>Активна (отображается в списке)</span>
                                </label>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="submit"
                                    className={styles.saveBtn}
                                >
                                    💾 {editingTopic ? 'Сохранить' : 'Добавить'}
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
