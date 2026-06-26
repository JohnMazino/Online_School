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

    // Форма создания вопроса
    const [questionText, setQuestionText] = useState('');
    const [questionOptions, setQuestionOptions] = useState(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);

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

        const filledOptions = questionOptions.filter(o => o.trim());
        if (filledOptions.length < 2) {
            alert('Минимум 2 варианта ответа');
            return;
        }

        try {
            // Адаптируем индекс правильного ответа если были пустые варианты
            const nonEmptyOptions = questionOptions.filter(o => o.trim());
            let adjustedCorrectIndex = correctIndex;

            const newQuestion = await quizzesApi.createQuestion(token, {
                topicId: selectedTopic.id,
                text: questionText,
                options: nonEmptyOptions.map(o => o.trim()),
                correctIndex: adjustedCorrectIndex >= nonEmptyOptions.length ? 0 : adjustedCorrectIndex,
            });

            setQuestions([...questions, newQuestion]);
            setQuestionText('');
            setQuestionOptions(['', '', '', '']);
            setCorrectIndex(0);
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
                {activeView === 'topics' && (
                    <span className={styles.breadcrumbItem}>📂 Темы квизи</span>
                )}
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
                        <h2>Темы квизи</h2>
                        <button className={styles.createBtn} onClick={() => setActiveView('create-topic')}>
                            ➕ Создать тему
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
                                            📝 {getQuestionCount(topic.id)} вопросов
                                        </span>
                                    </div>
                                    <div className={styles.topicActions}>
                                        <button
                                            className={styles.openBtn}
                                            onClick={() => {
                                                setSelectedTopic(topic);
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
                                placeholder="Напр., Математика 7 класс"
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

                        <div className={styles.actionButtons}>
                            <button className={styles.saveBtn} onClick={handleCreateTopic}>
                                💾 Создать тему
                            </button>
                            <button className={styles.cancelBtn} onClick={() => setActiveView('topics')}>
                                ✕ Отмена
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
                                        {q.options.map((opt, i) => (
                                            <span
                                                key={i}
                                                className={`${styles.optionBadge} ${i === q.correctIndex ? styles.correct : ''}`}
                                            >
                                                {i === q.correctIndex ? '✓ ' : ''}{opt}
                                            </span>
                                        ))}
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

                        <div className={styles.actionButtons}>
                            <button className={styles.saveBtn} onClick={handleCreateQuestion}>
                                💾 Создать вопрос
                            </button>
                            <button className={styles.cancelBtn} onClick={() => setActiveView('questions')}>
                                ✕ Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}