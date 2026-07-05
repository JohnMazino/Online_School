import { useState, useEffect } from 'react';
import { quizzesApi } from '../../api/quizzes';
import type { QuizTopic, QuizQuestion } from '../../types/TestConstructor';
import styles from './QuizManager.module.scss';

interface QuizManagerProps {
    token: string;
    teacherId: number;
}

export default function QuizManager({ token, teacherId }: QuizManagerProps) {
    const [topics, setTopics] = useState<QuizTopic[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<QuizTopic | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'topics' | 'questions' | 'create-topic' | 'create-question'>('topics');

    // Форма создания темы
    const [topicName, setTopicName] = useState('');
    const [topicDesc, setTopicDesc] = useState('');
    const [topicGameType, setTopicGameType] = useState<'quiz' | 'matching'>('quiz');

    // Форма создания вопроса
    const [questionText, setQuestionText] = useState('');
    const [questionType, setQuestionType] = useState<'single' | 'matching'>('single');
    const [questionOptions, setQuestionOptions] = useState(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);
    const [matchingPairs, setMatchingPairs] = useState([{ id: 1, left: '', right: '' }]);

    // Загрузка тем
    useEffect(() => {
        loadTopics();
    }, [token]);

    const loadTopics = async () => {
        try {
            setLoading(true);
            const data = await quizzesApi.getTeacherTopics(token);
            setTopics(data);
        } catch (error) {
            console.error('Error loading topics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка вопросов при выборе темы
    useEffect(() => {
        if (selectedTopic && token) {
            loadQuestions(selectedTopic.id);
        }
    }, [selectedTopic, token]);

    const loadQuestions = async (topicId: number) => {
        try {
            const data = await quizzesApi.getQuestionsByTopic(token, topicId);
            setQuestions(data);
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    };

    const resetQuestionForm = () => {
        setQuestionText('');
        setQuestionType('single');
        setQuestionOptions(['', '', '', '']);
        setCorrectIndex(0);
        setMatchingPairs([{ id: 1, left: '', right: '' }]);
    };

    // Создание темы
    const handleCreateTopic = async () => {
        if (!topicName.trim()) {
            alert('Введите название темы');
            return;
        }

        try {
            const newTopic = await quizzesApi.createTopic(token, {
                name: topicName,
                description: topicDesc,
                teacherId,
                gameType: topicGameType,
            });
            setTopics([newTopic, ...topics]);
            setTopicName('');
            setTopicDesc('');
            setActiveView('topics');
        } catch (error) {
            console.error('Error creating topic:', error);
            alert('Ошибка при создании темы');
        }
    };

    // Удаление темы
    const handleDeleteTopic = async (topicId: number) => {
        if (!confirm('Удалить тему и все её вопросы?')) return;

        try {
            await quizzesApi.deleteTopic(token, topicId);
            setTopics(topics.filter(t => t.id !== topicId));
            if (selectedTopic?.id === topicId) {
                setSelectedTopic(null);
                setQuestions([]);
            }
        } catch (error) {
            console.error('Error deleting topic:', error);
            alert('Ошибка при удалении темы');
        }
    };

    // Создание вопроса
    const handleCreateQuestion = async () => {
        if (!selectedTopic) return;
        if (!questionText.trim()) {
            alert('Введите текст вопроса');
            return;
        }

        try {
            let newQuestion;
            const shouldUseMatching = selectedTopic.gameType === 'matching' || questionType === 'matching';

            if (shouldUseMatching) {
                const filledPairs = matchingPairs.filter(pair => pair.left.trim() && pair.right.trim());
                if (filledPairs.length < 2) {
                    alert('Минимум 2 пары для сопоставления');
                    return;
                }

                newQuestion = await quizzesApi.createQuestion(token, {
                    topicId: selectedTopic.id,
                    text: questionText,
                    type: 'matching',
                    matchingPairs: filledPairs.map(pair => ({
                        id: Date.now() + Math.random(),
                        left: pair.left.trim(),
                        right: pair.right.trim(),
                    })),
                    options: filledPairs.map(pair => pair.right.trim()),
                });
            } else {
                const filledOptions = questionOptions.filter(o => o.trim());
                if (filledOptions.length < 2) {
                    alert('Минимум 2 варианта ответа');
                    return;
                }

                const nonEmptyOptions = questionOptions.filter(o => o.trim());
                const adjustedCorrectIndex = correctIndex >= nonEmptyOptions.length ? 0 : correctIndex;

                newQuestion = await quizzesApi.createQuestion(token, {
                    topicId: selectedTopic.id,
                    text: questionText,
                    type: 'single',
                    options: nonEmptyOptions.map(o => o.trim()),
                    correctIndex: adjustedCorrectIndex,
                });
            }

            setQuestions([...questions, newQuestion]);
            resetQuestionForm();
            setActiveView('questions');
        } catch (error) {
            console.error('Error creating question:', error);
            alert('Ошибка при создании вопроса');
        }
    };

    // Удаление вопроса
    const handleDeleteQuestion = async (questionId: number) => {
        if (!confirm('Удалить вопрос?')) return;

        try {
            await quizzesApi.deleteQuestion(token, questionId);
            setQuestions(questions.filter(q => q.id !== questionId));
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Ошибка при удалении вопроса');
        }
    };

    // Обновление счётчика вопросов в теме
    const getQuestionCount = (topicId: number): number => {
        const topic = topics.find(t => t.id === topicId);
        return (topic as any)?.question_count || questions.filter(q => q.topicId === topicId).length;
    };

    if (loading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    return (
        <div className={styles.quizManager}>
            {/* Навигация внутри квизи */}
            <div className={styles.breadcrumb}>
                {activeView === 'questions' && selectedTopic && (
                    <>
                        <button className={styles.breadcrumbLink} onClick={() => { setActiveView('topics'); setSelectedTopic(null); }}>
                            📂 Темы
                        </button>
                        <span className={styles.breadcrumbSep}>→</span>
                        <span className={styles.breadcrumbItem}>{selectedTopic.name}</span>
                    </>
                )}
                {activeView === 'create-topic' && (
                    <>
                        <button className={styles.breadcrumbLink} onClick={() => setActiveView('topics')}>
                            📂 Темы
                        </button>
                        <span className={styles.breadcrumbSep}>→</span>
                        <span className={styles.breadcrumbItem}>Новая тема</span>
                    </>
                )}
                {activeView === 'create-question' && selectedTopic && (
                    <>
                        <button className={styles.breadcrumbLink} onClick={() => setActiveView('questions')}>
                            📂 Темы
                        </button>
                        <span className={styles.breadcrumbSep}>→</span>
                        <button className={styles.breadcrumbLink} onClick={() => setActiveView('questions')}>
                            {selectedTopic.name}
                        </button>
                        <span className={styles.breadcrumbSep}>→</span>
                        <span className={styles.breadcrumbItem}>Новый вопрос</span>
                    </>
                )}
            </div>

            {/* Список тем */}
            {activeView === 'topics' && (
                <div className={styles.viewContainer}>
                    <div className={styles.viewHeader}>
                        <h2>Темы игр</h2>
                        <button className={styles.createBtn} onClick={() => setActiveView('create-topic')}>
                            Создать тему игры
                        </button>
                    </div>

                    {topics.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>У вас пока нет тем для квизи. Создайте первую тему!</p>
                        </div>
                    ) : (
                        <div className={styles.topicsList}>
                            {topics.map(topic => (
                                <div key={topic.id} className={styles.topicCard}>
                                    <div className={styles.topicInfo}>
                                        <h3 className={styles.topicName}>{topic.name}</h3>
                                        {topic.description && (
                                            <p className={styles.topicDesc}>{topic.description}</p>
                                        )}
                                        <span className={styles.questionCount}>
                                            {getQuestionCount(topic.id)} вопроса
                                        </span>
                                    </div>
                                    <div className={styles.topicActions}>
                                        <button
                                            className={styles.openBtn}
                                            onClick={() => {
                                                setSelectedTopic(topic);
                                                setQuestionType(topic.gameType === 'matching' ? 'matching' : 'single');
                                                setActiveView('questions');
                                            }}
                                        >
                                            Открыть
                                        </button>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => handleDeleteTopic(topic.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Создание темы */}
            {activeView === 'create-topic' && (
                <div className={styles.viewContainer}>
                    <div className={styles.formSection}>
                        <h2>Создание темы</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Название темы <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Напр., Как устроен мир?"
                                value={topicName}
                                onChange={(e) => setTopicName(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Описание (опционально)</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Краткое описание темы..."
                                value={topicDesc}
                                onChange={(e) => setTopicDesc(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Тип игры</label>
                            <select
                                className={styles.select}
                                value={topicGameType}
                                onChange={(e) => setTopicGameType(e.target.value as 'quiz' | 'matching')}
                            >
                                <option value="quiz">Квиз</option>
                                <option value="matching">Сопоставление</option>
                            </select>
                        </div>

                        <div className={styles.actionButtons}>
                            <button className={styles.saveBtn} onClick={handleCreateTopic}>
                                Создать тему
                            </button>
                            <button className={styles.cancelBtn} onClick={() => setActiveView('topics')}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Вопросы темы */}
            {activeView === 'questions' && selectedTopic && (
                <div className={styles.viewContainer}>
                    <div className={styles.viewHeader}>
                        <h2>{selectedTopic.name}</h2>
                        <button className={styles.createBtn} onClick={() => setActiveView('create-question')}>
                            ➕ Добавить вопрос
                        </button>
                    </div>

                    {questions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>В этой теме пока нет вопросов. Добавьте первый вопрос!</p>
                        </div>
                    ) : (
                        <div className={styles.questionsList}>
                            {questions.map((q, idx) => (
                                <div key={q.id} className={styles.questionCard}>
                                    <div className={styles.questionInfo}>
                                        <span className={styles.questionNumber}>#{idx + 1}</span>
                                        <span className={styles.questionText}>{q.text}</span>
                                    </div>
                                    <div className={styles.questionOptions}>
                                        {q.type === 'matching' && q.matchingPairs ? (
                                            q.matchingPairs.map(pair => (
                                                <span key={pair.id} className={styles.optionBadge}>
                                                    {pair.left} → {pair.right}
                                                </span>
                                            ))
                                        ) : (
                                            q.options.map((opt, i) => (
                                                <span
                                                    key={i}
                                                    className={`${styles.optionBadge} ${i === q.correctIndex ? styles.correct : ''}`}
                                                >
                                                    {i === q.correctIndex ? '✓ ' : ''}{opt}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                    <button
                                        className={styles.deleteQuestionBtn}
                                        onClick={() => handleDeleteQuestion(q.id)}
                                    >
                                        🗑️ Удалить
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Создание вопроса */}
            {activeView === 'create-question' && selectedTopic && (
                <div className={styles.viewContainer}>
                    <div className={styles.formSection}>
                        <h2>Новый вопрос для «{selectedTopic.name}»</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Текст вопроса <span className={styles.required}>*</span>
                            </label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Введите вопрос..."
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                rows={3}
                            />
                        </div>

                        {selectedTopic.gameType === 'matching' ? (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Тип вопроса</label>
                                <p className={styles.hint}>Тема сопоставления — этот вопрос будет сохраняться как matching.</p>
                            </div>
                        ) : (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Тип вопроса</label>
                                <p className={styles.hint}>Тема квиза поддерживает только одиночный выбор.</p>
                            </div>
                        )}

                        {selectedTopic.gameType === 'quiz' ? (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Варианты ответов <span className={styles.required}>*</span>
                                    <span className={styles.hint}> — выберите правильный ответ</span>
                                </label>
                                <div className={styles.optionsEditor}>
                                    {questionOptions.map((opt, idx) => (
                                        <div key={idx} className={styles.optionRow}>
                                            <input
                                                type="radio"
                                                name="correctAnswer"
                                                checked={correctIndex === idx}
                                                onChange={() => setCorrectIndex(idx)}
                                                className={styles.radioInput}
                                            />
                                            <input
                                                type="text"
                                                className={styles.optionInput}
                                                placeholder={`Вариант ${idx + 1}`}
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOpts = [...questionOptions];
                                                    newOpts[idx] = e.target.value;
                                                    setQuestionOptions(newOpts);
                                                }}
                                            />
                                            {questionOptions.length > 2 && (
                                                <button
                                                    className={styles.removeOptionBtn}
                                                    onClick={() => {
                                                        const newOpts = questionOptions.filter((_, i) => i !== idx);
                                                        setQuestionOptions(newOpts);
                                                        if (correctIndex >= newOpts.length) {
                                                            setCorrectIndex(0);
                                                        } else if (correctIndex === idx) {
                                                            setCorrectIndex(0);
                                                        }
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {questionOptions.length < 8 && (
                                        <button
                                            className={styles.addOptionBtn}
                                            onClick={() => setQuestionOptions([...questionOptions, ''])}
                                        >
                                            + Добавить вариант
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Пары для сопоставления <span className={styles.required}>*</span>
                                    <span className={styles.hint}> — левая часть и правильный вариант справа</span>
                                </label>
                                <div className={styles.matchingPairsEditor}>
                                    {matchingPairs.map((pair, idx) => (
                                        <div key={pair.id} className={styles.matchingPairRow}>
                                            <input
                                                type="text"
                                                className={styles.optionInput}
                                                placeholder={`Левая часть ${idx + 1}`}
                                                value={pair.left}
                                                onChange={(e) => {
                                                    const newPairs = [...matchingPairs];
                                                    newPairs[idx] = { ...newPairs[idx], left: e.target.value };
                                                    setMatchingPairs(newPairs);
                                                }}
                                            />
                                            <span className={styles.matchingArrow}>↔</span>
                                            <input
                                                type="text"
                                                className={styles.optionInput}
                                                placeholder={`Правая часть ${idx + 1}`}
                                                value={pair.right}
                                                onChange={(e) => {
                                                    const newPairs = [...matchingPairs];
                                                    newPairs[idx] = { ...newPairs[idx], right: e.target.value };
                                                    setMatchingPairs(newPairs);
                                                }}
                                            />
                                            {matchingPairs.length > 2 && (
                                                <button
                                                    className={styles.removeOptionBtn}
                                                    onClick={() => {
                                                        const newPairs = matchingPairs.filter((_, i) => i !== idx);
                                                        setMatchingPairs(newPairs);
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        className={styles.addOptionBtn}
                                        onClick={() => setMatchingPairs([...matchingPairs, { id: Date.now(), left: '', right: '' }])}
                                    >
                                        + Добавить пару
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className={styles.actionButtons}>
                            <button className={styles.saveBtn} onClick={handleCreateQuestion}>
                                Создать вопрос
                            </button>
                            <button className={styles.cancelBtn} onClick={() => setActiveView('questions')}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}