import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { quizzesApi } from '../../api/quizzes';
import type { QuizQuestion } from '../../types/TestConstructor';
import Sidebar from '../SideBar/SideBar';
import Background from '../Background/Background';
import styles from './QuizPlay.module.scss';

export default function MatchingPlay() {
    const { topicId } = useParams<{ topicId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, token } = useAuthStore();

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [leftItems, setLeftItems] = useState<string[]>([]);
    const [rightItems, setRightItems] = useState<string[]>([]);
    const [showResult, setShowResult] = useState(false);
    const [answers, setAnswers] = useState<{ questionId: number; isCorrect: boolean }[]>([]);
    const [gameFinished, setGameFinished] = useState(false);
    const [topicName, setTopicName] = useState('');
    const [loading, setLoading] = useState(true);

    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    useEffect(() => {
        if (!isAuthenticated || !token || !topicId) {
            navigate(!isAuthenticated ? '/login' : '/profile');
            return;
        }
        loadQuestions();
    }, [isAuthenticated, token, topicId]);

    const loadQuestions = async () => {
        try {
            setLoading(true);
            const data = await quizzesApi.getQuestionsByTopic(token!, Number(topicId));

            const normalizedData = (data || []).map((q: any) => ({
                ...q,
                type: q.type || 'matching',
                matchingPairs: Array.isArray(q.matchingPairs)
                    ? q.matchingPairs
                    : (Array.isArray(q.matching_pairs) ? q.matching_pairs : []),
            })) as QuizQuestion[];

            const topics = await quizzesApi.getAllTopics(token!);
            const topic = topics.find(t => t.id === Number(topicId));
            if (topic) setTopicName(topic.name);

            setQuestions(normalizedData);
        } catch (error) {
            console.error('Error loading matching questions:', error);
            alert('Ошибка при загрузке игры сопоставления');
            navigate('/profile');
        } finally {
            setLoading(false);
        }
    };

    const currentQuestion = questions[currentIndex];

    const initializeQuestionState = (question: QuizQuestion | undefined) => {
        if (!question?.matchingPairs?.length) {
            setLeftItems([]);
            setRightItems([]);
            setShowResult(false);
            return;
        }

        const left = question.matchingPairs.map(pair => pair.left);
        const right = question.matchingPairs.map(pair => pair.right);

        setLeftItems(shuffleArray(left));
        setRightItems(shuffleArray(right));
        setShowResult(false);
    };

    // Инициализация при смене вопроса
    useEffect(() => {
        initializeQuestionState(currentQuestion);
    }, [currentQuestion]);

    // Drag & Drop для сортировки правой колонки
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        e.currentTarget.classList.add(styles.dragging);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove(styles.dragging);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

        if (dragIndex === dropIndex) return;

        const newRightItems = [...rightItems];
        const [movedItem] = newRightItems.splice(dragIndex, 1);
        newRightItems.splice(dropIndex, 0, movedItem);

        setRightItems(newRightItems);
    };

    const handleSubmit = () => {
        if (!currentQuestion || showResult) return;

        const correctPairs = currentQuestion.matchingPairs!;
        const isCorrect = leftItems.every((left, index) => {
            const correctRight = correctPairs.find(p => p.left === left)?.right;
            return rightItems[index] === correctRight;
        });

        setShowResult(true);
        setAnswers(prev => [...prev, { 
            questionId: currentQuestion.id, 
            isCorrect 
        }]);
    };

    const handleNext = () => {
        if (currentIndex + 1 >= questions.length) {
            setGameFinished(true);
            return;
        }
        setCurrentIndex(prev => prev + 1);
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setAnswers([]);
        setGameFinished(false);
        initializeQuestionState(questions[0]);
    };

    if (loading) {
        return (
            <div className={styles.quizPlayPage}>
                <Sidebar />
                <div className={styles.quizContent}>
                    <Background />
                    <div className={styles.loadingOverlay}>Загрузка игры сопоставления...</div>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className={styles.quizPlayPage}>
                <Sidebar />
                <div className={styles.quizContent}>
                    <Background />
                    <div className={styles.loadingOverlay}>Нет доступных заданий.</div>
                </div>
            </div>
        );
    }

    if (gameFinished) {
        const correctCount = answers.filter(a => a.isCorrect).length;
        const percentage = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
        const message = percentage >= 80 ? 'Отлично!' : percentage >= 50 ? 'Хорошо, можно лучше' : 'Нужно повторить';

        return (
            <div className={styles.quizPlayPage}>
                <Sidebar />
                <div className={styles.quizContent}>
                    <Background />
                    <div className={styles.statsContainer}>
                        <div className={styles.statsHeader}>
                            <h1>🎉 Игра сопоставления завершена</h1>
                            <p className={styles.statsTopic}>{topicName}</p>
                        </div>
                        <div className={styles.statsContent}>
                            <div className={styles.statsSummary}>
                                <div className={styles.scoreCircle} style={{ borderColor: '#4caf50' }}>
                                    <span className={styles.scorePercentage} style={{ color: '#4caf50' }}>
                                        {percentage}%
                                    </span>
                                </div>
                                <div className={styles.statsDetails}>
                                    <p className={styles.statsMessage}>{message}</p>
                                    <div className={styles.statsNumbers}>
                                        <span className={styles.correctCount}>
                                            Верных: <strong>{correctCount}</strong>
                                        </span>
                                        <span className={styles.totalCount}>
                                            Всего: <strong>{questions.length}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.statsActions}>
                            <button className={styles.restartBtn} onClick={handleRestart}>
                                Пройти ещё раз
                            </button>
                            <button className={styles.profileBtn} onClick={() => navigate('/profile')}>
                                Вернуться в профиль
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.quizPlayPage}>
            <Sidebar />
            <div className={styles.quizContent}>
                <Background />
                <div className={styles.quizContainer}>
                    <div className={styles.quizHeader}>
                        <h2 className={styles.quizTitle}>Игра сопоставления</h2>
                        <div className={styles.quizProgress}>
                            <span className={styles.progressText}>
                                Вопрос {currentIndex + 1} из {questions.length}
                            </span>
                        </div>
                    </div>

                    <div className={styles.questionCard}>
                        <span className={styles.questionNumber}>Вопрос {currentIndex + 1}</span>
                        <p className={styles.questionText}>{currentQuestion.text}</p>
                    </div>

                    <div className={styles.matchingBoard}>
                        {/* Левая колонка */}
                        <div className={styles.matchingLeftColumn}>
                            {leftItems.map((item, idx) => (
                                <div key={idx} className={styles.matchingRow}>
                                    <div className={styles.matchingLeft}>{item}</div>
                                </div>
                            ))}
                        </div>

                        {/* Правая колонка — перетаскивается вверх/вниз */}
                        <div className={styles.matchingRightColumn}>
                            {rightItems.map((item, idx) => {
                                const correctAnswer = currentQuestion.matchingPairs?.find(
                                    p => p.left === leftItems[idx]
                                )?.right;

                                const isCorrect = showResult && item === correctAnswer;
                                const isWrong = showResult && item !== correctAnswer;

                                return (
                                    <div
                                        key={idx}
                                        draggable={!showResult}
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, idx)}
                                        className={`${styles.matchingRow} ${styles.matchingRightRow} 
                                            ${isCorrect ? styles.matchingRowCorrect : ''} 
                                            ${isWrong ? styles.matchingRowWrong : ''}`}
                                    >
                                        <div className={styles.matchingRight}>{item}</div>
                                        {showResult && (
                                            <span className={styles.matchingState}>
                                                {isCorrect ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {!showResult && (
                        <div className={styles.actionButtons}>
                            <button 
                                className={styles.nextBtn} 
                                onClick={handleSubmit}
                            >
                                Проверить
                            </button>
                        </div>
                    )}

                    {showResult && (
                        <div className={styles.actionButtons}>
                            <button className={styles.nextBtn} onClick={handleNext}>
                                {currentIndex + 1 >= questions.length ? 'Завершить' : 'Следующий вопрос'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}