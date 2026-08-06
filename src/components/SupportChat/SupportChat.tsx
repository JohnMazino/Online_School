import { useState, useEffect, useRef } from 'react';
import styles from './SupportChat.module.scss';
import { AvatarIcon } from './SupportChatIcons';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'support';
    timestamp: Date;
}

interface SupportChatProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SupportChat({ isOpen, onClose }: SupportChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: 'Здравствуйте! Чем я могу вам помочь?',
            sender: 'support',
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        const newMessage: Message = {
            id: messages.length + 1,
            text: inputText.trim(),
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        setIsTyping(true);

        setTimeout(() => {
            const supportReply: Message = {
                id: messages.length + 2,
                text: 'Спасибо за ваше сообщение! Наш специалист свяжется с вами в ближайшее время.',
                sender: 'support',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, supportReply]);
            setIsTyping(false);
        }, 1500);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <div className={styles.avatar}>
                            <AvatarIcon />
                        </div>
                        <div className={styles.headerText}>
                            <span className={styles.title}>Чат поддержки</span>
                            <span className={styles.status}>Онлайн</span>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>✕</span>
                    </button>
                </div>

                <div className={styles.messagesContainer}>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.supportMessage}`}
                        >
                            <div className={styles.messageContent}>
                                <p className={styles.messageText}>{message.text}</p>
                                <span className={styles.messageTime}>
                                    {formatTime(message.timestamp)}
                                </span>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className={`${styles.message} ${styles.typingMessage}`}>
                            <div className={styles.typingIndicator}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputContainer}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Введите сообщение..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        maxLength={500}
                    />
                    <button
                        className={styles.sendBtn}
                        onClick={handleSendMessage}
                        disabled={!inputText.trim()}
                    >
                        <span style={{ fontSize: '20px', lineHeight: 1 }}>➤</span>
                    </button>
                </div>
            </div>
        </div>
    );
}