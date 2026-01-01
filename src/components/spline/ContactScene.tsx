import Spline from '@splinetool/react-spline';
import { useState } from 'react';

interface ContactSceneProps {
  onSceneLoad?: () => void;
}

export default function ContactScene({ onSceneLoad }: ContactSceneProps) {
  const [loading, setLoading] = useState(true);

  function handleLoad() {
    setLoading(false);
    onSceneLoad?.();
  }

  const linkStyle = {
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    color: 'var(--text-primary)',
    padding: '1rem',
    borderRadius: '12px',
    fontSize: '1rem'
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {loading && (
        <div className="loading-screen">
          <h1>Loading Contact...</h1>
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
          maxWidth: '500px'
        }}>
          <h2>Let&apos;s Connect</h2>
          <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            Thanks for exploring my portfolio!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <a href="mailto:your.email@example.com" style={linkStyle}>
              📧 Email Me
            </a>

            <a href="https://linkedin.com/in/yourprofile" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              💼 LinkedIn
            </a>

            <a href="https://github.com/BryceKeeler720" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              💻 GitHub
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
