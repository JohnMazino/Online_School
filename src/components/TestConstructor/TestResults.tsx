import styles from './TestResults.module.scss';

interface StudentAnswer {
    questionId: number;
    selectedAnswers: number[];
    isCorrect: boolean;
    pointsEarned: number;
}

interface TestResult {
    id: number;
    testId: number;
    assignmentId: number;
    studentId: number;
    studentName: string;
    answers: StudentAnswer[];
    correctCount: number;
    totalQuestions: number;
    percentage: number;
    totalPoints: number;
    maxPoints: number;
    completedAt: string;
    timeTaken: number;
}

interface Question {
    id: number;
    type: 'single' | 'multiple';
    text: string;
    options: string[];
    correctAnswers: number[];
    points: number;
}

interface TestResultsProps {
    result: TestResult;
    questions: Question[];
    onClose: () => void;
}

/**
 * КОМПОНЕНТ: Просмотр результатов теста
 * 
 * Отображает для репетитора:
 * - Полную информацию о прохождении теста учеником
 * - Процент правильных ответов
 * - Количество набранных баллов
 * - Время прохождения теста
 * - Подробный разбор каждого вопроса и ответов ученика
 * - Статус (правильно/неправильно) для каждого вопроса
 */
export default function TestResults({ result, questions, onClose }: TestResultsProps) {
    // Преобразовать секунды в формат ММ:СС
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}м ${secs}с`;
    };

    // Получить цвет фона в зависимости от процента
    const getPercentageColor = (percentage: number): string => {
        if (percentage >= 80) return '#27ae60'; // зелёный
        if (percentage >= 60) return '#f39c12'; // оранжевый
        return '#e74c3c'; // красный
    };

    return (
        <div className={styles.resultsContainer}>
            {/* Заголовок с информацией о результатах */}
            <div className={styles.resultsHeader}>
                <button className={styles.closeBtn} onClick={onClose}>✕</button>
                
                <div className={styles.studentInfo}>
                    <h2>Результаты ученика: {result.studentName}</h2>
                    <p className={styles.completedDate}>Завершено: {result.completedAt}</p>
                </div>

                {/* Основная статистика */}
                <div className={styles.statsGrid}>
                    {/* Процент правильных ответов */}
                    <div className={styles.statCard}>
                        <div 
                            className={styles.percentageCircle}
                            style={{ borderColor: getPercentageColor(result.percentage) }}
                        >
                            <span className={styles.percentage}>{result.percentage}%</span>
                        </div>
                        <p className={styles.statLabel}>Правильных ответов</p>
                    </div>

                    {/* Количество правильных ответов */}
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>
                            {result.correctCount} / {result.totalQuestions}
                        </div>
                        <p className={styles.statLabel}>Вопросов решено</p>
                    </div>

                    {/* Набранные баллы */}
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>
                            {result.totalPoints} / {result.maxPoints}
                        </div>
                        <p className={styles.statLabel}>Набранные баллы</p>
                    </div>

                    {/* Время прохождения */}
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>
                            {formatTime(result.timeTaken)}
                        </div>
                        <p className={styles.statLabel}>Время на тест</p>
                    </div>
                </div>
            </div>

            {/* Подробный разбор ответов */}
            <div className={styles.answersSection}>
                <h3>Разбор ответов</h3>

                <div className={styles.answersList}>
                    {questions.map((question, idx) => {
                        const studentAnswer = result.answers.find(a => a.questionId === question.id);
                        
                        return (
                            <div 
                                key={question.id} 
                                className={`${styles.answerItem} ${studentAnswer?.isCorrect ? styles.correct : styles.incorrect}`}
                            >
                                {/* Статус и номер вопроса */}
                                <div className={styles.answerHeader}>
                                    <span className={styles.questionNumber}>Вопрос {idx + 1}</span>
                                    <span className={styles.questionType}>
                                        {question.type === 'single' ? '📌 Один ответ' : '☑️ Несколько ответов'}
                                    </span>
                                    <span className={styles.status}>
                                        {studentAnswer?.isCorrect ? '✅ Правильно' : '❌ Неправильно'}
                                    </span>
                                    <span className={styles.points}>
                                        {studentAnswer?.pointsEarned || 0} / {question.points} баллов
                                    </span>
                                </div>

                                {/* Текст вопроса */}
                                <p className={styles.questionText}>{question.text}</p>

                                {/* Варианты ответов */}
                                <div className={styles.optionsSection}>
                                    {question.options.map((option, optIdx) => {
                                        const isCorrect = question.correctAnswers.includes(optIdx);
                                        const isSelected = studentAnswer?.selectedAnswers.includes(optIdx);
                                        
                                        return (
                                            <div
                                                key={optIdx}
                                                className={`${styles.option} ${isCorrect ? styles.correctOption : ''} ${
                                                    isSelected && !isCorrect ? styles.wrongOption : ''
                                                }`}
                                            >
                                                <div className={styles.optionContent}>
                                                    <span className={styles.optionText}>{option}</span>
                                                </div>

                                                {/* Индикаторы */}
                                                <div className={styles.indicators}>
                                                    {isCorrect && <span className={styles.correctMark}>✓</span>}
                                                    {isSelected && !isCorrect && <span className={styles.wrongMark}>✗</span>}
                                                    {isSelected && isCorrect && <span className={styles.selectedMark}>✓ Выбрано</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Кнопка закрытия внизу */}
            <div className={styles.footer}>
                <button className={styles.closeMainBtn} onClick={onClose}>
                    Закрыть результаты
                </button>
            </div>
        </div>
    );
}
