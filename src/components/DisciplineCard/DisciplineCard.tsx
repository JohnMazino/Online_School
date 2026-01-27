import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './DisciplineCard.module.scss';

interface DisciplineCardProps {
    name: string;
    photoUrl: string;
    className?: string;
}

export default function DisciplineCard({ name, photoUrl, className = '' }: DisciplineCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPrep, setSelectedPrep] = useState<'oge' | 'ege' | 'general' | null>(null);
    const [selectedType, setSelectedType] = useState<'individual' | 'group' | null>(null);

    // Запрет скролла страницы при открытой модалке
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isModalOpen]);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedPrep(null);
        setSelectedType(null);
    };

    const handlePrepSelect = (prep: 'oge' | 'ege' | 'general') => {
        setSelectedPrep(prep);
        setSelectedType(null);
    };

    const handleTypeSelect = (type: 'individual' | 'group') => {
        setSelectedType(type);
    };

    return (
        <>
            <div className={`${styles.card} ${className}`} onClick={openModal}>
                <img src={photoUrl} alt={name} className={styles.photo} />
                <h3 className={styles.title}>{name}</h3>
            </div>

            {/* Модальное окно через портал (отдельный элемент в body) */}
            {isModalOpen && createPortal(
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeModal} onClick={closeModal}>×</button>

                        <h2 className={styles.modalTitle}>{name}</h2>

                        {/* Шаг 1: Выбор подготовки */}
                        {!selectedPrep && (
                            <div className={styles.step}>
                                <h3>Выберите вид подготовки</h3>
                                <div className={styles.buttonGroup}>
                                    <button onClick={() => handlePrepSelect('oge')}>ОГЭ</button>
                                    <button onClick={() => handlePrepSelect('ege')}>ЕГЭ</button>
                                    <button onClick={() => handlePrepSelect('general')}>Общая подготовка</button>
                                </div>
                            </div>
                        )}

                        {/* Шаг 2: Выбор вида занятий + стоимость/описание */}
                        {selectedPrep && (
                            <div className={styles.step}>
                                <h3>Выберите вид занятий</h3>
                                <div className={styles.buttonGroup}>
                                    <button onClick={() => handleTypeSelect('individual')}>
                                        Индивидуальные
                                    </button>
                                    <button onClick={() => handleTypeSelect('group')}>
                                        Групповые
                                    </button>
                                </div>
                                <button className={styles.backBtn} onClick={() => setSelectedPrep(null)}>
                                    ← Назад
                                </button>
                            </div>
                        )}

                        {/* Показ стоимости и описания сразу после выбора типа занятий */}
                        {selectedType === 'individual' && (
                            <div className={styles.step}>
                                <h3>Индивидуальные занятия</h3>
                                <p className={styles.price}>1200 ₽ / час</p>
                                <p className={styles.description}>
                                    Возможность выбора количества занятий в неделю, в какие дни и время.
                                </p>
                                <button className={styles.confirmBtn}>Выбрать</button>
                                <button className={styles.backBtn} onClick={() => setSelectedType(null)}>
                                    ← Назад
                                </button>
                            </div>
                        )}

                        {selectedType === 'group' && (
                            <div className={styles.step}>
                                <h3>Групповые занятия</h3>
                                <p className={styles.price}>3800 ₽ / месяц</p>
                                <p className={styles.description}>
                                    2 лекции в неделю, 3 среза знаний в неделю, 1 контрольная в месяц, 1 пробник за месяц.
                                </p>
                                <button className={styles.confirmBtn}>Выбрать</button>
                                <button className={styles.backBtn} onClick={() => setSelectedType(null)}>
                                    ← Назад
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body  // ← отдельный элемент в корне DOM
            )}
        </>
    );
}
