import React, { useEffect, useRef, useState } from 'react';
import './NewYear2026.css';

const NewYear2026 = ({ variant = 'fullscreen' }) => {
  const containerRef = useRef(null);
  const [showFullscreen, setShowFullscreen] = useState(variant === 'fullscreen');

  useEffect(() => {
    // Create floating particles
    const createParticles = () => {
      const container = containerRef.current;
      if (!container) return;

      const particleCount = variant === 'fullscreen' ? 50 : 20;
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#FFA500'];

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'ny-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
        particle.style.width = particle.style.height = (Math.random() * 8 + 4) + 'px';
        container.appendChild(particle);
      }
    };

    // Create confetti
    const createConfetti = () => {
      const confettiCount = variant === 'fullscreen' ? 100 : 30;
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

      for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
          const confetti = document.createElement('div');
          confetti.className = 'ny-confetti';
          confetti.style.left = Math.random() * 100 + '%';
          confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.animationDelay = Math.random() * 3 + 's';
          confetti.style.animationDuration = (Math.random() * 3 + 3) + 's';
          confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
          document.body.appendChild(confetti);

          setTimeout(() => {
            confetti.remove();
          }, 6000);
        }, i * 30);
      }
    };

    createParticles();
    
    if (variant === 'fullscreen') {
      createConfetti();
      // Hide fullscreen after 5 seconds
      const timer = setTimeout(() => {
        setShowFullscreen(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      // Continuous subtle confetti for navbar
      const confettiInterval = setInterval(() => {
        createConfetti();
      }, 8000);
      return () => {
        clearInterval(confettiInterval);
        const particles = document.querySelectorAll('.ny-particle');
        particles.forEach(p => p.remove());
      };
    }
  }, [variant]);

  if (variant === 'badge') {
    return (
      <div className="ny-navbar-badge">
        <span className="ny-badge-year">2026</span>
        <span className="ny-badge-icon">🎉</span>
      </div>
    );
  }

  if (!showFullscreen && variant === 'fullscreen') {
    return null;
  }

  return (
    <div className={`new-year-2026-container ${variant}`} ref={containerRef}>
      <div className="ny-main-text">
        <span className="ny-year-text">
          <span className="ny-digit">2</span>
          <span className="ny-digit">0</span>
          <span className="ny-digit">2</span>
          <span className="ny-digit">6</span>
        </span>
        <div className="ny-greeting">
          <span className="ny-greeting-text">Happy New Year</span>
          <div className="ny-sparkles">
            <span className="ny-sparkle">✨</span>
            <span className="ny-sparkle">🎉</span>
            <span className="ny-sparkle">🎊</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewYear2026;

