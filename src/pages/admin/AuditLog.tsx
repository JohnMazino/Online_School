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
        // Use backend API
        const data = await authApi.getAuditLogs(token, params);
        return {
            logs: data.logs || [],
            total: data.total || 0,
            page: data.page || 1,
            perPage: data.perPage || params?.per_page || 20,
            totalPages: data.totalPages || Math.ceil((data.total || 0) / (data.perPage || params?.per_page || 20))
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
