import React from 'react';
import type { FilterState } from '../dataTransforms';

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  visible?: boolean;
}

const ASSET_CLASSES = ['stock', 'crypto', 'forex', 'futures'] as const;

export default function FilterPanel({ filters, onChange, visible }: FilterPanelProps) {
  if (visible === false) return null;

  const toggleAssetClass = (cls: string) => {
    const current = filters.assetClasses;
    const updated = current.includes(cls)
      ? current.filter((c) => c !== cls)
      : [...current, cls];
    onChange({ ...filters, assetClasses: updated });
  };

  return (
    <div className="filter-panel market-panel">
      <div className="filter-section">
        <h4>Asset Classes</h4>
        <div className="filter-toggles">
          {ASSET_CLASSES.map((cls) => (
            <button
              key={cls}
              className={filters.assetClasses.includes(cls) ? 'active' : ''}
              onClick={() => toggleAssetClass(cls)}
            >
              {cls.charAt(0).toUpperCase() + cls.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-section">
        <h4>Signal Strength</h4>
        <div className="filter-slider">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.1}
            value={filters.minSignal}
            onChange={(e) =>
              onChange({ ...filters, minSignal: parseFloat(e.target.value) })
            }
          />
          <span className="slider-value">{filters.minSignal.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
