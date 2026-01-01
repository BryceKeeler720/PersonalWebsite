import Spline from '@splinetool/react-spline';
import { useState } from 'react';

interface AboutSceneProps {
  onSceneLoad?: () => void;
}

export default function AboutScene({ onSceneLoad }: AboutSceneProps) {
  const [loading, setLoading] = useState(true);

  function handleLoad() {
    setLoading(false);
    onSceneLoad?.();
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {loading && (
        <div className="loading-screen">
          <h1>Loading About Me...</h1>
          <div className="loading-spinner"></div>
        </div>
      )}
      
      <Spline
        scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
        onLoad={handleLoad}
      />

      {!loading && (
        <div className="ui-overlay" style={{
          top: '20px',
          left: '20px',
          maxWidth: '400px'
        }}>
          <h2>About Me</h2>
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              Bryce Keeler
            </h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              Digital Consulting Analyst @ Huron Consulting Group
            </p>
            
            <h4 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>
              Skills
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['Workday Integrations', 'Workday Extend', 'SQL/WQL', 'Python', 'React', 'TypeScript'].map(skill => (
                <span key={skill} style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
