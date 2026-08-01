import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import styles from './Auth.module.scss';
import Background from '../components/Background/Background';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Введите email и пароль');
            return;
        }

        setLoading(true);
        try {
            const data = await authApi.login(email, password);
            login(data.user, data.token);
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Неверный email или пароль');
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
                            Email
                            <input
                                type="email"
                                placeholder="example@mail.ru"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="username"
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
                                autoComplete="current-password"
                            />
                        </label>

                        {error && <p className={styles.error}>{error}</p>}

                        <button type="submit" disabled={loading}>
                            {loading ? 'Загрузка...' : 'Войти'}
                        </button>
                    </form>

                    <p>
                        Нет аккаунта? <a href="/register">Зарегистрироваться</a>
                    </p>
                </div>
            </div>
        </>
    );
}
