import { useState, useEffect, useRef } from 'react';

export const useWritingEffect = (text: string, deletingSpeed = 80, writingSpeed = 120) => {
    const [currentText, setCurrentText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const targetTextRef = useRef(text);

    useEffect(() => {
        if (text !== targetTextRef.current) {
            targetTextRef.current = text;
            setIsDeleting(true);
        }
    }, [text]);

    useEffect(() => {
        const handleTyping = () => {
            if (isDeleting) {
                if (currentText.length > 0) {
                    setCurrentText(currentText.substring(0, currentText.length - 1));
                } else {
                    setIsDeleting(false);
                }
            } else {
                const target = targetTextRef.current;
                if (currentText.length < target.length) {
                    setCurrentText(target.substring(0, currentText.length + 1));
                }
            }
        };

        const speed = isDeleting ? deletingSpeed : writingSpeed;
        const timer = setTimeout(handleTyping, speed);
        return () => clearTimeout(timer);
    }, [currentText, isDeleting]);

    return currentText;
};