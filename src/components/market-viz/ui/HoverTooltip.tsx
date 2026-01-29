import React from 'react';
import type { SignalSnapshot, AssetMetric } from '../../trading/types';
import { ASSET_INFO } from '../../../lib/trading/assets';

interface HoverTooltipProps {
  symbol: string;
  signal?: SignalSnapshot;
  metric?: AssetMetric;
  x: number;
  y: number;
}

export default function HoverTooltip({ symbol, signal, metric, x, y }: HoverTooltipProps) {
  const info = ASSET_INFO[symbol];
  const name = info?.name ?? symbol;

  return (
    <div className="hover-tooltip market-panel" style={{ left: x, top: y, position: 'fixed' }}>
      <div className="tooltip-symbol"><strong>{symbol}</strong></div>
      <div className="tooltip-name">{name}</div>
      {metric && (
        <>
          <div className="tooltip-price">
            {metric.price < 1 ? `$${metric.price.toFixed(4)}` : `$${metric.price.toFixed(2)}`}
          </div>
          <div
            className="tooltip-change"
            style={{ color: metric.changePercent >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {metric.changePercent >= 0 ? '+' : ''}
            {metric.changePercent.toFixed(2)}%
          </div>
        </>
      )}
      {signal && (
        <div className="tooltip-recommendation">{signal.recommendation.replace('_', ' ')}</div>
      )}
    </div>
  );
}
