#!/usr/bin/env node
/**
 * Trading Bot Backtest Script with Walk-Forward Weight Optimization
 * Uses train/test split to avoid overfitting: optimizes weights on training
 * window, then validates on a held-out test window (out-of-sample).
 *
 * Usage:
 *   node scripts/backtest.mjs [--days=30] [--train-days=60] [--test-start=YYYY-MM-DD] [--symbols=1500] [--optimize] [--verbose]
 *   node scripts/backtest.mjs --days=30 --train-days=60   # Train on 60 days, test on 30 days (OOS)
 *   node scripts/backtest.mjs --test-start=2025-12-26     # Test window starts on specific date
 *   node scripts/backtest.mjs --optimize=false --days=30   # Skip optimization, use current weights
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration (same as live bot)
const DEFAULT_CONFIG = {
  initialCapital: 10000,
  maxPositionSize: 0.12,
  maxPositions: 50,
  minTradeValue: 15,
  targetCashRatio: 0,
  buyThreshold: 0.02,
  weakSignalSell: 0.02,
  stopLoss: -2,
  profitTake: 2,
  strategyWeights: {
    momentum: 0.30,
    meanReversion: 0.25,
    sentiment: 0.15,
    technical: 0.30,
  },
};

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? 'true'];
    })
);
const BACKTEST_DAYS = parseInt(args.days || '30', 10);
const TRAIN_DAYS = parseInt(args['train-days'] || '60', 10);
const TEST_START = args['test-start'] || null; // e.g., '2025-12-26' - overrides --days for test window start
const MAX_SYMBOLS = parseInt(args.symbols || '1500', 10);
const VERBOSE = args.verbose === 'true';
const OPTIMIZE = args.optimize !== 'false'; // default: optimize
const TOP_N_SMOOTH = 10; // Average top N weight configs to reduce overfitting

// ────────────────────────────────────────────
// Symbol loading from assets.ts
// ────────────────────────────────────────────

function loadAllSymbols() {
  const assetsPath = join(__dirname, '..', 'src', 'lib', 'trading', 'assets.ts');
  const content = readFileSync(assetsPath, 'utf-8');

  const symbols = new Set();

  // Match all exported symbol arrays (CRYPTO_SYMBOLS, FOREX_SYMBOLS, etc.)
  const arrayRegex = /export const \w+_SYMBOLS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/g;
  let arrayMatch;
  while ((arrayMatch = arrayRegex.exec(content)) !== null) {
    const body = arrayMatch[1];
    const symbolRegex = /'([^']+)'/g;
    let symMatch;
    while ((symMatch = symbolRegex.exec(body)) !== null) {
      symbols.add(symMatch[1]);
    }
  }

  // Always include SPY for benchmark
  symbols.add('SPY');

  const allSymbols = [...symbols];
  return allSymbols.slice(0, MAX_SYMBOLS);
}

const BACKTEST_SYMBOLS = loadAllSymbols();

// ────────────────────────────────────────────
// Yahoo Finance data fetching
// ────────────────────────────────────────────

async function fetchHistoricalDaily(symbol) {
  try {
    // Fetch 6 months of daily data (need 50+ candles warmup + backtest period)
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=6mo&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;

    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];

    return timestamp
      .map((ts, i) => ({
        timestamp: ts,
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i],
      }))
      .filter(d => d.open !== null && d.close !== null);
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────
// Strategy calculations (identical to live bot)
// ────────────────────────────────────────────

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
  if (data.length < 50) return { name: 'Momentum', score: 0, confidence: 0, reason: 'Insufficient data' };
  const currentPrice = data[data.length - 1].close;
  const sma20 = calculateSMA(data, 20);
  const sma50 = calculateSMA(data, 50);
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  let score = 0;
  const reasons = [];

  // Price vs SMA-20: graded by distance
  if (sma20) {
    const pctAbove = ((currentPrice - sma20) / sma20) * 100;
    if (pctAbove > 2.0) { score += 0.25; reasons.push(`+${pctAbove.toFixed(1)}% vs SMA20`); }
    else if (pctAbove > 0.5) { score += 0.15; reasons.push('Above SMA20'); }
    else if (pctAbove > -0.5) { score += 0; reasons.push('Near SMA20'); }
    else if (pctAbove > -2.0) { score -= 0.15; reasons.push('Below SMA20'); }
    else { score -= 0.25; reasons.push(`${pctAbove.toFixed(1)}% vs SMA20`); }
  }

  // Price vs SMA-50: graded by distance
  if (sma50) {
    const pctAbove = ((currentPrice - sma50) / sma50) * 100;
    if (pctAbove > 3.0) { score += 0.25; reasons.push(`+${pctAbove.toFixed(1)}% vs SMA50`); }
    else if (pctAbove > 1.0) { score += 0.15; reasons.push('Above SMA50'); }
    else if (pctAbove > -1.0) { score += 0; }
    else if (pctAbove > -3.0) { score -= 0.15; reasons.push('Below SMA50'); }
    else { score -= 0.25; reasons.push(`${pctAbove.toFixed(1)}% vs SMA50`); }
  }

  // Golden/death cross
  if (sma20 && sma50) {
    const crossPct = ((sma20 - sma50) / sma50) * 100;
    if (crossPct > 1.0) { score += 0.2; reasons.push('Bullish MA cross'); }
    else if (crossPct > 0) { score += 0.1; }
    else if (crossPct > -1.0) { score -= 0.1; }
    else { score -= 0.2; reasons.push('Bearish MA cross'); }
  }

  // MACD
  if (ema12 && ema26) {
    const macdPct = ((ema12 - ema26) / ema26) * 100;
    if (macdPct > 1.0) { score += 0.2; reasons.push('Strong MACD bullish'); }
    else if (macdPct > 0) { score += 0.1; reasons.push('MACD bullish'); }
    else if (macdPct > -1.0) { score -= 0.1; reasons.push('MACD bearish'); }
    else { score -= 0.2; reasons.push('Strong MACD bearish'); }
  }

  // Rate of change: 5 days and 20 days
  if (data.length > 5) {
    const roc5 = ((currentPrice - data[data.length - 5].close) / data[data.length - 5].close) * 100;
    if (roc5 > 2.0) score += 0.05;
    else if (roc5 < -2.0) score -= 0.05;
  }
  if (data.length > 20) {
    const roc20 = ((currentPrice - data[data.length - 20].close) / data[data.length - 20].close) * 100;
    if (roc20 > 5.0) score += 0.05;
    else if (roc20 < -5.0) score -= 0.05;
  }

  return { name: 'Momentum', score: Math.max(-1, Math.min(1, score)), confidence: 0.7, reason: reasons.slice(0, 3).join(', ') };
}

function calculateMeanReversionSignal(data) {
  if (data.length < 50) return { name: 'Mean Reversion', score: 0, confidence: 0, reason: 'Insufficient data' };
  const currentPrice = data[data.length - 1].close;

  // Long-term mean (up to 200 days)
  const longPeriod = Math.min(200, data.length);
  const pricesLong = data.slice(-longPeriod).map(d => d.close);
  const meanLong = pricesLong.reduce((a, b) => a + b, 0) / pricesLong.length;
  const stdDevLong = Math.sqrt(pricesLong.reduce((sum, p) => sum + Math.pow(p - meanLong, 2), 0) / pricesLong.length);

  // Short-term z-score (20-period Bollinger Band style)
  const prices20 = data.slice(-20).map(d => d.close);
  const mean20 = prices20.reduce((a, b) => a + b, 0) / prices20.length;
  const stdDev20 = Math.sqrt(prices20.reduce((sum, p) => sum + Math.pow(p - mean20, 2), 0) / prices20.length);
  const shortZ = stdDev20 > 0 ? (currentPrice - mean20) / stdDev20 : 0;
  const longZ = stdDevLong > 0 ? (currentPrice - meanLong) / stdDevLong : 0;

  const zScore = longZ * 0.7 + shortZ * 0.3;
  const pctFromMean = meanLong > 0 ? ((currentPrice - meanLong) / meanLong * 100).toFixed(1) : '0.0';

  let score = 0;
  let reason = '';

  if (zScore < -2) { score = 0.8; reason = `Extremely oversold (z=${zScore.toFixed(2)}, ${pctFromMean}% from mean)`; }
  else if (zScore < -1.5) { score = 0.6; reason = `Very oversold (z=${zScore.toFixed(2)})`; }
  else if (zScore < -1) { score = 0.4; reason = `Oversold (z=${zScore.toFixed(2)})`; }
  else if (zScore < -0.5) { score = 0.2; reason = `Slightly below mean (z=${zScore.toFixed(2)})`; }
  else if (zScore > 2) { score = -0.8; reason = `Extremely overbought (z=${zScore.toFixed(2)}, +${pctFromMean}% from mean)`; }
  else if (zScore > 1.5) { score = -0.6; reason = `Very overbought (z=${zScore.toFixed(2)})`; }
  else if (zScore > 1) { score = -0.4; reason = `Overbought (z=${zScore.toFixed(2)})`; }
  else if (zScore > 0.5) { score = -0.2; reason = `Slightly above mean (z=${zScore.toFixed(2)})`; }
  else { score = 0; reason = `Near mean (z=${zScore.toFixed(2)})`; }

  return { name: 'Mean Reversion', score, confidence: 0.6, reason };
}

function calculateTechnicalSignal(data) {
  if (data.length < 20) return { name: 'Technical', score: 0, confidence: 0, reason: 'Insufficient data' };
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

  return { name: 'Technical', score: Math.max(-1, Math.min(1, score)), confidence: 0.65, reason: reasons.join(', ') };
}

// Deterministic sentiment for backtest (seeded by date + symbol hash)
function calculateSentimentSignal(symbol, dateStr) {
  let hash = 0;
  const seed = symbol + dateStr;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  // Convert to [-0.2, 0.2] range (same as live bot's random range)
  const score = ((hash % 1000) / 1000) * 0.4 - 0.2;
  return { name: 'Sentiment', score, confidence: 0.3, reason: 'Market sentiment analysis' };
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

  return { symbol, combined, recommendation };
}

function calculatePositionSize(signal, cash, maxPositionSize, totalValue, targetCashRatio) {
  const targetCash = totalValue * targetCashRatio;
  const availableCash = Math.max(0, cash - targetCash);
  const maxPosition = totalValue * maxPositionSize;
  const signalStrength = Math.abs(signal.combined);
  return Math.min(availableCash * signalStrength, maxPosition);
}

// ────────────────────────────────────────────
// Pre-compute signals for all symbols on all dates
// ────────────────────────────────────────────

function precomputeAllSignals(allData, symbols, backtestDates) {
  console.log('Pre-computing signals for all symbols on all dates...');
  // Structure: signalsByDate[date][symbol] = { momentum, meanReversion, technical, sentiment }
  const signalsByDate = {};
  // Structure: pricesByDate[date][symbol] = close price
  const pricesByDate = {};

  for (const date of backtestDates) {
    signalsByDate[date] = {};
    pricesByDate[date] = {};

    for (const symbol of symbols) {
      const symbolData = allData[symbol];
      if (!symbolData) continue;

      // Get price for this date
      const candle = symbolData.find(d => d.date === date);
      if (candle) pricesByDate[date][symbol] = candle.close;

      // Get data up to this date for signal computation
      const dataUpToDate = symbolData.filter(d => d.date <= date);
      if (dataUpToDate.length < 50) continue;

      signalsByDate[date][symbol] = {
        momentum: calculateMomentumSignal(dataUpToDate),
        meanReversion: calculateMeanReversionSignal(dataUpToDate),
        technical: calculateTechnicalSignal(dataUpToDate),
        sentiment: calculateSentimentSignal(symbol, date),
      };
    }
  }

  console.log(`Pre-computed signals for ${backtestDates.length} dates x ${symbols.length} symbols`);
  return { signalsByDate, pricesByDate };
}

// ────────────────────────────────────────────
// Lightweight simulation for optimization (no trade history)
// ────────────────────────────────────────────

function simulateLite(signalsByDate, pricesByDate, backtestDates, weights, config) {
  let portfolio = {
    cash: config.initialCapital,
    holdings: [],
    totalValue: config.initialCapital,
  };

  const dailyReturns = [];

  for (const date of backtestDates) {
    const daySignals = signalsByDate[date];
    const dayPrices = pricesByDate[date];
    if (!daySignals || !dayPrices) continue;

    // Combine pre-computed signals with the given weights
    const allSignals = {};
    for (const [symbol, signals] of Object.entries(daySignals)) {
      const combined =
        signals.momentum.score * weights.momentum +
        signals.meanReversion.score * weights.meanReversion +
        signals.sentiment.score * weights.sentiment +
        signals.technical.score * weights.technical;

      let recommendation;
      if (combined > 0.5) recommendation = 'STRONG_BUY';
      else if (combined > 0.15) recommendation = 'BUY';
      else if (combined < -0.5) recommendation = 'STRONG_SELL';
      else if (combined < -0.15) recommendation = 'SELL';
      else recommendation = 'HOLD';

      allSignals[symbol] = { symbol, combined, recommendation };
    }

    // Update holding prices
    for (const holding of portfolio.holdings) {
      const price = dayPrices[holding.symbol];
      if (price) {
        holding.currentPrice = price;
        holding.marketValue = holding.shares * price;
        holding.gainLoss = (price - holding.avgCost) * holding.shares;
        holding.gainLossPercent = ((price - holding.avgCost) / holding.avgCost) * 100;
      }
    }

    // Sell logic
    for (const holding of [...portfolio.holdings]) {
      const signal = allSignals[holding.symbol];
      const price = dayPrices[holding.symbol];
      if (!price) continue;

      holding.currentPrice = price;
      holding.marketValue = holding.shares * price;
      holding.gainLoss = (price - holding.avgCost) * holding.shares;
      holding.gainLossPercent = ((price - holding.avgCost) / holding.avgCost) * 100;

      let sellPercent = 0;

      if (!signal) {
        sellPercent = 1.0;
      } else if (signal.recommendation === 'STRONG_SELL') {
        sellPercent = 1.0;
      } else if (holding.gainLossPercent <= config.stopLoss) {
        sellPercent = 1.0;
      } else if (signal.combined < config.weakSignalSell) {
        sellPercent = 1.0;
      } else if (holding.gainLossPercent >= config.profitTake) {
        sellPercent = 0.5;
      } else if (signal.recommendation === 'SELL') {
        sellPercent = 0.75;
      }

      if (sellPercent > 0) {
        const sharesToSell = Math.round(holding.shares * sellPercent * 10000) / 10000 || holding.shares;
        const total = sharesToSell * price;

        portfolio.cash += total;
        if (sharesToSell >= holding.shares) {
          portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
        } else {
          holding.shares -= sharesToSell;
          holding.marketValue = holding.shares * price;
        }
      }
    }

    // Position rotation
    const targetCash = portfolio.totalValue * config.targetCashRatio;
    const availableCash = Math.max(0, portfolio.cash - targetCash);
    const strongBuyCandidates = Object.values(allSignals)
      .filter(s => s.combined > 0.15 && !portfolio.holdings.some(h => h.symbol === s.symbol))
      .length;

    if (strongBuyCandidates > 0 && (availableCash < config.minTradeValue || portfolio.holdings.length >= config.maxPositions)) {
      const holdingsWithSignals = portfolio.holdings
        .map(h => ({ holding: h, signal: allSignals[h.symbol] }))
        .filter(h => h.signal)
        .sort((a, b) => a.signal.combined - b.signal.combined);

      let rotated = 0;
      for (const { holding, signal } of holdingsWithSignals) {
        if (rotated >= 3) break;
        if (signal.combined >= 0.15) break;

        const price = dayPrices[holding.symbol];
        if (!price) continue;

        portfolio.cash += holding.shares * price;
        portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
        rotated++;
      }
    }

    // Buy logic
    const buyCandidates = Object.values(allSignals)
      .filter(s => s.combined > config.buyThreshold)
      .sort((a, b) => b.combined - a.combined)
      .slice(0, 50);

    for (const signal of buyCandidates) {
      if (portfolio.holdings.some(h => h.symbol === signal.symbol)) continue;
      if (portfolio.holdings.length >= config.maxPositions) break;

      const tgtCash = portfolio.totalValue * config.targetCashRatio;
      const availCash = Math.max(0, portfolio.cash - tgtCash);
      const maxPosition = portfolio.totalValue * config.maxPositionSize;
      const signalStrength = Math.abs(signal.combined);
      const positionSize = Math.min(availCash * signalStrength, maxPosition);

      if (positionSize < config.minTradeValue) continue;

      const price = dayPrices[signal.symbol];
      if (!price) continue;

      const shares = Math.round((positionSize / price) * 10000) / 10000;
      if (shares >= 0.0001) {
        const total = shares * price;
        portfolio.cash -= total;
        portfolio.holdings.push({
          symbol: signal.symbol,
          shares,
          avgCost: price,
          currentPrice: price,
          marketValue: total,
          gainLoss: 0,
          gainLossPercent: 0,
        });
      }
    }

    // End of day
    const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const prevValue = portfolio.totalValue;
    portfolio.totalValue = portfolio.cash + holdingsValue;

    const dailyReturn = prevValue > 0 ? (portfolio.totalValue - prevValue) / prevValue : 0;
    dailyReturns.push(dailyReturn);
  }

  const totalReturn = ((portfolio.totalValue - config.initialCapital) / config.initialCapital) * 100;

  // Calculate Sharpe ratio
  const riskFreeRate = 0.05 / 252;
  const excessReturns = dailyReturns.map(r => r - riskFreeRate);
  const avgExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const excessVar = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / excessReturns.length;
  const sharpe = excessVar > 0 ? (avgExcess * Math.sqrt(252)) / Math.sqrt(excessVar) : 0;

  // Max drawdown
  let maxDrawdown = 0;
  let peak = config.initialCapital;
  let runningValue = config.initialCapital;
  for (const dr of dailyReturns) {
    runningValue *= (1 + dr);
    if (runningValue > peak) peak = runningValue;
    const dd = (peak - runningValue) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    totalReturn,
    sharpe,
    maxDrawdown: maxDrawdown * 100,
    finalValue: portfolio.totalValue,
  };
}

// ────────────────────────────────────────────
// Weight optimization via grid search
// ────────────────────────────────────────────

function optimizeWeights(signalsByDate, pricesByDate, backtestDates, config) {
  console.log('\nOptimizing strategy weights (grid search)...');

  const step = 0.05;
  const minW = 0.0;
  const maxW = 0.70;
  const results = [];
  let totalCombos = 0;

  for (let m = minW; m <= maxW; m = Math.round((m + step) * 100) / 100) {
    for (let mr = minW; mr <= maxW; mr = Math.round((mr + step) * 100) / 100) {
      for (let s = minW; s <= maxW; s = Math.round((s + step) * 100) / 100) {
        const t = Math.round((1.0 - m - mr - s) * 100) / 100;
        if (t < minW || t > maxW) continue;

        totalCombos++;
        const weights = { momentum: m, meanReversion: mr, sentiment: s, technical: t };
        const result = simulateLite(signalsByDate, pricesByDate, backtestDates, weights, config);
        results.push({ weights, ...result });
      }
    }
    // Progress indicator
    const pct = Math.round(((m - minW) / (maxW - minW)) * 100);
    process.stdout.write(`\r  Progress: ${pct}% (${totalCombos} combinations tested)`);
  }
  console.log(`\r  Completed: ${totalCombos} weight combinations tested`);

  // Sort by total return (primary), then Sharpe (secondary)
  results.sort((a, b) => {
    if (Math.abs(b.totalReturn - a.totalReturn) > 0.01) return b.totalReturn - a.totalReturn;
    return b.sharpe - a.sharpe;
  });

  console.log('\n  Top 10 weight configurations:');
  console.log('  ──────────────────────────────────────────────────────────────────────────');
  console.log('  Momentum  MeanRev   Sentiment Technical │ Return    Sharpe   MaxDD');
  console.log('  ──────────────────────────────────────────────────────────────────────────');
  for (const r of results.slice(0, 10)) {
    const w = r.weights;
    console.log(`   ${w.momentum.toFixed(2)}      ${w.meanReversion.toFixed(2)}      ${w.sentiment.toFixed(2)}      ${w.technical.toFixed(2)}     │ ${r.totalReturn >= 0 ? '+' : ''}${r.totalReturn.toFixed(2)}%   ${r.sharpe.toFixed(2)}    -${r.maxDrawdown.toFixed(2)}%`);
  }

  console.log('\n  Bottom 5 configurations:');
  for (const r of results.slice(-5)) {
    const w = r.weights;
    console.log(`   ${w.momentum.toFixed(2)}      ${w.meanReversion.toFixed(2)}      ${w.sentiment.toFixed(2)}      ${w.technical.toFixed(2)}     │ ${r.totalReturn >= 0 ? '+' : ''}${r.totalReturn.toFixed(2)}%   ${r.sharpe.toFixed(2)}    -${r.maxDrawdown.toFixed(2)}%`);
  }

  // Weight smoothing: average the top N configs to reduce overfitting
  const topN = results.slice(0, TOP_N_SMOOTH);
  const smoothed = {
    momentum: topN.reduce((s, r) => s + r.weights.momentum, 0) / topN.length,
    meanReversion: topN.reduce((s, r) => s + r.weights.meanReversion, 0) / topN.length,
    sentiment: topN.reduce((s, r) => s + r.weights.sentiment, 0) / topN.length,
    technical: topN.reduce((s, r) => s + r.weights.technical, 0) / topN.length,
  };
  // Round to 2 decimal places
  for (const key of Object.keys(smoothed)) {
    smoothed[key] = Math.round(smoothed[key] * 100) / 100;
  }
  // Ensure they sum to 1.0 (adjust technical for rounding)
  const weightSum = smoothed.momentum + smoothed.meanReversion + smoothed.sentiment + smoothed.technical;
  smoothed.technical = Math.round((smoothed.technical + (1.0 - weightSum)) * 100) / 100;

  const best = results[0];
  console.log(`\n  Single best: momentum=${best.weights.momentum.toFixed(2)}, meanReversion=${best.weights.meanReversion.toFixed(2)}, sentiment=${best.weights.sentiment.toFixed(2)}, technical=${best.weights.technical.toFixed(2)}`);
  console.log(`    In-sample: ${best.totalReturn >= 0 ? '+' : ''}${best.totalReturn.toFixed(2)}% | Sharpe: ${best.sharpe.toFixed(2)} | MaxDD: -${best.maxDrawdown.toFixed(2)}%`);
  console.log(`\n  Smoothed (avg top ${TOP_N_SMOOTH}): momentum=${smoothed.momentum.toFixed(2)}, meanReversion=${smoothed.meanReversion.toFixed(2)}, sentiment=${smoothed.sentiment.toFixed(2)}, technical=${smoothed.technical.toFixed(2)}`);

  // Evaluate smoothed weights on the same training data for comparison
  const smoothedResult = simulateLite(signalsByDate, pricesByDate, backtestDates, smoothed, config);
  console.log(`    In-sample: ${smoothedResult.totalReturn >= 0 ? '+' : ''}${smoothedResult.totalReturn.toFixed(2)}% | Sharpe: ${smoothedResult.sharpe.toFixed(2)} | MaxDD: -${smoothedResult.maxDrawdown.toFixed(2)}%`);

  return smoothed;
}

// ────────────────────────────────────────────
// Main backtest engine
// ────────────────────────────────────────────

async function runBacktest() {
  console.log('='.repeat(60));
  console.log('TRADING BOT BACKTEST' + (OPTIMIZE ? ' + WALK-FORWARD OPTIMIZATION' : ''));
  if (OPTIMIZE) {
    console.log(`Train window: ${TRAIN_DAYS} trading days`);
    console.log(`Test window:  ${TEST_START ? `from ${TEST_START}` : `${BACKTEST_DAYS} trading days`} (out-of-sample)`);
  } else {
    console.log(`Period: ${TEST_START ? `from ${TEST_START}` : `${BACKTEST_DAYS} trading days`}`);
  }
  console.log(`Symbols: ${BACKTEST_SYMBOLS.length}`);
  console.log(`Initial Capital: $${DEFAULT_CONFIG.initialCapital.toLocaleString()}`);
  console.log(`Optimization: ${OPTIMIZE ? 'WALK-FORWARD (train/test split)' : 'DISABLED'}`);
  if (OPTIMIZE) console.log(`Weight smoothing: average top ${TOP_N_SMOOTH} configs`);
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Fetch all historical data
  console.log('Fetching historical data...');
  const allData = {};
  const BATCH_SIZE = 20;

  for (let i = 0; i < BACKTEST_SYMBOLS.length; i += BATCH_SIZE) {
    const batch = BACKTEST_SYMBOLS.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(BACKTEST_SYMBOLS.length / BATCH_SIZE);
    process.stdout.write(`  Batch ${batchNum}/${totalBatches}: ${batch.length} symbols...`);

    const results = await Promise.all(batch.map(s => fetchHistoricalDaily(s)));
    let fetched = 0;
    for (let j = 0; j < batch.length; j++) {
      if (results[j] && results[j].length >= 50) {
        allData[batch[j]] = results[j];
        fetched++;
      }
    }
    console.log(` ${fetched} OK`);

    if (i + BATCH_SIZE < BACKTEST_SYMBOLS.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const symbols = Object.keys(allData);
  console.log(`\nLoaded data for ${symbols.length} symbols`);

  if (symbols.length === 0) {
    console.error('No data loaded. Exiting.');
    process.exit(1);
  }

  // Step 2: Build timeline (use SPY's dates as the trading calendar)
  const spyData = allData['SPY'] || allData[symbols[0]];
  const allDates = spyData.map(d => d.date);

  // Determine backtest window: need warmup + train + test
  const warmupDays = 50;
  let allBacktestDates, trainDates, testDates;

  if (OPTIMIZE && TEST_START) {
    // Use specific start date for test window
    const availableDates = allDates.slice(warmupDays);
    testDates = availableDates.filter(d => d >= TEST_START);
    const preDates = availableDates.filter(d => d < TEST_START);
    trainDates = preDates.slice(-TRAIN_DAYS);
    allBacktestDates = [...trainDates, ...testDates];
    console.log(`Warmup: ${warmupDays} days`);
    console.log(`Train:  ${trainDates.length} days (${trainDates[0]} -> ${trainDates[trainDates.length - 1]})`);
    console.log(`Test:   ${testDates.length} days (${testDates[0]} -> ${testDates[testDates.length - 1]}) [OUT-OF-SAMPLE]`);
  } else if (OPTIMIZE) {
    const totalDays = TRAIN_DAYS + BACKTEST_DAYS;
    const startIdx = Math.max(warmupDays, allDates.length - totalDays);
    allBacktestDates = allDates.slice(startIdx);
    const splitPoint = allBacktestDates.length - BACKTEST_DAYS;
    trainDates = allBacktestDates.slice(0, splitPoint);
    testDates = allBacktestDates.slice(splitPoint);
    console.log(`Warmup: ${startIdx} days`);
    console.log(`Train:  ${trainDates.length} days (${trainDates[0]} -> ${trainDates[trainDates.length - 1]})`);
    console.log(`Test:   ${testDates.length} days (${testDates[0]} -> ${testDates[testDates.length - 1]}) [OUT-OF-SAMPLE]`);
  } else if (TEST_START) {
    allBacktestDates = allDates.slice(warmupDays).filter(d => d >= TEST_START);
    trainDates = allBacktestDates;
    testDates = allBacktestDates;
    console.log(`Warmup: ${warmupDays} days | Backtest: ${allBacktestDates.length} trading days`);
    console.log(`Date range: ${allBacktestDates[0]} -> ${allBacktestDates[allBacktestDates.length - 1]}`);
  } else {
    const totalDays = BACKTEST_DAYS;
    const startIdx = Math.max(warmupDays, allDates.length - totalDays);
    allBacktestDates = allDates.slice(startIdx);
    trainDates = allBacktestDates;
    testDates = allBacktestDates;
    console.log(`Warmup: ${startIdx} days | Backtest: ${allBacktestDates.length} trading days`);
    console.log(`Date range: ${allBacktestDates[0]} -> ${allBacktestDates[allBacktestDates.length - 1]}`);
  }

  // Step 3: Pre-compute signals for ALL dates (train + test)
  const { signalsByDate, pricesByDate } = precomputeAllSignals(allData, symbols, allBacktestDates);

  // Step 4: Optimize weights on TRAINING data only (if enabled)
  let activeWeights = { ...DEFAULT_CONFIG.strategyWeights };
  if (OPTIMIZE) {
    activeWeights = optimizeWeights(signalsByDate, pricesByDate, trainDates, DEFAULT_CONFIG);

    // Show out-of-sample performance preview
    const oosResult = simulateLite(signalsByDate, pricesByDate, testDates, activeWeights, DEFAULT_CONFIG);
    console.log(`\n  Out-of-sample preview (${testDates.length} days): ${oosResult.totalReturn >= 0 ? '+' : ''}${oosResult.totalReturn.toFixed(2)}% | Sharpe: ${oosResult.sharpe.toFixed(2)} | MaxDD: -${oosResult.maxDrawdown.toFixed(2)}%`);

    console.log('\nUsing optimized weights for out-of-sample test...\n');
  }

  // The final reported backtest runs on the TEST window only (out-of-sample)
  const backtestDates = testDates;

  // Step 5: Run full simulation with the chosen weights
  console.log('Running full simulation...');

  let portfolio = {
    cash: DEFAULT_CONFIG.initialCapital,
    holdings: [],
    totalValue: DEFAULT_CONFIG.initialCapital,
  };

  const trades = [];
  const portfolioHistory = [];
  const dailyReturns = [];

  // Track SPY for benchmark
  const spyStart = spyData.find(d => d.date === backtestDates[0])?.close;
  const spyBenchmark = [];

  for (let dayIdx = 0; dayIdx < backtestDates.length; dayIdx++) {
    const date = backtestDates[dayIdx];
    const daySignals = signalsByDate[date];
    const dayPrices = pricesByDate[date];
    if (!daySignals || !dayPrices) continue;

    // Combine pre-computed signals with active weights
    const allSignals = {};
    for (const [symbol, signals] of Object.entries(daySignals)) {
      const signal = combineSignals(
        symbol,
        signals.momentum,
        signals.meanReversion,
        signals.sentiment,
        signals.technical,
        activeWeights
      );
      allSignals[symbol] = signal;
    }

    // Update holding prices
    for (const holding of portfolio.holdings) {
      const price = dayPrices[holding.symbol];
      if (price) {
        holding.currentPrice = price;
        holding.marketValue = holding.shares * price;
        holding.gainLoss = (price - holding.avgCost) * holding.shares;
        holding.gainLossPercent = ((price - holding.avgCost) / holding.avgCost) * 100;
      }
    }

    // ── Sell logic ──
    for (const holding of [...portfolio.holdings]) {
      const signal = allSignals[holding.symbol];
      const price = dayPrices[holding.symbol];
      if (!price) continue;

      holding.currentPrice = price;
      holding.marketValue = holding.shares * price;
      holding.gainLoss = (price - holding.avgCost) * holding.shares;
      holding.gainLossPercent = ((price - holding.avgCost) / holding.avgCost) * 100;

      let sellPercent = 0;
      let sellReason = '';

      if (!signal) {
        sellPercent = 1.0;
        sellReason = 'No signal data';
      } else if (signal.recommendation === 'STRONG_SELL') {
        sellPercent = 1.0;
        sellReason = `STRONG_SELL: ${signal.combined.toFixed(2)}`;
      } else if (holding.gainLossPercent <= DEFAULT_CONFIG.stopLoss) {
        sellPercent = 1.0;
        sellReason = `Stop loss at ${holding.gainLossPercent.toFixed(1)}%`;
      } else if (signal.combined < DEFAULT_CONFIG.weakSignalSell) {
        sellPercent = 1.0;
        sellReason = `Weak signal (${signal.combined.toFixed(3)})`;
      } else if (holding.gainLossPercent >= DEFAULT_CONFIG.profitTake) {
        sellPercent = 0.5;
        sellReason = `Taking profits at ${holding.gainLossPercent.toFixed(1)}%`;
      } else if (signal.recommendation === 'SELL') {
        sellPercent = 0.75;
        sellReason = `SELL: ${signal.combined.toFixed(2)}`;
      }

      if (sellPercent > 0) {
        const sharesToSell = Math.round(holding.shares * sellPercent * 10000) / 10000 || holding.shares;
        const total = sharesToSell * price;
        const gainLoss = (price - holding.avgCost) * sharesToSell;
        const gainLossPercent = holding.gainLossPercent;

        trades.push({
          date, symbol: holding.symbol, action: 'SELL',
          shares: sharesToSell, price, total, reason: sellReason,
          gainLoss, gainLossPercent,
        });

        portfolio.cash += total;
        if (sharesToSell >= holding.shares) {
          portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
        } else {
          holding.shares -= sharesToSell;
          holding.marketValue = holding.shares * price;
        }
      }
    }

    // ── Position rotation ──
    const targetCash = portfolio.totalValue * DEFAULT_CONFIG.targetCashRatio;
    const availableCash = Math.max(0, portfolio.cash - targetCash);
    const strongBuyCandidates = Object.values(allSignals)
      .filter(s => s.combined > 0.15 && !portfolio.holdings.some(h => h.symbol === s.symbol))
      .length;

    if (strongBuyCandidates > 0 && (availableCash < DEFAULT_CONFIG.minTradeValue || portfolio.holdings.length >= DEFAULT_CONFIG.maxPositions)) {
      const holdingsWithSignals = portfolio.holdings
        .map(h => ({ holding: h, signal: allSignals[h.symbol] }))
        .filter(h => h.signal)
        .sort((a, b) => a.signal.combined - b.signal.combined);

      let rotated = 0;
      for (const { holding, signal } of holdingsWithSignals) {
        if (rotated >= 3) break;
        if (signal.combined >= 0.15) break;

        const price = dayPrices[holding.symbol];
        if (!price) continue;

        const total = holding.shares * price;
        trades.push({
          date, symbol: holding.symbol, action: 'SELL',
          shares: holding.shares, price, total,
          reason: `Rotation: weak signal (${signal.combined.toFixed(3)})`,
          gainLoss: (price - holding.avgCost) * holding.shares,
          gainLossPercent: holding.gainLossPercent,
        });

        portfolio.cash += total;
        portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
        rotated++;
      }
    }

    // ── Buy logic ──
    const buyCandidates = Object.values(allSignals)
      .filter(s => s.combined > DEFAULT_CONFIG.buyThreshold)
      .sort((a, b) => b.combined - a.combined)
      .slice(0, 50);

    for (const signal of buyCandidates) {
      if (portfolio.holdings.some(h => h.symbol === signal.symbol)) continue;
      if (portfolio.holdings.length >= DEFAULT_CONFIG.maxPositions) break;

      const positionSize = calculatePositionSize(signal, portfolio.cash, DEFAULT_CONFIG.maxPositionSize, portfolio.totalValue, DEFAULT_CONFIG.targetCashRatio);
      if (positionSize < DEFAULT_CONFIG.minTradeValue) continue;

      const price = dayPrices[signal.symbol];
      if (!price) continue;

      const shares = Math.round((positionSize / price) * 10000) / 10000;
      if (shares >= 0.0001) {
        const total = shares * price;
        trades.push({
          date, symbol: signal.symbol, action: 'BUY',
          shares, price, total,
          reason: `${signal.recommendation}: ${signal.combined.toFixed(2)}`,
          gainLoss: 0, gainLossPercent: 0,
        });

        portfolio.cash -= total;
        portfolio.holdings.push({
          symbol: signal.symbol,
          shares,
          avgCost: price,
          currentPrice: price,
          marketValue: total,
          gainLoss: 0,
          gainLossPercent: 0,
        });
      }
    }

    // ── End of day: update portfolio value ──
    const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const prevValue = portfolio.totalValue;
    portfolio.totalValue = portfolio.cash + holdingsValue;

    const dailyReturn = prevValue > 0 ? (portfolio.totalValue - prevValue) / prevValue : 0;
    dailyReturns.push(dailyReturn);

    portfolioHistory.push({ date, totalValue: portfolio.totalValue, holdings: portfolio.holdings.length });

    // SPY benchmark
    const spyCandle = spyData.find(d => d.date === date);
    if (spyCandle && spyStart) {
      spyBenchmark.push({
        date,
        value: (spyCandle.close / spyStart) * DEFAULT_CONFIG.initialCapital,
      });
    }

    const dayTrades = trades.filter(t => t.date === date);
    if (VERBOSE && dayTrades.length > 0) {
      console.log(`  ${date}: $${portfolio.totalValue.toFixed(2)} | ${portfolio.holdings.length} holdings | ${dayTrades.length} trades`);
    }
  }

  // ────────────────────────────────────────────
  // Step 6: Calculate and display results
  // ────────────────────────────────────────────

  console.log('\n' + '='.repeat(60));
  console.log('BACKTEST RESULTS');
  console.log('='.repeat(60));

  // Active weights
  console.log('\nStrategy Weights:');
  console.log(`  Momentum:       ${activeWeights.momentum.toFixed(2)}`);
  console.log(`  Mean Reversion: ${activeWeights.meanReversion.toFixed(2)}`);
  console.log(`  Sentiment:      ${activeWeights.sentiment.toFixed(2)}`);
  console.log(`  Technical:      ${activeWeights.technical.toFixed(2)}`);

  // Portfolio performance
  const finalValue = portfolio.totalValue;
  const totalReturn = ((finalValue - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital) * 100;
  const spyFinal = spyBenchmark[spyBenchmark.length - 1]?.value || DEFAULT_CONFIG.initialCapital;
  const spyReturn = ((spyFinal - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital) * 100;

  console.log('\nPortfolio Performance:');
  console.log(`  Initial Capital:    $${DEFAULT_CONFIG.initialCapital.toLocaleString()}`);
  console.log(`  Final Value:        $${finalValue.toFixed(2)}`);
  console.log(`  Total Return:       ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`);
  console.log(`  S&P 500 Return:     ${spyReturn >= 0 ? '+' : ''}${spyReturn.toFixed(2)}%`);
  console.log(`  Alpha:              ${(totalReturn - spyReturn) >= 0 ? '+' : ''}${(totalReturn - spyReturn).toFixed(2)}%`);

  // Trade statistics
  const sells = trades.filter(t => t.action === 'SELL');
  const buys = trades.filter(t => t.action === 'BUY');
  const winningTrades = sells.filter(t => (t.gainLossPercent ?? 0) >= 0);
  const losingTrades = sells.filter(t => (t.gainLossPercent ?? 0) < 0);
  const winRate = sells.length > 0 ? (winningTrades.length / sells.length) * 100 : 0;

  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + (t.gainLossPercent ?? 0), 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + Math.abs(t.gainLossPercent ?? 0), 0) / losingTrades.length
    : 0;
  const totalPnL = sells.reduce((sum, t) => sum + (t.gainLoss ?? 0), 0);

  console.log('\nTrade Statistics:');
  console.log(`  Total Trades:       ${trades.length} (${buys.length} buys, ${sells.length} sells)`);
  console.log(`  Win Rate:           ${winRate.toFixed(1)}%`);
  console.log(`  Wins / Losses:      ${winningTrades.length} / ${losingTrades.length}`);
  console.log(`  Avg Win:            +${avgWin.toFixed(2)}%`);
  console.log(`  Avg Loss:           -${avgLoss.toFixed(2)}%`);
  console.log(`  Total P&L (sells):  $${totalPnL.toFixed(2)}`);
  console.log(`  Profit Factor:      ${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'}`);

  // Risk metrics
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
  const riskFreeRate = 0.05 / 252;
  const excessReturns = dailyReturns.map(r => r - riskFreeRate);
  const avgExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const excessVar = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / excessReturns.length;
  const sharpe = excessVar > 0 ? (avgExcess * Math.sqrt(252)) / Math.sqrt(excessVar) : 0;

  let maxDrawdown = 0, peak = portfolioHistory[0]?.totalValue || DEFAULT_CONFIG.initialCapital;
  for (const point of portfolioHistory) {
    if (point.totalValue > peak) peak = point.totalValue;
    const drawdown = (peak - point.totalValue) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  console.log('\nRisk Metrics:');
  console.log(`  Sharpe Ratio:       ${sharpe.toFixed(2)}`);
  console.log(`  Volatility (ann.):  ${volatility.toFixed(1)}%`);
  console.log(`  Max Drawdown:       -${(maxDrawdown * 100).toFixed(2)}%`);
  console.log(`  Data Points:        ${dailyReturns.length}`);

  // Position summary
  console.log('\nPosition Summary:');
  console.log(`  Final Holdings:     ${portfolio.holdings.length}`);
  console.log(`  Final Cash:         $${portfolio.cash.toFixed(2)}`);
  console.log(`  Invested:           $${(portfolio.totalValue - portfolio.cash).toFixed(2)}`);

  // Top winners and losers
  if (sells.length > 0) {
    const sortedSells = [...sells].sort((a, b) => (b.gainLossPercent ?? 0) - (a.gainLossPercent ?? 0));

    console.log('\nTop 5 Winners:');
    for (const t of sortedSells.slice(0, 5)) {
      console.log(`  ${t.symbol.padEnd(10)} ${t.date}  ${(t.gainLossPercent ?? 0) >= 0 ? '+' : ''}${(t.gainLossPercent ?? 0).toFixed(2)}%  $${(t.gainLoss ?? 0).toFixed(2)}`);
    }

    console.log('\nTop 5 Losers:');
    for (const t of sortedSells.slice(-5).reverse()) {
      console.log(`  ${t.symbol.padEnd(10)} ${t.date}  ${(t.gainLossPercent ?? 0) >= 0 ? '+' : ''}${(t.gainLossPercent ?? 0).toFixed(2)}%  $${(t.gainLoss ?? 0).toFixed(2)}`);
    }
  }

  // Daily portfolio value (sparkline)
  console.log('\nPortfolio Value Over Time:');
  const step = Math.max(1, Math.floor(portfolioHistory.length / 15));
  for (let i = 0; i < portfolioHistory.length; i += step) {
    const p = portfolioHistory[i];
    const spyP = spyBenchmark[i];
    const pctChange = ((p.totalValue - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital) * 100;
    const bar = '='.repeat(Math.max(0, Math.round(Math.abs(pctChange) * 2)));
    const spyPct = spyP ? ((spyP.value - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital * 100).toFixed(1) : '?';
    console.log(`  ${p.date}  $${p.totalValue.toFixed(0).padStart(6)}  ${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1).padStart(5)}% ${bar}  (SPY: ${spyPct}%)`);
  }
  // Always show last day
  const last = portfolioHistory[portfolioHistory.length - 1];
  if (last) {
    const pctChange = ((last.totalValue - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital) * 100;
    const spyLast = spyBenchmark[spyBenchmark.length - 1];
    const spyPct = spyLast ? ((spyLast.value - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital * 100).toFixed(1) : '?';
    console.log(`  ${last.date}  $${last.totalValue.toFixed(0).padStart(6)}  ${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1).padStart(5)}% (FINAL)  (SPY: ${spyPct}%)`);
  }

  console.log('\n' + '='.repeat(60));

  // Write results to JSON for the frontend performance chart
  const outputPath = join(__dirname, '..', 'public', 'backtest-results.json');
  const output = {
    generatedAt: new Date().toISOString(),
    config: { ...DEFAULT_CONFIG, strategyWeights: activeWeights },
    dateRange: { start: backtestDates[0], end: backtestDates[backtestDates.length - 1] },
    portfolioHistory: portfolioHistory.map(p => ({
      timestamp: new Date(p.date + 'T16:00:00Z').toISOString(),
      totalValue: Math.round(p.totalValue * 100) / 100,
    })),
    spyBenchmark: spyBenchmark.map(p => ({
      timestamp: new Date(p.date + 'T16:00:00Z').toISOString(),
      value: Math.round(p.value * 100) / 100,
    })),
    trades: trades.map(t => ({
      date: t.date,
      symbol: t.symbol,
      action: t.action,
      shares: t.shares,
      price: t.price,
      total: t.total,
      reason: t.reason,
      gainLossPercent: t.gainLossPercent,
    })),
    summary: {
      totalReturn,
      spyReturn,
      alpha: totalReturn - spyReturn,
      winRate,
      sharpe,
      maxDrawdown: maxDrawdown * 100,
      totalTrades: trades.length,
      wins: winningTrades.length,
      losses: losingTrades.length,
    },
  };
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${outputPath}`);

  // Update initial capital and weights across codebase
  const roundedFinal = Math.round(finalValue * 100) / 100;
  console.log(`\nUpdating initialCapital to $${roundedFinal} and weights across codebase...`);

  const botPath = join(__dirname, 'trading-bot.mjs');
  const typesPath = join(__dirname, '..', 'src', 'components', 'trading', 'types.ts');

  for (const filePath of [botPath, typesPath]) {
    try {
      let content = readFileSync(filePath, 'utf-8');

      // Update initialCapital
      const updatedCapital = content.replace(
        /initialCapital:\s*[\d.]+/,
        `initialCapital: ${roundedFinal}`
      );

      // Update strategy weights
      let updatedWeights = updatedCapital;
      if (OPTIMIZE) {
        updatedWeights = updatedWeights.replace(
          /momentum:\s*[\d.]+/,
          `momentum: ${activeWeights.momentum.toFixed(2)}`
        );
        updatedWeights = updatedWeights.replace(
          /meanReversion:\s*[\d.]+/,
          `meanReversion: ${activeWeights.meanReversion.toFixed(2)}`
        );
        updatedWeights = updatedWeights.replace(
          /sentiment:\s*[\d.]+/,
          `sentiment: ${activeWeights.sentiment.toFixed(2)}`
        );
        updatedWeights = updatedWeights.replace(
          /technical:\s*[\d.]+/,
          `technical: ${activeWeights.technical.toFixed(2)}`
        );
      }

      if (updatedWeights !== content) {
        writeFileSync(filePath, updatedWeights);
        console.log(`  Updated: ${filePath}`);
      }
    } catch (e) {
      console.error(`  Failed to update ${filePath}: ${e.message}`);
    }
  }

  // Return summary for programmatic use
  return {
    totalReturn,
    spyReturn,
    alpha: totalReturn - spyReturn,
    winRate,
    sharpe,
    maxDrawdown: maxDrawdown * 100,
    totalTrades: trades.length,
    wins: winningTrades.length,
    losses: losingTrades.length,
    optimizedWeights: OPTIMIZE ? activeWeights : null,
  };
}

runBacktest().catch(console.error);
