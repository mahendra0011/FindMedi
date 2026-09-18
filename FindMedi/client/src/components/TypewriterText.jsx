import React, { useState, useEffect, useRef } from 'react';

export default function TypewriterText({ text, delay = 8, chunkSize = 2, onComplete }) {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        const nextIndex = Math.min(currentIndex + chunkSize, text.length);
        setCurrentText(text.substring(0, nextIndex));
        setCurrentIndex(nextIndex);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, delay, chunkSize, text, onComplete]);

  return (
    <div className="leading-relaxed whitespace-pre-wrap">
      {currentText}
    </div>
  );
}
