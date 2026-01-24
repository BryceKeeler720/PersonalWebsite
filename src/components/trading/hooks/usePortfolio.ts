import { useState, useEffect, useCallback } from 'react';
import type { Portfolio, Trade, Holding, SignalSnapshot, StockQuote } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../../lib/trading/storage';

const INITIAL_PORTFOLIO: Portfolio = {
  cash: DEFAULT_CONFIG.initialCapital,
  holdings: [],
  totalValue: DEFAULT_CONFIG.initialCapital,
  lastUpdated: new Date().toISOString(),
  initialCapital: DEFAULT_CONFIG.initialCapital,
};

/**
 * Custom hook for managing portfolio state with localStorage persistence
 */
export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    const saved = loadFromStorage<Portfolio>(STORAGE_KEYS.PORTFOLIO);
    return saved || INITIAL_PORTFOLIO;
  });

  const [trades, setTrades] = useState<Trade[]>(() => {
    return loadFromStorage<Trade[]>(STORAGE_KEYS.TRADES) || [];
  });

  // Persist portfolio to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PORTFOLIO, portfolio);
  }, [portfolio]);

  // Persist trades to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TRADES, trades);
  }, [trades]);

  /**
   * Execute a buy trade
   */
  const executeBuy = useCallback(
    (symbol: string, shares: number, price: number, signals: SignalSnapshot): boolean => {
      const total = shares * price;

      if (total > portfolio.cash) {
        console.error('Insufficient cash for buy order');
        return false;
      }

      const trade: Trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol,
        action: 'BUY',
        shares,
        price,
        total,
        reason: `${signals.recommendation}: Combined score ${signals.combined.toFixed(2)}`,
        signals,
      };

      setTrades(prev => [trade, ...prev]);

      setPortfolio(prev => {
        // Check if we already have this stock
        const existingIndex = prev.holdings.findIndex(h => h.symbol === symbol);
        let newHoldings: Holding[];

        if (existingIndex >= 0) {
          // Average into existing position
          const existing = prev.holdings[existingIndex];
          const totalShares = existing.shares + shares;
          const totalCost = existing.avgCost * existing.shares + price * shares;
          const newAvgCost = totalCost / totalShares;

          newHoldings = [...prev.holdings];
          newHoldings[existingIndex] = {
            ...existing,
            shares: totalShares,
            avgCost: newAvgCost,
            currentPrice: price,
            marketValue: totalShares * price,
            gainLoss: (price - newAvgCost) * totalShares,
            gainLossPercent: ((price - newAvgCost) / newAvgCost) * 100,
          };
        } else {
          // New position
          const newHolding: Holding = {
            symbol,
            shares,
            avgCost: price,
            currentPrice: price,
            marketValue: total,
            gainLoss: 0,
            gainLossPercent: 0,
          };
          newHoldings = [...prev.holdings, newHolding];
        }

        const newCash = prev.cash - total;
        const holdingsValue = newHoldings.reduce((sum, h) => sum + h.marketValue, 0);

        return {
          ...prev,
          cash: newCash,
          holdings: newHoldings,
          totalValue: newCash + holdingsValue,
          lastUpdated: new Date().toISOString(),
        };
      });

      return true;
    },
    [portfolio.cash]
  );

  /**
   * Execute a sell trade
   */
  const executeSell = useCallback(
    (symbol: string, shares: number, price: number, signals: SignalSnapshot): boolean => {
      const holding = portfolio.holdings.find(h => h.symbol === symbol);

      if (!holding || holding.shares < shares) {
        console.error('Insufficient shares for sell order');
        return false;
      }

      const total = shares * price;

      const trade: Trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol,
        action: 'SELL',
        shares,
        price,
        total,
        reason: `${signals.recommendation}: Combined score ${signals.combined.toFixed(2)}`,
        signals,
      };

      setTrades(prev => [trade, ...prev]);

      setPortfolio(prev => {
        const holdingIndex = prev.holdings.findIndex(h => h.symbol === symbol);
        const existingHolding = prev.holdings[holdingIndex];
        let newHoldings: Holding[];

        if (existingHolding.shares === shares) {
          // Selling all shares - remove position
          newHoldings = prev.holdings.filter(h => h.symbol !== symbol);
        } else {
          // Partial sell
          newHoldings = [...prev.holdings];
          const remainingShares = existingHolding.shares - shares;
          newHoldings[holdingIndex] = {
            ...existingHolding,
            shares: remainingShares,
            marketValue: remainingShares * price,
            gainLoss: (price - existingHolding.avgCost) * remainingShares,
          };
        }

        const newCash = prev.cash + total;
        const holdingsValue = newHoldings.reduce((sum, h) => sum + h.marketValue, 0);

        return {
          ...prev,
          cash: newCash,
          holdings: newHoldings,
          totalValue: newCash + holdingsValue,
          lastUpdated: new Date().toISOString(),
        };
      });

      return true;
    },
    [portfolio.holdings]
  );

  /**
   * Update current prices for all holdings
   */
  const updatePrices = useCallback((quotes: Map<string, StockQuote>) => {
    setPortfolio(prev => {
      const updatedHoldings = prev.holdings.map(holding => {
        const quote = quotes.get(holding.symbol);
        if (!quote) return holding;

        const currentPrice = quote.price;
        const marketValue = holding.shares * currentPrice;
        const gainLoss = (currentPrice - holding.avgCost) * holding.shares;
        const gainLossPercent = ((currentPrice - holding.avgCost) / holding.avgCost) * 100;

        return {
          ...holding,
          currentPrice,
          marketValue,
          gainLoss,
          gainLossPercent,
        };
      });

      const holdingsValue = updatedHoldings.reduce((sum, h) => sum + h.marketValue, 0);

      return {
        ...prev,
        holdings: updatedHoldings,
        totalValue: prev.cash + holdingsValue,
        lastUpdated: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Reset portfolio to initial state
   */
  const resetPortfolio = useCallback(() => {
    setPortfolio(INITIAL_PORTFOLIO);
    setTrades([]);
  }, []);

  /**
   * Calculate portfolio metrics
   */
  const getMetrics = useCallback(() => {
    const totalGainLoss = portfolio.totalValue - portfolio.initialCapital;
    const totalGainLossPercent = (totalGainLoss / portfolio.initialCapital) * 100;
    const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const cashPercent = (portfolio.cash / portfolio.totalValue) * 100;

    return {
      totalValue: portfolio.totalValue,
      cash: portfolio.cash,
      holdingsValue,
      cashPercent,
      totalGainLoss,
      totalGainLossPercent,
      positionCount: portfolio.holdings.length,
    };
  }, [portfolio]);

  return {
    portfolio,
    trades,
    executeBuy,
    executeSell,
    updatePrices,
    resetPortfolio,
    getMetrics,
  };
}
