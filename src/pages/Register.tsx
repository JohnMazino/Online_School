// src/pages/Register.tsx
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
    const [emailCode, setEmailCode] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaSvg, setCaptchaSvg] = useState('');
    const [captchaId, setCaptchaId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailModalError, setEmailModalError] = useState('');
    const [emailModalLoading, setEmailModalLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);
    const emailRef = useRef<HTMLInputElement>(null);
    const codeInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        if (showEmailModal && codeInputRef.current) {
            setTimeout(() => {
                codeInputRef.current?.focus();
            }, 100);
        }
    }, [showEmailModal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!firstName || !lastName || !email || !password) {
            setError('Заполните все поля');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Введите корректный email');
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
            setShowEmailModal(true);
            setEmailModalError('');
            setEmailCode('');
            setResendCooldown(30);
            startCooldown();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ошибка';
            setError(message);
            void generateCaptcha();
        } finally {
            setLoading(false);
        }
    };

    const startCooldown = () => {
        const interval = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0) return;

        setResendCooldown(30);
        setEmailModalError('');
        setEmailCode('');
        startCooldown();

        try {
            await authApi.sendEmailCode(email);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ошибка при отправке кода';
            setEmailModalError(message);
        }
    };

    const handleVerifyEmailCode = async () => {
        if (!emailCode.trim()) {
            setEmailModalError('Введите код из письма');
            return;
        }

        setEmailModalLoading(true);
        setEmailModalError('');

        try {
            const data = await authApi.registerWithEmail(
                firstName, lastName, email, password, emailCode.trim()
            );
            login(data.user, data.token);
            if (data.user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            let message = err instanceof Error ? err.message : 'Ошибка регистрации';
            if (err instanceof Error && err.message.includes('уже зарегистрирован')) {
                message = 'Эта почта уже зарегистрирована';
            }
            setEmailModalError(message);
        } finally {
            setEmailModalLoading(false);
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
                                ref={emailRef}
                                type="email"
                                placeholder="example@mail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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

            {/* Модальное окно для email кода */}
            {showEmailModal && (
                <div className={styles.modalOverlay} onClick={() => setShowEmailModal(false)}>
                    <div className={styles.emailModal} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowEmailModal(false)}
                            aria-label="Закрыть"
                            type="button"
                        >
                            ×
                        </button>

                        <div className={styles.emailModalHeader}>
                            <div className={styles.emailModalIcon}>
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <circle cx="24" cy="24" r="24" fill="rgba(80, 134, 242, 0.1)"/>
                                    <path d="M24 14C18.48 14 14 18.48 14 24C14 29.52 18.48 34 24 34C29.52 34 34 29.52 34 24C34 18.48 29.52 14 24 14ZM26 30H22V26H26V30ZM26 24H22V18H26V24Z" fill="#5086f2"/>
                                </svg>
                            </div>
                            <h2 className={styles.emailModalTitle}>Подтверждение email</h2>
                            <p className={styles.emailModalSubtitle}>
                                Код подтверждения отправлен на {email}
                            </p>
                        </div>

                        <div className={styles.emailModalBody}>
                            <div className={styles.codeInput}>
                                <input
                                    ref={codeInputRef}
                                    type="text"
                                    maxLength={6}
                                    placeholder="Введите код из письма"
                                    value={emailCode}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setEmailCode(value);
                                        setEmailModalError('');
                                    }}
                                    autoComplete="one-time-code"
                                    className={styles.emailInput}
                                />
                            </div>

                            {emailModalError && (
                                <p className={styles.emailModalError}>{emailModalError}</p>
                            )}

                            <button
                                className={styles.emailSubmitBtn}
                                onClick={handleVerifyEmailCode}
                                disabled={emailModalLoading || !emailCode.trim()}
                                type="button"
                            >
                                {emailModalLoading ? 'Проверка...' : 'Подтвердить'}
                            </button>

                            <button
                                className={styles.emailResendBtn}
                                onClick={handleResendCode}
                                disabled={resendCooldown > 0}
                                type="button"
                            >
                                {resendCooldown > 0
                                    ? `Отправить повторно через ${resendCooldown}с`
                                    : 'Отправить код повторно'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}