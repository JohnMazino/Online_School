import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import styles from './Users.module.scss';

interface User {
    id: number;
    phone: string;
    first_name?: string;
    last_name?: string;
    class?: string;
    role: string;
    registration_date: string;
    last_login?: string;
    is_active: boolean;
    test_attempts: number;
}

// Интерфейс для параметров запроса
interface GetAllUsersParams {
    q?: string;
    page?: number;
    perPage?: number;
    role?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: string;
}

export default function Users() {
    const { token } = useAuthStore();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({
        role: '',
        status: '',
        dateFrom: '',
        dateTo: ''
    });
    const [page, setPage] = useState(1);
    const [perPage] = useState(15);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Функция назначения роли
    const handleAssignRole = async (userId: number, newRole: string) => {
        if (!token || !confirm(`Назначить роль "${newRole}"?`)) return;
        try {
            await authApi.assignRole(token, userId, newRole);
            loadUsers();
        } catch (err: any) {
            setError(err.message || 'Ошибка изменения роли');
        }
    };

    const toggleUserBlock = async (token: string, userId: number, block: boolean) => {
        // Real API call
        try {
            const res = await authApi.blockUser(token, userId, block);
            return res;
        } catch (err) {
            console.error('Toggle block failed', err);
            throw err;
        }
    };

    const resetPassword = async (token: string, userId: number) => {
        try {
            const res = await authApi.resetUserPassword(token, userId);
            return res;
        } catch (err) {
            console.error('Reset password failed', err);
            throw err;
        }
    };

    const loadUsers = useCallback(async () => {
        if (!token) {
            setError('Нет токена авторизации');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Создаем строку параметров для getAllUsers
            let searchQuery = query || '';

            // Добавляем фильтры к поисковому запросу
            if (filters.role) {
                searchQuery += ` role:${filters.role}`;
            }
            if (filters.status) {
                searchQuery += ` status:${filters.status}`;
            }
            if (filters.dateFrom || filters.dateTo) {
                searchQuery += ` date:${filters.dateFrom || ''}-${filters.dateTo || ''}`;
            }

            // Если getAllUsers не поддерживает сортировку, мы можем сортировать на клиенте
            const data = await authApi.getAllUsers(token, {
                q: query || undefined,
                role: filters.role || undefined,
                status: filters.status || undefined,
                date_from: filters.dateFrom || undefined,
                date_to: filters.dateTo || undefined,
                page,
                per_page: perPage,
                sort_by: sortBy,
                sort_order: sortOrder,
            });

            if (data && data.users) {
                let usersData = data.users;

                // Сортировка на клиенте, если API не поддерживает
                if (sortBy && sortOrder) {
                    usersData = [...usersData].sort((a: any, b: any) => {
                        let aValue = a[sortBy];
                        let bValue = b[sortBy];

                        // Обработка разных типов данных
                        if (sortBy === 'registration_date' || sortBy === 'last_login') {
                            aValue = aValue ? new Date(aValue).getTime() : 0;
                            bValue = bValue ? new Date(bValue).getTime() : 0;
                        }

                        if (sortOrder === 'asc') {
                            return aValue > bValue ? 1 : -1;
                        } else {
                            return aValue < bValue ? 1 : -1;
                        }
                    });
                }

                setUsers(usersData);
                setTotal(data.total || 0);
                setError('');
            } else {
                setUsers([]);
                setTotal(0);
                setError('Некорректный ответ от сервера');
            }
        } catch (err: any) {
            console.error('Ошибка загрузки пользователей:', err);
            setError(err.message || 'Ошибка загрузки пользователей');
            setUsers([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [token, query, page, perPage, filters, sortBy, sortOrder]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const exportToCSV = () => {
        if (!users.length) {
            alert('Нет данных для экспорта');
            return;
        }

        try {
            const headers = [
                'ID',
                'Телефон',
                'Имя',
                'Фамилия',
                'Класс',
                'Роль',
                'Дата регистрации',
                'Последний вход',
                'Статус',
                'Попыток тестов'
            ];

            const csv = [
                headers.join(','),
                ...users.map(u => [
                    u.id,
                    u.phone,
                    u.first_name || '',
                    u.last_name || '',
                    u.class || '',
                    u.role,
                    u.registration_date,
                    u.last_login || '',
                    u.is_active ? 'active' : 'blocked',
                    u.test_attempts,
                ].join(','))
            ].join('\n');

            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('Ошибка экспорта:', err);
            alert('Ошибка экспорта данных');
        }
    };

    const handleBlockToggle = async (userId: number, currentStatus: boolean) => {
        if (!token || !confirm(`Вы уверены, что хотите ${currentStatus ? 'заблокировать' : 'разблокировать'} пользователя?`)) return;
        try {
            const res: any = await toggleUserBlock(token, userId, !currentStatus);
            if (res && res.user) {
                setUsers(prev => prev.map(user =>
                    user.id === userId ? { ...user, is_active: res.user.is_active } : user
                ));
            } else {
                // fallback toggle
                setUsers(prev => prev.map(user =>
                    user.id === userId ? { ...user, is_active: !currentStatus } : user
                ));
            }
        } catch (err: any) {
            setError(err.message || 'Ошибка изменения статуса');
        }
    };

    const handleResetPassword = async (userId: number) => {
        if (!token || !confirm('Сбросить пароль пользователя? Новый пароль будет отправлен на телефон')) return;
        try {
            const res: any = await resetPassword(token, userId);
            if (res && res.tempPassword) {
                alert(`Пароль сброшен. Временный пароль: ${res.tempPassword}`);
            } else {
                alert('Пароль сброшен');
            }
        } catch (err: any) {
            setError(err.message || 'Ошибка сброса пароля');
        }
    };

    const getSortIndicator = (column: string) => {
        if (sortBy !== column) return '↕️';
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const clearFilters = () => {
        setQuery('');
        setFilters({ role: '', status: '', dateFrom: '', dateTo: '' });
        setPage(1);
    };

    return (
        <div className={styles.usersSection}>
            <div className={styles.headerRow}>
                <h1>Пользователи</h1>
                <button onClick={exportToCSV} className={styles.exportBtn} disabled={!users.length}>
                    📥 Экспорт в CSV
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Фильтры и поиск */}
            <div className={styles.filters}>
                <input
                    className={styles.searchInput}
                    type="text"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Поиск по номеру или имени"
                />

                <select
                    className={styles.filterSelect}
                    value={filters.role}
                    onChange={e => handleFilterChange('role', e.target.value)}
                >
                    <option value="">Все роли</option>
                    <option value="student">Ученик</option>
                    <option value="teacher">Преподаватель</option>
                    <option value="admin">Админ</option>
                </select>

                <select
                    className={styles.filterSelect}
                    value={filters.status}
                    onChange={e => handleFilterChange('status', e.target.value)}
                >
                    <option value="">Все статусы</option>
                    <option value="active">Активен</option>
                    <option value="blocked">Заблокирован</option>
                </select>

                <input
                    className={styles.dateInput}
                    type="date"
                    value={filters.dateFrom}
                    onChange={e => handleFilterChange('dateFrom', e.target.value)}
                    placeholder="От даты"
                />

                <input
                    className={styles.dateInput}
                    type="date"
                    value={filters.dateTo}
                    onChange={e => handleFilterChange('dateTo', e.target.value)}
                    placeholder="До даты"
                />

                {(query || filters.role || filters.status || filters.dateFrom || filters.dateTo) && (
                    <button
                        className={styles.clearFiltersBtn}
                        onClick={clearFilters}
                    >
                        ✕ Очистить фильтры
                    </button>
                )}
            </div>

            {loading ? (
                <div className={styles.loading}>Загрузка...</div>
            ) : users.length === 0 ? (
                <div className={styles.empty}>
                    {query || filters.role || filters.status || filters.dateFrom || filters.dateTo ?
                        "Пользователи по заданным фильтрам не найдены" :
                        "Пользователи не найдены"}
                </div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.userTable}>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('id')}>
                                        ID {getSortIndicator('id')}
                                    </th>
                                    <th onClick={() => handleSort('phone')}>
                                        Телефон {getSortIndicator('phone')}
                                    </th>
                                    <th onClick={() => handleSort('first_name')}>
                                        ФИО {getSortIndicator('first_name')}
                                    </th>
                                    <th>Класс</th>
                                    <th onClick={() => handleSort('role')}>
                                        Роль {getSortIndicator('role')}
                                    </th>
                                    <th onClick={() => handleSort('registration_date')}>
                                        Регистрация {getSortIndicator('registration_date')}
                                    </th>
                                    <th onClick={() => handleSort('last_login')}>
                                        Последний вход {getSortIndicator('last_login')}
                                    </th>
                                    <th onClick={() => handleSort('is_active')}>
                                        Статус {getSortIndicator('is_active')}
                                    </th>
                                    <th onClick={() => handleSort('test_attempts')}>
                                        Тесты {getSortIndicator('test_attempts')}
                                    </th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className={styles.userRow}>
                                        <td>{u.id}</td>
                                        <td>{u.phone}</td>
                                        <td>
                                            {u.first_name || u.last_name ?
                                                `${u.first_name || ''} ${u.last_name || ''}`.trim() :
                                                '—'}
                                        </td>
                                        <td>{u.class || '—'}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${styles['role' + u.role.charAt(0).toUpperCase() + u.role.slice(1)]}`}>
                                                {u.role === 'student' ? 'Ученик' :
                                                    u.role === 'teacher' ? 'Преподаватель' :
                                                        u.role === 'admin' ? 'Администратор' : u.role}
                                            </span>
                                        </td>
                                        <td>{new Date(u.registration_date).toLocaleDateString('ru-RU')}</td>
                                        <td>{u.last_login ? new Date(u.last_login).toLocaleDateString('ru-RU') : '—'}</td>
                                        <td>
                                            <span className={u.is_active ? styles.statusActive : styles.statusBlocked}>
                                                {u.is_active ? '✅ Активен' : '❌ Заблокирован'}
                                            </span>
                                        </td>
                                        <td>{u.test_attempts}</td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedUser(u);
                                                    }}
                                                    title="Просмотреть детали"
                                                >
                                                    👁️
                                                </button>
                                                {u.role !== 'admin' && (
                                                    <>
                                                        <button
                                                            className={styles.actionBtn}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAssignRole(u.id, u.role === 'teacher' ? 'student' : 'teacher');
                                                            }}
                                                            title={u.role === 'teacher' ? 'Сделать учеником' : 'Назначить преподавателем'}
                                                        >
                                                            {u.role === 'teacher' ? '👨‍🎓' : '👨‍🏫'}
                                                        </button>
                                                        <button
                                                            className={`${styles.actionBtn} ${u.is_active ? styles.blockBtn : styles.unblockBtn}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleBlockToggle(u.id, u.is_active);
                                                            }}
                                                            title={u.is_active ? 'Заблокировать' : 'Разблокировать'}
                                                        >
                                                            {u.is_active ? '🔒' : '🔓'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.pagination}>
                        <button
                            className={styles.paginationBtn}
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Назад
                        </button>
                        <span className={styles.pageInfo}>
                            Страница {page} из {Math.max(1, Math.ceil(total / perPage))}
                        </span>
                        <button
                            className={styles.paginationBtn}
                            disabled={page >= Math.ceil(total / perPage)}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Вперед →
                        </button>
                        <span className={styles.totalInfo}>Всего: {total}</span>
                    </div>
                </>
            )}

            {/* Модальное окно для детальной информации */}
            {selectedUser && (
                <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>
                                {selectedUser.first_name || selectedUser.last_name ?
                                    `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() :
                                    'Пользователь'}
                            </h2>
                            <button
                                className={styles.closeModal}
                                onClick={() => setSelectedUser(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.modalRow}>
                                <strong>ID:</strong> {selectedUser.id}
                            </div>
                            <div className={styles.modalRow}>
                                <strong>Телефон:</strong> {selectedUser.phone}
                            </div>
                            {selectedUser.first_name && (
                                <div className={styles.modalRow}>
                                    <strong>Имя:</strong> {selectedUser.first_name}
                                </div>
                            )}
                            {selectedUser.last_name && (
                                <div className={styles.modalRow}>
                                    <strong>Фамилия:</strong> {selectedUser.last_name}
                                </div>
                            )}
                            <div className={styles.modalRow}>
                                <strong>Роль:</strong>
                                <span className={`${styles.roleBadge} ${styles['role' + selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)]}`}>
                                    {selectedUser.role === 'student' ? 'Ученик' :
                                        selectedUser.role === 'teacher' ? 'Преподаватель' :
                                            selectedUser.role === 'admin' ? 'Администратор' : selectedUser.role}
                                </span>
                            </div>
                            <div className={styles.modalRow}>
                                <strong>Статус:</strong>
                                <span className={selectedUser.is_active ? styles.statusActive : styles.statusBlocked}>
                                    {selectedUser.is_active ? '✅ Активен' : '❌ Заблокирован'}
                                </span>
                            </div>
                            <div className={styles.modalRow}>
                                <strong>Класс:</strong> {selectedUser.class || 'Не указан'}
                            </div>
                            <div className={styles.modalRow}>
                                <strong>Регистрация:</strong> {new Date(selectedUser.registration_date).toLocaleString('ru-RU')}
                            </div>
                            {selectedUser.last_login && (
                                <div className={styles.modalRow}>
                                    <strong>Последний вход:</strong> {new Date(selectedUser.last_login).toLocaleString('ru-RU')}
                                </div>
                            )}
                            <div className={styles.modalRow}>
                                <strong>Попыток тестов:</strong> {selectedUser.test_attempts}
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            {selectedUser.role !== 'admin' && (
                                <>
                                    <button
                                        className={styles.modalActionBtn}
                                        onClick={() => {
                                            handleAssignRole(selectedUser.id, selectedUser.role === 'teacher' ? 'student' : 'teacher');
                                            setSelectedUser(null);
                                        }}
                                    >
                                        {selectedUser.role === 'teacher' ? '👨‍🎓 Сделать учеником' : '👨‍🏫 Назначить преподавателем'}
                                    </button>

                                    <button
                                        className={`${styles.modalActionBtn} ${selectedUser.is_active ? styles.blockBtn : styles.unblockBtn}`}
                                        onClick={() => {
                                            handleBlockToggle(selectedUser.id, selectedUser.is_active);
                                            setSelectedUser(null);
                                        }}
                                    >
                                        {selectedUser.is_active ? '🔒 Заблокировать' : '🔓 Разблокировать'}
                                    </button>

                                    <button
                                        className={styles.modalActionBtn}
                                        onClick={() => {
                                            handleResetPassword(selectedUser.id);
                                            setSelectedUser(null);
                                        }}
                                    >
                                        🔐 Сбросить пароль
                                    </button>
                                </>
                            )}

                            <button
                                className={styles.modalActionBtnSecondary}
                                onClick={() => setSelectedUser(null)}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
