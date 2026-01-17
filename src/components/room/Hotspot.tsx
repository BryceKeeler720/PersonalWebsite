import React from 'react';
import type { HotspotData } from './types';
import './Hotspot.css';

interface HotspotProps {
  data: HotspotData;
  isActive: boolean;
  onClick: () => void;
}

const Hotspot: React.FC<HotspotProps> = ({ data, isActive, onClick }) => {
  return (
    <button
      className={`hotspot ${isActive ? 'active' : ''}`}
      style={{
        left: `${data.position.x}%`,
        top: `${data.position.y}%`,
      }}
      onClick={onClick}
      aria-label={`View ${data.label}`}
    >
      <div className="hotspot-pulse"></div>
      <div className="hotspot-icon">
        <span className="plus">+</span>
      </div>
      <div className="hotspot-label">
        <span className="label-icon">{data.icon}</span>
        <span className="label-text">{data.label}</span>
      </div>
    </button>
  );
};

export default Hotspot;
