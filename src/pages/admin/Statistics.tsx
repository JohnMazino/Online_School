import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import styles from './Statistics.module.scss';


// Типы данных для графиков
interface RegistrationStat {
    month: string;
    registrations: number;
}

interface SubjectStat {
    subject: string;
    activity: number;
}

interface ClassStat {
    class: string;
    users: number;
}

interface TooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
}

// Кастомный компонент для тултипа
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className={styles.customTooltip}>
                <p className={styles.tooltipLabel}>{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className={styles.tooltipItem} style={{ color: entry.color }}>
                        {entry.dataKey}: <strong>{entry.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Кастомный компонент для тултипа PieChart
const CustomPieTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className={styles.customTooltip}>
                <p className={styles.tooltipLabel}>{payload[0].name}</p>
                <p className={styles.tooltipItem} style={{ color: payload[0].color }}>
                    Пользователей: <strong>{payload[0].value}</strong>
                </p>
            </div>
        );
    }
    return null;
};

export default function Statistics() {
    // Метрики
    const [metrics, setMetrics] = useState({
        totalUsers: 0,
        active24h: 0,
        newWeek: 0,
        totalAttempts: 0,
        avgScore: 0,
        totalTasks: 0,
    });

    const [registrationStats, setRegistrationStats] = useState<RegistrationStat[]>([]);
    const [topSubjects, setTopSubjects] = useState<SubjectStat[]>([]);
    const [classDistribution, setClassDistribution] = useState<ClassStat[]>([]);
    const [loading, setLoading] = useState(true);

    // Цвета для PieChart
    const COLORS = ['#5086f2', '#856fd7', '#88abf2', '#3a6bd1', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6'];

    const token = useAuthStore(state => state.token);

    useEffect(() => {
        // Load real stats from backend
        const loadData = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const res = await (await fetch('http://localhost:5000/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })).json();

                setRegistrationStats(res.registrationStats || []);
                setTopSubjects(res.topSubjects?.map((s: any) => ({ subject: s.subject, activity: s.count })) || []);
                setClassDistribution(res.classDistribution || []);

                setMetrics(prev => ({
                    ...prev,
                    totalUsers: res.usersTotal || prev.totalUsers,
                    active24h: res.active24h || prev.active24h,
                    newWeek: res.newWeek || prev.newWeek,
                    totalAttempts: res.totalAttempts || prev.totalAttempts,
                    totalTasks: res.tasksCreated || prev.totalTasks,
                    avgScore: res.avgScore !== undefined ? res.avgScore : prev.avgScore,
                }));
            } catch (err) {
                console.error('Failed to load statistics', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        const interval = setInterval(() => {
            // refresh metrics only
            if (!token) return;
            fetch('http://localhost:5000/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(res => {
                setMetrics(prev => ({ ...prev, active24h: res.active24h || prev.active24h }));
            }).catch(() => {});
        }, 30000);

        return () => clearInterval(interval);
    }, [token]);

    // Форматирование чисел
    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}k`;
        }
        return num.toString();
    };

    return (
        <div className={styles.statisticsSection}>
            <h1>Статистика</h1>

            {/* Ключевые метрики */}
            <div className={styles.metricsGrid}>
                <div className={`${styles.metricCard} ${styles.card1}`}>
                    <div className={styles.metricIcon}>👥</div>
                    <div className={styles.metricContent}>
                        <h3>Всего пользователей</h3>
                        <p>{formatNumber(metrics.totalUsers)}</p>
                    </div>
                </div>
                <div className={`${styles.metricCard} ${styles.card2}`}>
                    <div className={styles.metricIcon}>🔥</div>
                    <div className={styles.metricContent}>
                        <h3>Активных за 24 часа</h3>
                        <p>{formatNumber(metrics.active24h)}</p>
                    </div>
                </div>
                <div className={`${styles.metricCard} ${styles.card3}`}>
                    <div className={styles.metricIcon}>🆕</div>
                    <div className={styles.metricContent}>
                        <h3>Новых за неделю</h3>
                        <p>{formatNumber(metrics.newWeek)}</p>
                    </div>
                </div>
                <div className={`${styles.metricCard} ${styles.card4}`}>
                    <div className={styles.metricIcon}>📊</div>
                    <div className={styles.metricContent}>
                        <h3>Всего попыток тестов</h3>
                        <p>{formatNumber(metrics.totalAttempts)}</p>
                    </div>
                </div>
                <div className={`${styles.metricCard} ${styles.card5}`}>
                    <div className={styles.metricIcon}>⭐</div>
                    <div className={styles.metricContent}>
                        <h3>Средний балл</h3>
                        <p>{metrics.avgScore}%</p>
                    </div>
                </div>
                <div className={`${styles.metricCard} ${styles.card6}`}>
                    <div className={styles.metricIcon}>📝</div>
                    <div className={styles.metricContent}>
                        <h3>Создано заданий</h3>
                        <p>{formatNumber(metrics.totalTasks)}</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>Загрузка статистики...</div>
            ) : (
                <>
                    {/* Графики */}
                    <div className={styles.chartsGrid}>
                        {/* Динамика регистраций */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h3>📈 Динамика регистраций за год</h3>
                                <div className={styles.chartInfo}>
                                    <span className={styles.infoItem}>
                                        <span className={styles.infoDot} style={{ backgroundColor: '#5086f2' }}></span>
                                        Новые регистрации
                                    </span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart
                                    data={registrationStats}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#f0f0f0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#666"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="registrations"
                                        name="Регистрации"
                                        stroke="#5086f2"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: '#5086f2', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 8, fill: '#5086f2', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Топ-5 предметов */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h3>🎯 Топ предметов по активности</h3>
                                <div className={styles.chartInfo}>
                                    <span className={styles.infoItem}>
                                        <span className={styles.infoDot} style={{ backgroundColor: '#5086f2' }}></span>
                                        Активность (попытки)
                                    </span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart
                                    data={topSubjects}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#f0f0f0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="subject"
                                        stroke="#666"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="activity"
                                        name="Активность"
                                        fill="#5086f2"
                                        radius={[8, 8, 0, 0]}
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Распределение по классам */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h3>👨‍🎓 Распределение пользователей по классам</h3>
                            </div>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={classDistribution}
                                        dataKey="users"
                                        nameKey="class"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        innerRadius={60}
                                        paddingAngle={5}
                                        label={({ name, percent }) => {
                                            // Добавляем проверку на undefined
                                            if (percent === undefined) return `${name}`;
                                            return `${name}: ${(percent * 100).toFixed(0)}%`;
                                        }}
                                        labelLine={false}
                                    >
                                        {classDistribution.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                stroke="#fff"
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomPieTooltip />} />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Дополнительная статистика */}
                    <div className={styles.statsSummary}>
                        <div className={styles.summaryCard}>
                            <h3>📋 Сводная информация</h3>
                            <div className={styles.summaryContent}>
                                <div className={styles.summaryRow}>
                                    <span>Пик активности:</span>
                                    <strong>Январь-Июнь</strong>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Самый популярный предмет:</span>
                                    <strong>Математика</strong>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Самый активный класс:</span>
                                    <strong>11 класс</strong>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Среднее время сессии:</span>
                                    <strong>24 минуты</strong>
                                </div>
                            </div>
                        </div>
                        <div className={styles.exportCard}>
                            <h3>📤 Экспорт данных</h3>
                            <div className={styles.exportContent}>
                                <p>Экспортируйте статистику для аналитики</p>
                                <div className={styles.exportButtons}>
                                    <button
                                        className={styles.exportBtn}
                                        onClick={async () => {
                                            if (!token) { alert('Требуется авторизация администратора'); return; }
                                            try {
                                                const tokenLocal = token || '';
                                                const blob = await (await fetch(`http://localhost:5000/api/admin/export?format=csv`, { headers: { 'Authorization': `Bearer ${tokenLocal}` } })).blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = 'users.csv';
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                window.URL.revokeObjectURL(url);
                                            } catch (err) {
                                                console.error('Export failed', err);
                                                alert('Экспорт не удался');
                                            }
                                        }}
                                    >
                                        📄 CSV
                                    </button>
                                    <button className={styles.exportBtn} disabled={!token} onClick={async () => {
                                            if (!token) { alert('Требуется авторизация администратора'); return; }
                                            try {
                                                const tokenLocal = token || '';
                                                const blob = await (await fetch(`http://localhost:5000/api/admin/export?format=xlsx`, { headers: { 'Authorization': `Bearer ${tokenLocal}` } })).blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = 'users.xlsx';
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                window.URL.revokeObjectURL(url);
                                            } catch (err) {
                                                console.error('Excel export failed', err);
                                                alert('Экспорт Excel не удался');
                                            }
                                        }}>
                                        📊 Excel
                                    </button>

                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
