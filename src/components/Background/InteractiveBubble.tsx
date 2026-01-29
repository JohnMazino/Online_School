import { useEffect, useRef } from 'react';
import styles from './Background.module.scss'; // или отдельный модуль

export default function InteractiveBubble() {
    const bubbleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const bubble = bubbleRef.current;
        if (!bubble) return;

        let curX = 0;
        let curY = 0;
        let tgX = 0;
        let tgY = 0;

        const move = () => {
            curX += (tgX - curX) / 20;
            curY += (tgY - curY) / 20;
            bubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
            requestAnimationFrame(move);
        };

        const onMouseMove = (e: MouseEvent) => {
            tgX = e.clientX;
            tgY = e.clientY;
        };

        window.addEventListener('mousemove', onMouseMove);
        move();

        return () => window.removeEventListener('mousemove', onMouseMove);
    }, []);

    return <div ref={bubbleRef} className={styles.interactive} />;
}
