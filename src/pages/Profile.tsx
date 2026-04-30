import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

import Sidebar from '../components/SideBar/SideBar';
import Background from '../components/Background/Background';

import styles from './Profile.module.scss';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    role?: string;
    balance?: number;
}

export default function Profile() {
    const navigate = useNavigate();
    const { isAuthenticated, user: authUser, token } = useAuthStore();
    const [user, setUser] = useState<User | null>(authUser);
    const [avatar, setAvatar] = useState<string>('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQAuAMBIgACEQEDEQH/xAAcAAABBQEBAQAAAAAAAAAAAAAFAAECBAYDBwj/xAA2EAACAQMDAQUGBAYDAQAAAAABAgMABBEFEiExEyJBUWEGMnGBkaEUscHwByNC0eHxM1JiFf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD2I1HPNSxUcUDinVc0lrolAJ9qGeHQdQkRSWFu/Tw4r5zm0u5dZL6STl3LBiclq+nNStRe2E9sxwJY2TPlkV4d2ASyNpNGrG3JVhtxg586DM6Lrl/oFzHeWF1JEwO2RCDtf0x0Jr2HRP4mWlzYpLfwlCQcyRjKj4jw58K8s1PRLh1M1lBK4HvbOcevXNZyLUG065kji3shO2RXQjJxycEfTNB9CSe2FpPJi3csM5A6bh413XU2RezVxJycY/qXqK8Xt9Rb8TbfgeI2BKAAYD8cf4rWwaiZIoGSQlUUDZznHTH5UGrk1RwXRyGR0BznrkgZ/Wp2+qxwWfB2nJBJ55z/AIrFalddpEqxlgMHa4PJXH2quNVd1iyOOzwxx5AZx9aDerqxBQqeETg/+ic5+4oRc+1TWl61urnbEgaTJzy3+jWckmkmjcwytu3AKuOnxrPardHTr9p5ss0SkYbqznp+R+tBrfa3+J84svwWlqYZnT+ZKxwVyOg8j615pbQyanITI7CMHJOOWPnmq1rDda5qBTcWeRsk5rax+zz6TErODhRywX8/SgCTaQnYhVQAHowPT416T/AmV4v/AKtk3QFHHx5B/SsLBbyNelyoMbLuDgdVz4g/2r0v+FVmIb/UJ1A76rlh86D0Y1BhXVwBXJjQcitILTk0s0DYpU2aVAs02eakRxUFHPNBMVNTTYBFICgluycDrXmftDpX4fWbzGOzl76qB1B/zXpuBjpWT9rI0OoW7sO8UYHB/MUGEtNVGn3S2kg7knusBnHp61m/bHT1k1EyoVw/OAAD+VLVbgS629p3trtlWPTjyNddQLTMlpOshkIwHGTz8KDPezEbLqzLyI4iMk9Aa9A7G2VRIHBz0KHHPp8aG2VomlwBFI7U95pHXBb7j6VcjdEVjuPH9O3GAfnxQTENs5Ii27Tztz1zz8vKuMTWj3RtI0AbacRnkgc/v5VWe/wwAkV93KoRtHQ9T8BiqyzRrI1yF2ksRktgAj/VAVQLbBecISS7E7iVGeMeZycUG9rdLOqxwz264dQWwRtzu5xn5fnV2K6EmVREHHvsfDPX4cV1ltmhnhmDuUIG1OAqt5+POKDJ+ykLWusiKSJg3Rl6EGiftR7RzTyrpulmOO3VsTTLyxx1HkB8qM6lA15AZLVkWUDAkVe8fnWSurZbSwcsmZc9/ceevjQavQURrdAFAhUAliOOPCvTP4dQKLW6ukUKJpeFA8AAK859lJ7W60/aGwXUr8PSvUPYS3Nvo4LyM25mIB6AfsUGjkbmuZ5FSlrnuoGNNUjUcGgjSqWKegYUqiakKBxmpqagKmKB81lfbi3W4hheScRxo/e5wa0ssgjUlyMedYj2m1JXlYKwwnuopByfDoT9OKDzS+tJ31OR4Qsly75Rc4Ix65NaRbcWyIA6m5bnf4j6Z4qVnp4jElzcR5unOHlkG4rzwAaUgO1jtAfGIyVyc/PP3oFbJHyJ5BIwPUgAE+PSq18e0YjtDKFO1gBuAGefyH0oXa3moT3YtLW3c7SDuZjkc/b6fSilvBPOxtblGguCO7Igysnh4dPp9qDM3TPuO5Czg7cFcAjPPGfpjPFcZnAQSKQvunByWyf2fD15ohOwjupY3VkZSUJHJUqccfY1Xjs4Eui0jrKCQ7JnBKjpleP95oJafJHL+Ha3lLbV7wAwd2e7t8D/AIrR29ypUC47VHI6hhjHjx5fnQSzghlkt40QIDLt7qDrx1+GcUWv7OafU/wVsFiKRhmd1GeSegoON3PACEtiGx7seNwb1HPH2qMhh1vT5rfYYpCAWYoOD4ZxzQefTrzTr5Y2csrEkbiSM+nPHwolZJ/OW43KGPDADAb4nx+HNBR0ewubLUktLqNpLYjKyAblc+gx9q929mA0WkwowPC8bk2n6V5fc2H4qzWROXhIdEU5zjwB8PiPOvVtDkEmnwOpLAqOScnp4mgvNz1rnjmu1QYUEcU46U1MWoEaVRJzSoGp6ZealigcVIVEU0rFVyDigAe1ztFZP2edxB7pBP5Vi9Bt3aCWe6CgL7rYwWPwrQ+1V6xjI7VYwM9/b0/OgNpOF08SKd2eQOgJ/wCx9P3xQR1S5K4RmYckAbRz5/L+1ZLUNSjspIu0L7EY7ULbsDzx4fAUWL3N1fMVQvEhwpHiSeuPjmg01m6+1lmDC0gyGdmOFBHSgIaFaapqNrqN7p00NrOB/KSVNzE+uTxmoaV7SxafrMT6vdZM6di0M0BjeKQ8ksMAAZGOPPrWoSJrUpMsaZYkSqvh15z/AIrlq9tpOrW2JlibAyWPX99aDK60m7WXuesZ5yh5Ofh1xVN8C8PYYL87t2MjnPBHlWkWzVFWNVLxjPeZwNv98ZP61WngVLhBK28liB3Rnr1FAI08XFrqUZDKsf8AyY6hT/qmu9Yn9o9XuvwlrdswU28fO2Jh4OxxnIYnpReS2jysTJlTwy55A8/p6Vd0y5tLGFo4lUhASVAH9/3k0AfV9Ga1tbCHTryW4vIhmftXLhjjnr0+VBrDVWTUJYZw0Thsyc5rf2RgnE8qgMGJwGOcA1hLzTriTX7t+wbsSSVJBGfn9aDc286tbpIrsAMAncASPhW69lLnMBh3Fh7wz1rybTHiikjQP2qhe5jyz0/St37P6gWMRAKhWx58H86D0DxxUWqEUhaIFupqW7NBE1AiumKWKCGBSpbaVAy4qfBqGOKQbBoJnCjJIwKEajq6R7ooY3c47z4wq/OizKCp3E4rOa3cxIjJHud/LjA/x8eKDA+1aHUbjawZju95myF9OtGZrD8PoUNusoXC5Mi8k8Z4+P8AahV9Ek8oeKRmZG7xjBAHp6mtFpkbXEcwcBljGADzlun0FBl/Zm2jfVZNsZUrnOQB9/OtPe6T/IllQFpGXAcjp/is5GdRsdT2qY3R5DubGNvoPljr+dbjt1eHsu03Fh9vEnHSg4Welx3mmLHLv7y4JBxz8qBajoQ0yNeEbcSF4/PzrXadH2UJHm27gU+r2q3UMakdGxmgx9tpMcNt2vG44zxn9OKqz2yfiBIp90YJAxWm16KaGyWG32jgFpG6DFZEzWIuMPqtujY70bP1PoaDvDpyX9owKOAOAp5rjp2hi+vJICWLqNybiRj1q/oS9rcMba6WWIY3qrA1o9PtOw1JpACQ6k5NBBtJis9MKLGm5VyeOv60Lj0aKS290jcSWDZ8fjWrnVXiZTwD6UGuXliR4zJ16MRzQYXVoI7S7/DhNrse6pXcPiPXitL7Lo0cgWVSu5RgeB9RWd1Cee61eI7CQndDADO7yOfTx69fOtjpMW3sid23qGHh9aDZWRLQYbnyPnXQriuengpDiuz8igiDUhzXPoafNBM0qQNNQR4qSlfKo4pwtBG4lVImOOMVhdXtf/pSsXZhEDhgCefTitvdQiaExscKetZLXZbO1jELlliUf8cfJIoBEdvFE2yBSyjHhkcfvxojYSRafZmJPezkk+nX4VSgnW4IS3Vwu0gHHdH+ahqMYtopAXO5lyw/7ZoB2q3ol78eREMtuHX/AH/en9mtawp7Y+JClj3sDz+Py6VRmuBJbozAY4V/TNQtIreTL7gqn3lUck+C/YUHpemXCXMPbRShl8QvOanFdCaN9gUlXwRu5BrJadKdEZDJIezmx2igZIz49aqaTNPpvtnLKkzPpOpR8eUUv9Pw8qDp/GDUryx0O2S1JSOd9srr1xjgZ8P8V4c90zNldxz4k5r6C9vNOtde9n5LC7n7BkPawyD+hwCASPEYJ49fSvCW0eW1k7FlVmz70bZB/wAUGk/hbd3Y9pYYYZT2Mme1UHOQAT9ele1vL2LTTyMqpHGQ25uAfhXlf8LtJs9Ou5NQnkVrvBjiRScRg9SfMn7Vtfau3m1jT0063dk7eRTOy+EQ5Ofj0+tBoILgTWC3BcBdu4HGPh41l9W1CR0aPJ7xIDAZFdbm9HYLp9mRst1A2MxBOOKF30qJAAy4APeH60HPRx2k3aSsCjEPz1yBg/lWrj2uAI3x0+NY23vkhKOw/wCy5HOOuP1ozZXZa5ZkjZscn1zj+1B6Hppm/DrucOMcnHSruc0D0m6SZQwXa3iuCMfWjkfK0HNhmmxU3FRBoHXFKkBSoFU1FNTg0ELgqkLO7bVUZJrzT2mnN3dGO2LkE8lwAB6+dbrX7h4bNyG2DHU15wlxBcyOd6ODwVckZx4c4J+NAR0GFbSIrFueTPfct1/t8BQ/WbpoLvEinMmd3juqxpE7tclYpA6AclFXGPEHHyqjrCO8/bSFUiHAy3vHHXn9KAEkrmeWJxlSjuCvg3OB6mqknbWMts8WWMy9qvU844+FWIlWK8xcOm0upAz488/epWKGS5mubhu0t0cBVwOPT5bRxQF9O1NtQZknULMIiQDxkDHT51B9ZbTLprUjtcrwGX3zkDgdPGht1I0F0lxbouA+1GXkYHXNWL21E93bNzuhikDA9du0YJ+gFBeutRgvLUC4M8ZaMEbG4Y8+B+BoePZlZo1kg1GSNCNxDy7SBj/VGbbTozBCkrB5uWcgYyhPdP0qF7PBH2ix7FdIxtVj74Y8fbn5UFdLfTtIKDdLcz71/rJU59fE9aswavNchtqdknC9zoQf9/aulxpsc09nNCe4rFiAc8nmqdwkNhvCnKuAw+R/TNBYeWNezeUqSc/zf+vx+P76UEe5/E6g6SA93qu7hvPg/OrGoRC4Yt2pXJPj4dccfX9mhcsRBWRsIVXA3eJ/Xp0oOrXO2ZIyhVWO3BHBI6c1pNLZ4VBEiq594YyDWb0dJbu53ooU8f8ApW/fStUkTIAk0JA8GU46/Cg1Ps5dbpcErsHiuDmtgmAtea6LeGzvwJGcA9OQw+HHSvSLdxJCGDAg80CbmueOa6N6VDNBHpSp8ZpUDgVNeOaWRTkjYcUAT2lnMdpIFdgSDkL1rBabbxEyTPH2krf0s279K0XttbyTxFBcFEJ7wB6ig+nQkWRTGR06849cdKDkk5S4O5VhjJw+7jI8hXHVLdpV7VUZ2XhRkioSWkvbKwEYjVupbHx+dEHvEwIThUbugAYJoMKYVuJiiEBI2AO090NkZyfEDGOKPxwRxWkcar2iBwXPmen9hQXVZIxqf4a2CxRJje7AnJ64XHr+eavWuoIto7Ak7B3mIwMjqSfLH5UFG5mAJiDMEk3EEjO1+ME/l9aKabLC8Sy9qry3GIgoPOPH7cVwbT0uFmuDgs0vdGeigA/nkVO3tPw7W7QqQwbgZ4GOpHn0x86AtdbmtS+8IDEJGCDGRxgZrN+1lm8ciXYJaNGTofe28Y+/3o48plCyx+5FG8RU8dwgY+4rvcWsdzpCxSD33wD6kjH3oH0qb+THlu5KACemfD+30ofqtuqusT5A76nPkcfrV3SYx+FmgOOG7h8jgEfeqtzOLq/EEvODuH/nnpQCG3PcZYuix4LMF6g/qDVfU1nMcYALwgEMVPOc+P74otqk8ELsGyrDu4A96szezKYh27FIi3IXqufGgPey1m9ncO7PI0T9A36cfv7UTW6Mt6VhYMDwoD/pVLRTEbJu++wKRxzuXHHx/Ou2kusl2FkEbOD3ZABkD1oDKg280crntFYjK7a9D0iXfbqwXaMeVZVosx527gepHjR/QJEaHC8YHQnmgOZyOlRbb4ipDpUXFByJ5pUsUqBmY1JCSMUitSXocCgxntmlxKjLEjL4bwegrhptmlnYoh73HIIHFGfaUyIoOBsz/Vzk1Vh3SRAsD06txQA7u0UNI7SFs4wvgtAFuZvx5W3j7qg99/L0+1a65jLl++OeAoGSfnWZvrVxdZyyhU+GfT08KCvDaILWWS4RXuN5Oc+PJGB+tZ2NpriT8LnajOQ20ZBwCcffy8DVjUL6S0tH7F8XUsiRxn/rnr9vyqxpdlBDqCW0QEjRJ/NcdC5IOfTjNBKAXUDSbyCIRjBbBcYOR9662kkyWoSOXvRSZXevO3GcH0pbI9SlETtsBDMMA948Y+gJqEq/hHUXExO1slsdOnj8aApbzoLnYuP5id7y4PX4HP3ohIQLOIjlRIGB/fzoCsrJNHIpUxHKFQOVJ/Y+tWGv+0i7Id0AjGT1GCc/nQX7J4xJMFJBL7zn0GP0qheMq3TuEw4GFwOp61Ve57NWdGAlf3W/fXwoPLqc11K8cTfzFz4jhj+xQdrjNxcdpu9wE4xzkfv7Vxs4TPdKbhF7Nx3lK5BHnXW17VLGQMuZDwHXkjmow3ATtIbmVY3WP/jkHKnwP786AxZiK2gSKEHafeK+A8yKKafZpFOkkcaDJyXAGT6UH0/T5G7ORZBvX3XB95T/AEmtPbwGOZAIypA73OAaA1EqvGOMHzoto6BeNx+dUIEULgURsh3x4UBjBHQ0izAdacDiotQRJyeKVIjHSlQdKYinpUAvWPcxQ1R3QCSRjxpqVBSk4nGABzjgUIvABdkDoPXrSpUHn3trIyX2nxodqtMwwPDnHFF7W0itreZowc7UTk+Gevx5PNKlQWdTJt7JJoyRIsQAb4Y/ua4avyihu92iLuJ68kA0qVBQtx2ENwqksIQFTcc8cdae1uJHtg7HLDBH0pUqCM7GUdi3EZbGB86GWZMk00jcspB+9KlQW47iQrjONzEnHnjOajalby7V540Zu02k46jYT+lKlQbLSLeNUUICoXoB4UdjCrMMKO91pUqArET50Qtjhlp6VAYQ8UzUqVA1KlSoP//Z');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/login');
            return;
        }

        const loadProfile = async () => {
            try {
                const data = await authApi.getProfile(token);
                setUser(data.user);
                // Если сервер возвращает аватарку, устанавливаем её
                if (data.user?.avatar) {
                    setAvatar(data.user.avatar);
                }
                // В будущем здесь можно добавить логику присвоения аватарки на основе user.id или user.role
            } catch (error) {
                console.error('Failed to load profile');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [isAuthenticated, token, navigate]);

    if (loading) {
        return <div>Загрузка...</div>;
    }

    if (!user) {
        return <div>Ошибка загрузки профиля</div>;
    }

    const courses = [
        { id: 1, name: 'Математика ЕГЭ 2026', group: true, expires: '2025-08-31', price: 3800 },
        { id: 2, name: 'Физика ОГЭ', group: true, expires: '2025-07-15', price: 3800 },
        { id: 3, name: 'Информатика (индивидуально)', group: false, expires: null, price: 1200 },
    ];

    const assignedTasks = [
        { type: 'лекция', title: 'Лекция по алгебре №5', deadline: '2025-07-10', link: '/lecture/5' },
        { type: 'тест', title: 'Тест по геометрии', deadline: '2025-07-11', link: '/test/3' },
        { type: 'срез', title: 'Срез знаний по физике', deadline: '2025-07-12', link: '/test/4' },
    ];

    const completedTasks = [
        { type: 'лекция', title: 'Лекция по алгебре №4', date: '2025-07-05' },
        { type: 'тест', title: 'Тест по тригонометрии', date: '2025-07-03', score: '95%' },
    ];

    // Удаляем handleAvatarChange

    const handleTopUp = () => {
        alert('Переход к пополнению баланса (в будущем — платёжная форма)');
    };

    const handleExtend = (courseId: number) => {
        alert(`Продление курса #${courseId} на месяц (в будущем — оплата)`);
    };

    return (
        <>
            {/* Фон */}
            <Background />

            <div className={styles.profilePage}>
                {/* Сайдбар */}
                <Sidebar />

                {/* Основной контент профиля */}
                <div className={styles.profileContent}>
                    <div className={styles.profileHeader}>
                        <div className={styles.avatarWrapper}>
                            <img src={avatar} alt="Аватар" className={styles.avatar} />
                        </div>

                        <div className={styles.userInfo}>
                            <h1>{user.firstName} {user.lastName}</h1>
                            <p className={styles.phone}>{user.phone}</p>
                            {user.role !== 'teacher' && (
                                <p className={styles.balance}>
                                    Баланс: <span>{user.balance ?? 0} ₽</span>
                                    <button className={styles.topUpBtn} onClick={handleTopUp}>
                                        Пополнить
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Купленные курсы */}
                    <section className={styles.section}>
                        <h2>Купленные курсы</h2>
                        <div className={styles.coursesGrid}>
                            {courses.map(course => (
                                <div key={course.id} className={styles.courseCard}>
                                    <h3>{course.name}</h3>
                                    <p>Тип: {course.group ? 'Групповой' : 'Индивидуальный'}</p>
                                    {course.expires && <p>Действует до: {course.expires}</p>}
                                    <p>Стоимость: {course.price} ₽</p>

                                    {course.group && (
                                        <button className={styles.extendBtn} onClick={() => handleExtend(course.id)}>
                                            Продлить на месяц
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Лекции, тесты, срезы */}
                    <section className={styles.section}>
                        <h2>Лекции, тесты, срезы</h2>

                        <div className={styles.tasksContainer}>
                            <div className={styles.taskColumn}>
                                <h3>Назначенные</h3>
                                {assignedTasks.map(task => (
                                    <div key={task.title} className={styles.taskItem}>
                                        <span className={styles.taskType}>{task.type.toUpperCase()}</span>
                                        <Link to={task.link} className={styles.taskLink}>
                                            {task.title}
                                        </Link>
                                        <p className={styles.deadline}>Дедлайн: {task.deadline}</p>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.taskColumn}>
                                <h3>Прошедшие</h3>
                                {completedTasks.map(task => (
                                    <div key={task.title} className={styles.taskItem}>
                                        <span className={styles.taskType}>{task.type.toUpperCase()}</span>
                                        <span>{task.title}</span>
                                        <p className={styles.completedDate}>Пройдено: {task.date} {task.score ? `(${task.score})` : ''}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Интерактивная доска */}
                    <section className={styles.section}>
                        <h2>Интерактивная доска</h2>
                        <div className={styles.boardPlaceholder}>
                            <button
                                className={styles.openBoardBtn}
                                onClick={() => window.open(`/draw?userId=${user.id}`, '_blank', 'noopener')}
                            >
                                Открыть доску
                            </button>
                        </div>
                    </section>

                    {/* Обратная связь */}
                    <section className={styles.section}>
                        <h2>Обратная связь с репетитором</h2>
                        <div className={styles.feedbackPlaceholder}>
                            <p>Здесь будет форма обратной связи или чат с репетитором</p>
                            <button>Написать репетитору</button>
                        </div>
                    </section>

                    {/* Чат с поддержкой
                    <section className={styles.section}>
                        <h2>Чат с поддержкой</h2>
                        <Link to="/support" className={styles.supportLink}>
                            <button className={styles.supportBtn}>Открыть чат</button>
                        </Link>
                    </section> */}
                </div>
            </div>
        </>
    );
}