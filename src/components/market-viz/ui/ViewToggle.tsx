import React from 'react';

interface ViewToggleProps {
  viewMode: '2d' | '3d';
  onChange: (mode: '2d' | '3d') => void;
}

export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle market-panel">
      <button className={viewMode === '2d' ? 'active' : ''} onClick={() => onChange('2d')}>2D</button>
      <button className={viewMode === '3d' ? 'active' : ''} onClick={() => onChange('3d')}>3D</button>
    </div>
  );
}
