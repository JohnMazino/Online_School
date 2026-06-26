import { useState, useEffect } from 'react';
import type { Test, StudentAnswer } from '../../types/TestConstructor';
import styles from './TestPlayer.module.scss';

interface TestPlayerProps {
    test: Test;
    onComplete: (answers: StudentAnswer[], timeTaken: number) => void;
    onCancel: () => void;
}

/**
 * КОМПОНЕНТ: Интерфейс прохождения теста для ученика
 * 
 * Функциональность:
 * - Отображение вопросов теста по одному
 * - Навигация между вопросами (предыдущий, следующий)
 * - Отслеживание выбранных ответов
 * - Таймер прохождения теста
 * - Индикатор прогресса
 * - Проверка перед отправкой (все ли вопросы решены)
 * - Отправка ответов и времени прохождения на сервер
 */
export default function TestPlayer({ test, onComplete, onCancel }: TestPlayerProps) {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState<StudentAnswer[]>([]);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Таймер
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const currentQuestion = test.questions[currentQuestionIdx];
    const totalQuestions = test.questions.length;
    const progress = ((currentQuestionIdx + 1) / totalQuestions) * 100;

    // Получить ответы ученика на текущий вопрос
    const getCurrentAnswer = (): StudentAnswer | undefined => {
        return answers.find(a => a.questionId === currentQuestion.id);
    };

    // Обновить ответ на текущий вопрос
    const handleAnswerChange = (optionIdx: number | number[]) => {
        const currentAnswer = getCurrentAnswer();
        let newSelectedAnswers: number[];

        if (currentQuestion.type === 'single') {
            // Для single - только один ответ
            newSelectedAnswers = [optionIdx as number];
        } else if (currentQuestion.type === 'matching') {
            // Для matching - массив пар (это обрабатывается в handleMatchingChange)
            newSelectedAnswers = Array.isArray(optionIdx) ? optionIdx : [optionIdx as number];
        } else {
            // Для multiple - можно несколько
            if (currentAnswer?.selectedAnswers.includes(optionIdx as number)) {
                newSelectedAnswers = currentAnswer.selectedAnswers.filter(idx => idx !== optionIdx);
            } else {
                newSelectedAnswers = [...(currentAnswer?.selectedAnswers || []), optionIdx as number];
            }
        }

        if (currentAnswer) {
            setAnswers(answers.map(a =>
                a.questionId === currentQuestion.id
                    ? { ...a, selectedAnswers: newSelectedAnswers }
                    : a
            ));
        } else {
            setAnswers([...answers, {
                questionId: currentQuestion.id,
                selectedAnswers: newSelectedAnswers,
            }]);
        }
    };

    // Обновить ответ для matching вопроса
    const handleMatchingChange = (pairId: number, rightItemIdx: number) => {
        const currentAnswer = getCurrentAnswer();
        // Формат: [pairId * 1000 + selectedRightIdx] для каждой пары
        let newSelectedAnswers = currentAnswer?.selectedAnswers || [];
        
        const existingIdx = newSelectedAnswers.findIndex(a => Math.floor(a / 1000) === pairId);
        if (existingIdx >= 0) {
            newSelectedAnswers[existingIdx] = pairId * 1000 + rightItemIdx;
        } else {
            newSelectedAnswers = [...newSelectedAnswers, pairId * 1000 + rightItemIdx];
        }

        if (currentAnswer) {
            setAnswers(answers.map(a =>
                a.questionId === currentQuestion.id
                    ? { ...a, selectedAnswers: newSelectedAnswers }
                    : a
            ));
        } else {
            setAnswers([...answers, {
                questionId: currentQuestion.id,
                selectedAnswers: newSelectedAnswers,
            }]);
        }
    };

    // Получить selected right item для matching pair
    const getMatchingSelection = (pairId: number): number | null => {
        const currentAnswer = getCurrentAnswer();
        const encoded = currentAnswer?.selectedAnswers.find(a => Math.floor(a / 1000) === pairId);
        return encoded ? encoded % 1000 : null;
    };

    // Переход к следующему вопросу
    const handleNext = () => {
        if (currentQuestionIdx < totalQuestions - 1) {
            setCurrentQuestionIdx(currentQuestionIdx + 1);
        }
    };

    // Переход к предыдущему вопросу
    const handlePrev = () => {
        if (currentQuestionIdx > 0) {
            setCurrentQuestionIdx(currentQuestionIdx - 1);
        }
    };

    // Завершение теста
    const handleSubmit = () => {
        // Проверка, что все вопросы решены
        const answeredCount = answers.length;
        if (answeredCount < totalQuestions) {
            const unansweredCount = totalQuestions - answeredCount;
            alert(`Осталось решить ${unansweredCount} вопросов`);
            return;
        }

        setIsSubmitting(true);
        // Имитация загрузки
        setTimeout(() => {
            onComplete(answers, timeElapsed);
        }, 500);
    };

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

    const currentAnswer = getCurrentAnswer();

    return (
        <div className={styles.testPlayer}>
            {/* Шапка с информацией */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1>{test.title}</h1>
                    <p className={styles.progress}>
                        Вопрос {currentQuestionIdx + 1} из {totalQuestions}
                    </p>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.timer}>
                        <span className={styles.timerLabel}>⏱️ Время:</span>
                        <span className={styles.timerValue}>{formatTime(timeElapsed)}</span>
                    </div>
                    <button className={styles.exitBtn} onClick={onCancel} title="Выйти из теста">
                        ✕
                    </button>
                </div>
            </div>

            {/* Полоса прогресса */}
            <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
            </div>

            {/* Основной контент */}
            <div className={styles.content}>
                {/* Вопрос */}
                <div className={styles.questionSection}>
                    <div className={styles.questionHeader}>
                        <span className={styles.questionLabel}>Вопрос {currentQuestionIdx + 1}</span>
                        <span className={styles.questionType}>
                            {currentQuestion.type === 'single' 
                                ? '📌 Выберите один ответ' 
                                : currentQuestion.type === 'multiple'
                                ? '☑️ Выберите несколько ответов'
                                : '🔗 Сопоставьте по парам'}
                        </span>
                        <span className={styles.points}>{currentQuestion.points} баллов</span>
                    </div>

                    <h2 className={styles.questionText}>{currentQuestion.text}</h2>

                    {/* Варианты ответов для single и multiple */}
                    {(currentQuestion.type === 'single' || currentQuestion.type === 'multiple') && (
                        <div className={styles.optionsContainer}>
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = currentAnswer?.selectedAnswers.includes(idx);

                                return (
                                    <label
                                        key={idx}
                                        className={`${styles.optionLabel} ${isSelected ? styles.selected : ''}`}
                                    >
                                        <input
                                            type={currentQuestion.type === 'single' ? 'radio' : 'checkbox'}
                                            name={`question-${currentQuestion.id}`}
                                            checked={isSelected || false}
                                            onChange={() => handleAnswerChange(idx)}
                                            className={styles.optionInput}
                                        />
                                        <span className={styles.optionText}>{option}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {/* Matching вопрос */}
                    {currentQuestion.type === 'matching' && currentQuestion.matchingPairs && (
                        <div className={styles.matchingContainer}>
                            {currentQuestion.matchingPairs.map((pair) => {
                                const selectedIdx = getMatchingSelection(pair.id);
                                const rightItems = currentQuestion.matchingPairs!.map(p => p.right);

                                return (
                                    <div key={pair.id} className={styles.matchingRow}>
                                        <div className={styles.matchingLeft}>{pair.left}</div>
                                        <div className={styles.matchingArrow}>→</div>
                                        <select
                                            className={styles.matchingSelect}
                                            value={selectedIdx ?? ''}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleMatchingChange(pair.id, parseInt(e.target.value));
                                                }
                                            }}
                                        >
                                            <option value="">Выберите...</option>
                                            {rightItems.map((item, idx) => (
                                                <option key={idx} value={idx}>
                                                    {item}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Кнопки навигации */}
            <div className={styles.footer}>
                <button
                    className={styles.prevBtn}
                    onClick={handlePrev}
                    disabled={currentQuestionIdx === 0}
                >
                    ← Предыдущий
                </button>

                {/* Индикатор: вопрос решен или нет */}
                <div className={styles.answerStatus}>
                    {currentAnswer ? (
                        <span className={styles.answered}>✓ Решен</span>
                    ) : (
                        <span className={styles.notAnswered}>✗ Не решен</span>
                    )}
                </div>

                {currentQuestionIdx === totalQuestions - 1 ? (
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting || answers.length < totalQuestions}
                    >
                        {isSubmitting ? 'Отправка...' : '✓ Завершить тест'}
                    </button>
                ) : (
                    <button
                        className={styles.nextBtn}
                        onClick={handleNext}
                    >
                        Следующий →
                    </button>
                )}
            </div>
        </div>
    );
}
