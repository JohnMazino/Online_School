import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import styles from './AuditLog.module.scss';

interface AdminAction {
    id: number;
    admin_id: number;
    admin_name?: string;
    action_type: string; // create / update / delete / block / role_change / etc.
    entity_type: string; // user / subject / topic / task / test / etc.
    entity_id: number;
    entity_name?: string;
    old_value?: string; // JSON string
    new_value?: string; // JSON string
    created_at: string;
    ip_address?: string;
    description?: string;
}

// Временные API функции для аудит-лога
const auditApi = {
    getAuditLogs: async (token: string, params?: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Моковые данные
        const mockLogs: AdminAction[] = [
            { id: 1, admin_id: 1, admin_name: 'Администратор', action_type: 'create', entity_type: 'user', entity_id: 123, entity_name: 'Иван Иванов', old_value: '', new_value: '{"role": "student", "status": "active"}', created_at: '2024-02-15T10:30:00', ip_address: '192.168.1.1', description: 'Создан новый пользователь' },
            { id: 2, admin_id: 1, admin_name: 'Администратор', action_type: 'update', entity_type: 'user', entity_id: 123, entity_name: 'Иван Иванов', old_value: '{"role": "student"}', new_value: '{"role": "teacher"}', created_at: '2024-02-15T11:15:00', ip_address: '192.168.1.1', description: 'Изменена роль пользователя' },
            { id: 3, admin_id: 2, admin_name: 'Модератор', action_type: 'block', entity_type: 'user', entity_id: 456, entity_name: 'Петр Петров', old_value: '{"status": "active"}', new_value: '{"status": "blocked"}', created_at: '2024-02-15T12:00:00', ip_address: '192.168.1.2', description: 'Пользователь заблокирован' },
            { id: 4, admin_id: 1, admin_name: 'Администратор', action_type: 'create', entity_type: 'subject', entity_id: 7, entity_name: 'Физика', old_value: '', new_value: '{"name": "Физика", "slug": "physics"}', created_at: '2024-02-14T09:20:00', ip_address: '192.168.1.1', description: 'Создан новый предмет' },
            { id: 5, admin_id: 1, admin_name: 'Администратор', action_type: 'create', entity_type: 'topic', entity_id: 12, entity_name: 'Механика', old_value: '', new_value: '{"subject_id": 7, "name": "Механика"}', created_at: '2024-02-14T10:45:00', ip_address: '192.168.1.1', description: 'Создана новая тема' },
            { id: 6, admin_id: 2, admin_name: 'Модератор', action_type: 'create', entity_type: 'task', entity_id: 34, entity_name: 'Задача по механике', old_value: '', new_value: '{"topic_id": 12, "type": "single"}', created_at: '2024-02-14T14:30:00', ip_address: '192.168.1.2', description: 'Создано новое задание' },
            { id: 7, admin_id: 1, admin_name: 'Администратор', action_type: 'update', entity_type: 'test', entity_id: 5, entity_name: 'Тест по физике', old_value: '{"duration": 60}', new_value: '{"duration": 90}', created_at: '2024-02-13T16:20:00', ip_address: '192.168.1.1', description: 'Изменена длительность теста' },
            { id: 8, admin_id: 2, admin_name: 'Модератор', action_type: 'delete', entity_type: 'task', entity_id: 21, entity_name: 'Старое задание', old_value: '{"active": true}', new_value: '', created_at: '2024-02-13T17:10:00', ip_address: '192.168.1.2', description: 'Удалено задание' },
            { id: 9, admin_id: 1, admin_name: 'Администратор', action_type: 'role_change', entity_type: 'user', entity_id: 789, entity_name: 'Анна Сидорова', old_value: '{"role": "student"}', new_value: '{"role": "teacher"}', created_at: '2024-02-12T08:45:00', ip_address: '192.168.1.1', description: 'Назначена роль преподавателя' },
            { id: 10, admin_id: 2, admin_name: 'Модератор', action_type: 'unblock', entity_type: 'user', entity_id: 456, entity_name: 'Петр Петров', old_value: '{"status": "blocked"}', new_value: '{"status": "active"}', created_at: '2024-02-12T11:30:00', ip_address: '192.168.1.2', description: 'Пользователь разблокирован' },
        ];

        let filtered = [...mockLogs];

        // Фильтрация по поиску
        if (params?.q) {
            const q = params.q.toLowerCase();
            filtered = filtered.filter(log =>
                log.description?.toLowerCase().includes(q) ||
                log.admin_name?.toLowerCase().includes(q) ||
                log.entity_name?.toLowerCase().includes(q) ||
                log.entity_type?.toLowerCase().includes(q) ||
                log.action_type?.toLowerCase().includes(q)
            );
        }

        // Фильтрация по ID админа
        if (params?.admin_id) {
            filtered = filtered.filter(log => log.admin_id === Number(params.admin_id));
        }

        // Фильтрация по типу действия
        if (params?.action_type) {
            filtered = filtered.filter(log => log.action_type === params.action_type);
        }

        // Фильтрация по типу сущности
        if (params?.entity_type) {
            filtered = filtered.filter(log => log.entity_type === params.entity_type);
        }

        // Фильтрация по дате
        if (params?.date_from || params?.date_to) {
            const from = params.date_from ? new Date(params.date_from) : null;
            const to = params.date_to ? new Date(params.date_to) : null;

            filtered = filtered.filter(log => {
                const logDate = new Date(log.created_at);
                if (from && logDate < from) return false;
                if (to && logDate > new Date(to.getTime() + 24 * 60 * 60 * 1000)) return false;
                return true;
            });
        }

        // Пагинация
        const page = params?.page || 1;
        const perPage = params?.per_page || 20;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const paginated = filtered.slice(start, end);

        return {
            logs: paginated,
            total: filtered.length,
            page,
            perPage,
            totalPages: Math.ceil(filtered.length / perPage)
        };
    }
};

export default function AuditLog() {
    const { token } = useAuthStore();

    const [logs, setLogs] = useState<AdminAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({
        admin_id: '',
        action_type: '',
        entity_type: '',
        date_from: '',
        date_to: '',
    });
    const [page, setPage] = useState(1);
    const [perPage] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    // Загрузка логов
    const loadLogs = useCallback(async () => {
        if (!token) {
            setError('Нет токена авторизации');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = {
                q: query || undefined,
                admin_id: filters.admin_id || undefined,
                action_type: filters.action_type || undefined,
                entity_type: filters.entity_type || undefined,
                date_from: filters.date_from || undefined,
                date_to: filters.date_to || undefined,
                page,
                per_page: perPage,
            };

            const data = await auditApi.getAuditLogs(token, params);
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки журнала действий');
            setLogs([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, query, filters, page, perPage]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const formatJSON = (json?: string) => {
        if (!json) return '—';
        try {
            const parsed = JSON.parse(json);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return json;
        }
    };

    const getActionLabel = (actionType: string) => {
        const labels: Record<string, string> = {
            'create': 'Создание',
            'update': 'Изменение',
            'delete': 'Удаление',
            'block': 'Блокировка',
            'unblock': 'Разблокировка',
            'role_change': 'Смена роли',
            'reset_password': 'Сброс пароля'
        };
        return labels[actionType] || actionType;
    };

    const getEntityLabel = (entityType: string) => {
        const labels: Record<string, string> = {
            'user': 'Пользователь',
            'subject': 'Предмет',
            'topic': 'Тема',
            'task': 'Задание',
            'test': 'Тест'
        };
        return labels[entityType] || entityType;
    };

    const toggleExpand = (logId: number) => {
        setExpandedLogId(expandedLogId === logId ? null : logId);
    };

    const clearFilters = () => {
        setQuery('');
        setFilters({
            admin_id: '',
            action_type: '',
            entity_type: '',
            date_from: '',
            date_to: '',
        });
        setPage(1);
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU');
    };

    return (
        <div className={styles.auditSection}>
            <div className={styles.headerRow}>
                <h1>Журнал действий</h1>
                <button
                    onClick={() => loadLogs()}
                    className={styles.refreshBtn}
                    title="Обновить"
                >
                    🔄
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
                        placeholder="Поиск по описанию, имени админа или сущности"
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

                <input
                    type="number"
                    className={styles.filterInput}
                    placeholder="ID админа"
                    value={filters.admin_id}
                    onChange={e => handleFilterChange('admin_id', e.target.value)}
                />

                <select
                    className={styles.filterSelect}
                    value={filters.action_type}
                    onChange={e => handleFilterChange('action_type', e.target.value)}
                >
                    <option value="">Все действия</option>
                    <option value="create">Создание</option>
                    <option value="update">Изменение</option>
                    <option value="delete">Удаление</option>
                    <option value="block">Блокировка</option>
                    <option value="unblock">Разблокировка</option>
                    <option value="role_change">Смена роли</option>
                </select>

                <select
                    className={styles.filterSelect}
                    value={filters.entity_type}
                    onChange={e => handleFilterChange('entity_type', e.target.value)}
                >
                    <option value="">Все сущности</option>
                    <option value="user">Пользователь</option>
                    <option value="subject">Предмет</option>
                    <option value="topic">Тема</option>
                    <option value="task">Задание</option>
                    <option value="test">Тест</option>
                </select>

                <input
                    type="date"
                    className={styles.dateInput}
                    value={filters.date_from}
                    onChange={e => handleFilterChange('date_from', e.target.value)}
                    placeholder="От даты"
                />
                <input
                    type="date"
                    className={styles.dateInput}
                    value={filters.date_to}
                    onChange={e => handleFilterChange('date_to', e.target.value)}
                    placeholder="До даты"
                />

                {(query || filters.admin_id || filters.action_type || filters.entity_type || filters.date_from || filters.date_to) && (
                    <button
                        className={styles.clearFiltersBtn}
                        onClick={clearFilters}
                    >
                        ✕ Очистить фильтры
                    </button>
                )}
            </div>

            {loading ? (
                <div className={styles.loading}>Загрузка журнала...</div>
            ) : logs.length === 0 ? (
                <div className={styles.empty}>
                    {query || filters.admin_id || filters.action_type || filters.entity_type || filters.date_from || filters.date_to ?
                        'Записи по заданным фильтрам не найдены' :
                        'Записи не найдены'}
                    {(query || filters.admin_id || filters.action_type || filters.entity_type || filters.date_from || filters.date_to) && (
                        <button
                            className={styles.clearSearchBtn}
                            onClick={clearFilters}
                        >
                            Очистить фильтры
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.auditTable}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Администратор</th>
                                    <th>Действие</th>
                                    <th>Сущность</th>
                                    <th>Описание</th>
                                    <th>Дата и время</th>
                                    <th>IP</th>
                                    <th>Подробности</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className={styles.logRow}>
                                        <td>{log.id}</td>
                                        <td>
                                            <div className={styles.adminCell}>
                                                <div className={styles.adminName}>{log.admin_name || `ID: ${log.admin_id}`}</div>
                                                <div className={styles.adminId}>ID: {log.admin_id}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.actionBadge} ${styles[`action${log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1)}`]}`}>
                                                {getActionLabel(log.action_type)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.entityCell}>
                                                <span className={styles.entityType}>{getEntityLabel(log.entity_type)}</span>
                                                <div className={styles.entityInfo}>
                                                    {log.entity_name && <span>{log.entity_name}</span>}
                                                    <span className={styles.entityId}>ID: {log.entity_id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.descriptionCell}>
                                                {log.description || '—'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.dateCell}>
                                                {formatDateTime(log.created_at)}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.ipCell}>
                                                {log.ip_address || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => toggleExpand(log.id)}
                                                className={styles.expandBtn}
                                            >
                                                {expandedLogId === log.id ? '▲ Скрыть' : '▼ Показать'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {logs.map(log => expandedLogId === log.id && (
                        <div key={`detail-${log.id}`} className={styles.detailPanel}>
                            <div className={styles.detailHeader}>
                                <h3>Подробности действия #{log.id}</h3>
                                <button
                                    onClick={() => setExpandedLogId(null)}
                                    className={styles.closeDetail}
                                >
                                    ×
                                </button>
                            </div>

                            <div className={styles.detailContent}>
                                <div className={styles.detailRow}>
                                    <div className={styles.detailColumn}>
                                        <h4>Исходные данные</h4>
                                        {log.old_value ? (
                                            <pre className={styles.jsonView}>
                                                {formatJSON(log.old_value)}
                                            </pre>
                                        ) : (
                                            <div className={styles.emptyValue}>Нет данных</div>
                                        )}
                                    </div>
                                    <div className={styles.detailColumn}>
                                        <h4>Новые данные</h4>
                                        {log.new_value ? (
                                            <pre className={styles.jsonView}>
                                                {formatJSON(log.new_value)}
                                            </pre>
                                        ) : (
                                            <div className={styles.emptyValue}>Нет данных</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

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
                        <span className={styles.totalInfo}>Всего записей: {total}</span>
                    </div>
                </>
            )}
        </div>
    );
}
