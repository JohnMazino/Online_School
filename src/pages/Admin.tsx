import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import styles from './Profile.module.scss';

export default function AdminPage() {
    const { isAuthenticated, user: authUser, token } = useAuthStore();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const navigate = useNavigate();
    const debounceRef = useRef<number | null>(null);

    const load = async (q?: string, p: number = 1) => {
        if (!token) {
            setUsers([]);
            setTotal(0);
            return;
        }

        setLoading(true);
        try {
            const data = await authApi.getAllUsers(token, q, p, perPage);
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Ошибка при загрузке пользователей');
            setUsers([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }; 

    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/login');
            return;
        }

        if (!authUser || authUser.role !== 'admin') {
            navigate('/');
            return;
        }

        // Immediate load on mount
        load();

        return;
    }, [isAuthenticated, token, authUser, navigate]);

    // Debounced server-side search + pagination
    useEffect(() => {
        if (!token) return;
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
            load(query, page);
        }, 600);

        return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
    }, [query, page, token]);
    const setRole = async (userId: number, role: string) => {
        if (!token) return;
        try {
            await authApi.assignRole(token, userId, role);
            // Refresh current page to reflect changes
            await load(query, page);
        } catch (err: any) {
            setError(err.message || 'Не удалось изменить роль');
        }
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div className={styles.profilePage}>
            <div className={styles.profileContent}>
                <h1>Админ панель</h1>
                {error && <p style={{ color: 'red' }}>{error}</p>}

                <div style={{ margin: '12px 0' }}>
                    <input
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        placeholder="Поиск по номеру, имени или фамилии"
                    />
                </div>

                {users.length === 0 ? (
                    <div>Пользователи не найдены</div>
                ) : (
                    <>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Имя</th>
                                    <th>Фамилия</th>
                                    <th>Телефон</th>
                                    <th>Баланс</th>
                                    <th>Роль</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.id}</td>
                                        <td>{u.first_name}</td>
                                        <td>{u.last_name}</td>
                                        <td>{u.phone}</td>
                                        <td>{typeof u.balance === 'number' ? `${u.balance} ₽` : '—'}</td>
                                        <td>{u.role}</td>
                                        <td>
                                            {u.role !== 'teacher' && (
                                                <button onClick={() => setRole(u.id, 'teacher')}>Назначить преподавателем</button>
                                            )}
                                            {u.role === 'teacher' && (
                                                <button onClick={() => setRole(u.id, 'student')}>Сделать учеником</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <div>Всего пользователей: {total}</div>
                            <div>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Предыдущий</button>
                                <span style={{ margin: '0 8px' }}>{page} / {Math.max(1, Math.ceil(total / perPage))}</span>
                                <button onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(total / perPage)), p + 1))} disabled={page >= Math.ceil(total / perPage)}>Следующий</button>
                            </div>
                        </div>
                    </>
                )} 
            </div>
        </div>
    );
}
