import { useState, useEffect } from 'react';
import PortfolioDashboard from './PortfolioDashboard';
import TradeLog from './TradeLog';
import StrategySignals from './StrategySignals';
import PerformanceChart from './PerformanceChart';
import type { Portfolio, Trade, SignalSnapshot } from './types';
import { DEFAULT_CONFIG } from './types';
import './TradingBot.css';

interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
}

type TabType = 'overview' | 'signals' | 'log';

interface TradingData {
  portfolio: Portfolio;
  trades: Trade[];
  signals: Record<string, SignalSnapshot>;
  lastRun: string | null;
  history: PortfolioSnapshot[];
}

const INITIAL_PORTFOLIO: Portfolio = {
  cash: DEFAULT_CONFIG.initialCapital,
  holdings: [],
  totalValue: DEFAULT_CONFIG.initialCapital,
  lastUpdated: new Date().toISOString(),
  initialCapital: DEFAULT_CONFIG.initialCapital,
};

export default function TradingBot() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [data, setData] = useState<TradingData>({
    portfolio: INITIAL_PORTFOLIO,
    trades: [],
    signals: {},
    lastRun: null,
    history: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from server
  const fetchData = async () => {
    try {
      const response = await fetch('/api/trading/data');
      if (!response.ok) {
        throw new Error('Failed to fetch trading data');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching trading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and every minute
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Convert signals object to Map for compatibility with existing components
  const signalsMap = new Map(Object.entries(data.signals));

  // Get top buy/sell candidates
  const getTopBuyCandidates = (limit: number) => {
    return Object.values(data.signals)
      .filter(s => s.recommendation === 'BUY' || s.recommendation === 'STRONG_BUY')
      .sort((a, b) => b.combined - a.combined)
      .slice(0, limit);
  };

  const getTopSellCandidates = (limit: number) => {
    return Object.values(data.signals)
      .filter(s => s.recommendation === 'SELL' || s.recommendation === 'STRONG_SELL')
      .sort((a, b) => a.combined - b.combined)
      .slice(0, limit);
  };

  if (isLoading) {
    return (
      <div className="trading-bot">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading trading bot data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trading-bot">
      {/* Header */}
      <header className="trading-header">
        <div className="header-content">
          <h1>Paper Trading Bot</h1>
          <p>Multi-asset analysis: Crypto, Forex, Futures, Stocks</p>
        </div>
        <div className="bot-status">
          <span className="status-dot running" />
          <span className="status-text">Running</span>
          {data.lastRun && (
            <span className="last-run">
              Last analysis: {new Date(data.lastRun).toLocaleString()}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <p>Error loading data: {error}</p>
          <button onClick={fetchData}>Retry</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="trading-grid">
        {/* Sidebar - Portfolio */}
        <div className="sidebar">
          <PortfolioDashboard
            portfolio={data.portfolio}
            onStockSelect={symbol => {
              setSelectedStock(symbol);
              setActiveTab('signals');
            }}
          />
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Tab Navigation */}
          <nav className="tab-nav">
            <button
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={activeTab === 'signals' ? 'active' : ''}
              onClick={() => setActiveTab('signals')}
            >
              Strategy Signals
            </button>
            <button
              className={activeTab === 'log' ? 'active' : ''}
              onClick={() => setActiveTab('log')}
            >
              Trade Log
            </button>
          </nav>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="overview-grid" style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Performance Chart */}
              <div className="trading-card">
                <h2>Portfolio Performance</h2>
                <PerformanceChart
                  history={data.history}
                  initialCapital={DEFAULT_CONFIG.initialCapital}
                />
              </div>

              {/* Top Signals */}
              <div className="trading-card">
                <h2>Current Top Signals</h2>
                {Object.keys(data.signals).length === 0 ? (
                  <div className="empty-state">
                    <p>No analysis data yet</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      The bot will analyze stocks on the next scheduled run
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <h3
                        style={{
                          fontSize: '0.875rem',
                          color: '#22c55e',
                          marginBottom: '0.75rem',
                        }}
                      >
                        Buy Signals
                      </h3>
                      {getTopBuyCandidates(5).map(signal => (
                        <div
                          key={signal.symbol}
                          style={{
                            padding: '0.5rem',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '4px',
                            marginBottom: '0.5rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setSelectedStock(signal.symbol);
                            setActiveTab('signals');
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{signal.symbol}</div>
                          <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>
                            Score: +{signal.combined.toFixed(3)}
                          </div>
                        </div>
                      ))}
                      {getTopBuyCandidates(5).length === 0 && (
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                          No buy signals
                        </div>
                      )}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '0.875rem',
                          color: '#ef4444',
                          marginBottom: '0.75rem',
                        }}
                      >
                        Sell Signals
                      </h3>
                      {getTopSellCandidates(5).map(signal => (
                        <div
                          key={signal.symbol}
                          style={{
                            padding: '0.5rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '4px',
                            marginBottom: '0.5rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setSelectedStock(signal.symbol);
                            setActiveTab('signals');
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{signal.symbol}</div>
                          <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                            Score: {signal.combined.toFixed(3)}
                          </div>
                        </div>
                      ))}
                      {getTopSellCandidates(5).length === 0 && (
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                          No sell signals
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Trades */}
              <div className="trading-card">
                <h2>Recent Trades</h2>
                {data.trades.length === 0 ? (
                  <div className="empty-state">
                    <p>No trades yet</p>
                  </div>
                ) : (
                  <div>
                    {data.trades.slice(0, 3).map(trade => (
                      <div
                        key={trade.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '8px',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              color: trade.action === 'BUY' ? '#22c55e' : '#ef4444',
                              fontWeight: 600,
                            }}
                          >
                            {trade.action}
                          </span>{' '}
                          <span style={{ color: '#fff' }}>{trade.symbol}</span>
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {trade.shares} @ ${trade.price.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    {data.trades.length > 3 && (
                      <button
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'transparent',
                          border: '1px dashed rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setActiveTab('log')}
                      >
                        View all {data.trades.length} trades
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'signals' && (
            <StrategySignals
              signals={signalsMap}
              selectedStock={selectedStock}
              onStockSelect={setSelectedStock}
              isAnalyzing={false}
            />
          )}

          {activeTab === 'log' && <TradeLog trades={data.trades} />}
        </div>
      </div>
    </div>
  );
}
