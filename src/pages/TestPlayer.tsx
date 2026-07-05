import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Test, Question, StudentAnswer } from '../types/TestConstructor';
import { testsApi } from '../api/tests';
import Sidebar from '../components/SideBar/SideBar';
import Background from '../components/Background/Background';

import styles from './TestPlayer.module.scss';

interface RandomizedQuestion extends Question {
    _shuffledRightOptions?: string[];
}

interface RandomizedTest extends Test {
    questions: RandomizedQuestion[];
}

export default function TestPlayer() {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, user: authUser, token } = useAuthStore();

    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<StudentAnswer[]>([]);
    const [startTime] = useState(new Date());
    const [submitted, setSubmitted] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [randomizedTest, setRandomizedTest] = useState<RandomizedTest | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const randomizeTestAnswers = (test: Test): RandomizedTest => {
        return {
            ...test,
            questions: test.questions.map(question => {
                if ((question.type === 'single' || question.type === 'multiple') && 
                    Array.isArray(question.options) && Array.isArray(question.correctAnswers)) {
                    
                    const optionsWithIndex = question.options.map((opt: string, idx: number) => ({ opt, origIdx: idx }));
                    const shuffled = shuffleArray(optionsWithIndex);

                    const correctAnswersNew = question.correctAnswers
                        .map((correctOrigIdx: number) => shuffled.findIndex(item => item.origIdx === correctOrigIdx))
                        .filter((idx: number) => idx >= 0);

                    return {
                        ...question,
                        options: shuffled.map(item => item.opt),
                        correctAnswers: correctAnswersNew,
                    } as RandomizedQuestion;
                }
                
                else if (question.type === 'matching' && Array.isArray(question.matchingPairs)) {
                    const originalPairs = question.matchingPairs;
                    const originalCorrect = Array.isArray(question.correctAnswers) 
                        ? question.correctAnswers 
                        : originalPairs.map((_, i) => i);
                    
                    const leftItems = originalPairs.map((pair, idx: number) => ({
                        id: pair.id,
                        left: pair.left,
                        correctRightOrigIdx: originalCorrect[idx] ?? idx
                    }));
                    const shuffledLeft = shuffleArray(leftItems);

                    const rightItems = originalPairs.map((pair, idx: number) => ({
                        text: pair.right,
                        origIdx: idx
                    }));
                    const shuffledRight = shuffleArray(rightItems);

                    const newCorrectAnswers = shuffledLeft.map(leftItem => 
                        shuffledRight.findIndex(r => r.origIdx === leftItem.correctRightOrigIdx)
                    );

                    return {
                        ...question,
                        matchingPairs: shuffledLeft.map(left => ({
                            id: left.id,
                            left: left.left,
                            right: ''
                        })),
                        _shuffledRightOptions: shuffledRight.map(r => r.text),
                        correctAnswers: newCorrectAnswers,
                    } as RandomizedQuestion;
                }
                
                return question as RandomizedQuestion;
            }),
        };
    };

    const convertAnswersToOriginalIndices = useCallback((
        answersList: StudentAnswer[], 
        fromTest: RandomizedTest, 
        toTest: Test
    ): StudentAnswer[] => {
        return answersList.map(answer => {
            const fromQuestion = fromTest.questions.find(q => q.id === answer.questionId) as RandomizedQuestion | undefined;
            const toQuestion = toTest.questions.find(q => q.id === answer.questionId);
            
            if (!fromQuestion || !toQuestion || fromQuestion.type !== toQuestion.type) {
                return answer;
            }

            if ((fromQuestion.type === 'single' || fromQuestion.type === 'multiple') && 
                Array.isArray(fromQuestion.options) && Array.isArray(toQuestion.options)) {
                
                const convertedAnswers = answer.selectedAnswers
                    .map((randIdx: number) => {
                        if (randIdx < fromQuestion.options!.length) {
                            const optionText = fromQuestion.options![randIdx];
                            const origIdx = toQuestion.options!.indexOf(optionText);
                            return origIdx >= 0 ? origIdx : randIdx;
                        }
                        return randIdx;
                    })
                    .filter((idx: number) => idx >= 0);
                
                return { ...answer, selectedAnswers: convertedAnswers };
            }
            
            if (fromQuestion.type === 'matching' && 
                Array.isArray(fromQuestion._shuffledRightOptions) && 
                Array.isArray(toQuestion.matchingPairs)) {
                
                const convertedAnswers = answer.selectedAnswers.map((rightIdx: number | null) => {
                    if (rightIdx === null || rightIdx === undefined) return 0;
                    const rightText = fromQuestion._shuffledRightOptions![rightIdx];
                    if (!rightText) return 0;
                    const origIdx = toQuestion.matchingPairs!.findIndex(p => p.right === rightText);
                    return origIdx >= 0 ? origIdx : 0;
                });
                
                return { ...answer, selectedAnswers: convertedAnswers };
            }
            
            return answer;
        });
    }, []);

    const submitTestResults = useCallback(async (reason: 'manual' | 'timeout' = 'manual') => {
        if (!token || !authUser || submitted || !test) return;
        
        try {
            setLoading(true);
            setSubmitError(null);
            
            const endTime = new Date();
            const timeTaken = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

            const answersToSend = randomizedTest && test 
                ? convertAnswersToOriginalIndices(answers, randomizedTest, test)
                : answers;

            const payload: any = {
                testId: test.id,
                studentId: authUser.id,
                studentName: `${authUser.firstName} ${authUser.lastName}`,
                answers: answersToSend,
                timeTaken,
            };
            
            if (randomizedTest) {
                payload.randomizedTest = randomizedTest;
            }

            const result = await testsApi.submitTestResult(token, payload);
            setSubmitted(true);

            navigate(`/test/${testId}/results`, { 
                state: { 
                    result: result, // используем result из API, а не normalizedResult
                    test: test 
                } 
            });
            
            if (reason === 'timeout') {
                alert('⏱️ Время истекло! Тест завершён автоматически.');
            }
        } catch (error: any) {
            console.error('Error submitting test:', error);
            const msg = error?.message || 'Неизвестная ошибка';
            setSubmitError(`❌ Ошибка: ${msg}`);
            if (reason === 'manual') {
                alert('Не удалось отправить результаты. Попробуйте снова.');
            }
        } finally {
            setLoading(false);
        }
    }, [token, authUser, submitted, test, randomizedTest, answers, startTime, convertAnswersToOriginalIndices]);

    // 📥 Загрузка теста — ИСПРАВЛЕНО
    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/login');
            return;
        }

        const loadTest = async () => {
            try {
                setLoading(true);
                if (!testId) {
                    navigate('/profile');
                    return;
                }

                // ✅ Используем fetch напрямую — testsApi.getTest не существует
                const response = await fetch(`http://localhost:5000/api/tests/${testId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }
                
                const data = await response.json();
                let loadedTest = data.test || data;

                // ✅ Парсинг вопросов из строки
                if (typeof loadedTest.questions === 'string') {
                    try {
                        loadedTest.questions = JSON.parse(loadedTest.questions);
                    } catch (e) {
                        console.error('Failed to parse questions:', e);
                        loadedTest.questions = [];
                    }
                }

                // ✅ Нормализация полей: snake_case → camelCase
                loadedTest = {
                    ...loadedTest,
                    timeLimit: loadedTest.time_limit ?? loadedTest.timeLimit ?? 0,
                };

                setTest(loadedTest);
                const randomized = randomizeTestAnswers(loadedTest);
                setRandomizedTest(randomized);

                // Инициализация ответов
                const initialAnswers = randomized.questions.map((q: Question) => ({
                    questionId: q.id,
                    selectedAnswers: [] as number[],
                }));
                setAnswers(initialAnswers);

                // ✅ Таймер: используем timeLimit (camelCase)
                if (loadedTest.timeLimit && loadedTest.timeLimit > 0) {
                    setSecondsLeft(loadedTest.timeLimit * 60);
                }
            } catch (error: any) {
                console.error('Error loading test:', error);
                alert(`❌ Не удалось загрузить тест: ${error.message}`);
                navigate('/profile');
            } finally {
                setLoading(false);
            }
        };

        loadTest();
    }, [isAuthenticated, token, testId, navigate]);

    // ⏱️ Таймер
    useEffect(() => {
        if (secondsLeft === null || secondsLeft <= 0 || submitted) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev === null || prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [secondsLeft, submitted]);

    useEffect(() => {
        if (secondsLeft === 0 && !submitted && test) {
            submitTestResults('timeout');
        }
    }, [secondsLeft, submitted, test, submitTestResults]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const handleAnswerChange = (questionId: number, selectedAnswerIdx: number, questionType: string) => {
        setAnswers(prev => prev.map(a => {
            if (a.questionId !== questionId) return a;
            if (questionType === 'single') {
                return { ...a, selectedAnswers: [selectedAnswerIdx] };
            } else if (questionType === 'multiple') {
                const isSelected = a.selectedAnswers.includes(selectedAnswerIdx);
                return {
                    ...a,
                    selectedAnswers: isSelected
                        ? a.selectedAnswers.filter(idx => idx !== selectedAnswerIdx)
                        : [...a.selectedAnswers, selectedAnswerIdx],
                };
            }
            return a;
        }));
    };

    const handleMatchingChange = (questionId: number, leftIdx: number, rightIdx: number) => {
        setAnswers(prev => prev.map(a => {
            if (a.questionId !== questionId) return a;
            const updated = [...a.selectedAnswers];
            updated[leftIdx] = rightIdx;
            return { ...a, selectedAnswers: updated };
        }));
    };

    if (loading && !test) {
        return (
            <>
                <Background />
                <div className={styles.testPlayerPage}>
                    <Sidebar />
                    <div className={styles.loadingState}>Загрузка теста...</div>
                </div>
            </>
        );
    }

    if (!test || !Array.isArray(test.questions) || test.questions.length === 0) {
        return (
            <>
                <Background />
                <div className={styles.testPlayerPage}>
                    <Sidebar />
                    <div className={styles.errorState}>
                        <h2>Тест не найден</h2>
                        <p>Или не содержит вопросов</p>
                        <button onClick={() => navigate('/profile')}>← Вернуться в профиль</button>
                    </div>
                </div>
            </>
        );
    }

    const displayTest = randomizedTest || test;

    return (
        <>
            <Background />
            <div className={styles.testPlayerPage}>
                <Sidebar />
                <div className={styles.profileContent}>
                    <div className={styles.testPlayerHeader}>
                        <h1>{test.title}</h1>
                        {test.description && <p className={styles.testDescription}>{test.description}</p>}
                        {secondsLeft !== null && (
                            <div className={`${styles.timer} ${secondsLeft <= 60 ? styles.timerWarning : ''}`}>
                                ⏱️ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                            </div>
                        )}
                    </div>

                    {submitError && (
                        <div className={styles.submitError}>
                            {submitError}
                            <button onClick={() => setSubmitError(null)}>✕</button>
                        </div>
                    )}

                    {!submitted ? (
                        <div className={styles.testQuestionsContainer}>
                            {displayTest.questions.map((question: RandomizedQuestion, qIdx: number) => {
                                const answer = answers.find(a => a.questionId === question.id) || {
                                    questionId: question.id,
                                    selectedAnswers: [] as number[],
                                };

                                return (
                                    <div key={question.id} className={styles.testQuestionCard}>
                                        <div className={styles.questionHeader}>
                                            <h3>Вопрос {qIdx + 1}</h3>
                                            {question.points > 0 && (
                                                <span className={styles.questionPoints}>
                                                    +{question.points} балл{question.points % 10 === 1 && question.points % 100 !== 11 ? '' : 'а'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className={styles.questionText}>
                                            {question.text}
                                        </div>

                                        {/* Single / Multiple */}
                                        {(question.type === 'single' || question.type === 'multiple') && Array.isArray(question.options) && (
                                            <div className={styles.answersGrid}>
                                                {question.options.map((option: string, idx: number) => {
                                                    const isSelected = answer.selectedAnswers.includes(idx);
                                                    return (
                                                        <label 
                                                            key={idx} 
                                                            className={`${styles.answerOption} ${isSelected ? styles.selected : ''}`}
                                                        >
                                                            <input
                                                                type={question.type === 'single' ? 'radio' : 'checkbox'}
                                                                name={`answer-${question.id}`}
                                                                checked={isSelected}
                                                                onChange={() => handleAnswerChange(question.id, idx, question.type)}
                                                            />
                                                            <span className={styles.answerLetter}>
                                                                {String.fromCharCode(65 + idx)}
                                                            </span>
                                                            <span className={styles.answerText}>{option}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Matching */}
                                        {question.type === 'matching' && Array.isArray(question.matchingPairs) && (
                                            <div className={styles.matchingContainer}>
                                                <div className={styles.matchingHeader}>
                                                    <span>Термин</span>
                                                    <span>Определение</span>
                                                </div>
                                                {question.matchingPairs.map((pair, leftIdx: number) => (
                                                    <div key={pair.id || leftIdx} className={styles.matchingRow}>
                                                        <span className={styles.leftItem}>{pair.left}</span>
                                                        <select
                                                            className={styles.matchingSelect}
                                                            value={answer.selectedAnswers[leftIdx] ?? ''}
                                                            onChange={(e) => handleMatchingChange(question.id, leftIdx, parseInt(e.target.value))}
                                                        >
                                                            <option value="">-- выберите --</option>
                                                            {question._shuffledRightOptions?.map((rightText: string, rightIdx: number) => (
                                                                <option key={rightIdx} value={rightIdx}>
                                                                    {rightText}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <div className={styles.testActions}>
                                <button
                                    className={styles.submitBtn}
                                    onClick={() => submitTestResults('manual')}
                                    disabled={loading}
                                >
                                    {loading ? '⏳ Отправка...' : '✅ Завершить тест'}
                                </button>
                            </div>
                        </div>
                    ):(
                        <div className={styles.loadingState}>Перенаправление на результаты...</div>
                    )}
                </div>
            </div>
        </>
    );
}