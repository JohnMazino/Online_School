import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import styles from './Auth.module.scss';

import Background from '../components/Background/Background';

export default function Register() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaSvg, setCaptchaSvg] = useState('');
    const [captchaId, setCaptchaId] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);
    const emailInputRef = useRef<HTMLInputElement>(null);

    const generateCaptcha = async () => {
        try {
            const captcha = await authApi.getCaptcha();
            setCaptchaSvg(captcha.data);
            setCaptchaId(captcha.id);
            setCaptchaInput('');
        } catch {
            setError('Не удалось загрузить капчу');
        }
    };

    useEffect(() => {
        void generateCaptcha();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!firstName || !lastName || !email || !password) {
            setError('Заполните все поля');
            return;
        }

        if (!captchaInput.trim() || !captchaId) {
            setError('Введите капчу');
            return;
        }

        setLoading(true);
        try {
            await authApi.verifyCaptcha(captchaInput, captchaId);
            await authApi.sendEmailCode(email);
            setShowCodeModal(true);
            setCode('');
            setModalError('');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ошибка';
            setError(message);
            void generateCaptcha();
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!code.trim()) {
            setModalError('Введите код из письма');
            return;
        }

        setModalLoading(true);
        setModalError('');

        try {
            const data = await authApi.registerWithEmail(
                firstName, lastName, email, password, code.trim()
            );
            login(data.user, data.token);
            if (data.user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ошибка регистрации';
            setModalError(message);
        } finally {
            setModalLoading(false);
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
                            Email
                            <input
                                ref={emailInputRef}
                                type="email"
                                placeholder="example@mail.ru"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
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

                        <label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                                <div
                                    onClick={generateCaptcha}
                                    style={{
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        overflow: 'hidden',
                                    }}
                                    dangerouslySetInnerHTML={{ __html: captchaSvg }}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Введите код с картинки"
                                value={captchaInput}
                                onChange={(e) => setCaptchaInput(e.target.value)}
                                required
                                style={{ marginTop: 8 }}
                                autoComplete="off"
                            />
                        </label>

                        {error && <p className={styles.error}>{error}</p>}

                        <button type="submit" disabled={loading}>
                            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
                        </button>
                    </form>

                    <p>
                        Уже есть аккаунт? <a href="/login">Войти</a>
                    </p>
                </div>
            </div>

            {showCodeModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2>Введите код подтверждения</h2>
                        <p style={{ marginBottom: 16 }}>
                            На вашу почту <strong>{email}</strong> выслан код. Введите его ниже.
                        </p>
                        <input
                            type="text"
                            placeholder="______"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            autoComplete="one-time-code"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '1.2rem',
                                textAlign: 'center',
                                letterSpacing: '2px',
                                border: '1px solid #ccc',
                                borderRadius: 6,
                                marginBottom: 12,
                            }}
                        />
                        {modalError && <p className={styles.error}>{modalError}</p>}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setShowCodeModal(false)}
                            >
                                Назад
                            </button>
                            <button
                                type="button"
                                onClick={handleVerifyCode}
                                disabled={modalLoading}
                            >
                                {modalLoading ? 'Проверка...' : 'Подтвердить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
