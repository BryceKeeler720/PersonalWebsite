import Spline from '@splinetool/react-spline';
import { useState } from 'react';

interface ProjectsSceneProps {
  onSceneLoad?: () => void;
}

const projects = [
  {
    title: 'Workday AI Recruiting App',
    description: 'AI recruiting application built with Workday Extend, published on Workday Marketplace.',
    tech: ['Workday Extend', 'XSLT', 'AI Integration']
  },
  {
    title: 'Reddit Content Automation',
    description: 'Automated system for creating and uploading social media content.',
    tech: ['n8n', 'FastAPI', 'Proxmox']
  },
  {
    title: 'Home Lab Infrastructure',
    description: 'Sophisticated home lab with Proxmox virtualization and self-hosted services.',
    tech: ['Proxmox', 'LXC', 'Pi-hole', 'Tailscale']
  }
];

export default function ProjectsScene({ onSceneLoad }: ProjectsSceneProps) {
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(0);

  function handleLoad() {
    setLoading(false);
    onSceneLoad?.();
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {loading && (
        <div className="loading-screen">
          <h1>Loading Projects...</h1>
          <div className="loading-spinner"></div>
        </div>
      )}
      
      <Spline
        scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
        onLoad={handleLoad}
      />

      {!loading && (
        <div className="ui-overlay" style={{
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '800px',
          width: 'calc(100% - 40px)'
        }}>
          <h2>Featured Projects</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
            {projects.map((project, index) => (
              <button
                key={index}
                onClick={() => setSelectedProject(index)}
                style={{
                  background: selectedProject === index 
                    ? 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))' 
                    : 'rgba(148, 163, 184, 0.1)',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '50px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {project.title}
              </button>
            ))}
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
              {projects[selectedProject].title}
            </h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              {projects[selectedProject].description}
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {projects[selectedProject].tech.map(tech => (
                <span key={tech} style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
