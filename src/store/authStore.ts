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

interface AuthState {
    isAuthenticated: boolean;
    user: { firstName: string; lastName: string; phone: string } | null;
    login: (userData: { firstName: string; lastName: string; phone: string }) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    user: null,
    login: (userData) => set({ isAuthenticated: true, user: userData }),
    logout: () => set({ isAuthenticated: false, user: null }),
}));
