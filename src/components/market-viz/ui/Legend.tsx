import React from 'react';

interface LegendProps {
  viewMode: '2d' | '3d';
}

export default function Legend({ viewMode }: LegendProps) {
  return (
    <div className="market-legend market-panel">
      <div className="legend-section">
        <h4>Signal Strength</h4>
        <div className="legend-gradient">
          <div className="gradient-bar" />
          <div className="gradient-labels">
            <span>Sell</span>
            <span>Neutral</span>
            <span>Buy</span>
          </div>
        </div>
      </div>

      {viewMode === '3d' && (
        <div className="legend-section">
          <h4>Size Reference</h4>
          <div className="legend-sizes">
            <div className="size-item">
              <div className="size-cube small" />
              <span>Low Volatility</span>
            </div>
            <div className="size-item">
              <div className="size-cube large" />
              <span>High Volatility</span>
            </div>
          </div>
        </div>
      )}

      <div className="legend-section">
        <h4>Axes</h4>
        {viewMode === '3d' ? (
          <div className="legend-axes">
            <div className="axis-label"><strong>Y</strong> Price Change %</div>
            <div className="axis-label"><strong>X</strong> Sector</div>
            <div className="axis-label"><strong>Z</strong> Volume</div>
          </div>
        ) : (
          <div className="legend-axes">
            <div className="axis-label"><strong>Color</strong> Signal</div>
            <div className="axis-label"><strong>Size</strong> Volume</div>
          </div>
        )}
      </div>
    </div>
  );
}
