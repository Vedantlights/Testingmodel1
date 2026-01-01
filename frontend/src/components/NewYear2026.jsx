import React, { useEffect, useState } from 'react';
import './NewYear2026.css';

const NewYear2026 = () => {
  const [showCelebration, setShowCelebration] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  
  // Show celebration for first 2 weeks of January 2026
  const currentDate = new Date();
  const isNewYearPeriod = currentDate.getMonth() === 0 && currentDate.getDate() <= 14;

  useEffect(() => {
    // Hide banner after 8 seconds
    const bannerTimer = setTimeout(() => {
      setShowBanner(false);
    }, 8000);

    // Hide confetti after 15 seconds
    const confettiTimer = setTimeout(() => {
      setShowCelebration(false);
    }, 15000);

    return () => {
      clearTimeout(bannerTimer);
      clearTimeout(confettiTimer);
    };
  }, []);

  if (!isNewYearPeriod) return null;

  return (
    <>
      {/* Confetti Animation */}
      {showCelebration && (
        <div className="new-year-confetti-container">
          {[...Array(60)].map((_, i) => (
            <div 
              key={i} 
              className="confetti" 
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3', '#ffd93d', '#6bcf7f', '#ff9ff3'][Math.floor(Math.random() * 10)]
              }} 
            />
          ))}
        </div>
      )}

      {/* Celebration Banner */}
      {showBanner && (
        <div className="new-year-banner">
          <span className="banner-emoji">🎉</span>
          <span className="banner-text">Happy New Year 2026!</span>
          <button 
            className="banner-close-btn"
            onClick={() => setShowBanner(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      {/* Sparkle Effects */}
      {showCelebration && (
        <div className="sparkle-container">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="sparkle" 
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 1}s`
              }} 
            />
          ))}
        </div>
      )}
    </>
  );
};

export default NewYear2026;

