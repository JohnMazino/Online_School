import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import styles from './Settings.module.scss'; // Создайте отдельный файл стилей

interface Settings {
    platformName: string;
    logoUrl: string;
    primaryColor: string;
    minPasswordLength: number;
    enable2FA: boolean;
    minTopUpAmount: number;
    paymentGateway: 'tbank' | 'yandex' | 'none';
    emailNotifications: boolean;
    smsNotifications: boolean;
}

// Временные API функции для настроек
const settingsApi = {
    getSettings: async (token: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Дефолтные настройки
        const defaultSettings: Settings = {
            platformName: 'Платформа Знаний',
            logoUrl: '/logo.svg',
            primaryColor: '#5086f2',
            minPasswordLength: 8,
            enable2FA: false,
            minTopUpAmount: 500,
            paymentGateway: 'tbank',
            emailNotifications: true,
            smsNotifications: false,
        };

        // Попытка загрузить из localStorage (для демо)
        const saved = localStorage.getItem('platform_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return defaultSettings;
            }
        }

        return defaultSettings;
    },

    updateSettings: async (token: string, settings: Settings) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Update settings:', settings);
        // Сохраняем в localStorage для демо
        localStorage.setItem('platform_settings', JSON.stringify(settings));
        return settings;
    },

    resetSettings: async (token: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Reset settings');
        // Удаляем сохраненные настройки
        localStorage.removeItem('platform_settings');
        return settingsApi.getSettings(token);
    }
};

export default function Settings() {
    const { token } = useAuthStore();

    const [settings, setSettings] = useState<Settings>({
        platformName: 'Платформа Знаний',
        logoUrl: '/logo.svg',
        primaryColor: '#5086f2',
        minPasswordLength: 8,
        enable2FA: false,
        minTopUpAmount: 500,
        paymentGateway: 'tbank',
        emailNotifications: true,
        smsNotifications: false,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [changed, setChanged] = useState(false);

    // Загрузка текущих настроек
    const fetchSettings = useCallback(async () => {
        if (!token) {
            setError('Нет токена авторизации');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await settingsApi.getSettings(token);
            setSettings(data);
            setError('');
            setChanged(false);
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки настроек');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            setSettings(prev => ({
                ...prev,
                [name]: checkbox.checked
            }));
        } else if (name === 'minPasswordLength' || name === 'minTopUpAmount') {
            setSettings(prev => ({
                ...prev,
                [name]: Math.max(1, Number(value) || 1)
            }));
        } else {
            setSettings(prev => ({
                ...prev,
                [name]: value
            }));
        }

        setChanged(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!changed) {
            setError('Нет изменений для сохранения');
            return;
        }

        if (!confirm('Сохранить изменения настроек?')) return;

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            await settingsApi.updateSettings(token, settings);
            setSuccess('Настройки успешно сохранены!');
            setChanged(false);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.message || 'Ошибка сохранения настроек');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Сбросить все настройки к значениям по умолчанию?')) return;

        setSaving(true);
        try {
            const defaultSettings = await settingsApi.resetSettings(token);
            setSettings(defaultSettings);
            setSuccess('Настройки сброшены к дефолтным значениям');
            setChanged(false);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.message || 'Ошибка сброса настроек');
        } finally {
            setSaving(false);
        }
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setSettings(prev => ({
            ...prev,
            primaryColor: value
        }));
        setChanged(true);
    };

    if (loading) return <div className={styles.loading}>Загрузка настроек...</div>;

    return (
        <div className={styles.settingsSection}>
            <div className={styles.headerRow}>
                <h1>Настройки платформы</h1>
                {changed && (
                    <span className={styles.changedIndicator}>
                        ⚠️ Есть несохраненные изменения
                    </span>
                )}
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <form onSubmit={handleSubmit}>
                {/* Настройки авторизации */}
                <div className={styles.settingsGroup}>
                    <div className={styles.groupHeader}>
                        <h2>🔐 Безопасность и авторизация</h2>
                        <div className={styles.groupBadge}>Важно</div>
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>
                                Минимальная длина пароля
                                <div className={styles.inputWithInfo}>
                                    <input
                                        type="number"
                                        name="minPasswordLength"
                                        value={settings.minPasswordLength}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        min="6"
                                        max="20"
                                    />
                                    <span className={styles.inputInfo}>символов</span>
                                </div>
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxGroup}>
                                <div className={styles.checkboxContainer}>
                                    <input
                                        type="checkbox"
                                        name="enable2FA"
                                        checked={settings.enable2FA}
                                        onChange={handleInputChange}
                                        className={styles.checkbox}
                                    />
                                    <div className={styles.checkboxVisual}>
                                        <div className={styles.checkboxInner} />
                                    </div>
                                </div>
                                <div className={styles.checkboxContent}>
                                    <div className={styles.checkboxTitle}>Двухфакторная аутентификация</div>
                                    <div className={styles.checkboxDescription}>
                                        Требовать подтверждение по SMS или email при входе
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Настройки оплаты */}
                <div className={styles.settingsGroup}>
                    <div className={styles.groupHeader}>
                        <h2>💰 Оплата и баланс</h2>
                        <div className={styles.groupBadge}>Финансы</div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>
                                Минимальная сумма пополнения
                                <div className={styles.inputWithInfo}>
                                    <input
                                        type="number"
                                        name="minTopUpAmount"
                                        value={settings.minTopUpAmount}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        min="100"
                                        step="50"
                                    />
                                    <span className={styles.inputInfo}>₽</span>
                                </div>
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>
                                Платёжный шлюз
                                <select
                                    name="paymentGateway"
                                    value={settings.paymentGateway}
                                    onChange={handleInputChange}
                                    className={styles.formSelect}
                                >
                                    <option value="tbank">Т-Банк</option>
                                    <option value="yandex">Яндекс.Касса</option>
                                    <option value="none">Отключено</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Уведомления */}
                <div className={styles.settingsGroup}>
                    <div className={styles.groupHeader}>
                        <h2>📢 Уведомления</h2>
                        <div className={styles.groupBadge}>Связь</div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxGroup}>
                                <div className={styles.checkboxContainer}>
                                    <input
                                        type="checkbox"
                                        name="emailNotifications"
                                        checked={settings.emailNotifications}
                                        onChange={handleInputChange}
                                        className={styles.checkbox}
                                    />
                                    <div className={styles.checkboxVisual}>
                                        <div className={styles.checkboxInner} />
                                    </div>
                                </div>
                                <div className={styles.checkboxContent}>
                                    <div className={styles.checkboxTitle}>Email-уведомления</div>
                                    <div className={styles.checkboxDescription}>
                                        Отправлять уведомления на почту пользователей
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxGroup}>
                                <div className={styles.checkboxContainer}>
                                    <input
                                        type="checkbox"
                                        name="smsNotifications"
                                        checked={settings.smsNotifications}
                                        onChange={handleInputChange}
                                        className={styles.checkbox}
                                    />
                                    <div className={styles.checkboxVisual}>
                                        <div className={styles.checkboxInner} />
                                    </div>
                                </div>
                                <div className={styles.checkboxContent}>
                                    <div className={styles.checkboxTitle}>SMS-уведомления</div>
                                    <div className={styles.checkboxDescription}>
                                        Отправлять SMS на номер телефона
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Кнопки */}
                <div className={styles.settingsActions}>
                    <div className={styles.actionButtons}>
                        <button
                            type="submit"
                            className={styles.saveBtn}
                            disabled={saving || !changed}
                        >
                            {saving ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Сохранение...
                                </>
                            ) : (
                                '💾 Сохранить настройки'
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            className={styles.resetBtn}
                            disabled={saving}
                        >
                            🔄 Сбросить к дефолтным
                        </button>
                    </div>

                    {!changed && (
                        <div className={styles.noChanges}>
                            ✅ Все изменения сохранены
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
