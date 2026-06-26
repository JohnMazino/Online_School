import type { Test, Assignment } from '../../types/TestConstructor';
import styles from './TestsList.module.scss';

interface TestsListProps {
    tests: Test[];
    assignments: Assignment[];
    onEdit: (test: Test) => void;
    onDelete: (testId: number) => void;
}

/**
 * КОМПОНЕНТ: Список тестов
 * 
 * Отображает все созданные тесты в виде карточек с информацией:
 * - Название и описание теста
 * - Количество вопросов и баллов
 * - Статус (черновик/опубликован)
 * - Количество активных назначений
 * - Кнопки для редактирования и удаления
 * - Список учащихся/групп, которым назначен тест
 */
export default function TestsList({ tests, assignments, onEdit, onDelete }: TestsListProps) {
    /**
     * Подсчитывает количество активных назначений для конкретного теста
     * @param testId ID теста
     * @returns Количество назначений
     */
    const getAssignmentCount = (testId: number): number => {
        return assignments.filter((a) => a.testId === testId).length;
    };

    /**
     * Вычисляет общее количество баллов за все вопросы теста
     * @param test Тест для расчёта
     * @returns Сумма баллов всех вопросов
     */
    const getTotalPoints = (test: Test): number => {
        return test.questions.reduce((sum, q) => sum + q.points, 0);
    };

    console.log('Tests in TestsList:', tests.map(t => ({ id: t.id, title: t.title })));
    return (
        <div className={styles.testsList}>
            {tests.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📋</div>
                    <h3>Тестов нет</h3>
                    <p>Начните создание первого теста, чтобы он появился здесь</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {tests.map((test) => (
                        <div key={test.id} className={styles.testCard}>
                            {/* Основная информация */}
                            <div className={styles.cardHeader}>
                                <h3 className={styles.testTitle}>{test.title}</h3>
                                <p className={styles.testDescription}>{test.description}</p>
                            </div>

                            {/* Метаинформация */}
                            <div className={styles.cardStats}>
                                <div className={styles.stat}>
                                    <span className={styles.statIcon}>❓</span>
                                    <span>
                                        <strong>{test.questions.length}</strong> вопросов
                                    </span>
                                </div>
                                <div className={styles.stat}>
                                    <span className={styles.statIcon}>⭐</span>
                                    <span>
                                        <strong>{getTotalPoints(test)}</strong> баллов
                                    </span>
                                </div>
                                <div className={styles.stat}>
                                    <span className={styles.statIcon}>👥</span>
                                    <span>
                                        <strong>{getAssignmentCount(test.id)}</strong> назначений
                                    </span>
                                </div>
                            </div>

                            {/* Информация о создании */}
                            <div className={styles.cardFooter}>
                                <small className={styles.createdDate}>📅 Создан: {test.createdAt}</small>
                            </div>

                            {/* Действия */}
                            <div className={styles.cardActions}>
                                <button className={styles.editBtn} onClick={() => onEdit(test)}>
                                    ✏️ Редактировать
                                </button>
                                <button className={styles.deleteBtn} onClick={() => onDelete(test.id)}>
                                    🗑️ Удалить
                                </button>
                            </div>

                            {/* Показываем учеников/группы, которым назначен тест */}
                            {getAssignmentCount(test.id) > 0 && (
                                <div className={styles.assignmentsList}>
                                    <h4>Назначен:</h4>
                                    <ul>
                                        {assignments
                                            .filter((a) => a.testId === test.id)
                                            .slice(0, 3)
                                            .map((assignment, idx) => (
                                                <li key={assignment?.id || `temp-assignment-${test.id}-${idx}`} className={styles.assignmentItem}>
                                                <span className={styles.assignmentType}>👤</span>
                                                <span className={styles.assignmentName}>
                                                    {assignment.studentName}
                                                    {assignment.dueDate && (
                                                        <span className={styles.dueDate}> ({assignment.dueDate})</span>
                                                    )}
                                            </span>
                                        </li>
                                        ))}
                                    </ul>
                                    {getAssignmentCount(test.id) > 3 && (
                                        <p className={styles.moreAssignments}>
                                            + ещё {getAssignmentCount(test.id) - 3} назначений
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
