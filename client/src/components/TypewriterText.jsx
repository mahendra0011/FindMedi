import React, { useState, useEffect, useRef } from 'react';

export default function TypewriterText({ text, delay = 10, onComplete }) {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        const chunkSize = 2; // Append 2 characters at a time for smooth ChatGPT-like speed
        const nextIndex = Math.min(currentIndex + chunkSize, text.length);
        setCurrentText(text.substring(0, nextIndex));
        setCurrentIndex(nextIndex);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, delay, text, onComplete]);

  return (
    <div className="leading-relaxed whitespace-pre-wrap">
      {currentText}
    </div>
  );
}
