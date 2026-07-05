import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Test, Assignment } from '../types/TestConstructor';
import { testsApi } from '../api/tests';

import Sidebar from '../components/SideBar/SideBar';
import Background from '../components/Background/Background';

import TestCreator from '../components/TestConstructor/TestCreator';
import TestsList from '../components/TestConstructor/TestsList';
import AssignTestPanel from '../components/TestConstructor/AssignTestPanel';
import QuizManager from '../components/Games/QuizManager';

import styles from './TestConstructorPage.module.scss';

export default function TestConstructorPage() {
    const navigate = useNavigate();
    const { isAuthenticated, user: authUser, token } = useAuthStore();

    // Состояния для управления панелями
    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'assign' | 'games'>('list');
    const [tests, setTests] = useState<Test[]>([]);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    // Проверка прав доступа и загрузка данных
    useEffect(() => {
        // Проверяем авторизацию
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // Проверяем, что это учитель
        if (authUser?.role !== 'teacher') {
            navigate('/profile');
            return;
        }

        // Загружаем тесты и назначения с API
        const loadData = async () => {
            try {
                if (!token) {
                    navigate('/login');
                    return;
                }

                // Загружаем тесты репетитора
                const response = await fetch(`http://localhost:5000/api/tests`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                    console.error('Failed to load tests');
                    setTests([]);
                } else {
                    const data = await response.json();
                    setTests(data.tests || []);
                }

                // Загружаем назначения преподавателя
                const assignmentsResponse = await fetch(`http://localhost:5000/api/tests/teacher/assignments-all`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (assignmentsResponse.ok) {
                                const assignmentsData = await assignmentsResponse.json();
            console.log('Server response for assignments:', assignmentsData);
            
            // Трансформируем данные - теперь student_name приходит с сервера
            const transformedAssignments = (assignmentsData.assignments || []).map((item: any) => ({
                id: item.id,
                testId: item.test_id,
                teacherId: item.teacher_id,
                studentId: item.student_id,
                studentName: item.student_name || `Студент ID: ${item.student_id}`, // fallback если нет имени
                assignedAt: item.assigned_at,
                dueDate: item.due_date,
                status: item.status,
            }));
            
            console.log('Transformed assignments with names:', transformedAssignments);
            setAssignments(transformedAssignments);
                }
            } catch (error) {
                console.error('Error loading test data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isAuthenticated, authUser, token, navigate]);

    // Добавление нового теста
    const handleCreateTest = async (test: Omit<Test, 'id' | 'createdAt' | 'teacherId'>) => {
        if (!token) {
            alert('Ошибка: отсутствует токен авторизации');
            return;
        }

        try {
            setLoading(true);
            const testToCreate: Omit<Test, 'id' | 'createdAt'> = {
                ...test,
                teacherId: authUser?.id || 1,
            };
            const createdTest = await testsApi.createTest(token, testToCreate);
            setTests([...tests, createdTest]);
            setActiveTab('list');
            alert('✅ Тест успешно создан и сохранён в базе!');
        } catch (error) {
            console.error('Error creating test:', error);
            alert('❌ Ошибка при создании теста. Попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    // Обновление теста
    const handleUpdateTest = async (updatedTest: Omit<Test, 'id' | 'createdAt' | 'teacherId'>) => {
        if (!selectedTest || !token) {
            alert('Ошибка: отсутствует выбранный тест или токен авторизации');
            return;
        }

        try {
            setLoading(true);
            const testToUpdate: Omit<Test, 'id' | 'createdAt'> = {
                ...updatedTest,
                teacherId: authUser?.id || 1,
            };
            const updated = await testsApi.updateTest(token, selectedTest.id, testToUpdate);
            setTests(tests.map(t => (t.id === selectedTest.id ? updated : t)));
            setSelectedTest(null);
            setActiveTab('list');
            alert('✅ Тест успешно обновлён и сохранён в базе!');
        } catch (error) {
            console.error('Error updating test:', error);
            alert('❌ Ошибка при обновлении теста. Попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    // Удаление теста
    const handleDeleteTest = async (testId: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот тест?')) {
            return;
        }

        if (!token) {
            alert('Ошибка: отсутствует токен авторизации');
            return;
        }

        try {
            setLoading(true);
            const success = await testsApi.deleteTest(token, testId);
            if (success) {
                setTests(tests.filter(t => t.id !== testId));
                setAssignments(assignments.filter(a => a.testId !== testId));
                alert('✅ Тест удалён');
            } else {
                alert('❌ Ошибка при удалении теста');
            }
        } catch (error) {
            console.error('Error deleting test:', error);
            alert('❌ Ошибка при удалении теста. Попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    // Назначение теста ученику или группе
    const handleAssignTest = async (assignment: Omit<Assignment, 'id' | 'assignedAt' | 'status'>) => {
        if (!token) {
            alert('Ошибка: отсутствует токен авторизации');
            return;
        }

        try {
            setLoading(true);
            
            // Отправить на сервер
            const createdAssignment = await testsApi.assignTest(token, assignment);

            
            // Добавить в локальное состояние
            const newAssignment: Assignment = {
                ...assignment,
                id: createdAssignment.id,
                assignedAt: createdAssignment.assignedAt || new Date().toISOString().split('T')[0],
                status: 'assigned',
            };

            setAssignments([...assignments, newAssignment]);
            alert('✅ Тест успешно назначен студенту!');
        } catch (error) {
            console.error('Error assigning test:', error);
            alert('❌ Ошибка при назначении теста. Попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    // Отмена назначения теста
    const handleCancelAssignment = async (assignmentId: number) => {
        if (!confirm('Отменить назначение теста?')) {
            return;
        }

        if (!token) {
            alert('Ошибка: отсутствует токен авторизации');
            return;
        }

        try {
            setLoading(true);
            const success = await testsApi.cancelAssignment(token, assignmentId);
            
            if (success) {
                setAssignments(assignments.filter(a => a.id !== assignmentId));
                alert('✅ Назначение отменено');
            } else {
                alert('❌ Ошибка при отмене назначения');
            }
        } catch (error) {
            console.error('Error canceling assignment:', error);
            alert('❌ Ошибка при отмене назначения. Попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    return (
        <>
            <Background />

            <div className={styles.constructorPage}>
                <Sidebar />

                <div className={styles.constructorContent}>
                    {/* Заголовок */}
                    <header className={styles.constructorHeader}>
                        <div className={styles.headerContent}>
                            <h1 className={styles.pageTitle}>Конструктор тестов</h1>
                            <p className={styles.pageSubtitle}>Создавайте, управляйте и назначайте тесты своим ученикам</p>
                        </div>
                    </header>

                    {/* Вкладки навигации */}
                    <nav className={styles.tabNavigation}>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'list' ? styles.active : ''}`}
                            onClick={() => {
                                setActiveTab('list');
                                setSelectedTest(null);
                            }}
                        >
                             Мои тесты
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'create' ? styles.active : ''}`}
                            onClick={() => {
                                setActiveTab('create');
                                setSelectedTest(null);
                            }}
                        >
                             Создать тест
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'assign' ? styles.active : ''}`}
                            onClick={() => setActiveTab('assign')}
                        >
                             Назначить тест
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'games' ? styles.active : ''}`}
                            onClick={() => setActiveTab('games')}
                        >
                            Игры
                        </button>
                    </nav>

                    {/* Контент вкладок */}
                    <main className={styles.tabContent}>
                        {/* Вкладка: Список тестов */}
                        {activeTab === 'list' && (
                            <TestsList
                                tests={tests}
                                onEdit={(test) => {
                                    setSelectedTest(test);
                                    setActiveTab('create');
                                }}
                                onDelete={handleDeleteTest}
                                assignments={assignments}
                            />
                        )}

                        {/* Вкладка: Создание/редактирование теста */}
                        {activeTab === 'create' && (
                            <TestCreator
                                test={selectedTest}
                                onSave={selectedTest ? handleUpdateTest : handleCreateTest}
                                onCancel={() => {
                                    setSelectedTest(null);
                                    setActiveTab('list');
                                }}
                            />
                        )}

                        {/* Вкладка: Назначение тестов */}
                        {activeTab === 'assign' && (
                            <AssignTestPanel
                                tests={tests}
                                assignments={assignments}
                                onAssign={handleAssignTest}
                                onCancelAssignment={handleCancelAssignment}
                            />
                        )}

                        {/* Вкладка: Игры (Квизи) */}
                        {activeTab === 'games' && token && authUser && (
                            <QuizManager
                                token={token}
                                teacherId={authUser.id}
                            />
                        )}
                    </main>
                </div>
            </div>
        </>
    );
}
