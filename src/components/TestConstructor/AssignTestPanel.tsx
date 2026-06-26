import { useState, useEffect } from 'react';
import type { Test, Assignment, Student } from '../../types/TestConstructor';
import { testsApi } from '../../api/tests';
import { useAuthStore } from '../../store/authStore';
import styles from './AssignTestPanel.module.scss';

interface AssignTestPanelProps {
    tests: Test[];
    assignments: Assignment[];
    onAssign: (assignment: Omit<Assignment, 'id' | 'assignedAt' | 'status'>) => void;
    onCancelAssignment: (assignmentId: number) => void;
}

/**
 * КОМПОНЕНТ: Панель назначения тестов
 * 
 * Позволяет репетитору:
 * 1. Выбрать опубликованный тест
 * 2. Назначить его отдельному учащемуся
 * 3. Установить дедлайн выполнения (опционально)
 * 4. Просмотреть историю всех назначений
 * 5. Отменить назначение при необходимости
 * 
 * Загружает реальных студентов из БД через API
 */

// Компонент для назначения тестов отдельным ученикам
export default function AssignTestPanel({
    tests,
    assignments,
    onAssign,
    onCancelAssignment,
}: AssignTestPanelProps) {
    const { token, user } = useAuthStore();

    // ===== СОСТОЯНИЕ ФОРМЫ =====
    const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [dueDate, setDueDate] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Загрузить студентов при монтировании компонента
    useEffect(() => {
        const loadStudents = async () => {
            if (!token) return;

            setLoadingStudents(true);
            try {
                const data = await testsApi.getStudents(token);
                setStudents(data);
            } catch (error) {
                console.error('Failed to load students:', error);
                setErrors(['Ошибка загрузки студентов']);
            } finally {
                setLoadingStudents(false);
            }
        };

        loadStudents();
    }, [token, user?.id]);

    /**
     * Валидация формы перед назначением теста
     * Проверяет:
     * - Выбран ли тест
     * - Выбраны ли студенты
     */
    const validateForm = (): boolean => {
        const newErrors: string[] = [];

        if (!selectedTestId) {
            newErrors.push('Выберите тест');
        }

        if (selectedStudentIds.length === 0) {
            newErrors.push('Выберите хотя бы одного студента');
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    // Назначить тест нескольким студентам
    const handleAssign = () => {
        if (validateForm() && selectedTestId) {
            // Назначить каждому выбранному студенту
            selectedStudentIds.forEach((studentId) => {
                const student = students.find(s => s.id === studentId);
                if (student) {
                    onAssign({
                        testId: selectedTestId,
                        teacherId: user?.id || 1,
                        studentId: studentId,
                        studentName: `${student.firstName} ${student.lastName}`,
                        dueDate: dueDate || undefined,
                    });
                }
            });

            // Очистить форму
            setSelectedTestId(null);
            setSelectedStudentIds([]);
            setDueDate('');
            setErrors([]);
        }
    };

    // Переключение выбора студента
    const toggleStudentSelection = (studentId: number) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    console.log('Errors in AssignTestPanel:', errors);
    console.log('Students in AssignTestPanel:', students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}` })));
    console.log('Assignments in AssignTestPanel:', assignments.map(a => ({ id: a.id, testId: a.testId })));
    return (
        <div className={styles.assignPanel}>
            <div className={styles.container}>
                {/* Левая колонна: Форма назначения */}
                <div className={styles.formSection}>
                    <h2>Назначить тест</h2>

                    {/* Сообщения об ошибках */}
                    {errors.length > 0 && (
                        <div className={styles.errorBox}>
                            <h4>❌ Ошибки в форме:</h4>
                            <ul>
                                {errors.map((error, i) => (
                                    <li key={`error-${i}`}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {tests.length === 0 ? (
                        <div className={styles.noTestsWarning}>
                            <p>⚠️ Нет тестов для назначения. Создайте тест в разделе "Создать тест"</p>
                        </div>
                    ) : (
                        <>
                            {/* Выбор теста */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Выберите тест <span className={styles.required}>*</span>
                                </label>
                                <select
                                    className={styles.select}
                                    value={selectedTestId || ''}
                                    onChange={(e) => setSelectedTestId(parseInt(e.target.value))}
                                >
                                    <option value="">-- Выберите тест --</option>
                                    {tests.map((test) => (
                                        <option key={test.id} value={test.id}>
                                            {test.title} ({test.questions.length} вопросов)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Информация о выбранном тесте */}
                            {selectedTestId && (
                                <div className={styles.testInfo}>
                                    {(() => {
                                        const test = tests.find((t) => t.id === selectedTestId);
                                        if (!test) return null;
                                        const totalPoints = test.questions.reduce((sum, q) => sum + q.points, 0);
                                        return (
                                            <>
                                                <h4>{test.title}</h4>
                                                <p>{test.description}</p>
                                                <div className={styles.testStats}>
                                                    <span>❓ {test.questions.length} вопросов</span>
                                                    <span>⭐ {totalPoints} баллов</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Выбор студентов (множественный выбор) */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Выберите студентов <span className={styles.required}>*</span>
                                    {selectedStudentIds.length > 0 && (
                                        <span className={styles.selectedCount}> ({selectedStudentIds.length})</span>
                                    )}
                                </label>

                                {students.map((student) => (
                                    <label key={student?.id || `student-${Math.random()}`} className={styles.studentCheckbox}>
                                    </label>
                                ))}
                                {loadingStudents ? (
                                    <p className={styles.loading}>⏳ Загрузка студентов...</p>
                                ) : students.length === 0 ? (
                                    <p className={styles.noResults}>
                                        ⚠️ У вас нет назначенных студентов
                                    </p>
                                ) : (
                                    <div className={styles.studentsList}>
                                        {students.map((student) => (
                                            <label key={student.id} className={styles.studentCheckbox}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onChange={() => toggleStudentSelection(student.id)}
                                                />
                                                <span className={styles.checkboxLabel}>
                                                    {student.firstName} {student.lastName}
                                                </span>
                                                {student.email && (
                                                    <span className={styles.studentEmail}>{student.email}</span>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Дедлайн (опционально) */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Дедлайн (опционально)</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    disabled={selectedStudentIds.length === 0}
                                />
                            </div>

                            {/* Кнопка назначения */}
                            <div className={styles.formActions}>
                                <button className={styles.assignBtn} onClick={handleAssign}>
                                    ✅ Назначить тест {selectedStudentIds.length > 0 && `(${selectedStudentIds.length})`}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Правая колонна: История назначений */}
                <div className={styles.historySection}>
                    <h2>История назначений</h2>

                    {assignments.length === 0 ? (
                        <div className={styles.emptyHistory}>
                            <p>📭 Назначений нет</p>
                        </div>
                    ) : (
                        <div className={styles.assignmentsList}>
                            {assignments
                                .sort(
                                    (a, b) =>
                                        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
                                )
                                .map((assignment, index) => {
                                    
                                    console.log('Looking for test with id:', assignment.testId);
                                    console.log('Available tests:', tests.map(t => ({ id: t.id, title: t.title })));
        

                                    const test = tests.find((t) => t.id === assignment.testId);
                                    return (
                                        <div key={assignment.id || `assignment-${index}-${assignment.testId}`} className={styles.assignmentItem}>
                                            <div className={styles.assignmentContent}>
                                                <h4>{test?.title}</h4>
                                                <p className={styles.assignmentTarget}>
                                                    👤 {assignment.studentName}
                                                </p>
                                                {assignment.dueDate && (
                                                    <p className={styles.assignmentDueDate}>
                                                        📅 Дедлайн: {assignment.dueDate}
                                                    </p>
                                                )}
                                                <p className={styles.assignmentDate}>
                                                    Назначено: {assignment.assignedAt}
                                                </p>
                                            </div>
                                            <button
                                                className={styles.cancelBtn}
                                                onClick={() => onCancelAssignment(assignment.id)}
                                                title="Отменить назначение"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
