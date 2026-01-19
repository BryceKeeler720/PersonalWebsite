import React from 'react';
import './Navigation.css';

const Navigation: React.FC = () => {
  return (
    <nav className="room-navigation">
      <div className="nav-content">
        <a href="/" className="nav-logo">
          <span className="logo-text">BK</span>
        </a>

        <div className="nav-links">
          <a href="/traditional" className="nav-link">
            Traditional View
          </a>
          <a href="/blog" className="nav-link">
            Blog
          </a>
          <a href="https://github.com/BryceKeeler720" target="_blank" rel="noopener noreferrer" className="nav-link">
            GitHub
          </a>
          <a href="https://linkedin.com/in/bryce-keeler720" target="_blank" rel="noopener noreferrer" className="nav-link">
            LinkedIn
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
