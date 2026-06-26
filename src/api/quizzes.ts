import type { QuizTopic, QuizQuestion } from '../types/TestConstructor';

const API_URL = 'http://localhost:5000/api';

/**
 * API для работы с квизи (играми)
 */
export const quizzesApi = {
    // ===== ТЕМЫ =====

    /**
     * Создать тему квизи (для учителя)
     */
    createTopic: async (token: string, topic: Omit<QuizTopic, 'id' | 'createdAt'>): Promise<QuizTopic> => {
        const response = await fetch(`${API_URL}/quizzes/topics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(topic),
        });
        if (!response.ok) throw new Error('Failed to create topic');
        const data = await response.json();
        return data.topic;
    },

    /**
     * Получить все темы учителя
     */
    getTeacherTopics: async (token: string): Promise<QuizTopic[]> => {
        const response = await fetch(`${API_URL}/quizzes/topics`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch topics');
        const data = await response.json();
        return data.topics || [];
    },

    /**
     * Получить все темы (для ученика — список доступных)
     */
    getAllTopics: async (token: string): Promise<QuizTopic[]> => {
        const response = await fetch(`${API_URL}/quizzes/topics/all`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch topics');
        const data = await response.json();
        return data.topics || [];
    },

    /**
     * Обновить тему
     */
    updateTopic: async (token: string, topicId: number, topic: Partial<QuizTopic>): Promise<QuizTopic> => {
        const response = await fetch(`${API_URL}/quizzes/topics/${topicId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(topic),
        });
        if (!response.ok) throw new Error('Failed to update topic');
        const data = await response.json();
        return data.topic;
    },

    /**
     * Удалить тему
     */
    deleteTopic: async (token: string, topicId: number): Promise<boolean> => {
        const response = await fetch(`${API_URL}/quizzes/topics/${topicId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.ok;
    },

    // ===== ВОПРОСЫ =====

    /**
     * Создать вопрос в теме
     */
    createQuestion: async (token: string, question: Omit<QuizQuestion, 'id'>): Promise<QuizQuestion> => {
        const response = await fetch(`${API_URL}/quizzes/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(question),
        });
        if (!response.ok) throw new Error('Failed to create question');
        const data = await response.json();
        return data.question;
    },

    /**
     * Создать несколько вопросов сразу
     */
    createQuestions: async (token: string, questions: Omit<QuizQuestion, 'id'>[]): Promise<QuizQuestion[]> => {
        const response = await fetch(`${API_URL}/quizzes/questions/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ questions }),
        });
        if (!response.ok) throw new Error('Failed to create questions');
        const data = await response.json();
        return data.questions || [];
    },

    /**
     * Получить вопросы по теме
     */
    getQuestionsByTopic: async (token: string, topicId: number): Promise<QuizQuestion[]> => {
        const response = await fetch(`${API_URL}/quizzes/topics/${topicId}/questions`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch questions');
        const data = await response.json();
        return data.questions || [];
    },

    /**
     * Обновить вопрос
     */
    updateQuestion: async (token: string, questionId: number, question: Partial<QuizQuestion>): Promise<QuizQuestion> => {
        const response = await fetch(`${API_URL}/quizzes/questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(question),
        });
        if (!response.ok) throw new Error('Failed to update question');
        const data = await response.json();
        return data.question;
    },

    /**
     * Удалить вопрос
     */
    deleteQuestion: async (token: string, questionId: number): Promise<boolean> => {
        const response = await fetch(`${API_URL}/quizzes/questions/${questionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.ok;
    },
};