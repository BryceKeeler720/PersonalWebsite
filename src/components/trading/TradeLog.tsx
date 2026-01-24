import React from 'react';
import type { Trade } from './types';

interface TradeLogProps {
  trades: Trade[];
}

export default function TradeLog({ trades }: TradeLogProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (trades.length === 0) {
    return (
      <div className="trading-card">
        <h2>Trade Log</h2>
        <div className="empty-state">
          <p>No trades yet</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Trades will appear here when executed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="trading-card">
      <h2>Trade Log ({trades.length} trades)</h2>
      <div className="trade-log">
        {trades.map(trade => (
          <div key={trade.id} className="trade-item">
            <div className="trade-header">
              <div className="trade-action">
                <span className={`badge ${trade.action.toLowerCase()}`}>{trade.action}</span>
                <span className="trade-symbol">{trade.symbol}</span>
              </div>
              <span className="trade-time">{formatDate(trade.timestamp)}</span>
            </div>
            <div className="trade-details">
              <span>
                {trade.shares} shares @ {formatCurrency(trade.price)}
              </span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(trade.total)}</span>
            </div>
            <div className="trade-reason">{trade.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
