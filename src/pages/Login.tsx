import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './Auth.module.scss';

import Background from '../components/Background/Background';


export default function Login() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Простая валидация
        if (!phone || phone.length < 10) {
            setError('Введите корректный номер телефона');
            return;
        }
        if (!password) {
            setError('Введите пароль');
            return;
        }

        // Имитация успешного входа (в будущем — запрос к бэкенду)
        console.log('Вход выполнен:', { phone, password });

        // Здесь можно передать реальные данные пользователя из ответа сервера
        login({
            firstName: 'Иван',
            lastName: 'Петров',
            phone,
        });

        // Перенаправление на главную страницу
        navigate('/');
    };

    return (
        <>
            <Background />
            <div className={styles.authPage}>
                <div className={styles.authForm}>
                    <h1>Вход</h1>

                    <form onSubmit={handleSubmit}>
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

                        <button type="submit">Войти</button>
                    </form>

                    <p>
                        Нет аккаунта? <a href="/register">Зарегистрироваться</a>
                    </p>
                </div>
            </div>
        </>
    );
}
