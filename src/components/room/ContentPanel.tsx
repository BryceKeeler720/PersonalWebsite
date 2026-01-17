import React, { useEffect, useState } from 'react';
import type { ContentData } from './types';
import './ContentPanel.css';

interface ContentPanelProps {
  content: ContentData;
  onClose: () => void;
  hotspotId: string;
}

const ContentPanel: React.FC<ContentPanelProps> = ({ content, onClose, hotspotId }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setTimeout(() => setIsAnimating(true), 10);
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  // Position the panel based on which hotspot was clicked
  const getPanelPosition = () => {
    const positions: Record<string, string> = {
      'computer': 'panel-right',
      'server-rack': 'panel-left',
      'desk': 'panel-bottom',
      'bookshelf': 'panel-top-right'
    };
    return positions[hotspotId] || 'panel-right';
  };

  return (
    <>
      <div
        className={`content-overlay ${isAnimating ? 'visible' : ''}`}
        onClick={handleClose}
      />
      <div className={`content-panel ${getPanelPosition()} ${isAnimating ? 'visible' : ''}`}>
        <div className="panel-header">
          <div className="panel-title-section">
            <h2 className="panel-title">{content.title}</h2>
            <p className="panel-subtitle">{content.subtitle}</p>
          </div>
          <button
            className="close-button"
            onClick={handleClose}
            aria-label="Close panel"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="panel-content">
          {content.items.map((item, index) => (
            <div
              key={index}
              className="content-item"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {item.link ? (
                <a href={item.link} className="item-link">
                  <div className="item-header">
                    <h3 className="item-title">{item.title}</h3>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 13L13 7M13 7H7M13 7V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="item-description">{item.description}</p>
                  <div className="item-tags">
                    {item.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="tag">{tag}</span>
                    ))}
                  </div>
                </a>
              ) : (
                <>
                  <div className="item-header">
                    <h3 className="item-title">{item.title}</h3>
                  </div>
                  <p className="item-description">{item.description}</p>
                  <div className="item-tags">
                    {item.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="tag">{tag}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="panel-footer">
          <button className="action-button" onClick={handleClose}>
            Back to Room
          </button>
        </div>
      </div>
    </>
  );
};

export default ContentPanel;
