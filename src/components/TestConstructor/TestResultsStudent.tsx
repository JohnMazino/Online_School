import { useNavigate } from 'react-router-dom';
import type { Question, TestResult } from '../../types/TestConstructor';
import styles from './TestResultsStudent.module.scss';

interface TestResultsStudentProps {
    testTitle: string;
    test: { questions: Question[] };
    result: TestResult;
    onRetake?: () => void;
}

/**
 * КОМПОНЕНТ: Результаты теста для ученика
 * 
 * Функциональность:
 * - Отображение общей статистики (процент, баллы, время)
 * - Разбор каждого вопроса с правильными ответами
 * - Сравнение выбранных ответов с правильными
 * - Цветовые индикаторы (зеленый = верно, красный = ошибка)
 * - Кнопка повторного прохождения (если разрешено)
 * - Кнопка возврата в кабинет
 */
export default function TestResultsStudent({ testTitle, test, result, onRetake }: TestResultsStudentProps) {
    const navigate = useNavigate();

    // Функция для проверки правильности ответа (с поддержкой matching)
    const checkAnswerCorrect = (question: Question, studentAnswer?: typeof result.answers[0]): boolean => {
        if (!studentAnswer) return false;

        if (question.type === 'matching' && question.matchingPairs) {
            // Для matching проверяем, что все пары сопоставлены правильно
            // Формат: studentAnswer.selectedAnswers[i] = pairId * 1000 + selectedRightIdx
            // question.correctAnswers[i] = pairId * 1000 + correctRightIdx
            
            if (studentAnswer.selectedAnswers.length !== question.correctAnswers.length) {
                return false;
            }

            return studentAnswer.selectedAnswers.every(a => question.correctAnswers.includes(a)) &&
                   question.correctAnswers.every(c => studentAnswer.selectedAnswers.includes(c));
        }

        // Для single/multiple проверяем обычным способом
        return studentAnswer.selectedAnswers.length === question.correctAnswers.length &&
               studentAnswer.selectedAnswers.every(a => question.correctAnswers.includes(a)) &&
               question.correctAnswers.every(c => studentAnswer.selectedAnswers.includes(c));
    };

    // Расчет общей статистики
    let totalPoints = 0;
    let earnedPoints = 0;
    let correctCount = 0;

    test.questions.forEach(question => {
        totalPoints += question.points;

        const studentAnswer = result.answers.find(a => a.questionId === question.id);
        const isCorrect = checkAnswerCorrect(question, studentAnswer);

        if (isCorrect) {
            earnedPoints += question.points;
            correctCount++;
        }
    });

    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    const passPercentage = 60; // Минимальный процент для прохождения

    // Форматирование времени
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}ч ${minutes}м ${secs}с`;
        }
        return `${minutes}м ${secs}с`;
    };

    // Получение цвета для процента
    const getPercentageColor = (pct: number): string => {
        if (pct >= 80) return '#10b981'; // Зеленый
        if (pct >= 60) return '#f59e0b'; // Оранжевый
        return '#ef4444'; // Красный
    };

    const percentageColor = getPercentageColor(percentage);
    const isPassed = percentage >= passPercentage;

    return (
        <div className={styles.resultsStudent}>
            {/* Шапка с результатом */}
            <div className={styles.header}>
                <h1>{testTitle}</h1>
                <p className={styles.subtitle}>
                    {isPassed ? '✓ Тест пройден успешно!' : '✗ Тест не пройден'}
                </p>
            </div>

            {/* Статистика */}
            <div className={styles.statsGrid}>
                {/* Процент */}
                <div className={styles.statCard}>
                    <div className={styles.percentageCircle} style={{ borderColor: percentageColor }}>
                        <div className={styles.percentageValue} style={{ color: percentageColor }}>
                            {percentage}%
                        </div>
                    </div>
                    <p className={styles.statLabel}>Успешность</p>
                </div>

                {/* Баллы */}
                <div className={styles.statCard}>
                    <div className={styles.statBox}>
                        <span className={styles.statNumber}>{earnedPoints}/{totalPoints}</span>
                        <span className={styles.statUnit}>баллов</span>
                    </div>
                    <p className={styles.statLabel}>Баллы</p>
                </div>

                {/* Вопросы */}
                <div className={styles.statCard}>
                    <div className={styles.statBox}>
                        <span className={styles.statNumber}>{correctCount}/{test.questions.length}</span>
                        <span className={styles.statUnit}>ответов</span>
                    </div>
                    <p className={styles.statLabel}>Правильные ответы</p>
                </div>

                {/* Время */}
                <div className={styles.statCard}>
                    <div className={styles.statBox}>
                        <span className={styles.statNumber}>{formatTime(result.timeTaken)}</span>
                        <span className={styles.statUnit}>время</span>
                    </div>
                    <p className={styles.statLabel}>Затрачено</p>
                </div>
            </div>

            {/* Информация о прохождении */}
            <div className={styles.infoBox}>
                <p>
                    <strong>Дата прохождения:</strong> {new Date(result.completedAt).toLocaleString('ru-RU')}
                </p>
                <p>
                    <strong>Минимальный балл для прохождения:</strong> {passPercentage}%
                </p>
                <p className={styles.status}>
                    <strong>Статус:</strong>
                    <span style={{ color: isPassed ? '#10b981' : '#ef4444', marginLeft: '8px' }}>
                        {isPassed ? 'ПРОШЕЛ' : 'НЕ ПРОШЕЛ'}
                    </span>
                </p>
            </div>

            {/* Разбор вопросов */}
            <div className={styles.reviewSection}>
                <h2>Разбор ответов</h2>

                {test.questions.map((question, idx) => {
                    const studentAnswer = result.answers.find(a => a.questionId === question.id);
                    const isCorrect = checkAnswerCorrect(question, studentAnswer);

                    const questionScore = isCorrect ? question.points : 0;

                    // Для matching вопросов показываем другое представление
                    if (question.type === 'matching' && question.matchingPairs) {
                        return (
                            <div key={question.id} className={styles.questionReview}>
                                <div className={styles.questionHeader}>
                                    <span className={styles.questionNumber}>Вопрос {idx + 1}</span>
                                    <span className={`${styles.questionStatus} ${isCorrect ? styles.correct : styles.incorrect}`}>
                                        {isCorrect ? '✓ Правильно' : '✗ Ошибка'}
                                    </span>
                                    <span className={styles.questionPoints}>
                                        {questionScore}/{question.points} баллов
                                    </span>
                                </div>

                                <p className={styles.questionText}>{question.text}</p>

                                {/* Matching разбор */}
                                <div className={styles.matchingReview}>
                                    {question.matchingPairs.map((pair) => {
                                        const encodedAnswer = studentAnswer?.selectedAnswers.find(
                                            a => Math.floor(a / 1000) === pair.id
                                        );
                                        const selectedIdx = encodedAnswer ? encodedAnswer % 1000 : null;
                                        const correctIdx = question.correctAnswers.find(
                                            a => Math.floor(a / 1000) === pair.id
                                        )?.valueOf() ?? null;
                                        const correctRightIdx = correctIdx !== null ? correctIdx % 1000 : null;

                                        const rightItems = question.matchingPairs!.map(p => p.right);
                                        const isCorrectPair = selectedIdx === correctRightIdx;

                                        return (
                                            <div 
                                                key={pair.id} 
                                                className={`${styles.matchingPairReview} ${isCorrectPair ? styles.correct : styles.incorrect}`}
                                            >
                                                <div className={styles.matchingLeft}>{pair.left}</div>
                                                <div className={styles.matchingArrow}>→</div>
                                                <div className={styles.matchingRight}>
                                                    {selectedIdx !== null ? (
                                                        <span>{rightItems[selectedIdx]}</span>
                                                    ) : (
                                                        <span className={styles.notAnswered}>—</span>
                                                    )}
                                                </div>
                                                {!isCorrectPair && (
                                                    <>
                                                        <div className={styles.matchingCorrectArrow}>→</div>
                                                        <div className={styles.matchingCorrect}>
                                                            {correctRightIdx !== null && rightItems[correctRightIdx]}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    // Обычные single/multiple вопросы
                    return (
                        <div key={question.id} className={styles.questionReview}>
                            <div className={styles.questionHeader}>
                                <span className={styles.questionNumber}>Вопрос {idx + 1}</span>
                                <span className={`${styles.questionStatus} ${isCorrect ? styles.correct : styles.incorrect}`}>
                                    {isCorrect ? '✓ Правильно' : '✗ Ошибка'}
                                </span>
                                <span className={styles.questionPoints}>
                                    {questionScore}/{question.points} баллов
                                </span>
                            </div>

                            <p className={styles.questionText}>{question.text}</p>

                            {/* Варианты ответов */}
                            <div className={styles.answersReview}>
                                {question.options.map((option, optIdx) => {
                                    const isStudentSelected = studentAnswer?.selectedAnswers.includes(optIdx);
                                    const isCorrectAnswer = question.correctAnswers.includes(optIdx);

                                    let answerStatus = '';
                                    if (isCorrectAnswer && isStudentSelected) {
                                        answerStatus = 'correct'; // Ученик выбрал правильный ответ
                                    } else if (isCorrectAnswer && !isStudentSelected) {
                                        answerStatus = 'missed'; // Ученик не выбрал правильный ответ
                                    } else if (!isCorrectAnswer && isStudentSelected) {
                                        answerStatus = 'wrong'; // Ученик выбрал неправильный ответ
                                    } else {
                                        answerStatus = 'neutral'; // Это не выбирал
                                    }

                                    return (
                                        <div
                                            key={optIdx}
                                            className={`${styles.answerOption} ${styles[answerStatus]}`}
                                        >
                                            <span className={styles.answerIcon}>
                                                {isStudentSelected && <span>👤 </span>}
                                                {isCorrectAnswer && <span>✓ </span>}
                                            </span>
                                            <span className={styles.answerText}>{option}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {!isCorrect && (
                                <div className={styles.explanation}>
                                    <p>
                                        <strong>Правильный ответ:</strong>{' '}
                                        {question.options
                                            .filter((_, i) => question.correctAnswers.includes(i))
                                            .join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Кнопки */}
            <div className={styles.footer}>
                <button className={styles.homeBtn} onClick={() => navigate('/profile')}>
                    ← Вернуться в кабинет
                </button>
                {onRetake && (
                    <button className={styles.retakeBtn} onClick={onRetake}>
                        🔄 Пройти тест еще раз
                    </button>
                )}
            </div>
        </div>
    );
}
