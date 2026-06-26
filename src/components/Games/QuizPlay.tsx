import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { quizzesApi } from '../../api/quizzes';
import type { QuizQuestion, QuizStats, QuizAnswer } from '../../types/TestConstructor';
import Sidebar from '../SideBar/SideBar';
import Background from '../Background/Background';
import styles from './QuizPlay.module.scss';

export default function QuizPlay() {
    const { topicId } = useParams<{ topicId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, token } = useAuthStore();

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [answers, setAnswers] = useState<QuizAnswer[]>([]);
    const [gameFinished, setGameFinished] = useState(false);
    const [stats, setStats] = useState<QuizStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [topicName, setTopicName] = useState('');

    // Алгоритм Фишера-Йейтса
    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Перемешивает варианты ответа и обновляет correctIndex
    const shuffleQuestionOptions = (question: QuizQuestion): QuizQuestion => {
        const optionsWithIndex = question.options.map((option, idx) => ({
            text: option,
            originalIndex: idx,
            isCorrect: idx === question.correctIndex,
        }));

        const shuffled = shuffleArray(optionsWithIndex);
        const newCorrectIndex = shuffled.findIndex(opt => opt.isCorrect);

        return {
            ...question,
            options: shuffled.map(opt => opt.text),
            correctIndex: newCorrectIndex,
        };
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

            if (!Array.isArray(data) || data.length === 0) {
                alert('В этой теме пока нет вопросов');
                navigate('/profile');
                return;
            }

            const normalizedData: QuizQuestion[] = data.map(q => ({
                ...q,
                correctIndex: (q as any).correct_index ?? q.correctIndex,
            }));

            const withShuffledOptions = normalizedData.map(shuffleQuestionOptions);

            const topics = await quizzesApi.getAllTopics(token!);
            const topic = topics.find(t => t.id === Number(topicId));
            if (topic) setTopicName(topic.name);

            setQuestions(withShuffledOptions);
            const shuffled = shuffleArray(withShuffledOptions);
            setShuffledQuestions(shuffled);
        } catch (error) {
            console.error('Error loading questions:', error);
            alert('Ошибка при загрузке вопросов');
            navigate('/profile');
        } finally {
            setLoading(false);
        }
    };

    const currentQuestion = shuffledQuestions[currentIndex];

    // Мгновенная проверка при клике на ответ
    const handleAnswerClick = (index: number) => {
        if (showResult) return; // Блокируем повторные клики

        setSelectedAnswer(index);
        setShowResult(true);

        const correct = index === currentQuestion.correctIndex;
        setIsCorrect(correct);

        setAnswers(prev => [...prev, {
            questionId: currentQuestion.id,
            selectedIndex: index,
            isCorrect: correct,
        }]);
    };

    const handleNextQuestion = () => {
        if (currentIndex + 1 >= shuffledQuestions.length) {
            const finalAnswers = [...answers];
            const correctCount = finalAnswers.filter(a => a.isCorrect).length;
            const wrongCount = finalAnswers.filter(a => !a.isCorrect).length;

            setStats({
                topicId: Number(topicId),
                topicName,
                totalQuestions: shuffledQuestions.length,
                correctAnswers: correctCount,
                wrongAnswers: wrongCount,
                answers: finalAnswers,
            });
            setGameFinished(true);
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowResult(false);
            setIsCorrect(null);
        }
    };

    const handleRestart = () => {
        const withShuffledOptions = questions.map(shuffleQuestionOptions);
        const shuffled = shuffleArray(withShuffledOptions);
        
        setShuffledQuestions(shuffled);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setIsCorrect(null);
        setAnswers([]);
        setStats(null);
        setGameFinished(false);
    };

    // Loading screen
    if (loading || shuffledQuestions.length === 0) {
        return (
            <div className={styles.quizPlayPage}>
                <Sidebar />
                <div className={styles.quizContent}>
                    <Background />
                    <div className={styles.loadingOverlay}>
                        {loading ? 'Загрузка квизи...' : 'Нет вопросов...'}
                    </div>
                </div>
            </div>
        );
    }

    // Statistics screen
    if (gameFinished && stats) {
        const percentage = Math.round((stats.correctAnswers / stats.totalQuestions) * 100);
        let message = 'Отличный результат!';
        let resultColor = '#4caf50';

        if (percentage < 50) {
            message = 'Стоит повторить тему!';
            resultColor = '#f44336';
        } else if (percentage < 80) {
            message = 'Хороший результат, но есть куда расти!';
            resultColor = '#ff9800';
        }

        return (
            <div className={styles.quizPlayPage}>
                <Sidebar />
                <div className={styles.quizContent}>
                    <Background />
                    <div className={styles.statsContainer}>
                        <div className={styles.statsHeader}>
                            <h1>🎉 Квизи завершён!</h1>
                            <p className={styles.statsTopic}>Тема: {stats.topicName}</p>
                        </div>
                        
                        <div className={styles.statsContent}>
                            <div className={styles.statsSummary}>
                                <div className={styles.scoreCircle} style={{ borderColor: resultColor }}>
                                    <span className={styles.scorePercentage} style={{ color: resultColor }}>
                                        {percentage}%
                                    </span>
                                </div>
                                <div className={styles.statsDetails}>
                                    <p className={styles.statsMessage}>{message}</p>
                                    <div className={styles.statsNumbers}>
                                        <span className={styles.correctCount}>
                                            Правильно: <strong>{stats.correctAnswers}</strong>
                                        </span>
                                        <span className={styles.wrongCount}>
                                            Ошибки: <strong>{stats.wrongAnswers}</strong>
                                        </span>
                                        <span className={styles.totalCount}>
                                            Всего: <strong>{stats.totalQuestions}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.progressBar}>
                                <div 
                                    className={styles.progressFill} 
                                    style={{ width: `${percentage}%`, backgroundColor: resultColor }} 
                                />
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
            </div>
        );
    }

    // Main quiz screen
    return (
        <div className={styles.quizPlayPage}>
            <Sidebar />
            <div className={styles.quizContent}>
                <Background />

                <div className={styles.quizContainer}>
                    {/* Прогресс */}
                    <div className={styles.quizHeader}>
                        <h2 className={styles.quizTitle}>{topicName}</h2>
                        <div className={styles.quizProgress}>
                            <span className={styles.progressText}>
                                Вопрос {currentIndex + 1} из {shuffledQuestions.length}
                            </span>
                            <div className={styles.progressDots}>
                                {shuffledQuestions.map((_, idx) => (
                                    <span
                                        key={idx}
                                        className={`${styles.dot} ${idx < currentIndex ? styles.answered : ''} ${idx === currentIndex ? styles.current : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Вопрос */}
                    <div className={styles.questionSection}>
                        <div className={styles.questionCard}>
                            <span className={styles.questionNumber}>Вопрос {currentIndex + 1}</span>
                            <p className={styles.questionText}>{currentQuestion?.text}</p>
                        </div>
                    </div>

                    <div className={styles.answersSection}>
                        {currentQuestion?.options?.map((option, idx) => {
                            // Определяем состояние карточки
                            const isSelected = selectedAnswer === idx;
                            const isCorrectAnswer = idx === currentQuestion.correctIndex;
                            const isWrongSelection = isSelected && !isCorrectAnswer;

                            let cardClass = styles.answerCard;
                            
                            if (showResult) {
                                if (isCorrectAnswer) {
                                    cardClass += ` ${styles.answerCorrect}`;
                                } else if (isWrongSelection) {
                                    cardClass += ` ${styles.answerWrong}`;
                                }
                            } else if (isSelected) {
                                cardClass += ` ${styles.answerHover}`;
                            }

                            return (
                                <button
                                    key={idx}
                                    className={cardClass}
                                    onClick={() => handleAnswerClick(idx)}
                                    disabled={showResult}
                                    type="button"
                                >
                                    <span className={styles.answerLetter}>
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className={styles.answerText}>{option}</span>
                                    
                                    {/* Иконки результата */}
                                    {showResult && isCorrectAnswer && (
                                        <span className={styles.answerIcon}>✓</span>
                                    )}
                                    {showResult && isWrongSelection && (
                                        <span className={styles.answerIcon}>✗</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Кнопка "Далее" */}
                    {showResult && (
                        <div className={styles.actionButtons}>
                            <button className={styles.nextBtn} onClick={handleNextQuestion}>
                                {currentIndex + 1 >= shuffledQuestions.length ? 'Результаты' : 'Следующий вопрос'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}