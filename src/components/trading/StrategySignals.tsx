import React, { useState, useEffect } from 'react';
import type { SignalSnapshot, StrategySignal } from './types';
import { SP500_SYMBOLS, getStockInfo } from '../../lib/trading/sp500';

interface StrategySignalsProps {
  signals: Map<string, SignalSnapshot>;
  selectedStock: string | null;
  onStockSelect: (symbol: string) => void;
  isAnalyzing: boolean;
}

function SignalGauge({ signal }: { signal: StrategySignal }) {
  const isPositive = signal.score >= 0;
  const width = Math.abs(signal.score) * 50; // Max 50% width (half the bar)

  return (
    <div className="signal-item">
      <div className="signal-header">
        <span className="signal-name">{signal.name}</span>
        <span
          className={`signal-score ${signal.score > 0.1 ? 'positive' : signal.score < -0.1 ? 'negative' : 'neutral'}`}
        >
          {signal.score >= 0 ? '+' : ''}
          {signal.score.toFixed(2)}
        </span>
      </div>
      <div className="signal-gauge">
        <div className="signal-gauge-center" />
        <div
          className={`signal-gauge-fill ${isPositive ? 'positive' : 'negative'}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="signal-reason">{signal.reason}</div>
      <div className="signal-confidence">Confidence: {(signal.confidence * 100).toFixed(0)}%</div>
    </div>
  );
}

function getRecommendationClass(rec: SignalSnapshot['recommendation']): string {
  switch (rec) {
    case 'STRONG_BUY':
      return 'strong-buy';
    case 'BUY':
      return 'buy';
    case 'HOLD':
      return 'hold';
    case 'SELL':
      return 'sell';
    case 'STRONG_SELL':
      return 'strong-sell';
  }
}

export default function StrategySignals({
  signals,
  selectedStock,
  onStockSelect,
  isAnalyzing,
}: StrategySignalsProps) {
  const [localSelected, setLocalSelected] = useState(selectedStock || SP500_SYMBOLS[0]);

  useEffect(() => {
    if (selectedStock) {
      setLocalSelected(selectedStock);
    }
  }, [selectedStock]);

  const handleSelect = (symbol: string) => {
    setLocalSelected(symbol);
    onStockSelect(symbol);
  };

  const currentSignal = signals.get(localSelected);
  const stockInfo = getStockInfo(localSelected);

  return (
    <div className="trading-card">
      <h2>Strategy Signals</h2>

      {/* Stock Selector */}
      <div className="signal-selector">
        <select value={localSelected} onChange={e => handleSelect(e.target.value)}>
          {SP500_SYMBOLS.map(symbol => {
            const info = getStockInfo(symbol);
            return (
              <option key={symbol} value={symbol}>
                {symbol} - {info.name}
              </option>
            );
          })}
        </select>
      </div>

      {isAnalyzing ? (
        <div className="loading">
          <div className="loading-spinner" />
          Analyzing {localSelected}...
        </div>
      ) : !currentSignal ? (
        <div className="empty-state">
          <p>No analysis available for {localSelected}</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Click "Run Analysis" to analyze stocks
          </p>
        </div>
      ) : (
        <>
          {/* Stock Info */}
          <div style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            <div style={{ fontSize: '0.875rem' }}>{stockInfo.name}</div>
            <div style={{ fontSize: '0.75rem' }}>Sector: {stockInfo.sector}</div>
          </div>

          {/* Strategy Signals */}
          <div className="signals-grid">
            <SignalGauge signal={currentSignal.momentum} />
            <SignalGauge signal={currentSignal.meanReversion} />
            <SignalGauge signal={currentSignal.technical} />
            <SignalGauge signal={currentSignal.sentiment} />
          </div>

          {/* Combined Signal */}
          <div className="combined-signal">
            <div className="label">Combined Signal</div>
            <div
              className="score"
              style={{
                color:
                  currentSignal.combined > 0.1
                    ? '#22c55e'
                    : currentSignal.combined < -0.1
                      ? '#ef4444'
                      : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {currentSignal.combined >= 0 ? '+' : ''}
              {currentSignal.combined.toFixed(3)}
            </div>
            <div className={`recommendation-badge ${getRecommendationClass(currentSignal.recommendation)}`}>
              {currentSignal.recommendation.replace('_', ' ')}
            </div>
          </div>

          {/* Timestamp */}
          <div
            style={{
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.4)',
              textAlign: 'center',
            }}
          >
            Analyzed: {new Date(currentSignal.timestamp).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
