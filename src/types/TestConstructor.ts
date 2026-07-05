/**
 * Единое определение типов для конструктора тестов
 * Используется во всех компонентах конструктора
 */

// Пара для сопоставления (matching question)
export interface MatchingPair {
    id: number;
    left: string;   // левый элемент (предпосылка)
    right: string;  // правый элемент (вариант ответа)
}

// Вопрос в тесте
export interface Question {
    id: number;
    type: 'single' | 'multiple' | 'matching';
    text: string;
    options: string[];                    // для single/multiple
    correctAnswers: number[];             // для single/multiple (индексы правильных ответов)
    matchingPairs?: MatchingPair[];       // для matching (пары для сопоставления)
    points: number;
}

// Сам тест
export interface Test {
    id: number;
    title: string;
    description: string;
    questions: Question[];
    createdAt: string;
    updatedAt?: string;
    teacherId: number;
    timeLimit: number; // в минутах, 0 = без ограничения
}

// Назначение теста студенту
export interface Assignment {
    id: number;
    testId: number;
    teacherId: number;
    studentId: number;
    studentName: string;
    assignedAt: string;
    dueDate?: string;
    status: 'assigned' | 'in_progress' | 'completed';
}

// Ответ студента на вопрос
export interface StudentAnswer {
    questionId: number;
    selectedAnswers: number[];
}

// Результаты прохождения теста
export interface TestResult {
    id: number;
    testId: number;
    studentId: number;
    studentName: string;
    answers: StudentAnswer[];
    completedAt: string;
    timeTaken: number; // в секундах
    score: number;     // набранные баллы
    maxScore: number;  // максимум баллов
    randomizedTest?: Test; // оригинальный рандомизированный тест для отображения результатов
}

// Студент в системе
export interface Student {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
}

// Квизи (Игры)

// Тема квизи
export interface QuizTopic {
    id: number;
    name: string;
    description: string;
    teacherId: number;
    createdAt: string;
    gameType: 'quiz' | 'matching';
}

// Вопрос квизи
export interface QuizQuestion {
    id: number;
    topicId: number;
    text: string;
    options: string[];        // варианты ответов (минимум 2)
    correctIndex?: number;    // индекс правильного ответа для обычного квиза
    type?: 'single' | 'matching';
    matchingPairs?: Array<{
        id: number;
        left: string;
        right: string;
    }>;
}

// Ответ ученика на один вопрос квизи
export interface QuizAnswer {
    questionId: number;
    selectedIndex: number;
    isCorrect: boolean;
}

// Статистика прохождения квизи
export interface QuizStats {
    topicId: number;
    topicName: string;
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    answers: QuizAnswer[];
}
