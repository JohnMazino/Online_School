import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import styles from './Auth.module.scss';
import Background from '../components/Background/Background';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validToken, setValidToken] = useState<boolean | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            setValidToken(false);
            setError('Отсутствует токен для сброса пароля');
            return;
        }

        const verifyToken = async () => {
            try {
                await authApi.verifyResetToken(token);
                setValidToken(true);
            } catch {
                setValidToken(false);
                setError('Недействительная или просроченная ссылка для сброса пароля');
            }
        };
        verifyToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        if (!token) {
            setError('Отсутствует токен для сброса пароля');
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка при сбросе пароля');
        } finally {
            setLoading(false);
        }
    };

    if (validToken === null) {
        return (
            <>
                <Background />
                <div className={styles.authPage}>
                    <div className={styles.authForm}>
                        <h1>Восстановление пароля</h1>
                        <p className={styles.authDescription}>Проверка ссылки...</p>
                    </div>
                </div>
            </>
        );
    }

    if (validToken === false) {
        return (
            <>
                <Background />
                <div className={styles.authPage}>
                    <div className={styles.authForm}>
                        <h1>Восстановление пароля</h1>
                        <div className={styles.errorMessage}>
                            <div className={styles.errorIcon}>
                                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="32" cy="32" r="32" fill="rgba(239, 68, 68, 0.1)"/>
                                    <path d="M20 20L44 44M44 20L20 44" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <h2>Ссылка недействительна</h2>
                            <p>{error}</p>
                            <button 
                                className={styles.backToLoginBtn}
                                onClick={() => navigate('/forgot-password')}
                            >
                                Запросить новую ссылку
                            </button>
                        </div>
                        <p className={styles.backToLogin}>
                            <Link to="/login">← Вернуться ко входу</Link>
                        </p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Background />
            <div className={styles.authPage}>
                <div className={styles.authForm}>
                    <h1>Создание нового пароля</h1>
                    
                    {!success ? (
                        <>
                            <p className={styles.authDescription}>
                                Придумайте новый пароль для вашей учетной записи
                            </p>
                            <form onSubmit={handleSubmit}>
                                <label>
                                    Новый пароль
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        minLength={6}
                                    />
                                </label>

                                <label>
                                    Подтвердите пароль
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </label>

                                {error && <p className={styles.error}>{error}</p>}

                                <button type="submit" disabled={loading}>
                                    {loading ? 'Сохранение...' : 'Сохранить пароль'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className={styles.successMessage}>
                            <div className={styles.successIcon}>
                                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="32" cy="32" r="32" fill="rgba(16, 185, 129, 0.1)"/>
                                    <path d="M20 32L28 40L44 24" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h2>Пароль успешно изменен!</h2>
                            <p>
                                Ваш пароль был успешно обновлен. Теперь вы можете войти в систему с новым паролем.
                            </p>
                            <button 
                                className={styles.backToLoginBtn}
                                onClick={() => navigate('/login')}
                            >
                                Войти
                            </button>
                        </div>
                    )}

                    <p className={styles.backToLogin}>
                        <Link to="/login">← Вернуться ко входу</Link>
                    </p>
                </div>
            </div>
        </>
    );
}