import { useEffect, useState } from 'react';
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
} from 'recharts';
import styles from './Dashboard.module.scss'; // Используем отдельный файл стилей

interface RegistrationData {
    month: string;
    registrations: number;
}

interface SubjectData {
    subject: string;
    count: number;
}

interface DashboardProps {
    stats: {
        usersTotal: number;
        active24h: number;
        newWeek: number;
        tasksCreated: number;
    };
}

export default function Dashboard({ stats }: DashboardProps) {
    const [registrationData, setRegistrationData] = useState<RegistrationData[]>([]);
    const [topSubjectsData, setTopSubjectsData] = useState<SubjectData[]>([]);

    useEffect(() => {
        setRegistrationData([
            { month: 'Янв', registrations: 120 },
            { month: 'Фев', registrations: 180 },
            { month: 'Мар', registrations: 250 },
            { month: 'Апр', registrations: 320 },
            { month: 'Май', registrations: 400 },
            { month: 'Июн', registrations: 450 },
        ]);

        setTopSubjectsData([
            { subject: 'Математика', count: 320 },
            { subject: 'Русский', count: 280 },
            { subject: 'Физика', count: 210 },
            { subject: 'Информатика', count: 190 },
            { subject: 'Химия', count: 150 },
        ]);
    }, []);

    return (
        <div className={styles.dashboard}>
            <h1>Дашборд</h1>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Пользователей всего</h3>
                    <p>{stats.usersTotal}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Активных за 24ч</h3>
                    <p>{stats.active24h}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Новых за неделю</h3>
                    <p>{stats.newWeek}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Создано заданий</h3>
                    <p>{stats.tasksCreated}</p>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3>Динамика регистраций за месяц</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={registrationData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="registrations"
                                stroke="#5086f2"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className={styles.chartCard}>
                    <h3>Топ-5 предметов по активности</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topSubjectsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="subject" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                            />
                            <Legend />
                            <Bar
                                dataKey="count"
                                fill="#5086f2"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
