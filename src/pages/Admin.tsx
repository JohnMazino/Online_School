import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import Sidebar from '../components/SideBar/SideBar';
import Background from '../components/Background/Background';
import styles from './Admin.module.scss';

interface User {
    id: number;
    phone: string;
    first_name: string;
    last_name: string;
    role: string;
    balance: number;
    created_at?: string;
}

interface Stats {
    totalUsers: number;
    totalProfit: number;
}

export default function AdminPage() {
    const navigate = useNavigate();
    const { isAuthenticated, user, token } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRole, setEditRole] = useState('');
    const [editBalance, setEditBalance] = useState('');

    const isAdmin = isAuthenticated && user?.role === 'admin';

    const fetchStats = useCallback(async () => {
        if (!token) return;
        try {
            const data = await authApi.getStats(token);
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, [token]);

    const fetchUsers = useCallback(async (q?: string, page?: number, pp?: number) => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await authApi.getAllUsers(token, q || '', page ?? currentPage, pp ?? perPage);
            setUsers(data.users);
            setTotalUsers(data.total);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('Не удалось загрузить список пользователей');
        } finally {
            setLoading(false);
        }
    }, [token, currentPage, perPage]);

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchStats();
        fetchUsers();
    }, [isAuthenticated, user?.role, navigate, fetchUsers, fetchStats]);

    const handleSearch = useCallback((value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        const timeout = setTimeout(() => {
            fetchUsers(value || undefined, 1, perPage);
        }, 300);
        setSearchTimeout(timeout);
    }, [searchTimeout, fetchUsers, perPage]);

    const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPerPage = Number(e.target.value);
        setPerPage(newPerPage);
        setCurrentPage(1);
        fetchUsers(searchQuery || undefined, 1, newPerPage);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchUsers(searchQuery || undefined, page, perPage);
    };

    const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));

    const handleRoleChange = async (userId: number, newRole: string) => {
        if (!token) return;
        try {
            await authApi.assignRole(token, userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setEditingId(null);
        } catch (err) {
            console.error('Failed to update role:', err);
            setError('Не удалось изменить роль');
        }
    };

    const handleBalanceChange = async (userId: number, newBalance: number) => {
        if (!token) return;
        try {
            await authApi.updateBalance(token, userId, newBalance);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, balance: newBalance } : u));
            setEditingId(null);
        } catch (err) {
            console.error('Failed to update balance:', err);
            setError('Не удалось обновить баланс');
        }
    };

    const handleEditStart = (user: User) => {
        setEditingId(user.id);
        setEditRole(user.role);
        setEditBalance(String(user.balance));
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditRole('');
        setEditBalance('');
    };

    const handleEditSave = (user: User) => {
        if (editRole !== user.role) {
            handleRoleChange(user.id, editRole);
        }
        const newBalance = Number(editBalance);
        if (!isNaN(newBalance) && newBalance !== user.balance) {
            handleBalanceChange(user.id, newBalance);
        }
        setEditingId(null);
    };

    if (!isAdmin) {
        return null;
    }

    const registeredUsers = stats?.totalUsers ?? 0;
    const profit = stats?.totalProfit ?? 0;

    return (
        <>
            <Background />

            <div className={styles.appWrapper}>
                <div className={styles.sidebarZone}>
                    <Sidebar />
                </div>

                <main className={styles.mainContent}>
                    <div className={styles.contentRectangle}>
                        <h1 className={styles.adminTitle}>Админ-панель</h1>

                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>👥</div>
                                <div className={styles.statInfo}>
                                    {statsLoading ? (
                                        <span className={styles.statValue}>---</span>
                                    ) : (
                                        <span className={styles.statValue}>{registeredUsers.toLocaleString()}</span>
                                    )}
                                    <span className={styles.statLabel}>Зарегистрированные пользователи</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>💰</div>
                                <div className={styles.statInfo}>
                                    {statsLoading ? (
                                        <span className={styles.statValue}>---</span>
                                    ) : (
                                        <span className={styles.statValue}>{profit.toLocaleString()} ₽</span>
                                    )}
                                    <span className={styles.statLabel}>Прибыль</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.searchBar}>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Поиск по имени, телефону или роли..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    className={styles.searchClear}
                                    onClick={() => {
                                        setSearchQuery('');
                                        fetchUsers();
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {error && <div className={styles.errorBanner}>{error}</div>}

                        <div className={styles.tableWrapper}>
                            <table className={styles.userTable}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Имя</th>
                                        <th>Телефон</th>
                                        <th>Роль</th>
                                        <th>Баланс</th>
                                        <th>Дата регистрации</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className={styles.emptyCell}>Загрузка...</td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className={styles.emptyCell}>
                                                {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
                                            </td>
                                        </tr>
                                    ) : users.map((u) => (
                                        <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td>{u.first_name} {u.last_name}</td>
                                            <td>{u.phone}</td>
                                            <td>
                                                {editingId === u.id ? (
                                                    <select
                                                        className={styles.editSelect}
                                                        value={editRole}
                                                        onChange={(e) => setEditRole(e.target.value)}
                                                    >
                                                        <option value="student">student</option>
                                                        <option value="teacher">teacher</option>
                                                        <option value="admin">admin</option>
                                                    </select>
                                                ) : (
                                                    <span className={styles.roleBadge}>{u.role}</span>
                                                )}
                                            </td>
                                            <td>
                                                {editingId === u.id ? (
                                                    <input
                                                        type="number"
                                                        className={styles.editInput}
                                                        value={editBalance}
                                                        onChange={(e) => setEditBalance(e.target.value)}
                                                    />
                                                ) : (
                                                    <span>{u.balance} ₽</span>
                                                )}
                                            </td>
                                            <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '-'}</td>
                                            <td>
                                                {editingId === u.id ? (
                                                    <div className={styles.actionsCell}>
                                                        <button
                                                            className={styles.saveBtn}
                                                            onClick={() => handleEditSave(u)}
                                                        >
                                                            Сохранить
                                                        </button>
                                                        <button
                                                            className={styles.cancelBtn}
                                                            onClick={handleEditCancel}
                                                        >
                                                            Отмена
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className={styles.editBtn}
                                                        onClick={() => handleEditStart(u)}
                                                    >
                                                        Редактировать
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.pagination}>
                            <div className={styles.paginationInfo}>
                                <span className={styles.paginationLabel}>Показать:</span>
                                <select
                                    className={styles.perPageSelect}
                                    value={perPage}
                                    onChange={handlePerPageChange}
                                >
                                    <option value={10}>10</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className={styles.paginationLabel}>на странице</span>
                            </div>

                            <div className={styles.paginationControls}>
                                <span className={styles.paginationText}>
                                    {totalUsers} пользователей
                                </span>
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                >
                                    ← Назад
                                </button>
                                <span className={styles.pageInfo}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                >
                                    Вперёд →
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}