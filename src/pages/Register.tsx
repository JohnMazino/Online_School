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
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);
    const phoneInputRef = useRef<HTMLInputElement>(null);

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
        
        // Если стёрли пробел/скобку — удаляем предыдущую цифру
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

        // Восстанавливаем позицию курсора
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
                pos = 3; // после "+7 "
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
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ошибка';
            setError(message);
            void generateCaptcha();
        } finally {
            setLoading(false);
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

            {showSmsModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2>Введите код подтверждения</h2>
                        <p style={{ marginBottom: 16 }}>
                            На ваш номер <strong>{phone}</strong> выслан код. Введите его ниже.
                        </p>
                        <input
                            type="text"
                            placeholder="______"
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value)}
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
                        {smsModalError && <p className={styles.error}>{smsModalError}</p>}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setShowSmsModal(false)}
                                style={{ flex: 1 }}
                            >
                                Назад
                            </button>
                            <button
                                type="button"
                                onClick={handleVerifySmsCode}
                                disabled={smsModalLoading}
                                style={{ flex: 1 }}
                            >
                                {smsModalLoading ? 'Проверка...' : 'Подтвердить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
