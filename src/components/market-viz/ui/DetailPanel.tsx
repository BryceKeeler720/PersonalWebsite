import React from 'react';
import type { SignalSnapshot, AssetMetric } from '../../trading/types';
import { ASSET_INFO } from '../../../lib/trading/assets';

interface DetailPanelProps {
  symbol: string;
  signal?: SignalSnapshot;
  metric?: AssetMetric;
  onClose: () => void;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toString();
}

function formatPrice(p: number): string {
  return p < 1 ? `$${p.toFixed(4)}` : `$${p.toFixed(2)}`;
}

const SIGNAL_KEYS = ['momentum', 'meanReversion', 'vwapReversion', 'technical'] as const;

const SIGNAL_LABELS: Record<string, string> = {
  momentum: 'Momentum',
  meanReversion: 'Mean Reversion',
  vwapReversion: 'VWAP Reversion',
  technical: 'Technical',
};

export default function DetailPanel({ symbol, signal, metric, onClose }: DetailPanelProps) {
  const info = ASSET_INFO[symbol];
  const name = info?.name ?? symbol;

  return (
    <div className="detail-panel market-panel">
      <div className="detail-header">
        <div>
          <h2 className="detail-symbol">{symbol}</h2>
          <span className="detail-name">{name}</span>
        </div>
        <button className="detail-close" onClick={onClose}>
          &times;
        </button>
      </div>

      {metric && (
        <div className="detail-price-section">
          <span className="detail-price">{formatPrice(metric.price)}</span>
          <span
            className="detail-change"
            style={{ color: metric.changePercent >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {metric.changePercent >= 0 ? '+' : ''}
            {metric.changePercent.toFixed(2)}%
          </span>
        </div>
      )}

      <hr className="detail-divider" />

      {metric && (
        <div className="detail-section">
          <h3>Market Data</h3>
          <div className="detail-rows">
            <div className="detail-row">
              <span>Volume</span>
              <span>{formatVolume(metric.volume)}</span>
            </div>
            <div className="detail-row">
              <span>ATR</span>
              <span>{metric.atr.toFixed(2)}</span>
            </div>
            {signal?.regime && (
              <div className="detail-row">
                <span>Regime</span>
                <span>{signal.regime.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <hr className="detail-divider" />

      {signal && (
        <div className="detail-section">
          <h3>Signals</h3>
          <div className="signal-gauges">
            {SIGNAL_KEYS.map((key) => {
              const s = signal[key];
              const pct = ((s.score + 1) / 2) * 100;
              const isNeg = s.score < 0;
              const fillColor = isNeg ? '#ef4444' : '#22c55e';
              const fillStart = isNeg ? pct : 50;
              const fillWidth = Math.abs(pct - 50);

              return (
                <div key={key} className="signal-gauge">
                  <div className="gauge-header">
                    <span className="gauge-name">{SIGNAL_LABELS[key]}</span>
                    <span className="gauge-score">{s.score.toFixed(2)}</span>
                    <span className="gauge-confidence">({(s.confidence * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="gauge-bar">
                    <div className="gauge-center" style={{ left: '50%' }} />
                    <div
                      className="gauge-fill"
                      style={{
                        left: `${fillStart}%`,
                        width: `${fillWidth}%`,
                        backgroundColor: fillColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="detail-combined">
            <div className="detail-row">
              <span>Combined Score</span>
              <span>{signal.combined.toFixed(2)}</span>
            </div>
            <div className="detail-recommendation">
              <span
                className={`recommendation-badge ${signal.recommendation.toLowerCase().replace('_', '-')}`}
              >
                {signal.recommendation.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
