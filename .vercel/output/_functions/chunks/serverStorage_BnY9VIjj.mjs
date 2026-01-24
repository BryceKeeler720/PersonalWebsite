import { Redis } from '@upstash/redis';
import { D as DEFAULT_CONFIG } from './types_vTnG2Q7D.mjs';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ""
});
const KEYS = {
  PORTFOLIO: "tradingbot:portfolio",
  TRADES: "tradingbot:trades",
  SIGNALS: "tradingbot:signals",
  LAST_RUN: "tradingbot:lastRun",
  HISTORY: "tradingbot:history"
};
const INITIAL_PORTFOLIO = {
  cash: DEFAULT_CONFIG.initialCapital,
  holdings: [],
  totalValue: DEFAULT_CONFIG.initialCapital,
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
  initialCapital: DEFAULT_CONFIG.initialCapital
};
async function getPortfolio() {
  try {
    const data = await redis.get(KEYS.PORTFOLIO);
    return data || INITIAL_PORTFOLIO;
  } catch (error) {
    console.error("Error getting portfolio:", error);
    return INITIAL_PORTFOLIO;
  }
}
async function savePortfolio(portfolio) {
  try {
    await redis.set(KEYS.PORTFOLIO, portfolio);
  } catch (error) {
    console.error("Error saving portfolio:", error);
  }
}
async function getTrades() {
  try {
    const data = await redis.get(KEYS.TRADES);
    return data || [];
  } catch (error) {
    console.error("Error getting trades:", error);
    return [];
  }
}
async function saveTrades(trades) {
  try {
    const trimmedTrades = trades.slice(0, 100);
    await redis.set(KEYS.TRADES, trimmedTrades);
  } catch (error) {
    console.error("Error saving trades:", error);
  }
}
async function addTrade(trade) {
  const trades = await getTrades();
  trades.unshift(trade);
  await saveTrades(trades);
}
async function getSignals() {
  try {
    const data = await redis.get(KEYS.SIGNALS);
    return data || {};
  } catch (error) {
    console.error("Error getting signals:", error);
    return {};
  }
}
async function saveSignals(signals) {
  try {
    await redis.set(KEYS.SIGNALS, signals);
  } catch (error) {
    console.error("Error saving signals:", error);
  }
}
async function getLastRun() {
  try {
    return await redis.get(KEYS.LAST_RUN);
  } catch (error) {
    console.error("Error getting last run:", error);
    return null;
  }
}
async function setLastRun(timestamp) {
  try {
    await redis.set(KEYS.LAST_RUN, timestamp);
  } catch (error) {
    console.error("Error setting last run:", error);
  }
}
async function getPortfolioHistory() {
  try {
    const data = await redis.get(KEYS.HISTORY);
    return data || [];
  } catch (error) {
    console.error("Error getting portfolio history:", error);
    return [];
  }
}
async function addPortfolioSnapshot(snapshot) {
  try {
    const history = await getPortfolioHistory();
    history.push(snapshot);
    const trimmed = history.slice(-1e3);
    await redis.set(KEYS.HISTORY, trimmed);
  } catch (error) {
    console.error("Error adding portfolio snapshot:", error);
  }
}

export { addTrade as a, saveSignals as b, setLastRun as c, addPortfolioSnapshot as d, getTrades as e, getSignals as f, getPortfolio as g, getLastRun as h, getPortfolioHistory as i, savePortfolio as s };
