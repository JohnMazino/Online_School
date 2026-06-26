import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { TestResult, Test } from '../types/TestConstructor';
import Sidebar from '../components/SideBar/SideBar';
import Background from '../components/Background/Background';
import styles from './Profile.module.scss';

/**
 * СТРАНИЦА: Просмотр результатов теста
 */
export default function TestResults() {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, token } = useAuthStore();

    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [test, setTest] = useState<Test | null>(null);
    const [randomizedTest, setRandomizedTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/login');
            return;
        }

        const loadResult = async () => {
            try {
                setLoading(true);
                if (!testId) {
                    navigate('/profile');
                    return;
                }

                // Получаем результат теста
                const resultResponse = await fetch(`http://localhost:5000/api/tests/result/${testId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!resultResponse.ok) {
                    if (resultResponse.status === 404) {
                        setError('Результат теста не найден');
                    } else {
                        setError('Ошибка при загрузке результатов');
                    }
                    return;
                }

                const resultData = await resultResponse.json();
                const result = resultData.result;
                
                // Ensure score and maxScore are numbers (database may return them as strings)
                if (result) {
                    result.score = Number(result.score);
                    result.maxScore = Number(result.maxScore);
                }
                
                setTestResult(result);
                
                // Если есть randomizedTest, сохраняем его для правильного отображения
                if (result?.randomizedTest) {
                    setRandomizedTest(result.randomizedTest);
                }

                // Получаем сам тест для отображения информации
                const testResponse = await fetch(`http://localhost:5000/api/tests/${testId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (testResponse.ok) {
                    const testData = await testResponse.json();
                    const loadedTest = testData.test || testData;
                    if (typeof loadedTest.questions === 'string') {
                        loadedTest.questions = JSON.parse(loadedTest.questions);
                    }
                    setTest(loadedTest);
                }
            } catch (err) {
                console.error('Error loading result:', err);
                setError('Ошибка при загрузке результатов');
            } finally {
                setLoading(false);
            }
        };

        loadResult();
    }, [isAuthenticated, token, testId, navigate]);

    if (loading) {
        return <div className={styles.loading}>Загрузка результатов...</div>;
    }

    if (error) {
        return (
            <>
                <Background />
                <div className={styles.profilePage}>
                    <Sidebar />
                    <div className={styles.profileContent}>
                        <div className={styles.errorMessage}>
                            <p>❌ {error}</p>
                            <button onClick={() => navigate('/profile')} className={styles.backButton}>
                                ← Вернуться в профиль
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (!testResult) {
        return (
            <>
                <Background />
                <div className={styles.profilePage}>
                    <Sidebar />
                    <div className={styles.profileContent}>
                        <div className={styles.loading}>Результаты не найдены</div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Background />
            <div className={styles.profilePage}>
                <Sidebar />

                <div className={styles.profileContent}>
                    <div className={styles.testResultsContainer}>
                        <div className={styles.resultsHeader}>
                            <h1>Результаты теста</h1>
                            <p className={styles.testTitle}>{test?.title}</p>
                        </div>

                        {/* SUMMARY TABLE */}
                        <div className={styles.summaryTableWrapper}>
                            <table className={styles.summaryTable}>
                                <tbody>
                                    <tr>
                                        <td className={styles.labelCell}>Состояние</td>
                                        <td className={styles.valueCell}>
                                            {testResult.maxScore > 0 && testResult.score >= testResult.maxScore * 0.7
                                                ? '✅ Завершено успешно'
                                                : testResult.maxScore > 0 && testResult.score >= testResult.maxScore * 0.5
                                                ? '⚠️ Завершено'
                                                : '❌ Завершено'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>Тест начат</td>
                                        <td className={styles.valueCell}>
                                            {new Date(new Date(testResult.completedAt).getTime() - testResult.timeTaken * 1000).toLocaleDateString('ru-RU', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>Завершен</td>
                                        <td className={styles.valueCell}>
                                            {new Date(testResult.completedAt).toLocaleDateString('ru-RU', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>Затраченное время</td>
                                        <td className={styles.valueCell}>
                                            {Math.floor(testResult.timeTaken / 60)} мин. {testResult.timeTaken % 60} сек.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>Баллы</td>
                                        <td className={styles.valueCell}>
                                            <strong>{testResult.score.toFixed(2)}/{testResult.maxScore.toFixed(2)}</strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>Оценка</td>
                                        <td className={styles.valueCell}>
                                            <strong>
                                                {(testResult.maxScore > 0 ? (testResult.score / testResult.maxScore) * 10 : 0).toFixed(2)} из 10.00 (
                                                {testResult.maxScore > 0 ? Math.round((testResult.score / testResult.maxScore) * 100) : 0}%)
                                            </strong>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* QUESTIONS REVIEW */}
                        {test && testResult.answers && (
                            <div className={styles.questionsReviewSection}>
                                <h2>Вопросы</h2>
                                {(randomizedTest || test).questions.map((question, idx) => {
                                    const studentAnswer = testResult.answers.find(
                                        (ans) => ans.questionId === question.id
                                    );
                                    
                                    // Calculate score for this question
                                    const calculateQuestionScore = (): number => {
                                        const correctAnswers = question.correctAnswers || [];
                                        const selectedAnswers = studentAnswer?.selectedAnswers || [];
                                        const points = question.points || 0;

                                        if (question.type === 'single') {
                                            const correctSorted = correctAnswers.slice().sort();
                                            const selectedSorted = selectedAnswers.slice().sort();
                                            if (JSON.stringify(correctSorted) === JSON.stringify(selectedSorted)) {
                                                return points;
                                            }
                                            return 0;
                                        } else if (question.type === 'multiple') {
                                            const correctSorted = correctAnswers.slice().sort();
                                            const selectedSorted = selectedAnswers.slice().sort();
                                            
                                            if (JSON.stringify(correctSorted) === JSON.stringify(selectedSorted)) {
                                                return points;
                                            } else {
                                                const correctSelectedCount = selectedAnswers.filter(ans => correctAnswers.includes(ans)).length;
                                                const incorrectSelected = selectedAnswers.filter(ans => !correctAnswers.includes(ans)).length;
                                                
                                                if (incorrectSelected === 0 && correctSelectedCount > 0) {
                                                    return (correctSelectedCount / correctAnswers.length) * points;
                                                }
                                                return 0;
                                            }
                                        } else if (question.type === 'matching') {
                                            if (JSON.stringify(correctAnswers) === JSON.stringify(selectedAnswers)) {
                                                return points;
                                            } else {
                                                const correctMatchCount = selectedAnswers.filter((val, idx) => val === correctAnswers[idx]).length;
                                                const totalPairs = correctAnswers.length || 1;
                                                
                                                if (correctMatchCount > 0) {
                                                    return (correctMatchCount / totalPairs) * points;
                                                }
                                                return 0;
                                            }
                                        }
                                        return 0;
                                    };

                                    const earnedPoints = calculateQuestionScore();
                                    const isCorrect = earnedPoints === question.points;
                                    const isPartial = earnedPoints > 0 && !isCorrect;

                                    return (
                                        <div key={question.id} className={styles.testQuestionCard}>
                                            {/* Question header with number and points */}
                                            <div className={styles.questionHeader}>
                                                <h3>Вопрос {idx + 1}</h3>
                                                <p className={styles.questionPoints}>{question.points} баллов</p>
                                            </div>

                                            {/* Question text */}
                                            <div className={styles.questionTextBlock}>
                                                {question.text}
                                            </div>

                                            {/* Options for single/multiple */}
                                            {(question.type === 'single' || question.type === 'multiple') && (
                                                <div className={styles.answersContainer}>
                                                    {question.options?.map((option, optIdx) => {
                                                        const isCorrectAnswer = question.correctAnswers?.includes(optIdx);
                                                        const isStudentAnswer = studentAnswer?.selectedAnswers?.includes(optIdx);

                                                        return (
                                                            <div
                                                                key={optIdx}
                                                                className={`${styles.answerOption} ${
                                                                    isCorrectAnswer ? styles.answerCorrect : ''
                                                                } ${
                                                                    isStudentAnswer && !isCorrectAnswer ? styles.answerIncorrect : ''
                                                                } ${
                                                                    isStudentAnswer && isCorrectAnswer ? styles.answerSelected : ''
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    disabled
                                                                    checked={isStudentAnswer}
                                                                    readOnly
                                                                />
                                                                <span className={styles.answerText}>{option}</span>
                                                                {isStudentAnswer && isCorrectAnswer && <span className={styles.badge}>✓</span>}
                                                                {isStudentAnswer && !isCorrectAnswer && <span className={styles.badge}>✗</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Matching pairs */}
                                            {question.type === 'matching' && (
                                                <div className={styles.matchingContainer}>
                                                    {question.matchingPairs?.map((pair, pairIdx) => {
                                                        const studentSelectedIdx = studentAnswer?.selectedAnswers?.[pairIdx];
                                                        const correctIdx = question.correctAnswers?.[pairIdx];
                                                        const isMatchCorrect = studentSelectedIdx === correctIdx;
                                                        const studentSelectedAnswer = studentSelectedIdx !== undefined && studentSelectedIdx < question.matchingPairs!.length 
                                                            ? question.matchingPairs![studentSelectedIdx]?.right 
                                                            : '(не выбрано)';

                                                        return (
                                                            <div key={pairIdx} className={styles.matchingRow}>
                                                                <span className={styles.leftItem}>{pair.left}</span>
                                                                <span className={styles.matchingArrow}>→</span>
                                                                <span
                                                                    className={`${styles.matchingSelect} ${
                                                                        isMatchCorrect ? styles.matchingCorrect : styles.matchingIncorrect
                                                                    }`}
                                                                >
                                                                    {studentSelectedAnswer}
                                                                    <span className={styles.badge}>{isMatchCorrect ? '✓' : '✗'}</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Show correct answers if incorrect */}
                                                    {!isCorrect && (
                                                        <div className={styles.correctAnswerSection}>
                                                            <p className={styles.correctLabel}>Правильный ответ:</p>
                                                            <div className={styles.matchingContainer}>
                                                                {question.matchingPairs?.map((pair, pairIdx) => {
                                                                    const correctIdx = question.correctAnswers?.[pairIdx];
                                                                    const correctAnswer = correctIdx !== undefined && correctIdx < question.matchingPairs!.length 
                                                                        ? question.matchingPairs![correctIdx]?.right 
                                                                        : '???';
                                                                    return (
                                                                        <div key={pairIdx} className={styles.matchingRow}>
                                                                            <span className={styles.leftItem}>{pair.left}</span>
                                                                            <span className={styles.matchingArrow}>→</span>
                                                                            <span className={`${styles.matchingSelect} ${styles.matchingCorrect}`}>
                                                                                {correctAnswer}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Status indicator */}
                                            <div className={`${styles.statusIndicator} ${
                                                isCorrect ? styles.correct : isPartial ? styles.partial : styles.incorrect
                                            }`}>
                                                <span className={styles.statusIcon}>
                                                    {isCorrect ? '✓ Правильно' : isPartial ? '~ Частично' : '✗ Неправильно'}
                                                </span>
                                                {!isCorrect && (
                                                    <span className={styles.statusPoints}>
                                                        {earnedPoints.toFixed(2)}/{question.points} баллов
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button className={styles.backButton} onClick={() => navigate('/profile')}>
                            ← Вернуться в профиль
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
