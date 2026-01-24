// Portfolio state
export interface Portfolio {
  cash: number;
  holdings: Holding[];
  totalValue: number;
  lastUpdated: string;
  initialCapital: number;
}

export interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

// Trade records
export interface Trade {
  id: string;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  reason: string;
  signals: SignalSnapshot;
}

// Stock data
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface HistoricalData {
  symbol: string;
  data: OHLCV[];
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Strategy signals
export interface StrategySignal {
  name: string;
  score: number; // -1 to 1 (sell to buy)
  confidence: number; // 0 to 1
  reason: string;
}

export interface SignalSnapshot {
  symbol: string;
  timestamp: string;
  momentum: StrategySignal;
  meanReversion: StrategySignal;
  sentiment: StrategySignal;
  technical: StrategySignal;
  combined: number; // Weighted final score
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
}

// Configuration
export interface TradingConfig {
  initialCapital: number;
  maxPositionSize: number; // % of portfolio per stock
  maxPositions: number; // Maximum number of positions
  minTradeValue: number; // Minimum trade value
  strategyWeights: StrategyWeights;
  scheduleInterval: 'hourly' | 'daily' | 'manual';
}

export interface StrategyWeights {
  momentum: number;
  meanReversion: number;
  sentiment: number;
  technical: number;
}

// Scheduler state
export interface SchedulerState {
  isRunning: boolean;
  nextRun: string | null;
  lastRun: string | null;
}

// Default configuration
export const DEFAULT_CONFIG: TradingConfig = {
  initialCapital: 10000,
  maxPositionSize: 0.20, // 20% max per position
  maxPositions: 10,
  minTradeValue: 100,
  strategyWeights: {
    momentum: 0.30,
    meanReversion: 0.25,
    sentiment: 0.15,
    technical: 0.30,
  },
  scheduleInterval: 'daily',
};
