import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';

import Background from './components/Background/Background';
import Sidebar from './components/SideBar/SideBar';

import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Draw from './pages/Draw';
import AdminPage from './pages/Admin';

import DisciplineCard from './components/DisciplineCard/DisciplineCard';

import styles from './App.module.scss';

// импорт фотографий
import student from './assets/pics/student.jpg'
import mathPhoto from './assets/pics/math.jpg';
import physicsPhoto from './assets/pics/fizika.jpg';
import informaticsPhoto from './assets/pics/informatika.jpg';

// импорт иконок
import RepetitorIcon from './assets/icons/repetitorBold.svg?react';
import DollarIcon from './assets/icons/dollar.svg?react';
import BookIcon from './assets/icons/book.svg?react';


function App() {
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadFromLocalStorage = useAuthStore((state) => state.loadFromLocalStorage);
  useEffect(() => {
    // Инициализируем состояние из localStorage при первой загрузке
    loadFromLocalStorage();
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Главная страница — с фоном и сайдбаром */}
        <Route
          path="/"
          element={
            <>
              <Background />

              <div className={styles.appWrapper}>
                <div className={styles.sidebarZone}>
                  <Sidebar />
                </div>

                <main className={styles.mainContent}>
                  <div className={styles.contentRectangle}>
                    {/* 1. Хедер */}
                    <header className={styles.header}>
                      <div className={styles.logoAndTitle}>
                        <img
                          src="src/assets/logo.svg"
                          alt="Логотип"
                          className={styles.logo}
                          width={100}
                          height={100}
                        />
                        <h1 className={styles.appName}>Платформа</h1>
                      </div>
                    </header>

                    {/* 2. блок: фото + кнопка */}
                    <section className={styles.heroSection}>
                      <div className={`${styles.heroContent} ${isAuthenticated ? styles.heroContentCentered : ''}`}>
                        <div className={styles.heroImageWrapper}>
                          <img
                            src={student}
                            alt="Ученик сидит за партой"
                            className={styles.heroImage}
                          />
                        </div>
                        {!isAuthenticated && (
                          <div className={styles.heroAction}>
                            <Link to="/login">
                              <button className={styles.bigAuthButton}>
                                Вход / Регистрация
                              </button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* 3. Новый блок — приветственный текст в белом прямоугольнике */}
                    <section className={styles.welcomeBox}>
                      <div className={styles.welcomeRectangle}>
                        <h2 className={styles.welcomeTitle}>Рады приветствовать вас!</h2>
                        <p className={styles.welcomeText}>
                          Рады приветствовать вас на платформе онлайн занятий! С Нами вы можете подготовиться к ОГЭ и ЕГЭ, а также мы предоставляем нашу общую подготовку для учеников не выпускного класса.
                        </p>
                      </div>
                    </section>

                    {/* 4. Карточки "Наши преимущества" */}
                    <section className={styles.advantagesSection}>
                      <h2 className={styles.sectionAdvantagesTitle}>Наши преимущества</h2>

                      <div className={styles.advantagesGrid}>
                        {/* Карточка 1 */}
                        <div className={styles.advantageCard}>
                          <div className={styles.cardFront}>
                            <div className={styles.iconWrapper}>
                              <RepetitorIcon width="48" height="48" />
                            </div>
                            <h3 className={styles.cardTitle}>Репетиторы</h3>
                          </div>

                          <div className={styles.cardBack}>
                            <p>
                              Каждый репетитор является дипломированным специалистом. Его документы об образовании выгружены на сайт и находятся в разделе «Репетиторы».
                            </p>
                          </div>
                        </div>

                        {/* Карточка 2 */}
                        <div className={styles.advantageCard}>
                          <div className={styles.cardFront}>
                            <div className={styles.iconWrapper}>
                              <DollarIcon width="48" height="48" />
                            </div>
                            <h3 className={styles.cardTitle}>Оплата</h3>
                          </div>

                          <div className={styles.cardBack}>
                            <p>
                              Оплатите занятия онлайн или оформите рассрочку через нашего партнёра — «Т-Банк». Также вы можете пополнить баланс личного кабинета, чтобы позже быстро записаться на урок, не беспокоясь об оплате.
                            </p>
                          </div>
                        </div>

                        {/* Карточка 3 */}
                        <div className={styles.advantageCard}>
                          <div className={styles.cardFront}>
                            <div className={styles.iconWrapper}>
                              <BookIcon width="48" height="48" />
                            </div>
                            <h3 className={styles.cardTitle}>Подход</h3>
                          </div>

                          <div className={styles.cardBack}>
                            <p>
                              У нас не только групповые занятия, но и есть возможность оформить график дополнительных индивидуальных занятий.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 5. Наши репетиторы */}
                    <section className={styles.tutorsSection}>
                      <h2 className={styles.sectionTutorTitle}>Наши репетиторы</h2>

                      <div className={styles.tutorsGrid}>
                        {/* Репетитор 1 */}
                        <div className={styles.tutorCard}>
                          <div className={styles.cardContent}>
                            <img
                              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop"
                              alt="Иван Петров"
                              className={styles.tutorPhoto}
                            />
                            <h3 className={styles.tutorNameFront}>Иван Петров</h3>
                            <div className={styles.infoOverlay}>
                              <h3 className={styles.tutorName}>Иван Петров</h3>
                              <p className={styles.tutorInfo}>
                                Магистр МГУ по математике и физике<br />
                                12 лет опыта, автор методик ЕГЭ 90+ баллов<br />
                                Подготовка к ЕГЭ / ОГЭ / олимпиадам
                              </p>
                              <div className={styles.documents}>
                                <span>Диплом МГУ (2010)</span>
                                <span>Свидетельство о повышении квалификации (2023)</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Репетитор 2 */}
                        <div className={styles.tutorCard}>
                          <div className={styles.cardContent}>
                            <img
                              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop"
                              alt="Анна Смирнова"
                              className={styles.tutorPhoto}
                            />
                            <h3 className={styles.tutorNameFront}>Анна Смирнова</h3>
                            <div className={styles.infoOverlay}>
                              <h3 className={styles.tutorName}>Анна Смирнова</h3>
                              <p className={styles.tutorInfo}>
                                Носитель языка (США)<br />
                                IELTS 8.5, TOEFL 115<br />
                                Разговорный английский, бизнес, подготовка к экзаменам
                              </p>
                              <div className={styles.documents}>
                                <span>TEFL / TESOL сертификат</span>
                                <span>Диплом University of California</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Репетитор 3 */}
                        <div className={styles.tutorCard}>
                          <div className={styles.cardContent}>
                            <img
                              src="https://images.unsplash.com/photo-1552058544-f2b08422138a?w=800&auto=format&fit=crop"
                              alt="Елена Ковалёва"
                              className={styles.tutorPhoto}
                            />
                            <h3 className={styles.tutorNameFront}>Елена Ковалёва</h3>
                            <div className={styles.infoOverlay}>
                              <h3 className={styles.tutorName}>Елена Ковалёва</h3>
                              <p className={styles.tutorInfo}>
                                Кандидат филологических наук<br />
                                15 лет стажа, автор учебных пособий<br />
                                Русский язык, литература, подготовка к ЕГЭ
                              </p>
                              <div className={styles.documents}>
                                <span>Кандидатская диссертация (2008)</span>
                                <span>Грант Минпросвещения РФ</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 6. Дисциплины */}
                    <section className={styles.disciplinesSection}>
                      <h2 className={styles.sectionTitle}>Дисциплины</h2>
                      <div className={styles.disciplinesGrid}>
                        <DisciplineCard
                          name="Математика"
                          photoUrl={mathPhoto}
                        />
                        <DisciplineCard
                          name="Физика"
                          photoUrl={physicsPhoto}
                        />
                        <DisciplineCard
                          name="Информатика"
                          photoUrl={informaticsPhoto}
                        />
                      </div>
                    </section>

                    {/* 7. Футер (Подвал) */}
                    <footer className={styles.footer}>
                      <div className={styles.footerContainer}>
                        <div className={styles.footerLogo}>
                          <img src="src/assets/logo.svg" alt="Логотип" className={styles.footerLogoImg} width={48} height={48} />
                          <div>
                            <h4 className={styles.footerTitle}>Платформа</h4>
                            <p className={styles.footerSubtitle}>Онлайн-уроки с лучшими репетиторами</p>
                          </div>
                        </div>

                        <div className={styles.footerLinks}>
                          <div className={styles.linkColumn}>
                            <h5>Платформа</h5>
                            <a href="#">О нас</a>
                            <a href="#">Как это работает</a>
                            <a href="#">Цены</a>
                            <a href="#">Для репетиторов</a>
                          </div>

                          <div className={styles.linkColumn}>
                            <h5>Ученикам</h5>
                            <a href="#">Найти репетитора</a>
                            <a href="#">Подготовка к ЕГЭ/ОГЭ</a>
                            <a href="#">Отзывы</a>
                            <a href="#">FAQ</a>
                          </div>

                          <div className={styles.linkColumn}>
                            <h5>Контакты</h5>
                            <a href="mailto:support@platforma.online">support@platforma.online</a>
                            <a href="tel:+31201234567">+31 (20) 123-45-67</a>
                            <div className={styles.socialIcons}>
                              <a href="#" aria-label="Telegram">Telegram</a>
                              <a href="#" aria-label="Instagram">Instagram</a>
                              <a href="#" aria-label="VK">VK</a>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.copyright}>
                        <p>© {new Date().getFullYear()} Платформа. Все права защищены.</p>
                      </div>
                    </footer>
                  </div>
                </main>
              </div>
            </>
          }
        />

        {/* Страницы входа и регистрации — без фона и сайдбара */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/draw" element={<Draw />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
