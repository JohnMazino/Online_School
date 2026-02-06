import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import styles from './Auth.module.scss';

import Background from '../components/Background/Background';


export default function Login() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        // Простая валидация
        if (!phone || (phone !== 'admin' && phone.replace(/\D/g, '').length < 10)) {
            setError('Введите корректный номер телефона');
            return;
        }
        if (!password) {
            setError('Введите пароль');
            return;
        }

        setLoading(true);
        try {
            const data = await authApi.login(phone, password);
            login(data.user, data.token);

            if (data.user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('Неверный номер телефона или пароль');
        } finally {
            setLoading(false);
        }
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


                        <button type="submit" disabled={loading}>{loading ? 'Загрузка...' : 'Войти'}</button>
                    </form>

                    <p>
                        Нет аккаунта? <a href="/register">Зарегистрироваться</a>
                    </p>
                </div>
            </div>
        </>
    );
}
