import { Redis } from '@upstash/redis';
import type { Portfolio, Trade, SignalSnapshot } from '../../components/trading/types';
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
};

export interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
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
    // Keep last 1000 snapshots (about 16 hours at 1 per minute)
    const trimmed = history.slice(-1000);
    await redis.set(KEYS.HISTORY, trimmed);
  } catch (error) {
    console.error('Error adding portfolio snapshot:', error);
  }
}
