import { useState, useEffect } from 'react';
import type { Test, Question } from '../../types/TestConstructor';
import styles from './TestCreator.module.scss';

interface TestCreatorProps {
    test?: Test | null;
    onSave: (test: Omit<Test, 'id' | 'createdAt' | 'teacherId' | 'updatedAt'>) => void;
    onCancel: () => void;
}

// Компонент для создания и редактирования тестов
export default function TestCreator({ test, onSave, onCancel }: TestCreatorProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [timeLimit, setTimeLimit] = useState(0);
    const [timeLimitDisplay, setTimeLimitDisplay] = useState('0');
    const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    /**
     * Инициализация формы при редактировании существующего теста
     * Загружает данные выбранного теста в поля формы
     */
    useEffect(() => {
        if (test) {
            setTitle(test.title);
            setDescription(test.description);
            setQuestions(test.questions);
            setTimeLimit(test.timeLimit || 0);
            setTimeLimitDisplay(String(test.timeLimit || 0));
        }
    }, [test]);

    /**
     * Валидация данных теста перед сохранением
     * Проверяет:
     * - Наличие названия теста
     * - Наличие хотя бы одного вопроса
     * - Заполненность текста каждого вопроса
     * - Наличие вариантов ответов для вопросов с выбором
     */
    const validateTest = (): boolean => {
        const newErrors: string[] = [];

        if (!title.trim()) {
            newErrors.push('Введите название теста');
        }

        if (questions.length === 0) {
            newErrors.push('Добавьте хотя бы один вопрос');
        }

        questions.forEach((q, idx) => {
            if (!q.text.trim()) {
                newErrors.push(`Вопрос ${idx + 1}: введите текст вопроса`);
            }

            // Проверка вариантов ответов для single/multiple вопросов
            if ((q.type === 'single' || q.type === 'multiple') && (!q.options || q.options.length === 0)) {
                newErrors.push(`Вопрос ${idx + 1}: добавьте варианты ответов`);
            }

            // Проверка пар для matching вопросов
            if (q.type === 'matching' && (!q.matchingPairs || q.matchingPairs.length === 0)) {
                newErrors.push(`Вопрос ${idx + 1}: добавьте пары для сопоставления`);
            }
        });

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    // Сохранение теста
    const handleSave = () => {
        if (validateTest()) {
            // Подготавливаем вопросы: для matching устанавливаем correctAnswers если их нет
            const preparedQuestions = questions.map(q => {
                if (q.type === 'matching' && q.matchingPairs && q.matchingPairs.length > 0) {
                    // Для matching вопросов correctAnswers должны быть индексами правых элементов
                    // Если пары введены в правильном порядке, то correctAnswers = [0, 1, 2, ...]
                    return {
                        ...q,
                        correctAnswers: q.matchingPairs.map((_, idx) => idx),
                    };
                }
                return q;
            });

            onSave({
                title,
                description,
                questions: preparedQuestions,
                timeLimit,
            });
        }
    };

    // Добавление нового вопроса
    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: Math.max(...questions.map(q => q.id), 0) + 1,
            type: 'single',
            text: '',
            options: ['', ''],
            correctAnswers: [],
            points: 1,
        };

        setQuestions([...questions, newQuestion]);
        setExpandedQuestionId(newQuestion.id);
    };

    // Удаление вопроса
    const handleDeleteQuestion = (questionId: number) => {
        setQuestions(questions.filter(q => q.id !== questionId));
    };

    // Обновление вопроса
    const handleUpdateQuestion = (updatedQuestion: Question) => {
        setQuestions(questions.map(q => (q.id === updatedQuestion.id ? updatedQuestion : q)));
    };

    // Добавление варианта ответа
    const handleAddOption = (questionId: number) => {
        setQuestions(
            questions.map(q => {
                if (q.id === questionId && q.options) {
                    return {
                        ...q,
                        options: [...q.options, ''],
                    };
                }
                return q;
            }),
        );
    };

    // Удаление варианта ответа
    const handleDeleteOption = (questionId: number, optionIndex: number) => {
        setQuestions(
            questions.map(q => {
                if (q.id === questionId && q.options) {
                    const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
                    return {
                        ...q,
                        options: newOptions,
                    };
                }
                return q;
            }),
        );
    };

    return (
        <div className={styles.testCreator}>
            {/* Основная информация о тесте */}
            <section className={styles.formSection}>
                <h2>Основная информация</h2>

                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Название теста <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Напр., Тест по алгебре №1"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Описание (опционально)</label>
                    <textarea
                        className={styles.textarea}
                        placeholder="Описание содержания теста..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Лимит времени (минут)
                        <span className={styles.hint}> — 0 означает без ограничения</span>
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        placeholder="0"
                        value={timeLimitDisplay}
                        onChange={(e) => {
                            const value = e.target.value;
                            // Разрешаем вводить только цифры или пустую строку
                            if (value === '' || /^\d+$/.test(value)) {
                                setTimeLimitDisplay(value);
                            }
                        }}
                        onBlur={(e) => {
                            const value = e.target.value;
                            // Если поле пустое после blur, установить 0
                            if (value === '') {
                                setTimeLimit(0);
                                setTimeLimitDisplay('0');
                            } else {
                                let numValue = parseInt(value);
                                // Ограничить от 0 до 300 (5 часов)
                                if (numValue > 300) numValue = 300;
                                setTimeLimit(numValue);
                                setTimeLimitDisplay(String(numValue));
                            }
                        }}
                        onKeyDown={(e) => {
                            // Запретить вводить нецифровые символы
                            if (!/[0-9\b]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                e.preventDefault();
                            }
                        }}
                    />
                </div>
            </section>

            {/* Сообщения об ошибках */}
            {errors.length > 0 && (
                <section className={styles.errorSection}>
                    <h3>❌ Ошибки в форме:</h3>
                    <ul>
                        {errors.map((error, idx) => (
                            <li key={`err-${idx}-${error.substring(0, 10)}`}>{error}</li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Вопросы */}
            <section className={styles.formSection}>
                <div className={styles.sectionHeader}>
                    <h2>Вопросы ({questions.length})</h2>
                    <button className={styles.addQuestionBtn} onClick={handleAddQuestion}>
                        ➕ Добавить вопрос
                    </button>
                </div>

                {questions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Вопросов нет. Начните создание теста, добавив первый вопрос!</p>
                    </div>
                ) : (
                    <div className={styles.questionsList}>
                        {questions.map((question, idx) => (
                            <QuestionEditor
                                key={question.id}
                                question={question}
                                questionNumber={idx + 1}
                                isExpanded={expandedQuestionId === question.id}
                                onToggleExpand={() =>
                                    setExpandedQuestionId(expandedQuestionId === question.id ? null : question.id)
                                }
                                onUpdate={handleUpdateQuestion}
                                onDelete={handleDeleteQuestion}
                                onAddOption={handleAddOption}
                                onDeleteOption={handleDeleteOption}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Кнопки действия */}
            <section className={styles.actionButtons}>
                <button className={styles.saveBtn} onClick={handleSave}>
                    💾 {test ? 'Обновить тест' : 'Создать тест'}
                </button>
                <button className={styles.cancelBtn} onClick={onCancel}>
                    ✕ Отмена
                </button>
            </section>
        </div>
    );
}

interface QuestionEditorProps {
    question: Question;
    questionNumber: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (question: Question) => void;
    onDelete: (questionId: number) => void;
    onAddOption: (questionId: number) => void;
    onDeleteOption: (questionId: number, optionIndex: number) => void;
}

// Компонент для редактирования отдельного вопроса
function QuestionEditor({
    question,
    questionNumber,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onDelete,
    onAddOption,
    onDeleteOption,
}: QuestionEditorProps) {
    const [pointsDisplay, setPointsDisplay] = useState<string>(String(question.points));

    // Обновляем отображение баллов когда меняется вопрос
    useEffect(() => {
        setPointsDisplay(String(question.points));
    }, [question.id]);

    return (
        <div className={styles.questionCard}>
            {/* Заголовок вопроса (всегда видимый) */}
            <div className={styles.questionHeader} onClick={onToggleExpand}>
                <div className={styles.questionTitle}>
                    <span className={styles.questionNumber}>#{questionNumber}</span>
                    <span className={styles.questionType}>{getQuestionTypeLabel(question.type)}</span>
                    <span className={styles.questionText}>{question.text || 'Без текста'}</span>
                </div>
                <button className={`${styles.expandBtn} ${isExpanded ? styles.expanded : ''}`}>
                    {isExpanded ? '▼' : '▶'}
                </button>
            </div>

            {/* Содержимое вопроса (раскрывается) */}
            {isExpanded && (
                <div className={styles.questionContent}>
                    {/* Тип вопроса и текст */}
                    <div className={styles.questionForm}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Тип вопроса</label>
                            <select
                                className={styles.select}
                                value={question.type}
                                onChange={(e) =>
                                    onUpdate({
                                        ...question,
                                        type: e.target.value as Question['type'],
                                        // Очистить старые поля при смене типа
                                        ...(e.target.value === 'matching' && { options: [], correctAnswers: [], matchingPairs: [] }),
                                        ...((e.target.value === 'single' || e.target.value === 'multiple') && { matchingPairs: undefined }),
                                    })
                                }
                            >
                                {/* Тип 'single': Один правильный ответ - radio buttons */}
                                <option value="single">Один правильный ответ</option>
                                
                                {/* Тип 'multiple': Несколько правильных ответов - checkboxes */}
                                <option value="multiple">Несколько правильных ответов</option>

                                {/* Тип 'matching': Сопоставить по парам */}
                                <option value="matching">Сопоставить по парам</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Текст вопроса <span className={styles.required}>*</span>
                            </label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Введите текст вопроса..."
                                value={question.text}
                                onChange={(e) =>
                                    onUpdate({
                                        ...question,
                                        text: e.target.value,
                                    })
                                }
                                rows={3}
                            />
                        </div>

                        {/* Варианты ответов (для выбора) */}
                        {(question.type === 'single' || question.type === 'multiple') && (
                            <div className={styles.optionsSection}>
                                <label className={styles.label}>Варианты ответов</label>
                                <div className={styles.optionsList}>
                                    {question.options?.map((option, idx) => (
                                        <div key={idx} className={styles.optionItem}>
                                            <input
                                                type={question.type === 'single' ? 'radio' : 'checkbox'}
                                                name={`question-${question.id}-correct`}
                                                checked={
                                                    question.correctAnswers
                                                        ? question.correctAnswers.includes(idx)
                                                        : false
                                                }
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        const newCorrectAnswers = question.type === 'single'
                                                            ? [idx]
                                                            : [...(question.correctAnswers || []), idx];
                                                        onUpdate({
                                                            ...question,
                                                            correctAnswers: newCorrectAnswers,
                                                        });
                                                    } else {
                                                        const newCorrectAnswers = (question.correctAnswers || []).filter(
                                                            (a) => a !== idx,
                                                        );
                                                        onUpdate({
                                                            ...question,
                                                            correctAnswers: newCorrectAnswers,
                                                        });
                                                    }
                                                }}
                                            />
                                            <input
                                                type="text"
                                                className={styles.optionInput}
                                                placeholder={`Вариант ${idx + 1}`}
                                                value={option}
                                                onChange={(e) => {
                                                    const newOptions = [...(question.options || [])];
                                                    newOptions[idx] = e.target.value;
                                                    onUpdate({
                                                        ...question,
                                                        options: newOptions,
                                                    });
                                                }}
                                            />
                                            {(question.options?.length || 0) > 2 && (
                                                <button
                                                    className={styles.deleteOptionBtn}
                                                    onClick={() => onDeleteOption(question.id, idx)}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className={styles.addOptionBtn}
                                    onClick={() => onAddOption(question.id)}
                                >
                                    + Добавить вариант
                                </button>
                            </div>
                        )}

                        {/* Пары для сопоставления (для matching) */}
                        {question.type === 'matching' && (
                            <div className={styles.matchingSection}>
                                <label className={styles.label}>Пары для сопоставления</label>
                                <div className={styles.matchingPairs}>
                                    {(question.matchingPairs || []).map((pair, idx) => (
                                        <div key={pair.id} className={styles.matchingPair}>
                                            <input
                                                type="text"
                                                className={styles.matchingInput}
                                                placeholder="Левый элемент"
                                                value={pair.left}
                                                onChange={(e) => {
                                                    const newPairs = [...(question.matchingPairs || [])];
                                                    newPairs[idx] = { ...pair, left: e.target.value };
                                                    onUpdate({
                                                        ...question,
                                                        matchingPairs: newPairs,
                                                    });
                                                }}
                                            />
                                            <span className={styles.matchingArrow}>→</span>
                                            <input
                                                type="text"
                                                className={styles.matchingInput}
                                                placeholder="Правый элемент"
                                                value={pair.right}
                                                onChange={(e) => {
                                                    const newPairs = [...(question.matchingPairs || [])];
                                                    newPairs[idx] = { ...pair, right: e.target.value };
                                                    onUpdate({
                                                        ...question,
                                                        matchingPairs: newPairs,
                                                    });
                                                }}
                                            />
                                            {(question.matchingPairs?.length || 0) > 2 && (
                                                <button
                                                    className={styles.deleteMatchingBtn}
                                                    onClick={() => {
                                                        const newPairs = (question.matchingPairs || []).filter(
                                                            (_, i) => i !== idx,
                                                        );
                                                        onUpdate({
                                                            ...question,
                                                            matchingPairs: newPairs,
                                                        });
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className={styles.addMatchingBtn}
                                    onClick={() => {
                                        const newId = Math.max(
                                            ...(question.matchingPairs || []).map((p) => p.id),
                                            0,
                                        ) + 1;
                                        onUpdate({
                                            ...question,
                                            matchingPairs: [
                                                ...(question.matchingPairs || []),
                                                { id: newId, left: '', right: '' },
                                            ],
                                        });
                                    }}
                                >
                                    + Добавить пару
                                </button>
                            </div>
                        )}

                        {/* Баллы за вопрос */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Баллы за вопрос</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={styles.input}
                                placeholder="1"
                                value={pointsDisplay}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Разрешаем вводить только цифры или пустую строку
                                    if (value === '' || /^\d+$/.test(value)) {
                                        setPointsDisplay(value);
                                    }
                                }}
                                onBlur={(e) => {
                                    const value = e.target.value;
                                    // Если поле пустое после blur, установить минимальное значение
                                    if (value === '' || (value && parseInt(value) < 1)) {
                                        onUpdate({
                                            ...question,
                                            points: 1,
                                        });
                                        setPointsDisplay('1');
                                    } else if (value) {
                                        const numValue = Math.min(100, parseInt(value));
                                        onUpdate({
                                            ...question,
                                            points: numValue,
                                        });
                                        setPointsDisplay(String(numValue));
                                    }
                                }}
                                onKeyDown={(e) => {
                                    // Запретить вводить нецифровые символы
                                    if (!/[0-9\b]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Кнопка удаления */}
                    <button className={styles.deleteQuestionBtn} onClick={() => onDelete(question.id)}>
                        🗑️ Удалить вопрос
                    </button>
                </div>
            )}
        </div>
    );
}

// Вспомогательная функция для получения подписи типа вопроса
function getQuestionTypeLabel(type: Question['type']): string {
    const labels: Record<Question['type'], string> = {
        single: 'Один ответ',
        multiple: 'Несколько ответов',
        matching: 'Сопоставить',
    };
    return labels[type];
}
