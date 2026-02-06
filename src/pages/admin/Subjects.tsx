import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth'; // предполагаем, что есть методы для предметов
import styles from './Subjects.module.scss';

interface Subject {
    id: number;
    name: string;
    slug: string;
    order: number;
    is_active: boolean;
    topics_count: number;
}

// Временные API функции для работы с предметами
const subjectsApi = {
    // Временная функция - замените на реальный API вызов
    getSubjects: async (token: string, query?: string, page?: number, perPage?: number) => {
        // Имитация задержки API
        await new Promise(resolve => setTimeout(resolve, 500));

        // Моковые данные для примера
        const mockSubjects: Subject[] = [
            { id: 1, name: 'Математика', slug: 'mathematics', order: 1, is_active: true, topics_count: 15 },
            { id: 2, name: 'Русский язык', slug: 'russian', order: 2, is_active: true, topics_count: 12 },
            { id: 3, name: 'Физика', slug: 'physics', order: 3, is_active: true, topics_count: 10 },
            { id: 4, name: 'Химия', slug: 'chemistry', order: 4, is_active: true, topics_count: 8 },
            { id: 5, name: 'Информатика', slug: 'informatics', order: 5, is_active: true, topics_count: 14 },
            { id: 6, name: 'Биология', slug: 'biology', order: 6, is_active: false, topics_count: 9 },
            { id: 7, name: 'История', slug: 'history', order: 7, is_active: true, topics_count: 11 },
            { id: 8, name: 'География', slug: 'geography', order: 8, is_active: true, topics_count: 7 },
        ];

        // Фильтрация по запросу
        let filtered = mockSubjects;
        if (query) {
            filtered = mockSubjects.filter(
                s => s.name.toLowerCase().includes(query.toLowerCase()) ||
                    s.slug.toLowerCase().includes(query.toLowerCase())
            );
        }

        // Пагинация
        const start = ((page || 1) - 1) * (perPage || 10);
        const end = start + (perPage || 10);
        const paginated = filtered.slice(start, end);

        return {
            subjects: paginated,
            total: filtered.length,
            page: page || 1,
            perPage: perPage || 10,
            totalPages: Math.ceil(filtered.length / (perPage || 10))
        };
    },

    // Временная функция для создания предмета
    createSubject: async (token: string, data: Partial<Subject>) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Create subject:', data);
        return { id: Date.now(), ...data };
    },

    // Временная функция для обновления предмета
    updateSubject: async (token: string, id: number, data: Partial<Subject>) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Update subject:', id, data);
        return { id, ...data };
    },

    // Временная функция для удаления предмета
    deleteSubject: async (token: string, id: number) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Delete subject:', id);
        return { success: true };
    },

    // Временная функция для переключения активности
    toggleSubjectActive: async (token: string, id: number, active: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Toggle subject active:', id, active);
        return { id, is_active: active };
    },
};

export default function Subjects() {
    const { token } = useAuthStore();

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        order: 0,
        is_active: true,
    });

    const loadSubjects = useCallback(async () => {
        if (!token) {
            setError('Нет токена авторизации');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Используем временные API функции
            const data = await subjectsApi.getSubjects(token, query, page, perPage);
            setSubjects(data.subjects || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки предметов');
            setSubjects([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, query, page, perPage]);

    useEffect(() => {
        loadSubjects();
    }, [loadSubjects]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked :
                type === 'number' ? parseInt(value) || 0 :
                    value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            if (editingSubject) {
                // Редактирование
                await subjectsApi.updateSubject(token, editingSubject.id, formData);
            } else {
                // Создание
                await subjectsApi.createSubject(token, formData);
            }
            setModalOpen(false);
            setEditingSubject(null);
            setFormData({ name: '', slug: '', order: 0, is_active: true });
            loadSubjects();
        } catch (err: any) {
            setError(err.message || 'Ошибка сохранения предмета');
        }
    };

    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            slug: subject.slug,
            order: subject.order,
            is_active: subject.is_active,
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить предмет? Это удалит все связанные темы и задания!')) return;
        if (!token) return;

        try {
            await subjectsApi.deleteSubject(token, id);
            loadSubjects();
        } catch (err: any) {
            setError(err.message || 'Ошибка удаления');
        }
    };

    const handleToggleActive = async (id: number, current: boolean) => {
        if (!token) return;

        try {
            await subjectsApi.toggleSubjectActive(token, id, !current);
            loadSubjects();
        } catch (err: any) {
            setError(err.message || 'Ошибка изменения статуса');
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingSubject(null);
        setFormData({ name: '', slug: '', order: 0, is_active: true });
    };

    return (
        <div className={styles.subjectsSection}>
            <div className={styles.headerRow}>
                <h1>Предметы</h1>
                <button
                    onClick={() => {
                        setEditingSubject(null);
                        setFormData({ name: '', slug: '', order: 0, is_active: true });
                        setModalOpen(true);
                    }}
                    className={styles.addBtn}
                >
                    + Добавить предмет
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Поиск */}
            <div className={styles.searchContainer}>
                <input
                    className={styles.searchInput}
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Поиск по названию или slug"
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

            {loading ? (
                <div className={styles.loading}>Загрузка...</div>
            ) : subjects.length === 0 ? (
                <div className={styles.empty}>
                    {query ? 'Предметы по вашему запросу не найдены' : 'Предметы не найдены'}
                    {query && (
                        <button
                            className={styles.clearSearchBtn}
                            onClick={() => setQuery('')}
                        >
                            Очистить поиск
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.subjectTable}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Название</th>
                                    <th>Slug</th>
                                    <th>Порядок</th>
                                    <th>Статус</th>
                                    <th>Тем</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map(s => (
                                    <tr key={s.id} className={styles.subjectRow}>
                                        <td>{s.id}</td>
                                        <td>
                                            <strong>{s.name}</strong>
                                        </td>
                                        <td>
                                            <code className={styles.slugCell}>{s.slug}</code>
                                        </td>
                                        <td>{s.order}</td>
                                        <td>
                                            <span className={s.is_active ? styles.statusActive : styles.statusInactive}>
                                                {s.is_active ? '✅ Активен' : '❌ Скрыт'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.topicsCount}>
                                                {s.topics_count}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button
                                                    onClick={() => handleEdit(s)}
                                                    className={styles.editBtn}
                                                    title="Редактировать"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(s.id, s.is_active)}
                                                    className={s.is_active ? styles.hideBtn : styles.showBtn}
                                                    title={s.is_active ? 'Скрыть' : 'Показать'}
                                                >
                                                    {s.is_active ? '👁️' : '👁️‍🗨️'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(s.id)}
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

            {/* Модальное окно для добавления/редактирования */}
            {modalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingSubject ? 'Редактировать предмет' : 'Добавить предмет'}</h2>
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
                                    Название *
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        required
                                        placeholder="Например: Математика"
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
                                        placeholder="Например: mathematics"
                                    />
                                    <small className={styles.formHint}>
                                        Только латинские буквы, цифры и дефисы
                                    </small>
                                </label>
                            </div>

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
                                    <span className={styles.checkboxText}>Активен (отображается в списке)</span>
                                </label>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="submit"
                                    className={styles.saveBtn}
                                >
                                    💾 {editingSubject ? 'Сохранить' : 'Добавить'}
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
