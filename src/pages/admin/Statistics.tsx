import { useState, useEffect } from 'react';
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
        totalUsers: 1250,
        active24h: 342,
        newWeek: 87,
        totalAttempts: 4560,
        avgScore: 68.4,
        totalTasks: 420,
    });

    const [registrationStats, setRegistrationStats] = useState<RegistrationStat[]>([]);
    const [topSubjects, setTopSubjects] = useState<SubjectStat[]>([]);
    const [classDistribution, setClassDistribution] = useState<ClassStat[]>([]);
    const [loading, setLoading] = useState(true);

    // Цвета для PieChart
    const COLORS = ['#5086f2', '#856fd7', '#88abf2', '#3a6bd1', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6'];

    useEffect(() => {
        // Имитация загрузки данных
        const loadData = async () => {
            setLoading(true);

            await new Promise(resolve => setTimeout(resolve, 800)); // Имитация задержки

            setRegistrationStats([
                { month: 'Янв', registrations: 120 },
                { month: 'Фев', registrations: 180 },
                { month: 'Мар', registrations: 250 },
                { month: 'Апр', registrations: 320 },
                { month: 'Май', registrations: 400 },
                { month: 'Июн', registrations: 450 },
                { month: 'Июл', registrations: 380 },
                { month: 'Авг', registrations: 310 },
                { month: 'Сен', registrations: 280 },
                { month: 'Окт', registrations: 220 },
                { month: 'Ноя', registrations: 190 },
                { month: 'Дек', registrations: 150 },
            ]);

            setTopSubjects([
                { subject: 'Математика', activity: 1450 },
                { subject: 'Русский язык', activity: 980 },
                { subject: 'Физика', activity: 720 },
                { subject: 'Информатика', activity: 650 },
                { subject: 'Химия', activity: 420 },
                { subject: 'Биология', activity: 380 },
                { subject: 'История', activity: 290 },
                { subject: 'География', activity: 210 },
            ]);

            setClassDistribution([
                { class: '9 класс', users: 420 },
                { class: '10 класс', users: 580 },
                { class: '11 класс', users: 650 },
                { class: '8 класс', users: 220 },
                { class: '7 класс', users: 180 },
                { class: 'Другое', users: 100 },
            ]);

            // Обновляем метрики с "живыми" данными
            setMetrics(prev => ({
                ...prev,
                totalUsers: 1250 + Math.floor(Math.random() * 50),
                active24h: 342 + Math.floor(Math.random() * 30),
                totalAttempts: 4560 + Math.floor(Math.random() * 200),
            }));

            setLoading(false);
        };

        loadData();

        // Обновление данных каждые 30 секунд (опционально)
        const interval = setInterval(() => {
            // Можно добавить обновление только метрик
            setMetrics(prev => ({
                ...prev,
                active24h: 342 + Math.floor(Math.random() * 30),
            }));
        }, 30000);

        return () => clearInterval(interval);
    }, []);

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
                                    <button className={styles.exportBtn}>
                                        📄 CSV
                                    </button>
                                    <button className={styles.exportBtn}>
                                        📊 Excel
                                    </button>
                                    <button className={styles.exportBtn}>
                                        📈 PDF
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
