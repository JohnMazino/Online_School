import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { tutorApi } from './api/auth';

import Background from './components/Background/Background';
import Sidebar from './components/SideBar/SideBar';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Draw from './pages/Draw';
import AdminPage from './pages/Admin';
import TestConstructorPage from './pages/TestConstructorPage';
import TestPlayer from './pages/TestPlayer';
import TestResults from './pages/TestResults';
import QuizPlay from './components/Games/QuizPlay';
import MatchingPlay from './components/Games/MatchingPlay';
import BlockBlast from './components/Games/BlockBlast';

import DisciplineCard from './components/DisciplineCard/DisciplineCard';

import styles from './App.module.scss';

// импорт фотографий
import student from './assets/pics/student.jpg';
import mathPhoto from './assets/pics/math.jpg';
import physicsPhoto from './assets/pics/fizika.jpg';
import informaticsPhoto from './assets/pics/informatika.jpg';

// импорт иконок
import RepetitorIcon from './assets/icons/repetitorBold.svg?react';
import DollarIcon from './assets/icons/dollar.svg?react';
import BookIcon from './assets/icons/book.svg?react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [tutors, setTutors] = useState<Array<{ id: number; name: string; specialty: string; bio: string; education: string; documents: string; img_url: string }>>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTutor, setNewTutor] = useState({ 
    name: '', 
    specialty: '', 
    bio: '', 
    education: '', 
    documents: '', 
    photo: null as File | null,
    documentFiles: [] as File[] 
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [documentPreviews, setDocumentPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const loadFromLocalStorage = useAuthStore((state) => state.loadFromLocalStorage);

  useEffect(() => {
    loadFromLocalStorage();
    setIsLoading(false);

    console.log('App initialized - Auth State:', {
      isAuthenticated,
      user: user,
      userRole: user?.role
    });

    tutorApi.getAll().then((data) => {
        setTutors(data.tutors);
      }).catch((err) => {
        console.error('Failed to fetch tutors:', err);
      });
  }, []);

  const handleDeleteTutor = async (tutorId: number) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      await tutorApi.delete(token, tutorId);
      setTutors(prev => prev.filter(t => t.id !== tutorId));
    } catch (err) {
      console.error('Failed to delete tutor:', err);
      setError('Не удалось удалить репетитора');
    }
  };

    const handleAddTutor = async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    if (!newTutor.name || !newTutor.specialty) return;
    try {
      // Объединяем документы в одно поле через запятую или массив
      const documentsString = newTutor.documentFiles.length > 0 
        ? newTutor.documentFiles.map(f => f.name).join(', ')
        : newTutor.documents;

      const data = await tutorApi.add(
        token, 
        newTutor.name, 
        newTutor.specialty, 
        newTutor.bio, 
        newTutor.education, 
        documentsString, // Передаем как строку
        newTutor.photo || undefined
      );
      setTutors(prev => [data.tutor, ...prev]);
      setNewTutor({ name: '', specialty: '', bio: '', education: '', documents: '', photo: null, documentFiles: [] });
      setPhotoPreview(null);
      setDocumentPreviews([]);
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add tutor:', err);
      setError('Не удалось добавить репетитора');
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setNewTutor(prev => ({
        ...prev,
        documentFiles: [...prev.documentFiles, ...fileArray]
      }));
      const previews = fileArray.map(file => URL.createObjectURL(file));
      setDocumentPreviews(prev => [...prev, ...previews]);
    }
  };

  const removeDocument = (index: number) => {
    setNewTutor(prev => ({
      ...prev,
      documentFiles: prev.documentFiles.filter((_, i) => i !== index)
    }));
    setDocumentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
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

                    {!isAuthenticated && (
                      <section className={styles.heroSection}>
                        <div className={styles.heroContent}>
                          <div className={styles.heroImageWrapper}>
                            <img
                              src={student}
                              alt="Ученик сидит за партой"
                              className={styles.heroImage}
                            />
                          </div>
                          <div className={styles.heroAction}>
                            <Link to="/login">
                              <button className={styles.bigAuthButton}>
                                Вход / Регистрация
                              </button>
                            </Link>
                          </div>
                        </div>
                      </section>
                    )}

                    <section className={styles.welcomeBox}>
                      <div className={styles.welcomeRectangle}>
                        <h2 className={styles.welcomeTitle}>Рады приветствовать вас!</h2>
                        <p className={styles.welcomeText}>
                          Рады приветствовать вас на платформе онлайн занятий! С Нами вы можете подготовиться к ОГЭ и ЕГЭ, а также мы предоставляем нашу общую подготовку для учеников не выпускного класса.
                        </p>
                      </div>
                    </section>

                    <section className={styles.advantagesSection}>
                      <h2 className={styles.sectionAdvantagesTitle}>Наши преимущества</h2>

                      <div className={styles.advantagesGrid}>
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

                    <section id="tutors-section" className={styles.tutorsSection}>
                      <div className={styles.tutorsHeader}>
                        <h2 className={styles.sectionTutorTitle}>Наши репетиторы</h2>
                        {isAuthenticated && user?.role === 'admin' && (
                          <button
                            type="button"
                            className={`${styles.addTutorBtn} ${showAddForm ? styles.addTutorBtnActive : ''}`}
                            onClick={() => setShowAddForm(!showAddForm)}
                          >
                            {showAddForm ? '✕ Закрыть' : '+ Добавить репетитора'}
                          </button>
                        )}
                      </div>

                      {showAddForm && (
                        <div className={styles.addTutorForm}>
                          <input
                            type="text"
                            placeholder="Имя"
                            value={newTutor.name}
                            onChange={(e) => setNewTutor(prev => ({ ...prev, name: e.target.value }))}
                          />
                          <input
                            type="text"
                            placeholder="Специализация"
                            value={newTutor.specialty}
                            onChange={(e) => setNewTutor(prev => ({ ...prev, specialty: e.target.value }))}
                          />
                          <textarea
                            placeholder="Описание"
                            value={newTutor.bio}
                            onChange={(e) => setNewTutor(prev => ({ ...prev, bio: e.target.value }))}
                          />
                          <input
                            type="text"
                            placeholder="Образование"
                            value={newTutor.education}
                            onChange={(e) => setNewTutor(prev => ({ ...prev, education: e.target.value }))}
                          />
                          <input
                            type="text"
                            placeholder="Документы (краткое описание)"
                            value={newTutor.documents}
                            onChange={(e) => setNewTutor(prev => ({ ...prev, documents: e.target.value }))}
                          />
                          
                          <div className={styles.uploadSection}>
                            <label className={styles.uploadLabel}>
                              <span className={styles.uploadIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 4V16M12 16L8 12M12 16L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M20 16V20H4V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </span>
                              <span>Фото репетитора</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setNewTutor(prev => ({ ...prev, photo: file }));
                                    setPhotoPreview(URL.createObjectURL(file));
                                  }
                                }}
                              />
                            </label>
                            {photoPreview && (
                              <div className={styles.filePreview}>
                                <img src={photoPreview} alt="Preview" className={styles.addTutorPhotoPreview} />
                                <button 
                                  className={styles.removeFileBtn}
                                  onClick={() => {
                                    setPhotoPreview(null);
                                    setNewTutor(prev => ({ ...prev, photo: null }));
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          <div className={styles.uploadSection}>
                            <label className={styles.uploadLabel}>
                              <span className={styles.uploadIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 6H20V18H4V6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M8 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M8 14H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </span>
                              <span>Документы (PDF)</span>
                              <input
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={handleDocumentChange}
                              />
                            </label>
                            {documentPreviews.length > 0 && (
                              <div className={styles.documentList}>
                                {newTutor.documentFiles.map((file, index) => (
                                  <div key={index} className={styles.documentItem}>
                                    <span className={styles.documentName}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      {file.name}
                                    </span>
                                    <button 
                                      className={styles.removeFileBtn}
                                      onClick={() => removeDocument(index)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <button type="button" className={styles.saveTutorBtn} onClick={handleAddTutor}>
                            Сохранить
                          </button>
                        </div>
                      )}

                      {error && <div className={styles.errorBanner}>{error}</div>}

                      <div
                        className={`${styles.tutorsGrid} ${
                          tutors.length === 1
                            ? styles.single
                            : tutors.length <= 3
                              ? styles.few
                              : ''
                        }`}>
                        {tutors.map((tutor) => (
                          <div className={styles.tutorCard} key={tutor.id}>
                            {isAuthenticated && user?.role === 'admin' && (
                              <div className={styles.deleteTutorBtn}
                                onClick={() => handleDeleteTutor(tutor.id)}
                                title="Удалить"
                              >
                                ✕
                              </div>
                            )}
                            <div className={styles.cardContent}>
                              <img
                                src={
                                  tutor.img_url
                                    ? tutor.img_url.startsWith('http')
                                      ? tutor.img_url
                                      : `${API_BASE}${tutor.img_url}`
                                    : undefined
                                }
                                alt={tutor.name}
                                className={styles.tutorPhoto}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <h3 className={styles.tutorNameFront}>{tutor.name}</h3>
                              <div className={styles.infoOverlay}>
                                <h3 className={styles.tutorName}>{tutor.name}</h3>
                                <p className={styles.tutorInfo}>
                                  {tutor.specialty}<br />
                                  {tutor.bio}
                                </p>
                                {tutor.education && (
                                  <p className={styles.tutorInfo}>{tutor.education}</p>
                                )}
                                {tutor.documents && (
                                  <div className={styles.documents}>
                                    <span>{tutor.documents}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className={styles.disciplinesSection}>
                      <h2 className={styles.sectionTitle}>Дисциплины</h2>
                      <div className={styles.disciplinesGrid}>
                        <DisciplineCard name="Математика" photoUrl={mathPhoto} />
                        <DisciplineCard name="Физика" photoUrl={physicsPhoto} />
                        <DisciplineCard name="Информатика" photoUrl={informaticsPhoto} />
                      </div>
                    </section>

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

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/test-constructor" element={<TestConstructorPage />} />
        <Route path="/test/:testId/results" element={<TestResults />} />
        <Route path="/test/:testId" element={<TestPlayer />} />
        <Route path="/quiz/:topicId" element={<QuizPlay />} />
        <Route path="/matching/:topicId" element={<MatchingPlay />} />
        <Route path="/blockblast" element={<BlockBlast />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/draw" element={<Draw />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;