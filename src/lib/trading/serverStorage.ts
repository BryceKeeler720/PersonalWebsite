import { Redis } from '@upstash/redis';
import type { Portfolio, Trade, SignalSnapshot, LearningState, AssetMetric } from '../../components/trading/types';
import { DEFAULT_CONFIG } from '../../components/trading/types';

// Initialize Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const KEYS = {
  PORTFOLIO: 'tradingbot:portfolio',
  TRADES: 'tradingbot:trades',
  SIGNALS: 'tradingbot:signals',
  LAST_RUN: 'tradingbot:lastRun',
  HISTORY: 'tradingbot:history',
  SPY_BENCHMARK: 'tradingbot:spyBenchmark',
  LEARNING_STATE: 'tradingbot:learningState',
  COOLDOWNS: 'tradingbot:cooldowns',
  METRICS: 'tradingbot:metrics',
};

export interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
}

export interface BenchmarkPoint {
  timestamp: string;
  value: number;
}

const INITIAL_PORTFOLIO: Portfolio = {
  cash: DEFAULT_CONFIG.initialCapital,
  holdings: [],
  totalValue: DEFAULT_CONFIG.initialCapital,
  lastUpdated: new Date().toISOString(),
  initialCapital: DEFAULT_CONFIG.initialCapital,
};

export async function getPortfolio(): Promise<Portfolio> {
  try {
    const data = await redis.get<Portfolio>(KEYS.PORTFOLIO);
    return data || INITIAL_PORTFOLIO;
  } catch (error) {
    console.error('Error getting portfolio:', error);
    return INITIAL_PORTFOLIO;
  }
}

export async function savePortfolio(portfolio: Portfolio): Promise<void> {
  try {
    await redis.set(KEYS.PORTFOLIO, portfolio);
  } catch (error) {
    console.error('Error saving portfolio:', error);
  }
}

export async function getTrades(): Promise<Trade[]> {
  try {
    const data = await redis.get<Trade[]>(KEYS.TRADES);
    return data || [];
  } catch (error) {
    console.error('Error getting trades:', error);
    return [];
  }
}

export async function saveTrades(trades: Trade[]): Promise<void> {
  try {
    // Keep only last 100 trades to avoid storage limits
    const trimmedTrades = trades.slice(0, 100);
    await redis.set(KEYS.TRADES, trimmedTrades);
  } catch (error) {
    console.error('Error saving trades:', error);
  }
}

export async function addTrade(trade: Trade): Promise<void> {
  const trades = await getTrades();
  trades.unshift(trade);
  await saveTrades(trades);
}

export async function getSignals(): Promise<Record<string, SignalSnapshot>> {
  try {
    const data = await redis.get<Record<string, SignalSnapshot>>(KEYS.SIGNALS);
    return data || {};
  } catch (error) {
    console.error('Error getting signals:', error);
    return {};
  }
}

export async function saveSignals(signals: Record<string, SignalSnapshot>): Promise<void> {
  try {
    await redis.set(KEYS.SIGNALS, signals);
  } catch (error) {
    console.error('Error saving signals:', error);
  }
}

export async function getLastRun(): Promise<string | null> {
  try {
    return await redis.get<string>(KEYS.LAST_RUN);
  } catch (error) {
    console.error('Error getting last run:', error);
    return null;
  }
}

export async function setLastRun(timestamp: string): Promise<void> {
  try {
    await redis.set(KEYS.LAST_RUN, timestamp);
  } catch (error) {
    console.error('Error setting last run:', error);
  }
}

export async function resetPortfolio(): Promise<void> {
  try {
    await redis.set(KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
    await redis.set(KEYS.TRADES, []);
    await redis.set(KEYS.SIGNALS, {});
    await redis.set(KEYS.HISTORY, []);
  } catch (error) {
    console.error('Error resetting portfolio:', error);
  }
}

export async function getPortfolioHistory(): Promise<PortfolioSnapshot[]> {
  try {
    const data = await redis.get<PortfolioSnapshot[]>(KEYS.HISTORY);
    return data || [];
  } catch (error) {
    console.error('Error getting portfolio history:', error);
    return [];
  }
}

export async function addPortfolioSnapshot(snapshot: PortfolioSnapshot): Promise<void> {
  try {
    const history = await getPortfolioHistory();
    history.push(snapshot);
    // Keep last 2000 snapshots (~14 days at 1 per 10 minutes)
    const trimmed = history.slice(-2000);
    await redis.set(KEYS.HISTORY, trimmed);
  } catch (error) {
    console.error('Error adding portfolio snapshot:', error);
  }
}

export async function getSPYBenchmark(): Promise<BenchmarkPoint[]> {
  try {
    const data = await redis.get<BenchmarkPoint[]>(KEYS.SPY_BENCHMARK);
    return data || [];
  } catch (error) {
    console.error('Error getting SPY benchmark:', error);
    return [];
  }
}

export async function getLearningState(): Promise<LearningState | null> {
  try {
    return await redis.get<LearningState>(KEYS.LEARNING_STATE);
  } catch (error) {
    console.error('Error getting learning state:', error);
    return null;
  }
}

// Asset metrics for market visualization
export async function getMetrics(): Promise<Record<string, AssetMetric>> {
  try {
    const data = await redis.get<Record<string, AssetMetric>>(KEYS.METRICS);
    return data || {};
  } catch (error) {
    console.error('Error getting metrics:', error);
    return {};
  }
}

export async function saveMetrics(metrics: Record<string, AssetMetric>): Promise<void> {
  try {
    await redis.set(KEYS.METRICS, metrics);
  } catch (error) {
    console.error('Error saving metrics:', error);
  }
}

// Cooldown tracking - prevents re-entering recently sold positions
export async function getCooldowns(): Promise<Record<string, string>> {
  try {
    const data = await redis.get<Record<string, string>>(KEYS.COOLDOWNS);
    return data || {};
  } catch (error) {
    console.error('Error getting cooldowns:', error);
    return {};
  }
}

export async function setCooldown(symbol: string, timestamp: string): Promise<void> {
  try {
    const cooldowns = await getCooldowns();
    cooldowns[symbol] = timestamp;

    // Clean up old cooldowns (> 7 days) to prevent unbounded growth
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [sym, ts] of Object.entries(cooldowns)) {
      if (new Date(ts).getTime() < cutoff) {
        delete cooldowns[sym];
      }
    }

    await redis.set(KEYS.COOLDOWNS, cooldowns);
  } catch (error) {
    console.error('Error setting cooldown:', error);
  }
}
