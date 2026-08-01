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
    const [phone, setPhone] = useState('+7 ');
    const [password, setPassword] = useState('');
    const [smsCode, setSmsCode] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaSvg, setCaptchaSvg] = useState('');
    const [captchaId, setCaptchaId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSmsModal, setShowSmsModal] = useState(false);
    const [smsModalError, setSmsModalError] = useState('');
    const [smsModalLoading, setSmsModalLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const smsInputRef = useRef<HTMLInputElement>(null);

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
        if (showSmsModal && smsInputRef.current) {
            setTimeout(() => {
                smsInputRef.current?.focus();
            }, 100);
        }
    }, [showSmsModal]);

    const formatPhone = (digits: string): string => {
        const d = digits.slice(0, 10);
        let result = '+7';

        if (d.length > 0) result += ` (${d.slice(0, 3)}`;
        if (d.length >= 3) result += `) ${d.slice(3, 6)}`;
        if (d.length >= 6) result += ` ${d.slice(6, 8)}`;
        if (d.length >= 8) result += ` ${d.slice(8, 10)}`;

        return result;
    };

    const getDigits = (value: string): string => {
        let digits = value.replace(/\D/g, '');
        if (digits.startsWith('7') || digits.startsWith('8')) {
            digits = digits.slice(1);
        }
        return digits.slice(0, 10);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const newValue = input.value;
        const cursor = input.selectionStart ?? 0;

        const oldDigits = getDigits(phone);
        let newDigits = getDigits(newValue);
        
        if (newValue.length < phone.length && newDigits.length === oldDigits.length) {
            const digitsBeforeCursor = phone
                .slice(0, cursor + (phone.length - newValue.length))
                .replace(/\D/g, '')
                .length;

            const removeIndex = Math.max(0, digitsBeforeCursor - 1);
            newDigits =
                oldDigits.slice(0, removeIndex) + oldDigits.slice(removeIndex + 1);
        }

        const formatted = formatPhone(newDigits);
        setPhone(formatted);

        requestAnimationFrame(() => {
            if (!phoneInputRef.current) return;

            const digitsBefore = newValue
                .slice(0, cursor)
                .replace(/\D/g, '')
                .length;

            let pos = 0;
            let counted = 0;

            for (let i = 0; i < formatted.length; i++) {
                if (/\d/.test(formatted[i])) {
                    counted++;
                }
                pos = i + 1;
                if (counted >= digitsBefore) break;
            }

            if (digitsBefore === 0) {
                pos = 3;
            }

            phoneInputRef.current.setSelectionRange(pos, pos);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!firstName || !lastName || !phone || !password) {
            setError('Заполните все поля');
            return;
        }

        if (getDigits(phone).length < 10) {
            setError('Номер телефона должен содержать минимум 10 цифр');
            return;
        }

        if (!captchaInput.trim() || !captchaId) {
            setError('Введите капчу');
            return;
        }

        setLoading(true);
        try {
            await authApi.verifyCaptcha(captchaInput, captchaId);
            const cleanPhone = '7' + getDigits(phone);
            await authApi.sendSmsCode(cleanPhone);
            setShowSmsModal(true);
            setSmsModalError('');
            setSmsCode('');
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
        
        try {
            const cleanPhone = '7' + getDigits(phone);
            await authApi.sendSmsCode(cleanPhone);
            setSmsModalError('');
            setSmsCode('');
            setResendCooldown(30);
            startCooldown();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ошибка при отправке кода';
            setSmsModalError(message);
        }
    };

    const handleVerifySmsCode = async () => {
        if (!smsCode.trim()) {
            setSmsModalError('Введите код из SMS');
            return;
        }

        setSmsModalLoading(true);
        setSmsModalError('');

        try {
            const cleanPhone = '7' + getDigits(phone);
            const data = await authApi.registerWithSms(
                firstName, lastName, cleanPhone, password, smsCode.trim()
            );
            login(data.user, data.token);
            if (data.user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ошибка регистрации';
            setSmsModalError(message);
        } finally {
            setSmsModalLoading(false);
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
                                ref={phoneInputRef}
                                type="tel"
                                value={phone}
                                onChange={handlePhoneChange}
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

            {/* SMS Модальное окно */}
            {showSmsModal && (
                <div className={styles.modalOverlay} onClick={() => setShowSmsModal(false)}>
                    <div className={styles.smsModal} onClick={(e) => e.stopPropagation()}>
                        {/* Кнопка закрытия (крестик) */}
                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowSmsModal(false)}
                            aria-label="Закрыть"
                            type="button"
                        >
                            ×
                        </button>

                        <div className={styles.smsModalHeader}>
                            <div className={styles.smsModalIcon}>
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <circle cx="24" cy="24" r="24" fill="rgba(80, 134, 242, 0.1)"/>
                                    <path d="M24 14C18.48 14 14 18.48 14 24C14 29.52 18.48 34 24 34C29.52 34 34 29.52 34 24C34 18.48 29.52 14 24 14ZM26 30H22V26H26V30ZM26 24H22V18H26V24Z" fill="#5086f2"/>
                                </svg>
                            </div>
                            <h2 className={styles.smsModalTitle}>Проверка безопасности</h2>
                            <p className={styles.smsModalSubtitle}>
                                Код подтверждения отправлен на ваш номер
                            </p>
                        </div>

                        <div className={styles.smsModalBody}>
                            <div className={styles.smsCodeInput}>
                                <input
                                    ref={smsInputRef}
                                    type="text"
                                    maxLength={6}
                                    placeholder="Введите код из SMS"
                                    value={smsCode}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setSmsCode(value);
                                        setSmsModalError('');
                                    }}
                                    autoComplete="one-time-code"
                                    className={styles.smsInput}
                                />
                            </div>

                            {smsModalError && (
                                <p className={styles.smsModalError}>{smsModalError}</p>
                            )}

                            <button
                                className={styles.smsSubmitBtn}
                                onClick={handleVerifySmsCode}
                                disabled={smsModalLoading || !smsCode.trim()}
                                type="button"
                            >
                                {smsModalLoading ? 'Проверка...' : 'Подтвердить'}
                            </button>

                            <button
                                className={styles.smsResendBtn}
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