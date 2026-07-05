import type { Test, Assignment, Student, TestResult } from '../types/TestConstructor';

const API_URL = 'http://localhost:5000/api';

/**
 * API для работы с тестами, заданиями и результатами
 */
export const testsApi = {
    // ===== СТУДЕНТЫ =====
    
    /**
     * Получить всех студентов (для репетитора)
     * В реальности может быть фильтр по группе или статусу
     */
    getStudents: async (token: string): Promise<Student[]> => {
        try {
            const response = await fetch(`${API_URL}/students`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error('Failed to fetch students');
            const data = await response.json();
            return data.students || [];
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    },

    /**
     * Получить студентов по поисковому запросу (имя/email/телефон)
     */
    searchStudents: async (token: string, query: string): Promise<Student[]> => {
        try {
            const params = new URLSearchParams({ q: query });
            const response = await fetch(`${API_URL}/students/search?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            return data.students || [];
        } catch (error) {
            console.error('Error searching students:', error);
            return [];
        }
    },

    // ===== ТЕСТЫ =====

    /**
     * Создать тест
     */
    createTest: async (token: string, test: Omit<Test, 'id' | 'createdAt'>): Promise<Test> => {
        try {
            const response = await fetch(`${API_URL}/tests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(test),
            });
            
            if (!response.ok) throw new Error('Failed to create test');
            const data = await response.json();
            return data.test;
        } catch (error) {
            console.error('Error creating test:', error);
            throw error;
        }
    },

    /**
     * Обновить тест
     */
    updateTest: async (token: string, testId: number, test: Omit<Test, 'id' | 'createdAt'>): Promise<Test> => {
        try {
            const response = await fetch(`${API_URL}/tests/${testId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(test),
            });
            
            if (!response.ok) throw new Error('Failed to update test');
            const data = await response.json();
            return data.test;
        } catch (error) {
            console.error('Error updating test:', error);
            throw error;
        }
    },

    /**
     * Получить все тесты репетитора
     */
    getTests: async (token: string, teacherId?: number): Promise<Test[]> => {
        try {
            const params = new URLSearchParams();
            if (teacherId) params.set('teacherId', String(teacherId));
            
            const response = await fetch(`${API_URL}/tests?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error('Failed to fetch tests');
            const data = await response.json();
            return data.tests || [];
        } catch (error) {
            console.error('Error fetching tests:', error);
            return [];
        }
    },

    /**
     * Получить один тест по ID
     */
    getTest: async (token: string, testId: number): Promise<Test | null> => {
        try {
            const response = await fetch(`${API_URL}/tests/${testId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error('Failed to fetch test');
            return response.json();
        } catch (error) {
            console.error('Error fetching test:', error);
            return null;
        }
    },

    /**
     * Удалить тест
     */
    deleteTest: async (token: string, testId: number): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/tests/${testId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            return response.ok;
        } catch (error) {
            console.error('Error deleting test:', error);
            return false;
        }
    },

    // ===== НАЗНАЧЕНИЯ ТЕСТОВ =====

    /**
     * Назначить тест студенту
     */
    assignTest: async (token: string, assignment: Omit<Assignment, 'id' | 'assignedAt' | 'status'>): Promise<Assignment> => {
        try {
            const response = await fetch(`${API_URL}/tests/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    testId: assignment.testId,
                    studentId: assignment.studentId,
                    dueDate: assignment.dueDate || null,
                }),
            });
            
            if (!response.ok) throw new Error('Failed to assign test');
            return response.json();
        } catch (error) {
            console.error('Error assigning test:', error);
            throw error;
        }
    },

    /**
     * Получить все назначения для учителя
     */
    getAssignments: async (token: string, teacherId?: number): Promise<Assignment[]> => {
        try {
            const params = new URLSearchParams();
            if (teacherId) params.set('teacherId', String(teacherId));
            
            const response = await fetch(`${API_URL}/tests/teacher/assignments-all?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error('Failed to fetch assignments');
            const data = await response.json();
            return data.assignments || [];
        } catch (error) {
            console.error('Error fetching assignments:', error);
            return [];
        }
    },

    /**
     * Получить назначенные тесты для студента
     */
    getStudentAssignments: async (token: string): Promise<any[]> => {
        try {
            const response = await fetch(`${API_URL}/tests/student/assignments`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error('Failed to fetch student assignments');
            const data = await response.json();
            return data.assignments || [];
        } catch (error) {
            console.error('Error fetching student assignments:', error);
            return [];
        }
    },

    /**
     * Отменить назначение теста
     */
    cancelAssignment: async (token: string, assignmentId: number): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/tests/assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            return response.ok;
        } catch (error) {
            console.error('Error canceling assignment:', error);
            return false;
        }
    },

    // ===== РЕЗУЛЬТАТЫ ТЕСТОВ =====

    /**
     * Отправить результаты теста
     */
    submitTestResult: async (token: string, result: Omit<TestResult, 'id' | 'completedAt' | 'score' | 'maxScore'>): Promise<TestResult> => {
        try {
            const response = await fetch(`${API_URL}/tests/results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    testId: result.testId,
                    answers: result.answers,
                    timeTaken: result.timeTaken,
                    // @ts-ignore - randomizedTest may be included for proper result display
                    randomizedTest: result.randomizedTest,
                }),
            });
            
            if (!response.ok) throw new Error('Failed to submit test result');
            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error submitting test result:', error);
            throw error;
        }
    },

    /**
     * Получить результаты теста (все студенты)
     */
    getTestResults: async (token: string, testId: number): Promise<TestResult[]> => {
        try {
            const response = await fetch(`${API_URL}/tests/${testId}/results`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error('Failed to fetch test results');
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Error fetching test results:', error);
            return [];
        }
    },

    /**
     * Получить результаты студента по одному тесту
     */
    getStudentTestResult: async (token: string, testId: number, studentId: number): Promise<TestResult | null> => {
        try {
            const response = await fetch(`${API_URL}/tests/${testId}/results/${studentId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) return null;
            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error fetching student test result:', error);
            return null;
        }
    },
};
