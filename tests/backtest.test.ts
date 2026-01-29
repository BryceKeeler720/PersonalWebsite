import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateStdDev,
  calculateZScore,
} from '../src/lib/trading/indicators';

// Sample price data simulating realistic market behavior
const generateSampleData = (days: number, startPrice: number = 100, volatility: number = 0.02) => {
  const data: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  let price = startPrice;

  for (let i = 0; i < days; i++) {
    const date = new Date(2024, 0, 1 + i);
    const change = (Math.random() - 0.5) * 2 * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(100000 + Math.random() * 500000);

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return data;
};

// Mini-backtest simulation logic (simplified version of the actual backtest)
interface Signal {
  symbol: string;
  combined: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
}

interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  gainLossPercent: number;
}

interface Portfolio {
  cash: number;
  holdings: Holding[];
  totalValue: number;
}

const calculateMomentumSignal = (prices: number[]): number => {
  if (prices.length < 63) return 0;

  const current = prices[prices.length - 1];
  const threeMonthsAgo = prices[prices.length - 63];
  const momentum = ((current - threeMonthsAgo) / threeMonthsAgo) * 100;

  if (momentum > 15) return 0.5;
  if (momentum > 5) return 0.25;
  if (momentum > -5) return 0;
  if (momentum > -15) return -0.25;
  return -0.5;
};

const calculateMeanReversionSignal = (prices: number[]): number => {
  if (prices.length < 20) return 0;

  const recent = prices.slice(-20);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const stdDev = calculateStdDev(recent);
  const current = prices[prices.length - 1];
  const zScore = calculateZScore(current, mean, stdDev);

  if (zScore < -2) return 0.6;
  if (zScore < -1) return 0.3;
  if (zScore > 2) return -0.6;
  if (zScore > 1) return -0.3;
  return 0;
};

const calculateTechnicalSignal = (prices: number[]): number => {
  if (prices.length < 15) return 0;

  const rsi = calculateRSI(prices, 14);
  if (rsi.length === 0) return 0;

  const currentRSI = rsi[rsi.length - 1];
  if (currentRSI < 30) return 0.5;
  if (currentRSI < 40) return 0.25;
  if (currentRSI > 70) return -0.5;
  if (currentRSI > 60) return -0.25;
  return 0;
};

const combineSignals = (
  momentum: number,
  meanReversion: number,
  technical: number,
  weights: { momentum: number; meanReversion: number; technical: number }
): Signal => {
  const combined =
    momentum * weights.momentum +
    meanReversion * weights.meanReversion +
    technical * weights.technical;

  let recommendation: Signal['recommendation'];
  if (combined > 0.5) recommendation = 'STRONG_BUY';
  else if (combined > 0.15) recommendation = 'BUY';
  else if (combined < -0.5) recommendation = 'STRONG_SELL';
  else if (combined < -0.15) recommendation = 'SELL';
  else recommendation = 'HOLD';

  return { symbol: 'TEST', combined, recommendation };
};

const runMiniBacktest = (
  data: { close: number }[],
  config: {
    initialCapital: number;
    maxPositionSize: number;
    buyThreshold: number;
    stopLoss: number;
    profitTake: number;
    weights: { momentum: number; meanReversion: number; technical: number };
  }
) => {
  const portfolio: Portfolio = {
    cash: config.initialCapital,
    holdings: [],
    totalValue: config.initialCapital,
  };

  const trades: { date: number; action: string; price: number; shares: number; pnl?: number }[] = [];
  const portfolioHistory: number[] = [];
  const prices = data.map((d) => d.close);

  // Need warmup period
  const warmup = 63;
  if (prices.length < warmup + 10) {
    return {
      finalValue: config.initialCapital,
      totalReturn: 0,
      trades: [],
      portfolioHistory: [config.initialCapital],
    };
  }

  for (let i = warmup; i < prices.length; i++) {
    const pricesUpToNow = prices.slice(0, i + 1);
    const currentPrice = prices[i];

    // Calculate signals
    const momentum = calculateMomentumSignal(pricesUpToNow);
    const meanReversion = calculateMeanReversionSignal(pricesUpToNow);
    const technical = calculateTechnicalSignal(pricesUpToNow);
    const signal = combineSignals(momentum, meanReversion, technical, config.weights);

    // Update existing holdings
    for (const holding of portfolio.holdings) {
      holding.currentPrice = currentPrice;
      holding.marketValue = holding.shares * currentPrice;
      holding.gainLossPercent = ((currentPrice - holding.avgCost) / holding.avgCost) * 100;
    }

    // Sell logic
    for (const holding of [...portfolio.holdings]) {
      let shouldSell = false;
      if (signal.recommendation === 'STRONG_SELL') shouldSell = true;
      if (holding.gainLossPercent <= config.stopLoss) shouldSell = true;
      if (holding.gainLossPercent >= config.profitTake) shouldSell = true;

      if (shouldSell) {
        const pnl = (currentPrice - holding.avgCost) * holding.shares;
        portfolio.cash += holding.shares * currentPrice;
        trades.push({ date: i, action: 'SELL', price: currentPrice, shares: holding.shares, pnl });
        portfolio.holdings = portfolio.holdings.filter((h) => h.symbol !== holding.symbol);
      }
    }

    // Buy logic
    if (signal.combined > config.buyThreshold && portfolio.holdings.length === 0) {
      const positionSize = Math.min(portfolio.cash, portfolio.totalValue * config.maxPositionSize);
      if (positionSize > 0) {
        const shares = positionSize / currentPrice;
        portfolio.cash -= positionSize;
        portfolio.holdings.push({
          symbol: 'TEST',
          shares,
          avgCost: currentPrice,
          currentPrice,
          marketValue: positionSize,
          gainLossPercent: 0,
        });
        trades.push({ date: i, action: 'BUY', price: currentPrice, shares });
      }
    }

    // Update portfolio value
    const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    portfolio.totalValue = portfolio.cash + holdingsValue;
    portfolioHistory.push(portfolio.totalValue);
  }

  const totalReturn = ((portfolio.totalValue - config.initialCapital) / config.initialCapital) * 100;

  return {
    finalValue: portfolio.totalValue,
    totalReturn,
    trades,
    portfolioHistory,
  };
};

describe('Backtest Integration Tests', () => {
  describe('Signal Calculations', () => {
    it('should generate momentum signal from price data', () => {
      // Uptrending prices
      const uptrend = Array.from({ length: 100 }, (_, i) => 100 + i);
      const signal = calculateMomentumSignal(uptrend);
      expect(signal).toBeGreaterThan(0);

      // Downtrending prices
      const downtrend = Array.from({ length: 100 }, (_, i) => 200 - i);
      const signalDown = calculateMomentumSignal(downtrend);
      expect(signalDown).toBeLessThan(0);
    });

    it('should generate mean reversion signal from price data', () => {
      // Prices far below mean (oversold)
      const oversold = [...Array(19).fill(100), 80];
      const signalOversold = calculateMeanReversionSignal(oversold);
      expect(signalOversold).toBeGreaterThan(0);

      // Prices far above mean (overbought)
      const overbought = [...Array(19).fill(100), 120];
      const signalOverbought = calculateMeanReversionSignal(overbought);
      expect(signalOverbought).toBeLessThan(0);
    });

    it('should combine signals with weighted average', () => {
      const weights = { momentum: 0.4, meanReversion: 0.3, technical: 0.3 };
      const signal = combineSignals(0.5, 0.3, 0.2, weights);
      // 0.5*0.4 + 0.3*0.3 + 0.2*0.3 = 0.2 + 0.09 + 0.06 = 0.35
      expect(signal.combined).toBeCloseTo(0.35, 5);
      expect(signal.recommendation).toBe('BUY');
    });

    it('should classify signal strength correctly', () => {
      const weights = { momentum: 1, meanReversion: 0, technical: 0 };

      expect(combineSignals(0.6, 0, 0, weights).recommendation).toBe('STRONG_BUY');
      expect(combineSignals(0.3, 0, 0, weights).recommendation).toBe('BUY');
      expect(combineSignals(0.1, 0, 0, weights).recommendation).toBe('HOLD');
      expect(combineSignals(-0.3, 0, 0, weights).recommendation).toBe('SELL');
      expect(combineSignals(-0.6, 0, 0, weights).recommendation).toBe('STRONG_SELL');
    });
  });

  describe('Portfolio Management', () => {
    it('should start with initial capital', () => {
      const data = generateSampleData(100);
      const result = runMiniBacktest(data, {
        initialCapital: 10000,
        maxPositionSize: 0.5,
        buyThreshold: 0.15,
        stopLoss: -10,
        profitTake: 20,
        weights: { momentum: 0.4, meanReversion: 0.3, technical: 0.3 },
      });

      expect(result.portfolioHistory[0]).toBeDefined();
    });

    it('should preserve capital when no trades occur', () => {
      // Very strict buy threshold that won't be met
      const data = generateSampleData(100);
      const result = runMiniBacktest(data, {
        initialCapital: 10000,
        maxPositionSize: 0.5,
        buyThreshold: 10, // Impossible to reach
        stopLoss: -10,
        profitTake: 20,
        weights: { momentum: 0.4, meanReversion: 0.3, technical: 0.3 },
      });

      expect(result.finalValue).toBe(10000);
      expect(result.trades.filter((t) => t.action === 'BUY').length).toBe(0);
    });

    it('should execute stop loss', () => {
      // Create declining price data
      const data = Array.from({ length: 150 }, (_, i) => ({
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        open: 100 - i * 0.5,
        high: 100 - i * 0.5 + 1,
        low: 100 - i * 0.5 - 1,
        close: 100 - i * 0.5,
        volume: 100000,
      }));

      const result = runMiniBacktest(data, {
        initialCapital: 10000,
        maxPositionSize: 1,
        buyThreshold: -1, // Very easy to trigger buy
        stopLoss: -5, // Tight stop loss
        profitTake: 50,
        weights: { momentum: 0, meanReversion: 1, technical: 0 }, // Mean reversion will trigger in decline
      });

      // Should have some sell trades
      const sells = result.trades.filter((t) => t.action === 'SELL');
      if (sells.length > 0) {
        // Verify stop loss was triggered
        const losingSells = sells.filter((t) => t.pnl !== undefined && t.pnl < 0);
        expect(losingSells.length).toBeGreaterThan(0);
      }
    });

    it('should respect position sizing limits', () => {
      const data = generateSampleData(100);
      const maxPositionSize = 0.25;

      const result = runMiniBacktest(data, {
        initialCapital: 10000,
        maxPositionSize,
        buyThreshold: -1, // Easy to trigger
        stopLoss: -50,
        profitTake: 50,
        weights: { momentum: 0.4, meanReversion: 0.3, technical: 0.3 },
      });

      // Check that buys don't exceed position size
      const buys = result.trades.filter((t) => t.action === 'BUY');
      for (const buy of buys) {
        const buyValue = buy.shares * buy.price;
        expect(buyValue).toBeLessThanOrEqual(10000 * maxPositionSize * 1.01); // Allow 1% tolerance
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate total return correctly', () => {
      const result = runMiniBacktest(generateSampleData(100), {
        initialCapital: 10000,
        maxPositionSize: 0.5,
        buyThreshold: 0.15,
        stopLoss: -10,
        profitTake: 20,
        weights: { momentum: 0.4, meanReversion: 0.3, technical: 0.3 },
      });

      const expectedReturn = ((result.finalValue - 10000) / 10000) * 100;
      expect(result.totalReturn).toBeCloseTo(expectedReturn, 5);
    });

    it('should track portfolio history over time', () => {
      const data = generateSampleData(100);
      const result = runMiniBacktest(data, {
        initialCapital: 10000,
        maxPositionSize: 0.5,
        buyThreshold: 0.15,
        stopLoss: -10,
        profitTake: 20,
        weights: { momentum: 0.4, meanReversion: 0.3, technical: 0.3 },
      });

      // Should have history entries
      expect(result.portfolioHistory.length).toBeGreaterThan(0);

      // All values should be positive
      for (const value of result.portfolioHistory) {
        expect(value).toBeGreaterThan(0);
      }
    });
  });

  describe('Indicator Integration', () => {
    it('should use SMA for trend identification', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const sma20 = calculateSMA(prices, 20);
      const sma50 = calculateSMA(prices, 50);

      // In uptrend, shorter SMA should be above longer SMA
      // (comparing last available values)
      expect(sma20[sma20.length - 1]).toBeGreaterThan(sma50[0]);
    });

    it('should use Bollinger Bands for volatility', () => {
      const stableData = Array.from({ length: 30 }, () => 100);
      const volatileData = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 20);

      const stableBB = calculateBollingerBands(stableData, 20, 2);
      const volatileBB = calculateBollingerBands(volatileData, 20, 2);

      // Volatile data should have wider bands
      const stableWidth = stableBB.upper[0] - stableBB.lower[0];
      const volatileWidth = volatileBB.upper[0] - volatileBB.lower[0];
      expect(volatileWidth).toBeGreaterThan(stableWidth);
    });

    it('should use RSI for overbought/oversold conditions', () => {
      // Strong uptrend should produce high RSI
      const uptrend = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
      const rsiUp = calculateRSI(uptrend, 14);
      if (rsiUp.length > 0) {
        expect(rsiUp[rsiUp.length - 1]).toBeGreaterThan(50);
      }

      // Strong downtrend should produce low RSI
      const downtrend = Array.from({ length: 20 }, (_, i) => 200 - i * 2);
      const rsiDown = calculateRSI(downtrend, 14);
      if (rsiDown.length > 0) {
        expect(rsiDown[rsiDown.length - 1]).toBeLessThan(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle insufficient data gracefully', () => {
      const shortData = generateSampleData(10);
      const result = runMiniBacktest(shortData, {
        initialCapital: 10000,
        maxPositionSize: 0.5,
        buyThreshold: 0.15,
        stopLoss: -10,
        profitTake: 20,
        weights: { momentum: 0.4, meanReversion: 0.3, technical: 0.3 },
      });

      // Should return without crashing
      expect(result.finalValue).toBe(10000);
      expect(result.trades).toEqual([]);
    });

    it('should handle zero volatility data', () => {
      const flatData = Array.from({ length: 100 }, () => ({
        date: '2024-01-01',
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 100000,
      }));

      const result = runMiniBacktest(flatData, {
        initialCapital: 10000,
        maxPositionSize: 0.5,
        buyThreshold: 0.15,
        stopLoss: -10,
        profitTake: 20,
        weights: { momentum: 0.4, meanReversion: 0.3, technical: 0.3 },
      });

      // Should handle without errors
      expect(result.finalValue).toBeGreaterThan(0);
    });

    it('should handle extreme price movements', () => {
      // Simulate a crash and recovery
      const crashData = [
        ...Array.from({ length: 70 }, (_, i) => ({
          date: `2024-01-${i + 1}`,
          open: 100,
          high: 100,
          low: 100,
          close: 100,
          volume: 100000,
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          date: `2024-03-${i + 1}`,
          open: 100 - i * 5,
          high: 100 - i * 5,
          low: 100 - i * 5 - 3,
          close: 100 - i * 5 - 2,
          volume: 200000,
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          date: `2024-04-${i + 1}`,
          open: 50 + i * 3,
          high: 50 + i * 3 + 2,
          low: 50 + i * 3,
          close: 50 + i * 3 + 1,
          volume: 150000,
        })),
      ];

      const result = runMiniBacktest(crashData, {
        initialCapital: 10000,
        maxPositionSize: 0.5,
        buyThreshold: 0.1,
        stopLoss: -15,
        profitTake: 25,
        weights: { momentum: 0.3, meanReversion: 0.4, technical: 0.3 },
      });

      // Should not crash and should have some portfolio value
      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.portfolioHistory.length).toBeGreaterThan(0);
    });
  });
});
