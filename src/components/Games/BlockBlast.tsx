import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { quizzesApi } from '../../api/quizzes';
import Sidebar from '../SideBar/SideBar';
import Background from '../Background/Background';
import styles from './BlockBlast.module.scss';
import quizStyles from './QuizPlay.module.scss';

interface BlockPiece {
  id: number;
  shape: number[][];
  color: string;
}

interface GameQuestion {
  id: number;
  text: string;
  type?: 'single' | 'matching';
  options?: string[];
  answer?: string;
  matchingPairs?: { left: string; right: string }[];
}

const BOARD_SIZE = 8;

const availablePieces: Omit<BlockPiece, 'id'>[] = [
  { shape: [[1, 1], [1, 1]], color: '#64b5f6' },
  { shape: [[1, 1, 1]], color: '#81c784' },
  { shape: [[1, 1]], color: '#ffb74d' },
  { shape: [[1, 0], [1, 0], [1, 1]], color: '#ba68c8' },
  { shape: [[1, 1, 1], [0, 1, 0]], color: '#4db6ac' },
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#e57373' },
  { shape: [[1]], color: '#ffd54f' },
  { shape: [[1, 0], [1, 0], [1, 0], [1, 1]], color: '#9575cd' },
  { shape: [[1, 0], [1, 1]], color: '#4fc3f7' },
];

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateRandomPieces(): BlockPiece[] {
  const picked = shuffle(availablePieces).slice(0, 3);
  return picked.map((piece, index) => ({
    ...piece,
    id: Date.now() + index,
  }));
}

export default function BlockBlast() {
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [clearingLines, setClearingLines] = useState<{ rows: number[]; cols: number[] }>({ rows: [], cols: [] });
  const [board, setBoard] = useState<number[][]>(createEmptyBoard());
  const [pieces, setPieces] = useState<BlockPiece[]>([]);
  const [pieceColors, setPieceColors] = useState<Record<number, string>>({});
  const [draggedPieceId, setDraggedPieceId] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{ row: number; col: number; piece: BlockPiece } | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [questionBank, setQuestionBank] = useState<GameQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const buildNewPieces = useCallback(() => {
    const nextPieces = generateRandomPieces();
    const nextColors = nextPieces.reduce<Record<number, string>>((acc, p) => {
      acc[p.id] = p.color;
      return acc;
    }, {});
    setPieceColors(prev => ({ ...prev, ...nextColors }));
    return nextPieces;
  }, []);

  // Загрузка вопросов
  useEffect(() => {
    const loadAllQuestions = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const allTopics = await quizzesApi.getAllTopics(token);
        const loaded: GameQuestion[] = [];

        for (const topic of allTopics) {
          const qs = await quizzesApi.getQuestionsByTopic(token, topic.id);
          qs.forEach((q: any) => {
            if (q.type === 'single' && q.options?.length) {
              const answer = q.options[q.correctIndex ?? 0];
              loaded.push({
                id: q.id,
                text: q.text,
                type: 'single',
                options: q.options,
                answer,
              });
            } else if (q.type === 'matching' && q.matchingPairs?.length) {
              loaded.push({
                id: q.id,
                text: q.text,
                type: 'matching',
                matchingPairs: q.matchingPairs,
              });
            }
          });
        }

        setQuestionBank(loaded.length > 0 ? loaded : [
          { id: 1, text: 'Сколько градусов в прямом угле?', type: 'single', options: ['45', '90', '180'], answer: '90' },
        ]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadAllQuestions();
  }, [token]);

  // Инициализация игры
  useEffect(() => {
    if (loading) return;
    resetGame();
  }, [loading]);

  const resetGame = () => {
    const nextPieces = buildNewPieces();
    setPieces(nextPieces);
    setBoard(createEmptyBoard());
    setScore(0);
    setLives(3);
    setShowGameOverModal(false);
    setShowQuestionModal(false);
    setQuestion(null);
    setSelectedAnswer('');
  };

  const getRandomQuestion = useCallback(() => {
    if (questionBank.length === 0) return null;
    return questionBank[Math.floor(Math.random() * questionBank.length)];
  }, [questionBank]);

  const canPlacePieceAt = (brd: number[][], piece: BlockPiece, row: number, col: number): boolean => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 1) continue;
        const tr = row + r, tc = col + c;
        if (tr < 0 || tr >= BOARD_SIZE || tc < 0 || tc >= BOARD_SIZE || brd[tr][tc] !== 0) {
          return false;
        }
      }
    }
    return true;
  };

  const placePiece = (piece: BlockPiece, row: number, col: number) => {
    let newBoard = board.map(line => [...line]);

    // Размещаем фигуру
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] === 1) {
          newBoard[row + r][col + c] = piece.id;
        }
      }
    }

    // Находим полные линии
    const fullRows: number[] = [];
    const fullCols: number[] = [];

    newBoard.forEach((r, i) => {
      if (r.every(c => c !== 0)) fullRows.push(i);
    });

    for (let c = 0; c < BOARD_SIZE; c++) {
      if (newBoard.every(row => row[c] !== 0)) fullCols.push(c);
    }

    // Если есть линии для очистки — запускаем анимацию
    if (fullRows.length > 0 || fullCols.length > 0) {
      setClearingLines({ rows: fullRows, cols: fullCols });

      // Задержка перед очисткой
      setTimeout(() => {
        // Очищаем линии
        fullRows.forEach(r => {
          newBoard[r].fill(0);
        });
        fullCols.forEach(c => {
          newBoard.forEach(row => row[c] = 0);
        });

        setBoard(newBoard);
        setScore(prev => prev + (fullRows.length + fullCols.length) * 100);
        setClearingLines({ rows: [], cols: [] });
      }, 300); // длительность анимации
    } else {
      setBoard(newBoard);
    }

    return newBoard;
  };

  const handleDragStart = (pieceId: number) => setDraggedPieceId(pieceId);

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    const piece = pieces.find(p => p.id === draggedPieceId);
    if (!piece) return;
    if (canPlacePieceAt(board, piece, row, col)) {
      setDragPreview({ row, col, piece });
    } else {
      setDragPreview(null);
    }
  };

  const handleDrop = (row: number, col: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview(null);
    const piece = pieces.find(p => p.id === draggedPieceId);
    if (!piece || !canPlacePieceAt(board, piece, row, col)) return;

    const newBoard = placePiece(piece, row, col);
    const remaining = pieces.filter(p => p.id !== piece.id);
    setPieces(remaining);
    setDraggedPieceId(null);

    if (remaining.length === 0) {
      const nextQuestion = getRandomQuestion();
      if (nextQuestion) {
        setQuestion(nextQuestion);
        setSelectedAnswer('');
        setShowQuestionModal(true);
      }
    } else if (!remaining.some(p =>
        Array.from({ length: BOARD_SIZE * BOARD_SIZE }).some((_, i) => {
          const r = Math.floor(i / BOARD_SIZE);
          const c = i % BOARD_SIZE;
          return canPlacePieceAt(newBoard, p, r, c);
        })
    )) {
      setShowGameOverModal(true);
    }
  };

  // MATCHING QUESTION COMPONENT
  const MatchingQuestionContent = ({
                                     question,
                                     onComplete
                                   }: {
    question: GameQuestion;
    onComplete: (isCorrect: boolean) => void;
  }) => {
    const [leftItems] = useState(() => question.matchingPairs!.map(p => p.left));
    const [rightItems, setRightItems] = useState(() =>
        shuffle(question.matchingPairs!.map(p => p.right))
    );
    const [showResult, setShowResult] = useState(false);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

      if (dragIndex === dropIndex) return;

      const newRightItems = [...rightItems];

      [newRightItems[dragIndex], newRightItems[dropIndex]] =
          [newRightItems[dropIndex], newRightItems[dragIndex]];

      setRightItems(newRightItems);
    };

    const checkAnswers = () => {
      const isCorrect = leftItems.every((left, index) => {
        const correctRight = question.matchingPairs!.find(p => p.left === left)?.right;
        return rightItems[index] === correctRight;
      });

      setShowResult(true);
      setTimeout(() => onComplete(isCorrect), 800);
    };

    return (
        <>
          <div className={quizStyles.matchingBoard}>
            {/* Левая колонка */}
            <div className={quizStyles.matchingLeftColumn}>
              {leftItems.map((item, idx) => (
                  <div key={idx} className={quizStyles.matchingRow}>
                    <div className={quizStyles.matchingLeft}>{item}</div>
                  </div>
              ))}
            </div>

            {/* Правая колонка */}
            <div className={quizStyles.matchingRightColumn}>
              {rightItems.map((item, idx) => {
                const correctAnswer = question.matchingPairs?.find(
                    p => p.left === leftItems[idx]
                )?.right;
                const isCorrect = showResult && item === correctAnswer;
                const isWrong = showResult && item !== correctAnswer;

                return (
                    <div
                        key={idx}
                        draggable={!showResult}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`${quizStyles.matchingRow} ${quizStyles.matchingRightRow}
                  ${isCorrect ? quizStyles.matchingRowCorrect : ''}
                  ${isWrong ? quizStyles.matchingRowWrong : ''}`}
                    >
                      <div className={quizStyles.matchingRight}>{item}</div>
                      {showResult && (
                          <span className={quizStyles.matchingState}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                      )}
                    </div>
                );
              })}
            </div>
          </div>

          {!showResult && (
              <div className={quizStyles.actionButtons}>
                <button className={quizStyles.nextBtn} onClick={checkAnswers}>
                  Проверить
                </button>
              </div>
          )}
        </>
    );
  };

  const handleQuestionSubmit = () => {
    if (!question || !selectedAnswer) return;
    const isCorrect = selectedAnswer === question.answer;
    const nextLives = isCorrect ? lives : Math.max(0, lives - 1);
    setLives(nextLives);
    setShowQuestionModal(false);

    if (nextLives <= 0) {
      setShowGameOverModal(true);
      return;
    }

    const nextPieces = buildNewPieces();
    setPieces(nextPieces);
  };

  const handleMatchingComplete = (isCorrect: boolean) => {
    const nextLives = isCorrect ? lives : Math.max(0, lives - 1);
    setLives(nextLives);
    setShowQuestionModal(false);

    if (nextLives <= 0) {
      setShowGameOverModal(true);
      return;
    }

    const nextPieces = buildNewPieces();
    setPieces(nextPieces);
  };

  return (
      <div className={styles.blockBlastPage}>
        <Sidebar />
        <div className={styles.gameContent}>
          <Background />

          <div className={styles.gameWindow}>
            <div className={styles.gameHeader}>
              <button type="button" className={styles.backButton} onClick={() => navigate('/profile')}>
                ← Назад к профилю
              </button>
              <div>
                <p className={styles.gameSubtitle}>Размещайте фигуры • Очищайте линии • Отвечайте на вопросы</p>
              </div>
            </div>

            <div className={styles.statusBar}>
              <span>Очки: <strong>{score}</strong></span>

              <div className={styles.livesContainer}>
                <span>Жизни:</span>
                <div className={styles.hearts}>
                  {[1, 2, 3].map((heart) => (
                      <span
                          key={heart}
                          className={styles.heart}
                      >
          {heart <= lives ? '❤️' : '♡'}
        </span>
                  ))}
                </div>
              </div>

              <span>Фигур осталось: <strong>{pieces.length}</strong></span>
            </div>

            <div className={styles.gridAndSidebar}>
              <div className={styles.boardGrid}>
                {board.map((rowData, row) => (
                    <div key={row} className={styles.boardRow}>
                      {rowData.map((cell, col) => {
                        const isPreview = dragPreview &&
                            row >= dragPreview.row && row < dragPreview.row + dragPreview.piece.shape.length &&
                            col >= dragPreview.col && col < dragPreview.col + dragPreview.piece.shape[0].length &&
                            dragPreview.piece.shape[row - dragPreview.row][col - dragPreview.col] === 1;

                        const isClearingRow = clearingLines.rows.includes(row);
                        const isClearingCol = clearingLines.cols.includes(col);
                        const isClearing = isClearingRow || isClearingCol;

                        return (
                            <div
                                key={col}
                                className={`
            ${styles.boardCell} 
            ${cell !== 0 ? styles.filledCell : ''} 
            ${isPreview ? styles.previewGhost : ''}
            ${isClearing ? styles.clearing : ''}
          `}
                                style={cell !== 0 ? { backgroundColor: pieceColors[cell] } : undefined}
                                onDragOver={(e) => handleDragOver(e, row, col)}
                                onDrop={(e) => handleDrop(row, col, e)}
                                onDragLeave={() => setDragPreview(null)}
                            />
                        );
                      })}
                    </div>
                ))}
              </div>

              <aside className={styles.sidePanel}>
                <div className={styles.sideSection}>
                  <h2>Фигуры</h2>
                  <div className={styles.pieceList}>
                    {pieces.map(piece => (
                        <div
                            key={piece.id}
                            className={`${styles.pieceCard} ${draggedPieceId === piece.id ? styles.draggingPiece : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(piece.id)}
                            onDragEnd={() => {
                              setDraggedPieceId(null);
                              setDragPreview(null);
                            }}
                        >
                          <div className={styles.piecePreview}>
                            {piece.shape.map((shapeRow, r) => (
                                <div key={r} className={styles.pieceRow}>
                                  {shapeRow.map((val, c) => (
                                      <span
                                          key={c}
                                          className={`${styles.previewCell} ${val === 1 ? styles.previewFilled : ''}`}
                                          style={val === 1 ? { backgroundColor: piece.color } : {}}
                                      />
                                  ))}
                                </div>
                            ))}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            {/* МОДАЛЬНОЕ ОКНО */}
            {showQuestionModal && question && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modalWindow}>
                    <div className={quizStyles.questionCard}>
                      <span className={quizStyles.questionNumber}>Вопрос</span>
                      <p className={quizStyles.questionText}>{question.text}</p>
                    </div>

                    {question.type === 'matching' && question.matchingPairs ? (
                        <MatchingQuestionContent
                            question={question}
                            onComplete={handleMatchingComplete}
                        />
                    ) : (
                        // Single choice
                        <div className={quizStyles.answersSection}>
                          {question.options?.map((option, idx) => (
                              <button
                                  key={idx}
                                  className={`${quizStyles.answerCard} ${selectedAnswer === option ? quizStyles.answerSelected : ''}`}
                                  onClick={() => setSelectedAnswer(option)}
                                  type="button"
                              >
                                <span className={quizStyles.answerLetter}>{String.fromCharCode(65 + idx)}</span>
                                <span className={quizStyles.answerText}>{option}</span>
                              </button>
                          ))}
                          <div className={quizStyles.actionButtons}>
                            <button
                                className={quizStyles.nextBtn}
                                onClick={handleQuestionSubmit}
                                disabled={!selectedAnswer}
                            >
                              Ответить
                            </button>
                          </div>
                        </div>
                    )}
                  </div>
                </div>
            )}

            {showGameOverModal && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modalWindow}>
                    <div className={styles.gameOverModal}>
                      <h2>Игра окончена!</h2>
                      <p className={styles.finalScore}>
                        Вы набрали <strong>{score}</strong> очков
                      </p>

                      <div className={styles.gameOverActions}>
                        <button
                            onClick={resetGame}
                            className={styles.resetButton}
                        >
                          Играть снова
                        </button>
                        <button
                            onClick={() => navigate('/profile')}
                            className={styles.backToProfileButton}
                        >
                          Вернуться в профиль
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}