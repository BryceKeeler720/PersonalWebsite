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
  companyName?: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  isExtendedHours?: boolean;
  priceUpdatedAt?: string;
  dividendYield?: number;
  annualDividend?: number;
  highWaterMark?: number;
  entryATR?: number | null;
  entryTimestamp?: string;
  barsHeld?: number;
  entrySignals?: SignalSnapshot;
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
  entrySignals?: SignalSnapshot | null;
  gainLoss?: number;
  gainLossPercent?: number;
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
  vwapReversion: StrategySignal;
  technical: StrategySignal;
  combined: number; // Weighted final score
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  price?: number; // Current price from latest candle
  regime?: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGE_BOUND' | 'UNKNOWN';
}

// Configuration
export interface TradingConfig {
  initialCapital: number;
  maxPositionSize: number; // % of portfolio per stock
  maxPositions: number; // Maximum number of positions
  minTradeValue: number; // Minimum trade value
  targetCashRatio: number; // Target cash % to maintain (e.g., 0.10 = 10%)
  strategyWeights: StrategyWeights;
  scheduleInterval: 'intraday' | 'hourly' | 'daily' | 'manual';
}

export interface StrategyWeights {
  momentum: number;
  meanReversion: number;
  vwapReversion: number;
  technical: number;
}

// Scheduler state
export interface SchedulerState {
  isRunning: boolean;
  nextRun: string | null;
  lastRun: string | null;
}

// Self-Learning System state
export interface RegimeWeight {
  trend: number;
  reversion: number;
}

export interface ClosedTradeAttribution {
  regime: string;
  isWin: boolean;
  gainLossPercent: number;
  trendGroupScore: number;
  reversionGroupScore: number;
  trendDominant: boolean;
  timestamp: string;
}

export interface WeightSnapshot {
  timestamp: string;
  weights: Record<string, RegimeWeight>;
  tradesAnalyzed: number;
}

export interface ParamChange {
  timestamp: string;
  paramName: string;
  oldValue: number;
  newValue: number;
  olderWinRate: number;
  newerWinRate: number;
  tradesAnalyzed: number;
}

export interface LearningState {
  regimeWeights: Record<string, RegimeWeight>;
  params: Record<string, number>;
  closedTrades: ClosedTradeAttribution[];
  totalTradesAnalyzed: number;
  warmupComplete: boolean;
  lastParamTuneAt: number;
  paramDirections: Record<string, number>;
  weightHistory: WeightSnapshot[];
  paramHistory: ParamChange[];
}

// Market visualization metric (computed during cron analysis)
export interface AssetMetric {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  atr: number;
  marketCap?: number;
  timestamp: string;
}

// Default configuration - regime-adaptive strategy
export const DEFAULT_CONFIG: TradingConfig = {
  initialCapital: 10000,
  maxPositionSize: 0.07, // 7% max per position — ATR-based sizing within this cap
  maxPositions: 15, // Concentrated portfolio
  minTradeValue: 15,
  targetCashRatio: 0.05, // 5% cash buffer
  strategyWeights: {
    momentum: 0.35, // Trend Momentum (Group A)
    meanReversion: 0.25, // BB+RSI Reversion (Group B)
    vwapReversion: 0.10, // VWAP Reversion (Group B)
    technical: 0.30, // MACD Trend (Group A)
  },
  scheduleInterval: 'intraday',
};
