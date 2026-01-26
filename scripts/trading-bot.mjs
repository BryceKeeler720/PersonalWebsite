#!/usr/bin/env node
/**
 * Trading Bot Script - Self-hosted continuous service
 * Runs as a daemon with configurable intervals for high-frequency trading
 */

import { Redis } from '@upstash/redis';

// Service Configuration
const RUN_INTERVAL_MS = parseInt(process.env.RUN_INTERVAL_MS || '60000', 10); // Default: 1 minute
const RUN_ONCE = process.env.RUN_ONCE === 'true'; // For GitHub Actions compatibility
let isShuttingDown = false;
let currentRunPromise = null;

// Configuration
const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 500;
const DEFAULT_CONFIG = {
  initialCapital: 10000,
  maxPositionSize: 0.12,
  maxPositions: 50,
  minTradeValue: 15,
  targetCashRatio: 0.10,
  strategyWeights: {
    momentum: 0.30,
    meanReversion: 0.25,
    sentiment: 0.15,
    technical: 0.30,
  },
};

// Asset lists
const CRYPTO_SYMBOLS = [
  'BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'SOL-USD', 'ADA-USD', 'DOGE-USD',
  'AVAX-USD', 'DOT-USD', 'MATIC-USD', 'LINK-USD', 'SHIB-USD', 'LTC-USD',
  'ATOM-USD', 'UNI-USD', 'XLM-USD', 'NEAR-USD', 'APT-USD', 'OP-USD', 'ARB-USD',
  'FIL-USD', 'HBAR-USD', 'ICP-USD', 'VET-USD', 'AAVE-USD', 'MKR-USD', 'GRT-USD',
  'INJ-USD', 'RUNE-USD', 'FTM-USD',
];

const FOREX_SYMBOLS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X',
  'NZDUSD=X', 'EURGBP=X', 'EURJPY=X', 'GBPJPY=X', 'AUDJPY=X', 'CADJPY=X',
  'EURAUD=X', 'EURCHF=X', 'GBPCHF=X', 'USDMXN=X', 'USDZAR=X', 'USDTRY=X',
  'USDINR=X', 'USDCNY=X',
];

const FUTURES_SYMBOLS = [
  'ES=F', 'NQ=F', 'YM=F', 'RTY=F', 'GC=F', 'SI=F', 'CL=F', 'BZ=F', 'NG=F',
  'HG=F', 'PL=F', 'ZC=F', 'ZW=F', 'ZS=F', 'ZB=F', 'ZN=F', '6E=F', '6B=F', '6J=F',
];

const SP500_SYMBOLS = [
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'AVGO', 'TSLA',
  'BRK-B', 'LLY', 'WMT', 'JPM', 'V', 'XOM', 'JNJ', 'ORCL', 'MA', 'MU', 'COST',
  'AMD', 'PLTR', 'ABBV', 'HD', 'BAC', 'NFLX', 'PG', 'CVX', 'UNH', 'KO',
  'GE', 'CSCO', 'CAT', 'MS', 'GS', 'LRCX', 'IBM', 'PM', 'WFC', 'MRK',
  'RTX', 'AMAT', 'AXP', 'TMO', 'INTC', 'MCD', 'CRM', 'LIN', 'TMUS', 'KLAC',
  'C', 'PEP', 'BA', 'DIS', 'ABT', 'ISRG', 'AMGN', 'APH', 'SCHW', 'GEV',
  'APP', 'NEE', 'TXN', 'BLK', 'ACN', 'ANET', 'UBER', 'TJX', 'GILD', 'T',
  'VZ', 'QCOM', 'DHR', 'BKNG', 'SPGI', 'INTU', 'LOW', 'ADI', 'PFE', 'HON',
  'NOW', 'DE', 'BSX', 'LMT', 'UNP', 'COF', 'SYK', 'NEM', 'MDT', 'ETN',
  'WELL', 'PANW', 'ADBE', 'COP', 'PGR', 'VRTX', 'CB', 'PLD', 'PH', 'BX',
];

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEYS = {
  PORTFOLIO: 'tradingbot:portfolio',
  TRADES: 'tradingbot:trades',
  SIGNALS: 'tradingbot:signals',
  LAST_RUN: 'tradingbot:lastRun',
  HISTORY: 'tradingbot:history',
};

// Storage functions
async function getPortfolio() {
  const data = await redis.get(KEYS.PORTFOLIO);
  return data || {
    cash: DEFAULT_CONFIG.initialCapital,
    holdings: [],
    totalValue: DEFAULT_CONFIG.initialCapital,
    lastUpdated: new Date().toISOString(),
    initialCapital: DEFAULT_CONFIG.initialCapital,
  };
}

async function savePortfolio(portfolio) {
  await redis.set(KEYS.PORTFOLIO, portfolio);
}

async function getTrades() {
  const data = await redis.get(KEYS.TRADES);
  return data || [];
}

async function addTrade(trade) {
  const trades = await getTrades();
  trades.unshift(trade);
  await redis.set(KEYS.TRADES, trades.slice(0, 100));
}

async function saveSignals(signals) {
  await redis.set(KEYS.SIGNALS, signals);
}

async function setLastRun(timestamp) {
  await redis.set(KEYS.LAST_RUN, timestamp);
}

async function getPortfolioHistory() {
  const data = await redis.get(KEYS.HISTORY);
  return data || [];
}

async function addPortfolioSnapshot(snapshot) {
  const history = await getPortfolioHistory();
  history.push(snapshot);
  await redis.set(KEYS.HISTORY, history.slice(-1000));
}

// Yahoo Finance API functions
async function fetchYahooQuote(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d&includePrePost=true`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result?.meta) return null;

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp;

    let price = meta.regularMarketPrice;
    let isExtendedHours = false;

    if (quotes?.close && timestamps?.length > 0) {
      for (let i = quotes.close.length - 1; i >= 0; i--) {
        if (quotes.close[i] !== null) {
          price = quotes.close[i];
          const lastTimestamp = timestamps[i];
          const tradingPeriod = meta.currentTradingPeriod;
          const isPreMarket = tradingPeriod?.pre && lastTimestamp >= tradingPeriod.pre.start && lastTimestamp < tradingPeriod.pre.end;
          const isPostMarket = tradingPeriod?.post && lastTimestamp >= tradingPeriod.post.start && lastTimestamp < tradingPeriod.post.end;
          isExtendedHours = isPreMarket || isPostMarket;
          break;
        }
      }
    }

    if (!price) return null;
    return {
      price,
      isExtendedHours,
      dividendYield: meta.dividendYield || undefined,
      annualDividend: meta.trailingAnnualDividendRate || undefined,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    return null;
  }
}

async function fetchYahooHistorical(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;

    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];

    return timestamp
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i],
      }))
      .filter(d => d.open !== null && d.high !== null && d.low !== null && d.close !== null);
  } catch (error) {
    console.error(`Error fetching historical for ${symbol}:`, error.message);
    return null;
  }
}

// Strategy calculations
function calculateSMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((sum, d) => sum + d.close, 0) / period;
}

function calculateEMA(data, period) {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(data, period = 14) {
  if (data.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMomentumSignal(data) {
  if (data.length < 50) return { name: 'momentum', score: 0, confidence: 0, reason: 'Insufficient data' };

  const currentPrice = data[data.length - 1].close;
  const sma20 = calculateSMA(data, 20);
  const sma50 = calculateSMA(data, 50);
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  let score = 0;
  const reasons = [];

  if (currentPrice > sma20) { score += 0.25; reasons.push('Above SMA20'); }
  else { score -= 0.25; reasons.push('Below SMA20'); }

  if (currentPrice > sma50) { score += 0.25; reasons.push('Above SMA50'); }
  else { score -= 0.25; reasons.push('Below SMA50'); }

  if (sma20 > sma50) { score += 0.25; reasons.push('SMA20 > SMA50'); }
  else { score -= 0.25; reasons.push('SMA20 < SMA50'); }

  if (ema12 > ema26) { score += 0.25; reasons.push('MACD bullish'); }
  else { score -= 0.25; reasons.push('MACD bearish'); }

  return { name: 'momentum', score: Math.max(-1, Math.min(1, score)), confidence: 0.7, reason: reasons.slice(0, 2).join(', ') };
}

function calculateMeanReversionSignal(data) {
  if (data.length < 20) return { name: 'meanReversion', score: 0, confidence: 0, reason: 'Insufficient data' };

  const currentPrice = data[data.length - 1].close;
  const sma20 = calculateSMA(data, 20);
  const prices = data.slice(-20).map(d => d.close);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length);

  const zScore = stdDev > 0 ? (currentPrice - sma20) / stdDev : 0;
  let score = 0;
  let reason = '';

  if (zScore < -2) { score = 0.8; reason = 'Extremely oversold (z < -2)'; }
  else if (zScore < -1) { score = 0.4; reason = 'Oversold (z < -1)'; }
  else if (zScore > 2) { score = -0.8; reason = 'Extremely overbought (z > 2)'; }
  else if (zScore > 1) { score = -0.4; reason = 'Overbought (z > 1)'; }
  else { score = 0; reason = 'Near mean'; }

  return { name: 'meanReversion', score, confidence: 0.6, reason };
}

function calculateTechnicalSignal(data) {
  if (data.length < 20) return { name: 'technical', score: 0, confidence: 0, reason: 'Insufficient data' };

  const rsi = calculateRSI(data);
  let score = 0;
  const reasons = [];

  if (rsi < 30) { score += 0.5; reasons.push(`RSI oversold (${rsi.toFixed(0)})`); }
  else if (rsi < 40) { score += 0.25; reasons.push(`RSI low (${rsi.toFixed(0)})`); }
  else if (rsi > 70) { score -= 0.5; reasons.push(`RSI overbought (${rsi.toFixed(0)})`); }
  else if (rsi > 60) { score -= 0.25; reasons.push(`RSI high (${rsi.toFixed(0)})`); }
  else { reasons.push(`RSI neutral (${rsi.toFixed(0)})`); }

  const recentData = data.slice(-5);
  const avgVolume = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
  const recentVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / 5;

  if (recentVolume > avgVolume * 1.5) {
    const priceChange = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close;
    if (priceChange > 0) { score += 0.25; reasons.push('High volume uptrend'); }
    else { score -= 0.25; reasons.push('High volume downtrend'); }
  }

  return { name: 'technical', score: Math.max(-1, Math.min(1, score)), confidence: 0.65, reason: reasons.join(', ') };
}

function calculateSentimentSignal() {
  // Simplified sentiment (would need real news API for proper implementation)
  const score = (Math.random() - 0.5) * 0.4;
  return { name: 'sentiment', score, confidence: 0.3, reason: 'Market sentiment analysis' };
}

function combineSignals(symbol, momentum, meanReversion, sentiment, technical, weights) {
  const combined =
    momentum.score * weights.momentum +
    meanReversion.score * weights.meanReversion +
    sentiment.score * weights.sentiment +
    technical.score * weights.technical;

  let recommendation;
  if (combined > 0.5) recommendation = 'STRONG_BUY';
  else if (combined > 0.15) recommendation = 'BUY';
  else if (combined < -0.5) recommendation = 'STRONG_SELL';
  else if (combined < -0.15) recommendation = 'SELL';
  else recommendation = 'HOLD';

  return {
    symbol,
    timestamp: new Date().toISOString(),
    momentum,
    meanReversion,
    sentiment,
    technical,
    combined,
    recommendation,
  };
}

function calculatePositionSize(signal, cash, maxPositionSize, totalValue, targetCashRatio) {
  const targetCash = totalValue * targetCashRatio;
  const availableCash = Math.max(0, cash - targetCash);
  const maxPosition = totalValue * maxPositionSize;
  const signalStrength = Math.abs(signal.combined);
  return Math.min(availableCash * signalStrength, maxPosition);
}

async function analyzeStock(symbol) {
  const historicalData = await fetchYahooHistorical(symbol);
  if (!historicalData || historicalData.length < 50) return null;

  const momentum = calculateMomentumSignal(historicalData);
  const meanReversion = calculateMeanReversionSignal(historicalData);
  const technical = calculateTechnicalSignal(historicalData);
  const sentiment = calculateSentimentSignal();

  return combineSignals(symbol, momentum, meanReversion, sentiment, technical, DEFAULT_CONFIG.strategyWeights);
}

// Main execution
async function main() {
  console.log('Starting trading bot...');

  // Check Redis connection
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('Missing Redis credentials');
    process.exit(1);
  }

  let portfolio = await getPortfolio();
  const allSignals = {};

  // Determine assets to analyze
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let assetsToAnalyze = [...CRYPTO_SYMBOLS];
  if (!isWeekend) {
    assetsToAnalyze.push(...SP500_SYMBOLS, ...FOREX_SYMBOLS, ...FUTURES_SYMBOLS);
  }

  console.log(`Analyzing ${assetsToAnalyze.length} assets (Weekend: ${isWeekend})...`);

  // Process in batches
  for (let i = 0; i < assetsToAnalyze.length; i += BATCH_SIZE) {
    const batch = assetsToAnalyze.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(assetsToAnalyze.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`);

    const results = await Promise.all(batch.map(async (symbol) => {
      try {
        const signal = await analyzeStock(symbol);
        return { symbol, signal };
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error.message);
        return { symbol, signal: null };
      }
    }));

    for (const { symbol, signal } of results) {
      if (signal) allSignals[symbol] = signal;
    }

    if (i + BATCH_SIZE < assetsToAnalyze.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`Analyzed ${Object.keys(allSignals).length} assets successfully`);

  // Update holding prices
  for (const holding of portfolio.holdings) {
    const quote = await fetchYahooQuote(holding.symbol);
    if (quote) {
      holding.currentPrice = quote.price;
      holding.marketValue = holding.shares * quote.price;
      holding.gainLoss = (quote.price - holding.avgCost) * holding.shares;
      holding.gainLossPercent = ((quote.price - holding.avgCost) / holding.avgCost) * 100;
      holding.isExtendedHours = quote.isExtendedHours;
      holding.priceUpdatedAt = new Date().toISOString();
      holding.dividendYield = quote.dividendYield;
      holding.annualDividend = quote.annualDividend;
    }
  }

  // Check for sells
  for (const holding of portfolio.holdings) {
    const signal = allSignals[holding.symbol];
    const quote = await fetchYahooQuote(holding.symbol);
    if (!quote) continue;

    holding.currentPrice = quote.price;
    holding.marketValue = holding.shares * quote.price;
    holding.gainLoss = (quote.price - holding.avgCost) * holding.shares;
    holding.gainLossPercent = ((quote.price - holding.avgCost) / holding.avgCost) * 100;

    let sellPercent = 0;
    let sellReason = '';

    if (!signal) {
      sellPercent = 1.0;
      sellReason = 'No signal data - rotating out';
    } else if (signal.recommendation === 'STRONG_SELL') {
      sellPercent = 1.0;
      sellReason = `STRONG_SELL: score ${signal.combined.toFixed(2)}`;
    } else if (holding.gainLossPercent <= -3) {
      sellPercent = 1.0;
      sellReason = `Stop loss at ${holding.gainLossPercent.toFixed(1)}%`;
    } else if (signal.combined < 0.02) {
      sellPercent = 1.0;
      sellReason = `Weak signal (${signal.combined.toFixed(3)})`;
    } else if (holding.gainLossPercent >= 4) {
      sellPercent = 0.5;
      sellReason = `Taking profits at ${holding.gainLossPercent.toFixed(1)}%`;
    } else if (signal.recommendation === 'SELL') {
      sellPercent = 0.5;
      sellReason = `SELL: score ${signal.combined.toFixed(2)}`;
    }

    if (sellPercent > 0) {
      const sharesToSell = Math.round(holding.shares * sellPercent * 10000) / 10000 || holding.shares;

      const trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol: holding.symbol,
        action: 'SELL',
        shares: sharesToSell,
        price: quote.price,
        total: sharesToSell * quote.price,
        reason: sellReason,
        signals: signal || { symbol: holding.symbol, timestamp: new Date().toISOString(), momentum: {}, meanReversion: {}, sentiment: {}, technical: {}, combined: 0, recommendation: 'HOLD' },
      };

      portfolio.cash += trade.total;

      if (sharesToSell >= holding.shares) {
        portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
      } else {
        holding.shares -= sharesToSell;
        holding.marketValue = holding.shares * quote.price;
      }

      await addTrade(trade);
      console.log(`SELL ${trade.shares} ${trade.symbol} @ $${trade.price}: ${sellReason}`);
    }
  }

  // Check for buys
  const buyCandidates = Object.values(allSignals)
    .filter(s => s.combined > 0.02)
    .sort((a, b) => b.combined - a.combined)
    .slice(0, 35);

  for (const signal of buyCandidates) {
    if (portfolio.holdings.some(h => h.symbol === signal.symbol)) continue;
    if (portfolio.holdings.length >= DEFAULT_CONFIG.maxPositions) break;

    const positionSize = calculatePositionSize(signal, portfolio.cash, DEFAULT_CONFIG.maxPositionSize, portfolio.totalValue, DEFAULT_CONFIG.targetCashRatio);
    if (positionSize < DEFAULT_CONFIG.minTradeValue) continue;

    const quote = await fetchYahooQuote(signal.symbol);
    if (quote) {
      const shares = Math.round((positionSize / quote.price) * 10000) / 10000;
      if (shares >= 0.0001) {
        const total = shares * quote.price;

        const trade = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          symbol: signal.symbol,
          action: 'BUY',
          shares,
          price: quote.price,
          total,
          reason: `${signal.recommendation}: score ${signal.combined.toFixed(2)}`,
          signals: signal,
        };

        portfolio.cash -= total;
        portfolio.holdings.push({
          symbol: signal.symbol,
          shares,
          avgCost: quote.price,
          currentPrice: quote.price,
          marketValue: total,
          gainLoss: 0,
          gainLossPercent: 0,
          isExtendedHours: quote.isExtendedHours,
          priceUpdatedAt: new Date().toISOString(),
        });

        await addTrade(trade);
        console.log(`BUY ${shares} ${signal.symbol} @ $${quote.price}`);
      }
    }
  }

  // Update portfolio totals
  const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
  portfolio.totalValue = portfolio.cash + holdingsValue;
  portfolio.lastUpdated = new Date().toISOString();

  // Save everything
  await savePortfolio(portfolio);
  await saveSignals(allSignals);
  await setLastRun(new Date().toISOString());
  await addPortfolioSnapshot({ timestamp: new Date().toISOString(), totalValue: portfolio.totalValue });

  console.log(`\nCompleted! Portfolio: $${portfolio.totalValue.toFixed(2)} | Holdings: ${portfolio.holdings.length} | Cash: $${portfolio.cash.toFixed(2)}`);
}

// Graceful shutdown handling
function setupShutdownHandlers() {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    isShuttingDown = true;

    if (currentRunPromise) {
      console.log('Waiting for current run to complete...');
      await currentRunPromise;
    }

    console.log('Trading bot stopped.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Service loop
async function runService() {
  setupShutdownHandlers();

  console.log('='.repeat(60));
  console.log('Trading Bot Service Started');
  console.log(`Interval: ${RUN_INTERVAL_MS / 1000} seconds`);
  console.log(`Mode: ${RUN_ONCE ? 'Single Run' : 'Continuous Service'}`);
  console.log('='.repeat(60));

  while (!isShuttingDown) {
    const startTime = Date.now();

    try {
      currentRunPromise = main();
      await currentRunPromise;
      currentRunPromise = null;
    } catch (error) {
      console.error('Run failed:', error);
      currentRunPromise = null;
    }

    if (RUN_ONCE) {
      console.log('Single run mode - exiting.');
      break;
    }

    if (isShuttingDown) break;

    const elapsed = Date.now() - startTime;
    const waitTime = Math.max(0, RUN_INTERVAL_MS - elapsed);

    if (waitTime > 0) {
      console.log(`\nNext run in ${Math.round(waitTime / 1000)} seconds...`);
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, waitTime);
        // Allow early exit on shutdown
        const checkShutdown = setInterval(() => {
          if (isShuttingDown) {
            clearTimeout(timeout);
            clearInterval(checkShutdown);
            resolve();
          }
        }, 1000);
      });
    }
  }
}

runService().catch(console.error);
