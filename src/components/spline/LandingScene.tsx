import Spline from '@splinetool/react-spline';
import { useState } from 'react';

interface LandingSceneProps {
  onSceneLoad?: () => void;
  onInteraction?: () => void;
}

export default function LandingScene({ onSceneLoad, onInteraction }: LandingSceneProps) {
  const [loading, setLoading] = useState(true);

  function handleLoad() {
    setLoading(false);
    onSceneLoad?.();
    console.log('Landing scene loaded');
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {loading && (
        <div className="loading-screen">
          <h1>Loading Experience...</h1>
          <div className="loading-spinner"></div>
        </div>
      )}
      
      <Spline
        scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
        onLoad={handleLoad}
      />

      {!loading && (
        <div className="ui-overlay" style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          <h2>Welcome to My Portfolio</h2>
          <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            Navigate through the 3D world to explore my work, skills, and projects.
          </p>
          <button
            onClick={onInteraction}
            style={{
              background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))',
              border: 'none',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '50px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Start Journey →
          </button>
        </div>
      )}
    </div>
  );
}
