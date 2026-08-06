import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import styles from './Auth.module.scss';
import Background from '../components/Background/Background';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!email) {
            setError('Введите email');
            return;
        }

        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка при отправке запроса');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Background />
            <div className={styles.authPage}>
                <div className={styles.authForm}>
                    <h1>Восстановление пароля</h1>
                    
                    {!success ? (
                        <>
                            <p className={styles.authDescription}>
                                Введите ваш email, и мы отправим ссылку для сброса пароля
                            </p>
                            <form onSubmit={handleSubmit}>
                                <label>
                                    Email
                                    <input
                                        type="email"
                                        placeholder="example@mail.ru"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </label>

                                {error && <p className={styles.error}>{error}</p>}

                                <button type="submit" disabled={loading}>
                                    {loading ? 'Отправка...' : 'Отправить ссылку'}
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
                            <h2>Письмо отправлено!</h2>
                            <p>
                                На вашу почту <strong>{email}</strong> отправлена ссылка для сброса пароля.
                                Перейдите по ней, чтобы установить новый пароль.
                            </p>
                            <button 
                                className={styles.backToLoginBtn}
                                onClick={() => navigate('/login')}
                            >
                                Вернуться ко входу
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