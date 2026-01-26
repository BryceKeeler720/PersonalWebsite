import { useState, useEffect, useMemo } from 'react';
import PortfolioDashboard from './PortfolioDashboard';
import TradeLog from './TradeLog';
import StrategySignals from './StrategySignals';
import PerformanceChart from './PerformanceChart';
import type { Portfolio, Trade, SignalSnapshot } from './types';
import { DEFAULT_CONFIG } from './types';
import { getAssetInfo } from '../../lib/trading/assets';
import './TradingBot.css';

interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
}

interface BenchmarkPoint {
  timestamp: string;
  value: number;
}

type TabType = 'overview' | 'signals' | 'log';

interface TradingData {
  portfolio: Portfolio;
  trades: Trade[];
  signals: Record<string, SignalSnapshot>;
  lastRun: string | null;
  history: PortfolioSnapshot[];
  spyBenchmark: BenchmarkPoint[];
}

const INITIAL_PORTFOLIO: Portfolio = {
  cash: DEFAULT_CONFIG.initialCapital,
  holdings: [],
  totalValue: DEFAULT_CONFIG.initialCapital,
  lastUpdated: new Date().toISOString(),
  initialCapital: DEFAULT_CONFIG.initialCapital,
};

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3b82f6',
  Healthcare: '#22c55e',
  Financial: '#f59e0b',
  'Consumer Cyclical': '#ec4899',
  'Communication Services': '#8b5cf6',
  Industrial: '#6366f1',
  'Consumer Defensive': '#14b8a6',
  Energy: '#f97316',
  Utilities: '#06b6d4',
  'Real Estate': '#84cc16',
  Materials: '#a855f7',
  Crypto: '#fbbf24',
  Forex: '#10b981',
  Futures: '#ef4444',
  Stock: '#64748b',
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
    spyBenchmark: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/trading/data');
      if (!response.ok) throw new Error('Failed to fetch trading data');
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const signalsMap = new Map(Object.entries(data.signals));

  const sectorAllocation = useMemo(() => {
    const sectors: Record<string, number> = {};
    for (const holding of data.portfolio.holdings) {
      const info = getAssetInfo(holding.symbol);
      const sector = info.category;
      sectors[sector] = (sectors[sector] || 0) + holding.marketValue;
    }
    return Object.entries(sectors)
      .map(([sector, value]) => ({ sector, value, color: SECTOR_COLORS[sector] || '#64748b' }))
      .sort((a, b) => b.value - a.value);
  }, [data.portfolio.holdings]);

  const tradeStats = useMemo(() => {
    const sells = data.trades.filter(t => t.action === 'SELL');
    if (sells.length === 0) return null;

    let wins = 0, losses = 0, totalGain = 0, totalLoss = 0;
    for (const trade of sells) {
      if (trade.reason.includes('+') || trade.reason.includes('profit')) {
        wins++;
        const match = trade.reason.match(/([+-]?\d+\.?\d*)%/);
        if (match) totalGain += parseFloat(match[1]);
      } else if (trade.reason.includes('-') || trade.reason.includes('loss') || trade.reason.includes('Stop')) {
        losses++;
        const match = trade.reason.match(/([+-]?\d+\.?\d*)%/);
        if (match) totalLoss += Math.abs(parseFloat(match[1]));
      }
    }

    const winRate = sells.length > 0 ? (wins / sells.length) * 100 : 0;
    const avgWin = wins > 0 ? totalGain / wins : 0;
    const avgLoss = losses > 0 ? totalLoss / losses : 0;

    return { wins, losses, winRate, avgWin, avgLoss, totalTrades: sells.length };
  }, [data.trades]);

  const riskMetrics = useMemo(() => {
    if (data.history.length < 2) return null;

    const returns: number[] = [];
    for (let i = 1; i < data.history.length; i++) {
      const ret = (data.history[i].totalValue - data.history[i - 1].totalValue) / data.history[i - 1].totalValue;
      returns.push(ret);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    const riskFreeRate = 0.05 / 252;
    const excessReturns = returns.map(r => r - riskFreeRate);
    const avgExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const excessVariance = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcessReturn, 2), 0) / excessReturns.length;
    const sharpeRatio = excessVariance > 0 ? (avgExcessReturn * Math.sqrt(252)) / Math.sqrt(excessVariance) : 0;

    let maxDrawdown = 0, peak = data.history[0].totalValue;
    for (const point of data.history) {
      if (point.totalValue > peak) peak = point.totalValue;
      const drawdown = (peak - point.totalValue) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return { volatility, sharpeRatio, maxDrawdown: maxDrawdown * 100 };
  }, [data.history]);

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

  const totalHoldingsValue = data.portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);

  return (
    <div className="trading-bot">
      <a href="/traditional" className="back-link" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'rgba(255, 255, 255, 0.6)',
        textDecoration: 'none',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        transition: 'color 0.2s ease',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Home
      </a>
      <header className="trading-header">
        <div className="header-content">
          <h1>Algorithmic Trading Bot</h1>
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

      <div className="trading-grid">
        <div className="sidebar">
          <PortfolioDashboard
            portfolio={data.portfolio}
            onStockSelect={symbol => {
              setSelectedStock(symbol);
              setActiveTab('signals');
            }}
          />
        </div>

        <div className="main-content">
          <nav className="tab-nav">
            <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
              Overview
            </button>
            <button className={activeTab === 'signals' ? 'active' : ''} onClick={() => setActiveTab('signals')}>
              Strategy Signals
            </button>
            <button className={activeTab === 'log' ? 'active' : ''} onClick={() => setActiveTab('log')}>
              Trade Log
            </button>
          </nav>

          {activeTab === 'overview' && (
            <div className="overview-grid" style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="trading-card">
                <h2>Portfolio Performance vs S&P 500</h2>
                <PerformanceChart
                  history={data.history}
                  initialCapital={DEFAULT_CONFIG.initialCapital}
                  spyBenchmark={data.spyBenchmark}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {tradeStats && (
                  <div className="trading-card">
                    <h2>Trade Performance</h2>
                    <div className="stats-grid">
                      <div className="stat-box">
                        <div className="stat-label">Win Rate</div>
                        <div className={`stat-value ${tradeStats.winRate >= 50 ? 'positive' : 'negative'}`}>
                          {tradeStats.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Wins / Losses</div>
                        <div className="stat-value">
                          <span style={{ color: '#22c55e' }}>{tradeStats.wins}</span>
                          {' / '}
                          <span style={{ color: '#ef4444' }}>{tradeStats.losses}</span>
                        </div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Avg Win</div>
                        <div className="stat-value positive">+{tradeStats.avgWin.toFixed(1)}%</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Avg Loss</div>
                        <div className="stat-value negative">-{tradeStats.avgLoss.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {riskMetrics && (
                  <div className="trading-card">
                    <h2>Risk Metrics</h2>
                    <div className="stats-grid">
                      <div className="stat-box">
                        <div className="stat-label">Sharpe Ratio</div>
                        <div className={`stat-value ${riskMetrics.sharpeRatio >= 1 ? 'positive' : riskMetrics.sharpeRatio >= 0 ? '' : 'negative'}`}>
                          {riskMetrics.sharpeRatio.toFixed(2)}
                        </div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Max Drawdown</div>
                        <div className="stat-value negative">-{riskMetrics.maxDrawdown.toFixed(1)}%</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Volatility</div>
                        <div className="stat-value">{riskMetrics.volatility.toFixed(1)}%</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Data Points</div>
                        <div className="stat-value">{data.history.length}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {sectorAllocation.length > 0 && (
                <div className="trading-card">
                  <h2>Sector Allocation</h2>
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      {(() => {
                        let startAngle = -90;
                        return sectorAllocation.map((sector, i) => {
                          const percent = (sector.value / totalHoldingsValue) * 100;
                          const angle = (percent / 100) * 360;
                          const endAngle = startAngle + angle;
                          const largeArc = angle > 180 ? 1 : 0;
                          const x1 = 80 + 70 * Math.cos((startAngle * Math.PI) / 180);
                          const y1 = 80 + 70 * Math.sin((startAngle * Math.PI) / 180);
                          const x2 = 80 + 70 * Math.cos((endAngle * Math.PI) / 180);
                          const y2 = 80 + 70 * Math.sin((endAngle * Math.PI) / 180);
                          const path = `M 80 80 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`;
                          startAngle = endAngle;
                          return <path key={i} d={path} fill={sector.color} opacity="0.85" />;
                        });
                      })()}
                      <circle cx="80" cy="80" r="35" fill="#000" />
                    </svg>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      {sectorAllocation.slice(0, 6).map(sector => (
                        <div key={sector.sector} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ width: 12, height: 12, borderRadius: 2, background: sector.color, marginRight: '0.5rem' }} />
                          <span style={{ flex: 1, fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>{sector.sector}</span>
                          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                            {((sector.value / totalHoldingsValue) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                      {sectorAllocation.length > 6 && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
                          +{sectorAllocation.length - 6} more sectors
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                      <h3 style={{ fontSize: '0.875rem', color: '#22c55e', marginBottom: '0.75rem' }}>Buy Signals</h3>
                      {getTopBuyCandidates(5).map(signal => (
                        <div
                          key={signal.symbol}
                          style={{ padding: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '4px', marginBottom: '0.5rem', cursor: 'pointer' }}
                          onClick={() => { setSelectedStock(signal.symbol); setActiveTab('signals'); }}
                        >
                          <div style={{ fontWeight: 600 }}>{signal.symbol}</div>
                          <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>Score: +{signal.combined.toFixed(3)}</div>
                        </div>
                      ))}
                      {getTopBuyCandidates(5).length === 0 && (
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>No buy signals</div>
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.875rem', color: '#ef4444', marginBottom: '0.75rem' }}>Sell Signals</h3>
                      {getTopSellCandidates(5).map(signal => (
                        <div
                          key={signal.symbol}
                          style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', marginBottom: '0.5rem', cursor: 'pointer' }}
                          onClick={() => { setSelectedStock(signal.symbol); setActiveTab('signals'); }}
                        >
                          <div style={{ fontWeight: 600 }}>{signal.symbol}</div>
                          <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>Score: {signal.combined.toFixed(3)}</div>
                        </div>
                      ))}
                      {getTopSellCandidates(5).length === 0 && (
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>No sell signals</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="trading-card">
                <h2>Recent Trades</h2>
                {data.trades.length === 0 ? (
                  <div className="empty-state"><p>No trades yet</p></div>
                ) : (
                  <div>
                    {data.trades.slice(0, 3).map(trade => (
                      <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ color: trade.action === 'BUY' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{trade.action}</span>{' '}
                          <span style={{ color: '#fff' }}>{trade.symbol}</span>
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{trade.shares} @ ${trade.price.toFixed(2)}</div>
                      </div>
                    ))}
                    {data.trades.length > 3 && (
                      <button
                        style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer' }}
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
            <StrategySignals signals={signalsMap} selectedStock={selectedStock} onStockSelect={setSelectedStock} isAnalyzing={false} />
          )}

          {activeTab === 'log' && <TradeLog trades={data.trades} />}
        </div>
      </div>
    </div>
  );
}
