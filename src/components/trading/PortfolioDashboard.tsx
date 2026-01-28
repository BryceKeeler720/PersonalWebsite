import React from 'react';
import type { Portfolio } from './types';

interface PortfolioDashboardProps {
  portfolio: Portfolio;
  initialCapital?: number;
  onStockSelect?: (symbol: string) => void;
}

export default function PortfolioDashboard({ portfolio, initialCapital, onStockSelect }: PortfolioDashboardProps) {
  const baseline = initialCapital ?? portfolio.initialCapital;
  const totalGainLoss = portfolio.totalValue - baseline;
  const totalGainLossPercent = (totalGainLoss / baseline) * 100;
  const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="trading-card">
      <h2>Portfolio</h2>

      {/* Total Value */}
      <div className="portfolio-value">
        <div className="value">{formatCurrency(portfolio.totalValue)}</div>
        <div className={`change ${totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
          {formatCurrency(totalGainLoss)} ({formatPercent(totalGainLossPercent)})
        </div>
      </div>

      {/* Stats */}
      <div className="portfolio-stats">
        <div className="stat-item">
          <div className="label">Cash</div>
          <div className="value">{formatCurrency(portfolio.cash)}</div>
        </div>
        <div className="stat-item">
          <div className="label">Invested</div>
          <div className="value">{formatCurrency(holdingsValue)}</div>
        </div>
        <div className="stat-item">
          <div className="label">Positions</div>
          <div className="value">{portfolio.holdings.length}</div>
        </div>
        <div className="stat-item">
          <div className="label">Cash %</div>
          <div className="value">{((portfolio.cash / portfolio.totalValue) * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Holdings */}
      <h2 style={{ marginTop: '1.5rem', borderBottom: 'none', paddingBottom: 0 }}>Holdings</h2>
      {portfolio.holdings.length === 0 ? (
        <div className="empty-state">
          <p>No positions yet</p>
        </div>
      ) : (
        <div className="holdings-list">
          {portfolio.holdings.map(holding => (
            <div
              key={holding.symbol}
              className="holding-item"
              onClick={() => onStockSelect?.(holding.symbol)}
              style={{ cursor: onStockSelect ? 'pointer' : 'default' }}
            >
              <div>
                <div className="holding-symbol">{holding.symbol}</div>
                <div className="holding-shares">
                  {holding.shares} shares @ {formatCurrency(holding.avgCost)}
                </div>
              </div>
              <div className="holding-value">
                <div className="holding-price">{formatCurrency(holding.marketValue)}</div>
                <div className={`holding-pnl ${holding.gainLoss >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(holding.gainLoss)} ({formatPercent(holding.gainLossPercent)})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Last Updated */}
      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: 'var(--kana-fg-muted)',
          textAlign: 'center',
        }}
      >
        Updated: {new Date(portfolio.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
