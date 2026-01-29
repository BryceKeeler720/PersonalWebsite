import { useState, useEffect, useRef, useMemo } from 'react';
import type { SignalSnapshot, StrategySignal } from './types';
import {
  CRYPTO_SYMBOLS,
  FOREX_SYMBOLS,
  FUTURES_SYMBOLS,
  SP500_SYMBOLS,
  NASDAQ_ADDITIONAL,
  getAssetInfo,
  getAssetType,
} from '../../lib/trading/assets';

// Default signals for when data is missing
const DEFAULT_SIGNALS: Record<string, StrategySignal> = {
  momentum: { name: 'Trend Momentum', score: 0, confidence: 0, reason: 'No data available' },
  meanReversion: { name: 'BB+RSI Reversion', score: 0, confidence: 0, reason: 'No data available' },
  technical: { name: 'MACD Trend', score: 0, confidence: 0, reason: 'No data available' },
  vwapReversion: { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'No data available' },
};

// Pre-computed search entry for fast lookups
interface SearchEntry {
  symbol: string;
  symbolLower: string;
  name: string;
  nameLower: string;
  category: string;
}

// Static category definitions
const STATIC_CATEGORIES = [
  { label: 'Crypto (24/7)', symbols: [...CRYPTO_SYMBOLS].sort() },
  { label: 'Forex', symbols: [...FOREX_SYMBOLS].sort() },
  { label: 'Futures', symbols: [...FUTURES_SYMBOLS].sort() },
  { label: 'S&P 500', symbols: [...SP500_SYMBOLS].sort() },
  { label: 'NASDAQ', symbols: [...NASDAQ_ADDITIONAL].sort() },
];

// Pre-build search index from static symbols (computed once at module load)
const staticSymbolSet = new Set<string>();
const staticSearchIndex: SearchEntry[] = [];

for (const category of STATIC_CATEGORIES) {
  for (const symbol of category.symbols) {
    if (staticSymbolSet.has(symbol)) continue; // skip duplicates
    staticSymbolSet.add(symbol);
    const info = getAssetInfo(symbol);
    staticSearchIndex.push({
      symbol,
      symbolLower: symbol.toLowerCase(),
      name: info.name,
      nameLower: info.name.toLowerCase(),
      category: category.label,
    });
  }
}

function getCategoryLabel(symbol: string): string {
  const type = getAssetType(symbol);
  if (type === 'crypto') return 'Crypto (24/7)';
  if (type === 'forex') return 'Forex';
  if (type === 'futures') return 'Futures';
  return 'Stocks';
}

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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
        setExpandedCategory(null);
        setSearchTerm('');
        setDebouncedSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search input (100ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 100);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build full search index including dynamically discovered symbols from signals
  const fullSearchIndex = useMemo(() => {
    const index = [...staticSearchIndex];
    // Add any symbols from signals that aren't in static arrays
    for (const symbol of signals.keys()) {
      if (!staticSymbolSet.has(symbol)) {
        const info = getAssetInfo(symbol);
        index.push({
          symbol,
          symbolLower: symbol.toLowerCase(),
          name: info.name,
          nameLower: info.name.toLowerCase(),
          category: getCategoryLabel(symbol),
        });
      }
    }
    return index;
  }, [signals]);

  // Build categories, merging dynamically-discovered NASDAQ symbols into the NASDAQ category
  const assetCategories = useMemo(() => {
    const dynamicStocks: string[] = [];
    for (const symbol of signals.keys()) {
      if (!staticSymbolSet.has(symbol)) {
        dynamicStocks.push(symbol);
      }
    }

    if (dynamicStocks.length === 0) return [...STATIC_CATEGORIES];

    return STATIC_CATEGORIES.map(cat => {
      if (cat.label !== 'NASDAQ') return cat;
      return { label: 'NASDAQ', symbols: [...cat.symbols, ...dynamicStocks].sort() };
    });
  }, [signals]);

  // Ranked search results (only when searching)
  const searchResults = useMemo(() => {
    if (!debouncedSearch) return null;

    const query = debouncedSearch.toLowerCase();

    const scored: (SearchEntry & { score: number })[] = [];
    for (const entry of fullSearchIndex) {
      let score = 0;

      // Exact symbol match
      if (entry.symbolLower === query) {
        score = 100;
      // Symbol starts with query
      } else if (entry.symbolLower.startsWith(query)) {
        score = 80;
      // Name starts with query (word boundary)
      } else if (entry.nameLower.startsWith(query)) {
        score = 70;
      // Name contains query at word boundary
      } else if (entry.nameLower.includes(' ' + query)) {
        score = 60;
      // Symbol contains query
      } else if (entry.symbolLower.includes(query)) {
        score = 40;
      // Name contains query
      } else if (entry.nameLower.includes(query)) {
        score = 20;
      } else {
        continue; // No match
      }

      // Boost symbols that have signal data
      if (signals.has(entry.symbol)) {
        score += 5;
      }

      scored.push({ ...entry, score });
    }

    // Sort by score descending, then alphabetically
    scored.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol));

    // Limit to top 50 for rendering performance
    return scored.slice(0, 50);
  }, [debouncedSearch, fullSearchIndex, signals]);

  // Filter categories for browsing mode (no search or category expansion)
  const filteredCategories = useMemo(() => {
    if (!debouncedSearch) return assetCategories;

    const query = debouncedSearch.toLowerCase();
    return assetCategories
      .map(category => ({
        ...category,
        symbols: category.symbols.filter((symbol: string) => {
          const info = getAssetInfo(symbol);
          return symbol.toLowerCase().includes(query) || info.name.toLowerCase().includes(query);
        }),
      }))
      .filter(category => category.symbols.length > 0);
  }, [debouncedSearch, assetCategories]);

  const handleSelect = (symbol: string) => {
    setLocalSelected(symbol);
    onStockSelect(symbol);
    setIsOpen(false);
    setExpandedCategory(null);
    setSearchTerm('');
    setDebouncedSearch('');
  };

  const handleCategoryClick = (categoryLabel: string) => {
    setExpandedCategory(expandedCategory === categoryLabel ? null : categoryLabel);
  };

  const handleBack = () => {
    setExpandedCategory(null);
  };

  // Get the currently expanded category's filtered symbols
  const expandedCategoryData = expandedCategory
    ? filteredCategories.find(c => c.label === expandedCategory)
    : null;

  const currentSignal = signals.get(localSelected);
  const assetInfo = getAssetInfo(localSelected);

  // Determine if we should show flat search results vs category browser
  const showFlatResults = searchResults !== null && !expandedCategory;

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
              placeholder="Search by symbol or name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {/* Back button outside scrollable area */}
            {expandedCategory && expandedCategoryData && (
              <button
                className="stock-dropdown-back"
                onClick={handleBack}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                <span>{expandedCategoryData.label}</span>
              </button>
            )}
            <div className="stock-dropdown-list">
              {showFlatResults ? (
                <>
                  {searchResults.map(result => (
                    <button
                      key={result.symbol}
                      className={`stock-dropdown-item ${result.symbol === localSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(result.symbol)}
                    >
                      <span className="stock-symbol">{result.symbol}</span>
                      <span className="stock-name">{result.name}</span>
                    </button>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="stock-dropdown-empty">No assets found</div>
                  )}
                </>
              ) : expandedCategory && expandedCategoryData ? (
                <>
                  {expandedCategoryData.symbols.map((symbol: string) => {
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
                  {expandedCategoryData.symbols.length === 0 && (
                    <div className="stock-dropdown-empty">No assets found</div>
                  )}
                </>
              ) : (
                <>
                  {filteredCategories.map(category => (
                    <button
                      key={category.label}
                      className="stock-dropdown-category-btn"
                      onClick={() => handleCategoryClick(category.label)}
                    >
                      <span className="category-name">{category.label}</span>
                      <span className="category-count">{category.symbols.length}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.5">
                        <path d="M4 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                    </button>
                  ))}
                  {filteredCategories.length === 0 && (
                    <div className="stock-dropdown-empty">No categories found</div>
                  )}
                </>
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
          <div style={{ marginBottom: '1rem', color: 'var(--kana-fg-dim)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '0.875rem' }}>{assetInfo.name}</div>
              {currentSignal.price != null && (
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--kana-fg)' }}>
                  ${currentSignal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.75rem' }}>Category: {assetInfo.category}</div>
          </div>

          {/* Strategy Signals */}
          <div className="signals-grid">
            <SignalGauge signal={currentSignal.momentum ?? DEFAULT_SIGNALS.momentum} />
            <SignalGauge signal={currentSignal.meanReversion ?? DEFAULT_SIGNALS.meanReversion} />
            <SignalGauge signal={currentSignal.technical ?? DEFAULT_SIGNALS.technical} />
            <SignalGauge signal={currentSignal.vwapReversion ?? (currentSignal as any).sentiment ?? DEFAULT_SIGNALS.vwapReversion} />
          </div>

          {/* Combined Signal */}
          <div className="combined-signal">
            <div className="label">Combined Signal</div>
            <div
              className="score"
              style={{
                color:
                  currentSignal.combined > 0.1
                    ? '#76946A'
                    : currentSignal.combined < -0.1
                      ? '#C34043'
                      : 'var(--kana-fg-dim)',
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
              color: 'var(--kana-fg-muted)',
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
