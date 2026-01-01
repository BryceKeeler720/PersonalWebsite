import { useState, useEffect } from 'react';
import LandingScene from '../spline/LandingScene';
import AboutScene from '../spline/AboutScene';
import ProjectsScene from '../spline/ProjectsScene';
import ContactScene from '../spline/ContactScene';
import ProgressBar from './ProgressBar';
import Controls from './Controls';
import '../../styles/game.css';

type Level = 'landing' | 'about' | 'projects' | 'contact';

export default function GameContainer() {
  const [currentLevel, setCurrentLevel] = useState<Level>('landing');
  const [showControls, setShowControls] = useState(true);

  const levels: Level[] = ['landing', 'about', 'projects', 'contact'];
  const currentLevelIndex = levels.indexOf(currentLevel);
  const progress = ((currentLevelIndex + 1) / levels.length) * 100;

  function nextLevel() {
    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex < levels.length - 1) {
      setCurrentLevel(levels[currentIndex + 1]);
    }
  }

  function previousLevel() {
    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex > 0) {
      setCurrentLevel(levels[currentIndex - 1]);
    }
  }

  function goToLevel(level: Level) {
    setCurrentLevel(level);
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        nextLevel();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        previousLevel();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowControls(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentLevel]);

  return (
    <div className="game-container">
      <ProgressBar 
        progress={progress} 
        currentLevel={currentLevelIndex + 1}
        totalLevels={levels.length}
      />

      <a href="/traditional" className="skip-button">
        Skip to Traditional View
      </a>

      {showControls && <Controls />}

      {currentLevel === 'landing' && (
        <LandingScene onInteraction={nextLevel} />
      )}
      {currentLevel === 'about' && <AboutScene />}
      {currentLevel === 'projects' && <ProjectsScene />}
      {currentLevel === 'contact' && <ContactScene />}

      <div style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '1rem',
        zIndex: 100
      }}>
        {currentLevelIndex > 0 && (
          <button
            onClick={previousLevel}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '50px',
              cursor: 'pointer'
            }}
          >
            ← Previous
          </button>
        )}
        
        {currentLevelIndex < levels.length - 1 && (
          <button
            onClick={nextLevel}
            style={{
              background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))',
              border: 'none',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '50px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Next →
          </button>
        )}
      </div>

      <div style={{
        position: 'fixed',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        zIndex: 100
      }}>
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => goToLevel(level)}
            title={level.charAt(0).toUpperCase() + level.slice(1)}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: currentLevel === level 
                ? 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))'
                : 'rgba(148, 163, 184, 0.3)',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          />
        ))}
      </div>
    </div>
  );
}
