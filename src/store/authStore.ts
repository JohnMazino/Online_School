{/* Каталог store и файл authStore.ts (или authStore.js) — это стандартный способ организации глобального состояния в твоём React-приложении с использованием библиотеки Zustand.
Что это такое и зачем нужно
Zustand — это очень лёгкая альтернатива Redux или Context API.
Она позволяет хранить данные (например, информацию о том, залогинен ли пользователь, его имя, телефон и т.д.) в одном месте, доступном из любого компонента.
В твоём случае файл authStore.ts хранит состояние авторизации:

isAuthenticated — залогинен ли пользователь (true/false)
user — объект с данными пользователя (имя, фамилия, телефон)
login — функция для входа/регистрации
logout — функция для выхода */}

import { create } from 'zustand';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    role?: string;
    balance?: number;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    login: (userData: User, token: string) => void;
    logout: () => void;
    setToken: (token: string) => void;
    loadFromLocalStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
    return {
        isAuthenticated: false,
        user: null,
        token: null,
        login: (userData: User, token: string) => {
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(userData));
            set({ isAuthenticated: true, user: userData, token });
        },
        logout: () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            set({ isAuthenticated: false, user: null, token: null });
        },
        setToken: (token: string) => {
            localStorage.setItem('authToken', token);
            set({ token });
        },
        loadFromLocalStorage: () => {
            const token = localStorage.getItem('authToken');
            const userStr = localStorage.getItem('user');
            if (token && userStr) {
                const user = JSON.parse(userStr);
                set({ isAuthenticated: true, token, user });
            } else {
                set({ isAuthenticated: false, user: null, token: null });
            }
        },
    };
});
