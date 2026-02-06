import { useState, useEffect } from 'react';
import styles from './TestConstructor.module.scss';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { testsApi } from '../../api/tests';

interface Test {
    id?: number;
    title: string;
    subject: string;
    grade?: '9' | '11';
    exam_type?: 'oge' | 'ege';
    description?: string;
    sections: Section[];
    total_questions?: number;
    total_points?: number;
    estimated_time?: number;
    created_by?: number;
}

interface Section {
    id: string;
    title: string;
    description?: string;
    max_points?: number;
    time_limit?: number;
    questions: Question[];
}

interface Question {
    id: string;
    type: 'single' | 'multiple' | 'open' | 'match' | 'order' | 'file';
    text: string;
    image?: string;
    points: number;
    time?: number;
    variants?: Variant[];
    matches?: MatchItem[];
    orderItems?: OrderItem[];
    correctAnswer?: string | string[] | number[] | Record<string, string> | string[];
    explanation?: string;
    fileTypes?: string[];
    maxFileSize?: number;
}

interface Variant {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface MatchItem {
    id: string;
    left: string;
    right: string;
}

interface OrderItem {
    id: string;
    text: string;
    correctPosition: number;
}


export default function TestConstructor() {
    const [test, setTest] = useState<Test>({
        title: 'Новый тест',
        subject: '',
        sections: [
            { id: 's1', title: 'Раздел 1', questions: [] }
        ],
    });

    const [activeSectionId, setActiveSectionId] = useState('s1');
    const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [showQuestionTypeModal, setShowQuestionTypeModal] = useState(false); // Добавил состояние для модалки

    // Автосохранение
    useEffect(() => {
        if (autoSaveStatus === 'unsaved') {
            setAutoSaveStatus('saving');

            const timeoutId = setTimeout(() => {
                console.log('Автосохранение теста:', test);
                setAutoSaveStatus('saved');
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [test, autoSaveStatus]);

    // Обновляем сводную статистику
    useEffect(() => {
        const totalQuestions = test.sections.reduce((sum, section) => sum + section.questions.length, 0);
        const totalPoints = test.sections.reduce((sum, section) =>
            sum + section.questions.reduce((qSum, q) => qSum + q.points, 0), 0);

        setTest(prev => ({
            ...prev,
            total_questions: totalQuestions,
            total_points: totalPoints,
        }));
    }, [test.sections]);

    const handleTestChange = (updates: Partial<Test>) => {
        setTest(prev => ({ ...prev, ...updates }));
        setAutoSaveStatus('unsaved');
    };

    const handleSectionChange = (sectionId: string, updates: Partial<Section>) => {
        setTest(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
                s.id === sectionId ? { ...s, ...updates } : s
            ),
        }));
        setAutoSaveStatus('unsaved');
    };

    const token = useAuthStore((s:any)=>s.token);
    const currentUser = useAuthStore((s:any)=>s.user);

    const saveTest = async () => {
        setAutoSaveStatus('saving');
        try {
            const payload = { ...test };
            payload.sections = test.sections.map((s) => ({
                title: s.title,
                description: s.description,
                max_points: s.max_points,
                time_limit: s.time_limit,
                questions: s.questions.map((q) => ({
                    type: q.type,
                    text: q.text,
                    points: q.points,
                    time: q.time,
                    variants: q.variants,
                    matches: q.matches,
                    orderItems: q.orderItems,
                    fileTypes: q.fileTypes,
                    explanation: q.explanation,
                    correctAnswer: q.correctAnswer,
                })),
            }));

            const res = await testsApi.createTest(token, { ...payload, created_by: currentUser?.id });
            // set test id so we can assign immediately
            setTest(prev => ({ ...prev, id: res.test_id }));

            setAutoSaveStatus('saved');
            alert('Тест успешно сохранён (ID: ' + res.test_id + ')');
            return res;
        } catch (error:any) {
            setAutoSaveStatus('unsaved');
            alert('Ошибка при сохранении теста: ' + (error.message||error));
            throw error;
        }
    };

    const addSection = () => {
        const newSection = {
            id: `s${Date.now()}`,
            title: `Раздел ${test.sections.length + 1}`,
            questions: [],
        };
        setTest(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
        setActiveSectionId(newSection.id);
        setActiveQuestionId(null);
        setAutoSaveStatus('unsaved');
    };

    const addQuestion = (type: Question['type'] = 'single') => {
        const newQuestion: Question = {
            id: `q${Date.now()}`,
            type: type,
            text: 'Новый вопрос',
            points: 1,
        };

        // Инициализация данных в зависимости от типа вопроса
        switch (type) {
            case 'single':
            case 'multiple':
                newQuestion.variants = [
                    { id: 'v1', text: 'Вариант 1', isCorrect: type === 'single' },
                    { id: 'v2', text: 'Вариант 2', isCorrect: false },
                    { id: 'v3', text: 'Вариант 3', isCorrect: false },
                    { id: 'v4', text: 'Вариант 4', isCorrect: false },
                ];
                break;
            case 'match':
                newQuestion.matches = [
                    { id: 'm1', left: 'Элемент A', right: 'Соответствие 1' },
                    { id: 'm2', left: 'Элемент B', right: 'Соответствие 2' },
                    { id: 'm3', left: 'Элемент C', right: 'Соответствие 3' },
                ];
                break;
            case 'order':
                newQuestion.orderItems = [
                    { id: 'o1', text: 'Первый шаг', correctPosition: 1 },
                    { id: 'o2', text: 'Второй шаг', correctPosition: 2 },
                    { id: 'o3', text: 'Третий шаг', correctPosition: 3 },
                ];
                break;
            case 'file':
                newQuestion.fileTypes = ['.pdf', '.doc', '.docx', '.txt'];
                newQuestion.maxFileSize = 5; // MB
                break;
        }

        setTest(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
                s.id === activeSectionId
                    ? { ...s, questions: [...s.questions, newQuestion] }
                    : s
            ),
        }));

        setActiveQuestionId(newQuestion.id);
        setAutoSaveStatus('unsaved');
    };

    const updateQuestion = (updates: Partial<Question>) => {
        setTest(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
                s.id === activeSectionId
                    ? {
                        ...s,
                        questions: s.questions.map(q =>
                            q.id === activeQuestionId ? { ...q, ...updates } : q
                        ),
                    }
                    : s
            ),
        }));
        setAutoSaveStatus('unsaved');
    };

    const deleteQuestion = (questionId: string) => {
        if (!confirm('Удалить вопрос?')) return;
        setTest(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
                s.id === activeSectionId
                    ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
                    : s
            ),
        }));
        setActiveQuestionId(null);
        setAutoSaveStatus('unsaved');
    };

    const deleteSection = (sectionId: string) => {
        if (test.sections.length <= 1) {
            alert('Тест должен содержать хотя бы один раздел');
            return;
        }
        if (!confirm('Удалить раздел и все вопросы в нём?')) return;

        setTest(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== sectionId),
        }));

        if (activeSectionId === sectionId) {
            setActiveSectionId(test.sections[0].id);
        }
        setAutoSaveStatus('unsaved');
    };

    // Вспомогательные функции для работы с типами вопросов
    const addMatchItem = () => {
        if (!currentQuestion) return;
        const newId = `m${Date.now()}`;
        const newMatches = [
            ...(currentQuestion.matches || []),
            { id: newId, left: 'Новый элемент', right: 'Новое соответствие' }
        ];
        updateQuestion({ matches: newMatches });
    };

    const updateMatchItem = (index: number, field: 'left' | 'right', value: string) => {
        if (!currentQuestion?.matches) return;
        const newMatches = [...currentQuestion.matches];
        newMatches[index] = { ...newMatches[index], [field]: value };
        updateQuestion({ matches: newMatches });
    };

    const removeMatchItem = (index: number) => {
        if (!currentQuestion?.matches) return;
        if (currentQuestion.matches.length <= 2) {
            alert('Должно быть минимум 2 элемента для сопоставления');
            return;
        }
        const newMatches = currentQuestion.matches.filter((_, i) => i !== index);
        updateQuestion({ matches: newMatches });
    };

    const addOrderItem = () => {
        if (!currentQuestion) return;
        const newId = `o${Date.now()}`;
        const newOrderItems = [
            ...(currentQuestion.orderItems || []),
            { id: newId, text: 'Новый элемент', correctPosition: (currentQuestion.orderItems?.length || 0) + 1 }
        ];
        updateQuestion({ orderItems: newOrderItems });
    };

    const updateOrderItem = (index: number, field: 'text', value: string) => {
        if (!currentQuestion?.orderItems) return;
        const newOrderItems = [...currentQuestion.orderItems];
        newOrderItems[index] = { ...newOrderItems[index], [field]: value };
        updateQuestion({ orderItems: newOrderItems });
    };

    const updateOrderPosition = (index: number, newPosition: number) => {
        if (!currentQuestion?.orderItems) return;
        const newOrderItems = [...currentQuestion.orderItems];
        // Обновляем позицию текущего элемента
        newOrderItems[index] = { ...newOrderItems[index], correctPosition: newPosition };

        // Обновляем позиции других элементов если нужно
        const maxPosition = newOrderItems.length;
        if (newPosition > maxPosition) {
            newPosition = maxPosition;
            newOrderItems[index].correctPosition = maxPosition;
        }

        // Сортируем по позициям
        newOrderItems.sort((a, b) => a.correctPosition - b.correctPosition);

        // Перенумеруем позиции чтобы не было пропусков
        newOrderItems.forEach((item, idx) => {
            item.correctPosition = idx + 1;
        });

        updateQuestion({ orderItems: newOrderItems });
    };

    const removeOrderItem = (index: number) => {
        if (!currentQuestion?.orderItems) return;
        if (currentQuestion.orderItems.length <= 2) {
            alert('Должно быть минимум 2 элемента для упорядочивания');
            return;
        }
        const newOrderItems = currentQuestion.orderItems.filter((_, i) => i !== index);
        // Перенумеруем позиции
        newOrderItems.forEach((item, idx) => {
            item.correctPosition = idx + 1;
        });
        updateQuestion({ orderItems: newOrderItems });
    };

    const currentSection = test.sections.find(s => s.id === activeSectionId);
    const currentQuestion = currentSection?.questions.find(q => q.id === activeQuestionId);

    // Модальное окно выбора типа вопроса
    const QuestionTypeModal = () => (
        <div className={styles.modalOverlay} onClick={() => setShowQuestionTypeModal(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Выберите тип вопроса</h3>
                    <button
                        className={styles.closeModalBtn}
                        onClick={() => setShowQuestionTypeModal(false)}
                    >
                        ✕
                    </button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.typeGrid}>
                        <button onClick={() => addQuestion('single')} className={styles.typeCard}>
                            <div className={styles.typeIcon}>○</div>
                            <h5>Одиночный выбор</h5>
                            <p>Один правильный вариант</p>
                        </button>
                        <button onClick={() => addQuestion('multiple')} className={styles.typeCard}>
                            <div className={styles.typeIcon}>□</div>
                            <h5>Множественный выбор</h5>
                            <p>Несколько правильных вариантов</p>
                        </button>
                        <button onClick={() => addQuestion('open')} className={styles.typeCard}>
                            <div className={styles.typeIcon}>📝</div>
                            <h5>Открытый ответ</h5>
                            <p>Текстовый ответ</p>
                        </button>
                        <button onClick={() => addQuestion('match')} className={styles.typeCard}>
                            <div className={styles.typeIcon}>🔗</div>
                            <h5>Сопоставление</h5>
                            <p>Установить соответствие</p>
                        </button>
                        <button onClick={() => addQuestion('order')} className={styles.typeCard}>
                            <div className={styles.typeIcon}>🔢</div>
                            <h5>Последовательность</h5>
                            <p>Расположить в правильном порядке</p>
                        </button>
                        <button onClick={() => addQuestion('file')} className={styles.typeCard}>
                            <div className={styles.typeIcon}>📎</div>
                            <h5>Загрузка файла</h5>
                            <p>Ответ в виде файла</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Модалка назначения теста пользователям
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [assignDueDate, setAssignDueDate] = useState<string>('');

    const [userSearch, setUserSearch] = useState('');
    const [fallbackUserId, setFallbackUserId] = useState<number | ''>('');

    const [assignLoading, setAssignLoading] = useState(false);

    const openAssignModal = async () => {
        console.log('openAssignModal called');
        setAssignLoading(true);
        setShowAssignModal(true);

        if (!test.id) {
            // если тест ещё не сохранён, сохраним
            try {
                console.log('saving test before assign...');
                await saveTest();
                console.log('test saved, id=', test.id);
            } catch (e) {
                alert('Не удалось сохранить тест. Назначение остановлено.');
                setAssignLoading(false);
                setShowAssignModal(false);
                return;
            }
        }

        try {
            const usersRes = await authApi.getAllUsers(token, '', 1, 200);
            const users = usersRes.users || usersRes;
            setAvailableUsers(users);
            console.log('loaded users:', users.length);
        } catch (e:any) {
            console.error('Failed to load users', e);
            // Преференция: продолжим, но покажем поиск по id/телефону
            setAvailableUsers([]);
        } finally {
            setAssignLoading(false);
        }
    };

    const toggleSelectUser = (id:number) => {
        setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
    };

    const searchUsers = async () => {
        try {
            const usersRes = await authApi.getAllUsers(token, userSearch, 1, 50);
            const users = usersRes.users || usersRes;
            setAvailableUsers(users);
        } catch (e) {
            console.warn('Search failed', e);
            alert('Поиск пользователей недоступен (нет прав)');
        }
    };

    const confirmAssign = async () => {
        if (!test.id) { alert('Нет id теста'); return; }
        const toAssign = [...selectedUserIds];
        if (fallbackUserId) toAssign.push(Number(fallbackUserId));
        if (toAssign.length === 0) { alert('Выберите пользователей или введите ID/телефон'); return; }

        try {
            await testsApi.assignBatch(token, { test_id: test.id, assigned_to: toAssign, assigned_by: currentUser?.id, due_date: assignDueDate || null });
            alert('Тест успешно назначен');
            setShowAssignModal(false);
            setSelectedUserIds([]);
            setAssignDueDate('');
            setFallbackUserId('');
            setUserSearch('');
        } catch (e:any) {
            alert('Ошибка назначения: ' + (e.message||e));
        }
    };

    const AssignModal = () => (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)} style={{zIndex:9999}}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{maxWidth:800}}>
                <div className={styles.modalHeader}>
                    <h3>Назначить тест пользователям</h3>
                    <button className={styles.closeModalBtn} onClick={() => setShowAssignModal(false)}>✕</button>
                </div>
                <div className={styles.modalBody}>
                    {assignLoading ? (
                        <div style={{padding:'1rem'}}>Сохранение теста и загрузка пользователей…</div>
                    ) : (
                        <>
                            <div style={{marginBottom: '1rem'}}>
                                <label>Дедлайн: <input type="date" value={assignDueDate} onChange={e=>setAssignDueDate(e.target.value)} /></label>
                            </div>

                            <div style={{display:'flex', gap:'0.5rem', marginBottom:'0.75rem'}}>
                                <input placeholder="Поиск по имени или телефону" value={userSearch} onChange={e=>setUserSearch(e.target.value)} />
                                <button onClick={searchUsers}>Поиск</button>
                            </div>

                            <div style={{maxHeight: '40vh', overflow: 'auto', border: '1px solid var(--border)'}}>
                                {availableUsers.length === 0 && <div style={{padding:'1rem', color:'var(--text-secondary)'}}>Список пользователей недоступен. Введите ID пользователя вручную ниже.</div>}
                                {availableUsers.map(u => (
                                    <div key={u.id} style={{display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem'}}>
                                        <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={()=>toggleSelectUser(u.id)} />
                                        <div>{u.first_name || u.firstName || (u.first_name+' '+u.last_name) || (u.firstName+' '+u.lastName) || u.phone}</div>
                                        <div style={{marginLeft:'auto', color:'var(--text-secondary)'}}>#{u.id}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{marginTop:'0.75rem'}}>
                                <label>Или укажите ID пользователя/телефон вручную: <input value={fallbackUserId as any} onChange={e=>setFallbackUserId(e.target.value ? Number(e.target.value) : '')} placeholder="ID или телефон" /></label>
                            </div>
                        </>
                    )}
                </div>
                <div className={styles.modalActions}>
                    <button onClick={confirmAssign} className={styles.saveBtn} disabled={assignLoading}>📤 Назначить</button>
                    <button onClick={()=>setShowAssignModal(false)} className={styles.cancelBtn}>Отмена</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.testConstructor}>
            {/* Модальное окно выбора типа вопроса */}
            {showQuestionTypeModal && <QuestionTypeModal />}
            {showAssignModal && <AssignModal />}

            {/* Верхняя панель */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <input
                        type="text"
                        value={test.title}
                        onChange={e => handleTestChange({ title: e.target.value })}
                        placeholder="Название теста"
                        className={styles.testTitle}
                    />
                    <div className={styles.testMeta}>
                        <select
                            value={test.subject}
                            onChange={e => handleTestChange({ subject: e.target.value })}
                            className={styles.subjectSelect}
                        >
                            <option value="">Выберите предмет</option>
                            <option value="mathematics">Математика</option>
                            <option value="russian">Русский язык</option>
                            <option value="physics">Физика</option>
                            <option value="chemistry">Химия</option>
                        </select>
                        <select
                            value={test.grade || ''}
                            onChange={e => handleTestChange({ grade: e.target.value as '9' | '11' })}
                        >
                            <option value="">Класс</option>
                            <option value="9">9 класс (ОГЭ)</option>
                            <option value="11">11 класс (ЕГЭ)</option>
                        </select>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Поиск по библиотеке вопросов..."
                        />
                    </div>
                    <div className={styles.actions}>
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={styles.previewBtn}
                        >
                            {previewMode ? '✏️ Редактировать' : '👁️ Предпросмотр'}
                        </button>
                        <button
                            onClick={saveTest}
                            className={styles.saveBtn}
                            disabled={autoSaveStatus === 'saving'}
                        >
                            {autoSaveStatus === 'saving' ? '💾 Сохранение...' :
                                autoSaveStatus === 'saved' ? '✅ Сохранено' : '💾 Сохранить'}
                        </button>
                        <button
                            onClick={openAssignModal}
                            className={styles.assignBtn}
                        >
                            📤 Назначить ученикам
                        </button>
                    </div>
                </div>
            </header>

            <div className={styles.main}>
                {/* Левая панель — структура теста */}
                <aside className={styles.structurePanel}>
                    <div className={styles.panelHeader}>
                        <h3>Структура теста</h3>
                        <div className={styles.panelHeaderButtons}>
                            <button onClick={() => setShowQuestionTypeModal(true)} className={styles.addQuestionBtn}>
                                + Вопрос
                            </button>
                            <button onClick={addSection} className={styles.addSectionBtn}>
                                + Раздел
                            </button>
                        </div>
                    </div>
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Вопросов:</span>
                            <span className={styles.statValue}>{test.total_questions || 0}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Баллов:</span>
                            <span className={styles.statValue}>{test.total_points || 0}</span>
                        </div>
                    </div>
                    <ul className={styles.sectionList}>
                        {test.sections.map(section => (
                            <li
                                key={section.id}
                                className={`${styles.sectionItem} ${activeSectionId === section.id ? styles.active : ''}`}
                            >
                                <div
                                    className={styles.sectionHeader}
                                    onClick={() => {
                                        setActiveSectionId(section.id);
                                        setActiveQuestionId(null);
                                    }}
                                >
                                    <span className={styles.sectionTitle}>{section.title}</span>
                                    <span className={styles.questionCount}>({section.questions.length})</span>
                                </div>
                                {activeSectionId === section.id && (
                                    <div className={styles.sectionActions}>
                                        <button
                                            onClick={() => handleSectionChange(section.id, {
                                                title: prompt('Новое название:', section.title) || section.title
                                            })}
                                            className={styles.editBtn}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => deleteSection(section.id)}
                                            className={styles.deleteBtn}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                )}
                                {activeSectionId === section.id && section.questions.length > 0 && (
                                    <ul className={styles.questionList}>
                                        {section.questions.map(question => (
                                            <li
                                                key={question.id}
                                                className={`${styles.questionItem} ${activeQuestionId === question.id ? styles.active : ''}`}
                                                onClick={() => setActiveQuestionId(question.id)}
                                            >
                                                <span className={styles.questionType}>
                                                    {question.type === 'single' ? '○' :
                                                        question.type === 'multiple' ? '□' :
                                                            question.type === 'open' ? '📝' :
                                                                question.type === 'match' ? '🔗' :
                                                                    question.type === 'order' ? '🔢' : '📎'}
                                                </span>
                                                <span className={styles.questionText}>
                                                    {question.text.substring(0, 30)}{question.text.length > 30 ? '...' : ''}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* Центральная часть — редактор */}
                <main className={styles.editor}>
                    {previewMode ? (
                        <div className={styles.preview}>
                            <h2>👁️ Предпросмотр теста</h2>
                            <div className={styles.previewContent}>
                                <h1>{test.title}</h1>
                                <div className={styles.testInfo}>
                                    <span>Предмет: {test.subject}</span>
                                    <span>Вопросов: {test.total_questions}</span>
                                    <span>Баллов: {test.total_points}</span>
                                </div>
                                {test.sections.map((section, idx) => (
                                    <div key={section.id} className={styles.previewSection}>
                                        <div className={styles.sectionHeaderRow}>
                                            <h3>{idx + 1}. {section.title}</h3>
                                            <span className={styles.questionCount}>({section.questions.length} вопросов)</span>
                                        </div>
                                        {section.questions.map((question, qIdx) => (
                                            <div key={question.id} className={styles.previewQuestion}>
                                                <div className={styles.questionHeader}>
                                                    <span className={styles.questionNumber}>{qIdx + 1}.</span>
                                                    <span className={styles.questionPoints}>({question.points} баллов)</span>
                                                </div>
                                                <p className={styles.questionText}>{question.text}</p>

                                                {/* Одиночный выбор */}
                                                {question.type === 'single' && question.variants && (
                                                    <div className={styles.previewVariants}>
                                                        {question.variants.map(variant => (
                                                            <label key={variant.id} className={styles.previewVariant}>
                                                                <input type="radio" name={`q${question.id}`} disabled />
                                                                {variant.text}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Множественный выбор */}
                                                {question.type === 'multiple' && question.variants && (
                                                    <div className={styles.previewVariants}>
                                                        {question.variants.map(variant => (
                                                            <label key={variant.id} className={styles.previewVariant}>
                                                                <input type="checkbox" name={`q${question.id}`} disabled />
                                                                {variant.text}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Открытый ответ */}
                                                {question.type === 'open' && (
                                                    <textarea
                                                        placeholder="Введите ваш ответ..."
                                                        className={styles.previewTextarea}
                                                        disabled
                                                    />
                                                )}

                                                {/* Сопоставление */}
                                                {question.type === 'match' && question.matches && (
                                                    <div className={styles.previewVariants}>
                                                        {question.matches.map((match, idx) => (
                                                            <div key={match.id} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '1rem',
                                                                marginBottom: '0.5rem',
                                                                padding: '0.75rem',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: 'var(--border-radius-small)'
                                                            }}>
                                                                <span>{match.left}</span>
                                                                <span>→</span>
                                                                <select disabled style={{ padding: '0.5rem', flex: 1 }}>
                                                                    <option>{match.right}</option>
                                                                    {question.matches?.map(m => (
                                                                        <option key={m.id}>{m.right}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Последовательность */}
                                                {question.type === 'order' && question.orderItems && (
                                                    <div className={styles.previewVariants}>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                                            Расположите элементы в правильном порядке (перетащите):
                                                        </p>
                                                        {question.orderItems.map(item => (
                                                            <div key={item.id} style={{
                                                                padding: '1rem',
                                                                marginBottom: '0.5rem',
                                                                background: 'var(--bg-card)',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: 'var(--border-radius-small)',
                                                                cursor: 'move'
                                                            }}>
                                                                {item.text}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Загрузка файла */}
                                                {question.type === 'file' && (
                                                    <div style={{
                                                        border: '2px dashed var(--border)',
                                                        borderRadius: 'var(--border-radius)',
                                                        padding: '2rem',
                                                        textAlign: 'center',
                                                        marginTop: '1rem'
                                                    }}>
                                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                                            Загрузите файл ответа ({question.fileTypes?.join(', ')})
                                                        </p>
                                                        <input type="file" disabled />
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                                            Максимальный размер: {question.maxFileSize}MB
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeQuestionId && currentQuestion ? (
                        <div className={styles.questionEditor}>
                            <div className={styles.questionTypeSelector}>
                                <span>Тип вопроса:</span>
                                {(['single', 'multiple', 'open', 'match', 'order', 'file'] as const).map(type => (
                                    <button
                                        key={type}
                                        className={`${styles.typeBtn} ${currentQuestion.type === type ? styles.active : ''}`}
                                        onClick={() => updateQuestion({ type })}
                                    >
                                        {type === 'single' && '○ Одиночный выбор'}
                                        {type === 'multiple' && '□ Множественный выбор'}
                                        {type === 'open' && '📝 Открытый ответ'}
                                        {type === 'match' && '🔗 Сопоставление'}
                                        {type === 'order' && '🔢 Последовательность'}
                                        {type === 'file' && '📎 Загрузка файла'}
                                    </button>
                                ))}
                            </div>

                            <div className={styles.questionContent}>
                                <div className={styles.textEditor}>
                                    <h4>Текст вопроса:</h4>
                                    <textarea
                                        value={currentQuestion.text}
                                        onChange={e => updateQuestion({ text: e.target.value })}
                                        placeholder="Введите текст вопроса..."
                                        rows={5}
                                        className={styles.questionTextarea}
                                    />
                                    <div className={styles.textFormatting}>
                                        <button>B</button>
                                        <button>I</button>
                                        <button>U</button>
                                        <button>📷</button>
                                        <button>∑</button>
                                    </div>
                                </div>

                                {/* Одиночный и множественный выбор */}
                                {['single', 'multiple'].includes(currentQuestion.type) && currentQuestion.variants && (
                                    <div className={styles.variantsEditor}>
                                        <h4>Варианты ответа:</h4>
                                        {currentQuestion.variants.map((variant, i) => (
                                            <div key={variant.id} className={styles.variantRow}>
                                                <input
                                                    type="text"
                                                    value={variant.text}
                                                    onChange={e => {
                                                        const newVariants = [...currentQuestion.variants!];
                                                        newVariants[i] = { ...variant, text: e.target.value };
                                                        updateQuestion({ variants: newVariants });
                                                    }}
                                                    placeholder="Текст варианта..."
                                                    className={styles.variantInput}
                                                />
                                                <label className={styles.correctLabel}>
                                                    <input
                                                        type={currentQuestion.type === 'single' ? 'radio' : 'checkbox'}
                                                        name="correct-variant"
                                                        checked={variant.isCorrect}
                                                        onChange={e => {
                                                            const newVariants = [...currentQuestion.variants!];
                                                            if (currentQuestion.type === 'single') {
                                                                newVariants.forEach(v => v.isCorrect = false);
                                                            }
                                                            newVariants[i] = { ...variant, isCorrect: e.target.checked };
                                                            updateQuestion({ variants: newVariants });
                                                        }}
                                                    />
                                                    {currentQuestion.type === 'single' ? 'Правильный' : 'Верный'}
                                                </label>
                                                <button
                                                    onClick={() => {
                                                        if (currentQuestion.variants!.length > 2) {
                                                            updateQuestion({
                                                                variants: currentQuestion.variants!.filter(v => v.id !== variant.id),
                                                            });
                                                        }
                                                    }}
                                                    className={styles.removeVariantBtn}
                                                    disabled={currentQuestion.variants!.length <= 2}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() =>
                                                updateQuestion({
                                                    variants: [
                                                        ...currentQuestion.variants!,
                                                        { id: `v${Date.now()}`, text: '', isCorrect: false },
                                                    ],
                                                })
                                            }
                                            className={styles.addVariantBtn}
                                        >
                                            + Добавить вариант
                                        </button>
                                    </div>
                                )}

                                {/* Сопоставление */}
                                {currentQuestion.type === 'match' && (
                                    <div className={styles.variantsEditor}>
                                        <h4>Элементы для сопоставления:</h4>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                            Создайте пары "левый элемент → правый элемент"
                                        </p>
                                        {currentQuestion.matches?.map((match, i) => (
                                            <div key={match.id} className={styles.variantRow}>
                                                <input
                                                    type="text"
                                                    value={match.left}
                                                    onChange={e => updateMatchItem(i, 'left', e.target.value)}
                                                    placeholder="Левый элемент..."
                                                    className={styles.variantInput}
                                                />
                                                <span style={{ color: 'var(--text-secondary)' }}>→</span>
                                                <input
                                                    type="text"
                                                    value={match.right}
                                                    onChange={e => updateMatchItem(i, 'right', e.target.value)}
                                                    placeholder="Правый элемент..."
                                                    className={styles.variantInput}
                                                />
                                                <button
                                                    onClick={() => removeMatchItem(i)}
                                                    className={styles.removeVariantBtn}
                                                    disabled={(currentQuestion.matches?.length || 0) <= 2}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                        <button onClick={addMatchItem} className={styles.addVariantBtn}>
                                            + Добавить пару
                                        </button>
                                    </div>
                                )}

                                {/* Последовательность */}
                                {currentQuestion.type === 'order' && (
                                    <div className={styles.variantsEditor}>
                                        <h4>Элементы для упорядочивания:</h4>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                            Укажите правильный порядок элементов
                                        </p>
                                        {currentQuestion.orderItems?.map((item, i) => (
                                            <div key={item.id} className={styles.variantRow}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '80px' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>#{item.correctPosition}</span>
                                                    <select
                                                        value={item.correctPosition}
                                                        onChange={e => updateOrderPosition(i, parseInt(e.target.value))}
                                                        style={{ padding: '0.5rem', borderRadius: 'var(--border-radius-small)' }}
                                                    >
                                                        {Array.from({ length: currentQuestion.orderItems?.length || 0 }, (_, idx) => (
                                                            <option key={idx + 1} value={idx + 1}>
                                                                {idx + 1}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={item.text}
                                                    onChange={e => updateOrderItem(i, 'text', e.target.value)}
                                                    placeholder="Текст элемента..."
                                                    className={styles.variantInput}
                                                />
                                                <button
                                                    onClick={() => removeOrderItem(i)}
                                                    className={styles.removeVariantBtn}
                                                    disabled={(currentQuestion.orderItems?.length || 0) <= 2}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                        <button onClick={addOrderItem} className={styles.addVariantBtn}>
                                            + Добавить элемент
                                        </button>
                                    </div>
                                )}

                                {/* Загрузка файла */}
                                {currentQuestion.type === 'file' && (
                                    <div className={styles.variantsEditor}>
                                        <h4>Настройки загрузки файла:</h4>
                                        <div className={styles.property}>
                                            <label>Разрешенные типы файлов:</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                {['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png', '.zip'].map(type => (
                                                    <label key={type} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.5rem',
                                                        background: 'var(--bg-card)',
                                                        border: `1px solid ${currentQuestion.fileTypes?.includes(type) ? 'var(--primary)' : 'var(--border)'}`,
                                                        borderRadius: 'var(--border-radius-small)',
                                                        cursor: 'pointer'
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={currentQuestion.fileTypes?.includes(type) || false}
                                                            onChange={e => {
                                                                const current = currentQuestion.fileTypes || [];
                                                                const newTypes = e.target.checked
                                                                    ? [...current, type]
                                                                    : current.filter(t => t !== type);
                                                                updateQuestion({ fileTypes: newTypes });
                                                            }}
                                                        />
                                                        {type}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={styles.property}>
                                            <label>Максимальный размер файла (MB):</label>
                                            <input
                                                type="number"
                                                value={currentQuestion.maxFileSize || 5}
                                                onChange={e => updateQuestion({ maxFileSize: parseInt(e.target.value) })}
                                                min="1"
                                                max="50"
                                                className={styles.propertyInput}
                                            />
                                        </div>
                                        <div className={styles.property}>
                                            <label>Дополнительные инструкции:</label>
                                            <textarea
                                                value={currentQuestion.explanation || ''}
                                                onChange={e => updateQuestion({ explanation: e.target.value })}
                                                placeholder="Инструкции для загрузки файла..."
                                                rows={2}
                                                className={styles.propertyInput}
                                                style={{ minHeight: '80px' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Объяснение (для всех типов кроме file) */}
                                {currentQuestion.type !== 'file' && (
                                    <div className={styles.explanationEditor}>
                                        <h4>Объяснение ответа:</h4>
                                        <textarea
                                            value={currentQuestion.explanation || ''}
                                            onChange={e => updateQuestion({ explanation: e.target.value })}
                                            placeholder="Объяснение правильного ответа..."
                                            rows={3}
                                            className={styles.explanationTextarea}
                                        />
                                    </div>
                                )}

                                {/* Прикрепленные файлы (для всех типов) */}
                                {currentQuestion.type !== 'file' && (
                                    <div className={styles.attachments}>
                                        <h4>Прикрепленные файлы:</h4>
                                        <div className={styles.fileUpload}>
                                            <input type="file" id="file-upload" style={{ display: 'none' }} />
                                            <label htmlFor="file-upload" className={styles.uploadLabel}>
                                                📎 Загрузить изображение, схему или график
                                            </label>
                                            <span className={styles.fileHint}>PNG, JPG до 5MB</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.emptyEditor}>
                            <div className={styles.emptyContent}>
                                <h2>🎯 Конструктор вопросов</h2>
                                <p>Выберите раздел слева или создайте новый вопрос</p>
                                <div className={styles.questionTypes}>
                                    <h4>Выберите тип вопроса:</h4>
                                    <div className={styles.typeGrid}>
                                        <button onClick={() => addQuestion('single')} className={styles.typeCard}>
                                            <div className={styles.typeIcon}>○</div>
                                            <h5>Одиночный выбор</h5>
                                            <p>Один правильный вариант</p>
                                        </button>
                                        <button onClick={() => addQuestion('multiple')} className={styles.typeCard}>
                                            <div className={styles.typeIcon}>□</div>
                                            <h5>Множественный выбор</h5>
                                            <p>Несколько правильных вариантов</p>
                                        </button>
                                        <button onClick={() => addQuestion('open')} className={styles.typeCard}>
                                            <div className={styles.typeIcon}>📝</div>
                                            <h5>Открытый ответ</h5>
                                            <p>Текстовый ответ</p>
                                        </button>
                                        <button onClick={() => addQuestion('match')} className={styles.typeCard}>
                                            <div className={styles.typeIcon}>🔗</div>
                                            <h5>Сопоставление</h5>
                                            <p>Установить соответствие</p>
                                        </button>
                                        <button onClick={() => addQuestion('order')} className={styles.typeCard}>
                                            <div className={styles.typeIcon}>🔢</div>
                                            <h5>Последовательность</h5>
                                            <p>Расположить в правильном порядке</p>
                                        </button>
                                        <button onClick={() => addQuestion('file')} className={styles.typeCard}>
                                            <div className={styles.typeIcon}>📎</div>
                                            <h5>Загрузка файла</h5>
                                            <p>Ответ в виде файла</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Правая панель — свойства */}
                {/* Правая панель — свойства */}
                <aside className={styles.propertiesPanel}>
                    <div className={styles.panelHeader}>
                        <h3>⚙️ Свойства</h3>
                    </div>

                    {activeQuestionId && currentQuestion ? (
                        <div className={styles.questionProperties}>
                            <div className={styles.propertyGroup}>
                                <h4>Баллы и время</h4>
                                <div className={styles.property}>
                                    <label>Баллы за вопрос:</label>
                                    <input
                                        type="number"
                                        value={currentQuestion.points}
                                        onChange={e => updateQuestion({ points: Number(e.target.value) })}
                                        min="1"
                                        max="10"
                                        className={styles.propertyInput}
                                    />
                                </div>
                                <div className={styles.property}>
                                    <label>Рекомендуемое время (мин):</label>
                                    <input
                                        type="number"
                                        value={currentQuestion.time || ''}
                                        onChange={e => updateQuestion({ time: Number(e.target.value) || undefined })}
                                        min="0"
                                        max="30"
                                        className={styles.propertyInput}
                                        placeholder="не ограничено"
                                    />
                                </div>
                            </div>

                            <div className={styles.propertyGroup}>
                                <h4>Действия</h4>
                                <button
                                    onClick={() => deleteQuestion(currentQuestion.id)}
                                    className={styles.deleteQuestionBtn}
                                >
                                    🗑️ Удалить вопрос
                                </button>
                                <button
                                    onClick={() => {
                                        const newQuestion = { ...currentQuestion, id: `q${Date.now()}` };
                                        setTest(prev => ({
                                            ...prev,
                                            sections: prev.sections.map(s =>
                                                s.id === activeSectionId
                                                    ? { ...s, questions: [...s.questions, newQuestion] }
                                                    : s
                                            ),
                                        }));
                                        alert('Вопрос дублирован');
                                    }}
                                    className={styles.duplicateBtn}
                                >
                                    📋 Дублировать вопрос
                                </button>
                            </div>
                        </div>
                    ) : currentSection ? (
                        <div className={styles.sectionProperties}>
                            <div className={styles.propertyGroup}>
                                <h4>Настройки раздела</h4>
                                <div className={styles.property}>
                                    <label>Название раздела:</label>
                                    <input
                                        type="text"
                                        value={currentSection.title}
                                        onChange={e => handleSectionChange(activeSectionId, { title: e.target.value })}
                                        className={styles.propertyInput}
                                    />
                                </div>
                                <div className={styles.property}>
                                    <label>Максимум баллов:</label>
                                    <input
                                        type="number"
                                        value={currentSection.max_points || ''}
                                        onChange={e => handleSectionChange(activeSectionId, {
                                            max_points: Number(e.target.value) || undefined
                                        })}
                                        className={styles.propertyInput}
                                        placeholder="нет ограничения"
                                    />
                                </div>
                                <div className={styles.property}>
                                    <label>Ограничение времени (мин):</label>
                                    <input
                                        type="number"
                                        value={currentSection.time_limit || ''}
                                        onChange={e => handleSectionChange(activeSectionId, {
                                            time_limit: Number(e.target.value) || undefined
                                        })}
                                        className={styles.propertyInput}
                                        placeholder="нет ограничения"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={addSection}
                                className={styles.addSectionBtn}
                            >
                                + Добавить новый раздел
                            </button>
                        </div>
                    ) : (
                        <div className={styles.noSelection}>
                            <p>👈 Выберите раздел или вопрос для редактирования свойств</p>
                            <div className={styles.testStats}>
                                <div className={styles.statCard}>
                                    <div className={styles.statValue}>{test.total_questions || 0}</div>
                                    <div className={styles.statLabel}>всего вопросов</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statValue}>{test.total_points || 0}</div>
                                    <div className={styles.statLabel}>всего баллов</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statValue}>{test.sections.length}</div>
                                    <div className={styles.statLabel}>разделов</div>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
