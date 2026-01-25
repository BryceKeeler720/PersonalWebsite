import { useState, useEffect, useRef } from 'react';
import type { SignalSnapshot, StrategySignal } from './types';
import {
  CRYPTO_SYMBOLS,
  FOREX_SYMBOLS,
  FUTURES_SYMBOLS,
  SP500_SYMBOLS,
  NASDAQ_ADDITIONAL,
  getAssetInfo,
} from '../../lib/trading/assets';

// Group assets by category for the dropdown
const assetCategories = [
  { label: 'Crypto (24/7)', symbols: [...CRYPTO_SYMBOLS].sort() },
  { label: 'Forex', symbols: [...FOREX_SYMBOLS].sort() },
  { label: 'Futures', symbols: [...FUTURES_SYMBOLS].sort() },
  { label: 'S&P 500', symbols: [...SP500_SYMBOLS].sort() },
  { label: 'NASDAQ', symbols: [...NASDAQ_ADDITIONAL].sort() },
];

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
  const [localSelected, setLocalSelected] = useState(selectedStock || 'BTC-USD');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedStock) {
      setLocalSelected(selectedStock);
    }
  }, [selectedStock]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (symbol: string) => {
    setLocalSelected(symbol);
    onStockSelect(symbol);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Filter categories and symbols based on search
  const filteredCategories = assetCategories.map(category => ({
    ...category,
    symbols: category.symbols.filter((symbol: string) => {
      const info = getAssetInfo(symbol);
      const search = searchTerm.toLowerCase();
      return symbol.toLowerCase().includes(search) || info.name.toLowerCase().includes(search);
    }),
  })).filter(category => category.symbols.length > 0);

  const currentSignal = signals.get(localSelected);
  const assetInfo = getAssetInfo(localSelected);

  return (
    <div className="trading-card">
      <h2>Strategy Signals</h2>

      {/* Asset Selector */}
      <div className="signal-selector" ref={dropdownRef}>
        <button
          className="stock-dropdown-trigger"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
        >
          <span>{localSelected} - {assetInfo.name}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.6">
            <path d="M6 8L1 3h10z" />
          </svg>
        </button>
        {isOpen && (
          <div className="stock-dropdown-menu">
            <input
              ref={inputRef}
              type="text"
              className="stock-dropdown-search"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="stock-dropdown-list">
              {filteredCategories.map(category => (
                <div key={category.label} className="stock-dropdown-category">
                  <div className="stock-dropdown-category-label">{category.label}</div>
                  {category.symbols.map((symbol: string) => {
                    const info = getAssetInfo(symbol);
                    return (
                      <button
                        key={symbol}
                        className={`stock-dropdown-item ${symbol === localSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(symbol)}
                      >
                        <span className="stock-symbol">{symbol}</span>
                        <span className="stock-name">{info.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {filteredCategories.length === 0 && (
                <div className="stock-dropdown-empty">No assets found</div>
              )}
            </div>
          </div>
        )}
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
          {/* Asset Info */}
          <div style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            <div style={{ fontSize: '0.875rem' }}>{assetInfo.name}</div>
            <div style={{ fontSize: '0.75rem' }}>Category: {assetInfo.category}</div>
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
