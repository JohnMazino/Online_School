// src/pages/Register.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './Auth.module.scss';

import Background from '../components/Background/Background';


export default function Register() {
    const [step, setStep] = useState<'data' | 'code'>('data');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);

    const handleDataSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !phone || !password) {
            setError('Заполните все поля');
            return;
        }
        if (phone.length < 10) {
            setError('Номер телефона должен содержать минимум 10 цифр');
            return;
        }

        // Имитация отправки SMS-кода
        console.log(`Отправка кода на номер: ${phone}`);
        alert(`Код отправлен на ${phone} (имитация: введите 1234)`);
        setError('');
        setStep('code');
    };

    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code !== '1234') {
            setError('Неверный код');
            return;
        }

        // Имитация успешной регистрации + автоматический вход
        console.log('Регистрация успешна:', { firstName, lastName, phone });
        login({ firstName, lastName, phone });
        alert('Регистрация и вход успешны!');
        navigate('/'); // редирект на главную
    };

    return (
        <>
            <Background />
            <div className={styles.authPage}>
                <div className={styles.authForm}>
                    <h1>Регистрация</h1>

                    {step === 'data' && (
                        <form onSubmit={handleDataSubmit}>
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

                            <button type="submit">Получить код по SMS</button>
                        </form>
                    )}

                    {step === 'code' && (
                        <form onSubmit={handleCodeSubmit}>
                            <h3>Подтверждение номера</h3>
                            <p>Код отправлен на {phone}</p>
                            <p className={styles.hint}>(Для теста введите: 1234)</p>

                            <label>
                                Код из SMS
                                <input
                                    type="text"
                                    placeholder="1234"
                                    maxLength={4}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                />
                            </label>

                            {error && <p className={styles.error}>{error}</p>}

                            <p className={styles.resend}>
                                Не пришёл код?{' '}
                                <button type="button" onClick={() => setStep('data')}>
                                    Отправить заново
                                </button>
                            </p>

                            <button type="submit">Завершить регистрацию</button>

                            <button
                                className={styles.backBtn}
                                type="button"
                                onClick={() => setStep('data')}
                            >
                                ← Назад
                            </button>
                        </form>
                    )}

                    <p>
                        Уже есть аккаунт? <a href="/login">Войти</a>
                    </p>
                </div>
            </div>
        </>
    );
}
