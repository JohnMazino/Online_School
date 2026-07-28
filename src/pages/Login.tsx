// src/pages/Login.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import styles from './Auth.module.scss';
import Background from '../components/Background/Background';

export default function Login() {
    const [phone, setPhone] = useState('+7 ');
    const [password, setPassword] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaSvg, setCaptchaSvg] = useState('');
    const [captchaId, setCaptchaId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);
    const phoneInputRef = useRef<HTMLInputElement>(null);

    // ===== Капча =====
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

    // ===== Телефон (маска) =====
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

        if (!phone || getDigits(phone).length < 10) {
            setError('Введите корректный номер телефона');
            return;
        }

        if (!password) {
            setError('Введите пароль');
            return;
        }

        if (!captchaInput.trim()) {
            setError('Введите капчу');
            return;
        }

        if (!captchaId) {
            setError('Капча не загружена');
            return;
        }

        setLoading(true);
        try {
            const cleanPhone = '7' + getDigits(phone);
            const data = await authApi.login(cleanPhone, password, captchaInput, captchaId);
            login(data.user, data.token);
            if (data.user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Неверный номер телефона или пароль');
            void generateCaptcha();
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
                                ref={phoneInputRef}
                                type="tel"
                                placeholder="+7 (XXX) XXX XX XX"
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

                        {/* Капча */}
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