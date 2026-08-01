import { useState, useCallback, useEffect } from 'react';
import { lectureApi } from '../../api/auth';
import styles from './LecturesPanel.module.scss';

interface Lecture {
    id: number;
    title: string;
    file_name: string;
    file_path: string;
    file_size: number;
    description: string;
    teacher_id: number;
    created_at: string;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LecturesPanelProps {
    token: string;
}

export default function LecturesPanel({ token }: LecturesPanelProps) {
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadLectures = useCallback(async () => {
        try {
            const data = await lectureApi.getAll();
            setLectures(data.lectures);
        } catch (err) {
            console.error('Failed to fetch lectures:', err);
        }
    }, []);

    useEffect(() => {
        loadLectures();
    }, [loadLectures]);

    const handleFileDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingIndex(null);

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        const title = file.name.replace(/\.[^/.]+$/, '');

        setUploading(true);
        setError(null);
        try {
            const data = await lectureApi.upload(token, title, file);
            setLectures(prev => [data.lecture, ...prev]);
        } catch (err) {
            console.error('Failed to upload lecture:', err);
            setError('Не удалось загрузить файл');
        } finally {
            setUploading(false);
        }
    }, [token]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const title = file.name.replace(/\.[^/.]+$/, '');

        setUploading(true);
        setError(null);
        try {
            const data = await lectureApi.upload(token, title, file);
            setLectures(prev => [data.lecture, ...prev]);
        } catch (err) {
            console.error('Failed to upload lecture:', err);
            setError('Не удалось загрузить файл');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (lectureId: number) => {
        try {
            await lectureApi.delete(token, lectureId);
            setLectures(prev => prev.filter(l => l.id !== lectureId));
        } catch (err) {
            console.error('Failed to delete lecture:', err);
            setError('Не удалось удалить лекцию');
        }
    };

    const handleDragStart = (index: number) => {
        setDraggingIndex(index);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggingIndex === null || draggingIndex === index) return;

        setLectures(prev => {
            const newList = [...prev];
            const [draggedItem] = newList.splice(draggingIndex, 1);
            newList.splice(index, 0, draggedItem);
            return newList;
        });
        setDraggingIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggingIndex === null) return;
        const ids = lectures.map(l => l.id);
        try {
            await lectureApi.reorder(token, ids);
        } catch (err) {
            console.error('Failed to reorder lectures:', err);
        }
        setDraggingIndex(null);
    };

    return (
        <div className={styles.lecturesPanel}>
            <h3 className={styles.sectionTitle}>Лекции</h3>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div
                className={`${styles.dropZone} ${uploading ? styles.uploading : ''}`}
                onDrop={handleFileDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
                {uploading ? (
                    <div className={styles.dropZoneContent}>
                        <span className={styles.dropIcon}>⏳</span>
                        <p>Загрузка файла...</p>
                    </div>
                ) : (
                    <div className={styles.dropZoneContent}>
                        <span className={styles.dropIcon}>📁</span>
                        <p>Перетащите файл лекции сюда или</p>
                        <label className={styles.fileInputLabel}>
                            выберите файл
                            <input
                                type="file"
                                onChange={handleFileSelect}
                                className={styles.fileInput}
                                accept="*/*"
                            />
                        </label>
                    </div>
                )}
            </div>

            <div className={styles.lecturesList}>
                {lectures.length === 0 ? (
                    <p className={styles.emptyText}>Лекции пока не загружены</p>
                ) : lectures.map((lecture, index) => (
                    <div
                        key={lecture.id}
                        className={`${styles.lectureItem} ${draggingIndex === index ? styles.dragging : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className={styles.dragHandle} title="Перетащите для сортировки">⠿</div>
                        <div className={styles.lectureInfo}>
                            <span className={styles.lectureTitle}>{lecture.title}</span>
                            <span className={styles.lectureMeta}>
                                Файл: {lecture.file_name} · {formatFileSize(lecture.file_size)}
                            </span>
                            {lecture.description && (
                                <span className={styles.lectureDesc}>{lecture.description}</span>
                            )}
                        </div>
                        <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(lecture.id)}
                            title="Удалить"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}