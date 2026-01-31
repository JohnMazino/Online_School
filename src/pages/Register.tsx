// src/pages/Register.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

import { authApi } from '../api/auth';
import styles from './Auth.module.scss';

import Background from '../components/Background/Background';


export default function Register() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!firstName || !lastName || !phone || !password) {
            setError('Заполните все поля');
            return;
        }
        if (phone.length < 10) {
            setError('Номер телефона должен содержать минимум 10 цифр');
            return;
        }

        setLoading(true);
        try {
            const data = await authApi.register(firstName, lastName, phone, password);
            login(data.user, data.token);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Background />
            <div className={styles.authPage}>
                <div className={styles.authForm}>
                    <h1>Регистрация</h1>
                    <form onSubmit={handleSubmit}>
                        <label>
                            Имя
                            <input
                                type="text"
                                placeholder="Иван"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            Фамилия
                            <input
                                type="text"
                                placeholder="Петров"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            Номер телефона
                            <input
                                type="tel"
                                placeholder="+7 (XXX) XXX-XX-XX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            Пароль
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </label>

                        {error && <p className={styles.error}>{error}</p>}

                        <button type="submit" disabled={loading}>{loading ? 'Загрузка...' : 'Зарегистрироваться'}</button>
                    </form>

                    <p>
                        Уже есть аккаунт? <a href="/login">Войти</a>
                    </p>
                </div>
            </div>
        </>
    );
}
