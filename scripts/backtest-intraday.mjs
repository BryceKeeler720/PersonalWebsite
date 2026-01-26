#!/usr/bin/env node
/**
 * Intraday Strategy Backtest
 * Compares new intraday strategies (VWAP Reversion, Intraday Momentum, RSI+Volume, Gap Fade)
 * against the old daily strategies over a 1-month period.
 *
 * Uses Yahoo Finance 5-min data (no Alpaca keys required for backtest).
 *
 * Usage:
 *   node scripts/backtest-intraday.mjs [--days=30] [--symbols=100] [--verbose]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────

const DEFAULT_CONFIG = {
  initialCapital: 10000,
  maxPositionSize: 0.04,
  maxPositions: 50,
  minTradeValue: 15,
  targetCashRatio: 0,
  buyThreshold: 0.15,
  weakSignalSell: 0.08,
  stopLoss: -5,
  profitTake: 5,
  strategyWeights: {
    momentum: 0.35,
    meanReversion: 0.25,
    sentiment: 0.10,
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
const MAX_SYMBOLS = parseInt(args.symbols || '100', 10);
const VERBOSE = args.verbose === 'true';
const TRADE_INTERVAL_BARS = 6; // Every 6 × 5-min bars = 30 minutes

// ────────────────────────────────────────────
// Symbol loading
// ────────────────────────────────────────────

function loadSymbols() {
  const assetsPath = join(__dirname, '..', 'src', 'lib', 'trading', 'assets.ts');
  const content = readFileSync(assetsPath, 'utf-8');
  const symbols = new Set();

  const arrayRegex = /export const \w+_SYMBOLS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/g;
  let arrayMatch;
  while ((arrayMatch = arrayRegex.exec(content)) !== null) {
    const body = arrayMatch[1];
    const symbolRegex = /'([^']+)'/g;
    let symMatch;
    while ((symMatch = symbolRegex.exec(body)) !== null) {
      const sym = symMatch[1];
      // Skip forex and futures (not supported by intraday strategy)
      if (!sym.endsWith('=X') && !sym.endsWith('=F')) {
        symbols.add(sym);
      }
    }
  }

  return [...symbols].slice(0, MAX_SYMBOLS);
}

// ────────────────────────────────────────────
// Yahoo Finance data fetching
// ────────────────────────────────────────────

async function fetchYahoo5Min(symbol) {
  try {
    // Yahoo allows up to 60 days of 5-min data
    const days = Math.min(BACKTEST_DAYS + 10, 59); // extra for warmup
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${days}d&interval=5m`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;

    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];

    return timestamp
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString(),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i],
      }))
      .filter(d => d.open !== null && d.close !== null && d.volume !== null);
  } catch {
    return null;
  }
}

async function fetchYahooDaily(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`,
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
      .filter(d => d.open !== null && d.close !== null);
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────
// Intraday Signal Functions (same as trading-bot.mjs)
// ────────────────────────────────────────────

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

function calculateVWAPReversionSignal(intradayBars, sessionBars) {
  if (!sessionBars || sessionBars.length < 6) {
    return { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'Insufficient data' };
  }

  let cumVolPrice = 0;
  let cumVol = 0;
  for (const bar of sessionBars) {
    const tp = (bar.high + bar.low + bar.close) / 3;
    cumVolPrice += tp * bar.volume;
    cumVol += bar.volume;
  }

  if (cumVol === 0) {
    return { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'No volume' };
  }

  const vwap = cumVolPrice / cumVol;
  const currentPrice = sessionBars[sessionBars.length - 1].close;

  const squaredDiffs = sessionBars.map(b => {
    const tp = (b.high + b.low + b.close) / 3;
    return Math.pow(tp - vwap, 2);
  });
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length);

  if (stdDev === 0) return { name: 'VWAP Reversion', score: 0, confidence: 0.3, reason: 'No variation' };

  const zScore = (currentPrice - vwap) / stdDev;
  let score = 0;

  if (zScore < -2) score = 0.8;
  else if (zScore < -1.5) score = 0.6;
  else if (zScore < -1) score = 0.4;
  else if (zScore < -0.5) score = 0.2;
  else if (zScore > 2) score = -0.8;
  else if (zScore > 1.5) score = -0.6;
  else if (zScore > 1) score = -0.4;
  else if (zScore > 0.5) score = -0.2;

  const confidence = Math.min(0.8, 0.3 + (sessionBars.length / 78) * 0.5);
  return { name: 'VWAP Reversion', score, confidence, reason: `z=${zScore.toFixed(2)}` };
}

function calculateIntradayMomentumSignal(intradayBars) {
  if (!intradayBars || intradayBars.length < 12) {
    return { name: 'Intraday Momentum', score: 0, confidence: 0, reason: 'Insufficient data' };
  }

  const bars = intradayBars;
  const currentPrice = bars[bars.length - 1].close;

  const atrPeriod = Math.min(14, bars.length - 1);
  let atrSum = 0;
  for (let i = bars.length - atrPeriod; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );
    atrSum += tr;
  }
  const atr = atrSum / atrPeriod;
  if (atr === 0) return { name: 'Intraday Momentum', score: 0, confidence: 0.3, reason: 'No movement' };

  let score = 0;

  if (bars.length >= 7) {
    const mom30m = (currentPrice - bars[bars.length - 7].close) / atr;
    if (mom30m > 1.5) score += 0.3;
    else if (mom30m > 0.75) score += 0.15;
    else if (mom30m < -1.5) score -= 0.3;
    else if (mom30m < -0.75) score -= 0.15;
  }

  if (bars.length >= 13) {
    const mom1h = (currentPrice - bars[bars.length - 13].close) / atr;
    if (mom1h > 2) score += 0.4;
    else if (mom1h > 1) score += 0.2;
    else if (mom1h < -2) score -= 0.4;
    else if (mom1h < -1) score -= 0.2;
  }

  if (bars.length >= 25) {
    const mom2h = (currentPrice - bars[bars.length - 25].close) / atr;
    if (mom2h > 2.5) score += 0.3;
    else if (mom2h > 1.5) score += 0.15;
    else if (mom2h < -2.5) score -= 0.3;
    else if (mom2h < -1.5) score -= 0.15;
  }

  return { name: 'Intraday Momentum', score: Math.max(-1, Math.min(1, score)), confidence: 0.65, reason: '' };
}

function calculateRSIVolumeSignal(intradayBars) {
  if (!intradayBars || intradayBars.length < 20) {
    return { name: 'RSI + Volume', score: 0, confidence: 0, reason: 'Insufficient data' };
  }

  const rsi7 = calculateRSI(intradayBars, 7);
  const rsi14 = calculateRSI(intradayBars, 14);
  let score = 0;

  if (rsi7 < 20) score += 0.5;
  else if (rsi7 < 30) score += 0.35;
  else if (rsi7 < 40) score += 0.15;
  else if (rsi7 > 80) score -= 0.5;
  else if (rsi7 > 70) score -= 0.35;
  else if (rsi7 > 60) score -= 0.15;

  if ((rsi7 < 30 && rsi14 < 40) || (rsi7 > 70 && rsi14 > 60)) {
    score *= 1.3;
  }

  const recentBars = intradayBars.slice(-6);
  const lookback = Math.min(40, intradayBars.length);
  const avgVolume = intradayBars.slice(-lookback).reduce((sum, d) => sum + d.volume, 0) / lookback;
  const recentVolume = recentBars.reduce((sum, d) => sum + d.volume, 0) / recentBars.length;

  if (avgVolume > 0) {
    const volumeRatio = recentVolume / avgVolume;
    if (volumeRatio > 2.5) {
      const pc = (recentBars[recentBars.length - 1].close - recentBars[0].close) / recentBars[0].close;
      if (pc > 0) score += 0.25;
      else if (pc < 0) score -= 0.25;
    } else if (volumeRatio > 1.5) {
      const pc = (recentBars[recentBars.length - 1].close - recentBars[0].close) / recentBars[0].close;
      if (pc > 0) score += 0.1;
      else if (pc < 0) score -= 0.1;
    }
  }

  return { name: 'RSI + Volume', score: Math.max(-1, Math.min(1, score)), confidence: 0.7, reason: '' };
}

function calculateGapFadeSignal(intradayBars, dailyBars, simDate) {
  if (!dailyBars || dailyBars.length < 2 || !intradayBars || intradayBars.length < 6) {
    return { name: 'Gap Fade', score: 0, confidence: 0, reason: 'Insufficient data' };
  }

  // Find previous close from daily data
  const simDateStr = simDate.toISOString().split('T')[0];
  const prevDayIdx = dailyBars.findIndex(d => d.date >= simDateStr) - 1;
  const previousClose = prevDayIdx >= 0 ? dailyBars[prevDayIdx].close : dailyBars[dailyBars.length - 2].close;

  // Today's open = first intraday bar of this session
  const todayDateStr = simDateStr;
  const todayFirstBar = intradayBars.find(b => b.date.startsWith(todayDateStr));
  const todayOpen = todayFirstBar?.open || intradayBars[0]?.open;

  if (!todayOpen || !previousClose) {
    return { name: 'Gap Fade', score: 0, confidence: 0, reason: 'Cannot determine gap' };
  }

  const gapPercent = ((todayOpen - previousClose) / previousClose) * 100;
  const currentPrice = intradayBars[intradayBars.length - 1].close;
  const gapFillPercent = todayOpen !== previousClose
    ? ((currentPrice - todayOpen) / (previousClose - todayOpen)) * 100
    : 100;

  // Simulate time decay based on bar position in day
  const barsIntoDay = intradayBars.filter(b => b.date.startsWith(todayDateStr)).length;
  const timeDecay = Math.max(0.2, 1 - (barsIntoDay / 78));

  if (Math.abs(gapPercent) < 0.1) {
    return { name: 'Gap Fade', score: 0, confidence: 0.2, reason: 'No gap' };
  }

  let score = 0;
  if (gapPercent > 2) score = -0.6 * timeDecay;
  else if (gapPercent > 1) score = -0.4 * timeDecay;
  else if (gapPercent > 0.3) score = -0.2 * timeDecay;
  else if (gapPercent < -2) score = 0.6 * timeDecay;
  else if (gapPercent < -1) score = 0.4 * timeDecay;
  else if (gapPercent < -0.3) score = 0.2 * timeDecay;

  if (gapFillPercent > 80) score *= 0.3;
  else if (gapFillPercent > 50) score *= 0.6;

  return { name: 'Gap Fade', score: Math.max(-1, Math.min(1, score)), confidence: 0.5 * timeDecay, reason: '' };
}

function combineSignals(momentum, meanReversion, sentiment, technical, weights) {
  return momentum.score * weights.momentum +
    meanReversion.score * weights.meanReversion +
    sentiment.score * weights.sentiment +
    technical.score * weights.technical;
}

// ────────────────────────────────────────────
// Simulation engine
// ────────────────────────────────────────────

function runIntradayBacktest(allIntraday, allDaily, symbols, config) {
  let portfolio = {
    cash: config.initialCapital,
    holdings: [],
    totalValue: config.initialCapital,
  };

  const dailyReturns = [];
  let totalTrades = 0;
  let winTrades = 0;
  let lossTrades = 0;

  // Build a sorted timeline of all unique 5-min timestamps across all symbols
  const allTimestamps = new Set();
  for (const symbol of symbols) {
    const bars = allIntraday[symbol];
    if (!bars) continue;
    for (const bar of bars) {
      allTimestamps.add(bar.date);
    }
  }
  const sortedTimestamps = [...allTimestamps].sort();

  // Group timestamps by trading day
  const dayMap = new Map(); // dateStr -> [timestamps]
  for (const ts of sortedTimestamps) {
    const dayStr = ts.split('T')[0];
    if (!dayMap.has(dayStr)) dayMap.set(dayStr, []);
    dayMap.get(dayStr).push(ts);
  }

  const tradingDays = [...dayMap.keys()].sort();

  // Determine backtest start (skip warmup days)
  const startIdx = Math.max(0, tradingDays.length - BACKTEST_DAYS);
  const backtestDays = tradingDays.slice(startIdx);

  console.log(`  Trading days available: ${tradingDays.length}, backtest period: ${backtestDays.length} days`);
  console.log(`  Period: ${backtestDays[0]} to ${backtestDays[backtestDays.length - 1]}`);

  let prevDayEndValue = config.initialCapital;

  for (const dayStr of backtestDays) {
    const dayTimestamps = dayMap.get(dayStr);
    if (!dayTimestamps || dayTimestamps.length < 6) continue;

    // Trade every TRADE_INTERVAL_BARS bars (every 10 min)
    for (let barIdx = TRADE_INTERVAL_BARS; barIdx < dayTimestamps.length; barIdx += TRADE_INTERVAL_BARS) {
      const currentTs = dayTimestamps[barIdx];
      const simDate = new Date(currentTs);

      // Build lookback window for each symbol (bars up to this point today + some history)
      const allSignals = {};
      const priceCache = {};

      for (const symbol of symbols) {
        const bars = allIntraday[symbol];
        if (!bars) continue;

        // Get bars up to current timestamp
        const barsUpToNow = bars.filter(b => b.date <= currentTs);
        if (barsUpToNow.length < 12) continue;

        // Session bars = today's bars only
        const sessionBars = barsUpToNow.filter(b => b.date.split('T')[0] === dayStr);
        if (sessionBars.length < 3) continue;

        const lastPrice = barsUpToNow[barsUpToNow.length - 1].close;
        priceCache[symbol] = lastPrice;

        const dailyBars = allDaily[symbol] || [];

        // Compute signals
        const momentum = calculateIntradayMomentumSignal(barsUpToNow.slice(-50));
        const meanReversion = calculateVWAPReversionSignal(barsUpToNow, sessionBars);
        const technical = calculateRSIVolumeSignal(barsUpToNow.slice(-50));
        const sentiment = calculateGapFadeSignal(sessionBars, dailyBars, simDate);

        const combined = combineSignals(momentum, meanReversion, sentiment, technical, config.strategyWeights);

        let recommendation;
        if (combined > 0.5) recommendation = 'STRONG_BUY';
        else if (combined > 0.15) recommendation = 'BUY';
        else if (combined < -0.5) recommendation = 'STRONG_SELL';
        else if (combined < -0.15) recommendation = 'SELL';
        else recommendation = 'HOLD';

        allSignals[symbol] = { symbol, combined, recommendation };
      }

      // Update holdings
      for (const holding of portfolio.holdings) {
        const price = priceCache[holding.symbol];
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
        const price = priceCache[holding.symbol];
        if (!price) continue;

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

          const pnl = (price - holding.avgCost) * sharesToSell;
          if (pnl > 0) winTrades++;
          else lossTrades++;
          totalTrades++;

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
          const price = priceCache[holding.symbol];
          if (!price) continue;
          portfolio.cash += holding.shares * price;
          portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
          rotated++;
          totalTrades++;
        }
      }

      // Buy logic
      const openSlots = config.maxPositions - portfolio.holdings.length;
      const buyCandidates = Object.values(allSignals)
        .filter(s => s.combined > config.buyThreshold && !portfolio.holdings.some(h => h.symbol === s.symbol))
        .sort((a, b) => b.combined - a.combined)
        .slice(0, openSlots);

      if (buyCandidates.length > 0) {
        const tgtCash = portfolio.totalValue * config.targetCashRatio;
        const availCash = Math.max(0, portfolio.cash - tgtCash);
        const maxPosition = portfolio.totalValue * config.maxPositionSize;
        const totalStrength = buyCandidates.reduce((sum, s) => sum + Math.abs(s.combined), 0);

        let allocations = buyCandidates.map(signal => {
          const weight = Math.abs(signal.combined) / totalStrength;
          return { signal, size: Math.min(availCash * weight, maxPosition) };
        });

        const cappedTotal = allocations.reduce((sum, a) => sum + a.size, 0);
        if (cappedTotal < availCash) {
          const uncapped = allocations.filter(a => a.size < maxPosition);
          const excess = availCash - cappedTotal;
          const uncappedStr = uncapped.reduce((sum, a) => sum + Math.abs(a.signal.combined), 0);
          if (uncappedStr > 0) {
            for (const alloc of uncapped) {
              const bonus = excess * (Math.abs(alloc.signal.combined) / uncappedStr);
              alloc.size = Math.min(alloc.size + bonus, maxPosition);
            }
          }
        }

        const totalAllocated = allocations.reduce((sum, a) => sum + a.size, 0);
        if (totalAllocated > availCash) {
          const scale = availCash / totalAllocated;
          allocations = allocations.map(a => ({ ...a, size: a.size * scale }));
        }

        for (const { signal, size } of allocations) {
          if (size < config.minTradeValue) continue;
          const price = priceCache[signal.symbol];
          if (!price) continue;

          const shares = Math.round((size / price) * 10000) / 10000;
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
            totalTrades++;
          }
        }
      }

      // Update portfolio total
      const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
      portfolio.totalValue = portfolio.cash + holdingsValue;
    }

    // End of day: record daily return
    const dailyReturn = prevDayEndValue > 0 ? (portfolio.totalValue - prevDayEndValue) / prevDayEndValue : 0;
    dailyReturns.push({ date: dayStr, return: dailyReturn, value: portfolio.totalValue });
    prevDayEndValue = portfolio.totalValue;

    if (VERBOSE) {
      const totalReturn = ((portfolio.totalValue - config.initialCapital) / config.initialCapital * 100).toFixed(2);
      console.log(`  ${dayStr}: $${portfolio.totalValue.toFixed(0)} (${totalReturn}%) | Holdings: ${portfolio.holdings.length} | Trades today: ${totalTrades}`);
    }
  }

  // Calculate metrics
  const totalReturn = ((portfolio.totalValue - config.initialCapital) / config.initialCapital) * 100;

  const riskFreeRate = 0.05 / 252;
  const returns = dailyReturns.map(d => d.return);
  const excessReturns = returns.map(r => r - riskFreeRate);
  const avgExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const excessVar = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / excessReturns.length;
  const sharpe = excessVar > 0 ? (avgExcess * Math.sqrt(252)) / Math.sqrt(excessVar) : 0;

  let maxDrawdown = 0;
  let peak = config.initialCapital;
  let runningValue = config.initialCapital;
  for (const dr of returns) {
    runningValue *= (1 + dr);
    if (runningValue > peak) peak = runningValue;
    const dd = (peak - runningValue) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const winRate = totalTrades > 0 ? (winTrades / (winTrades + lossTrades) * 100) : 0;

  return {
    totalReturn,
    sharpe,
    maxDrawdown: maxDrawdown * 100,
    finalValue: portfolio.totalValue,
    totalTrades,
    winRate,
    winTrades,
    lossTrades,
    dailyReturns,
  };
}

// ────────────────────────────────────────────
// Main
// ────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Intraday Strategy Backtest');
  console.log(`  Period: ${BACKTEST_DAYS} days | Symbols: ${MAX_SYMBOLS}`);
  console.log(`  Trade interval: every ${TRADE_INTERVAL_BARS * 5} minutes`);
  console.log('═══════════════════════════════════════════════════════\n');

  const symbols = loadSymbols();
  console.log(`Loaded ${symbols.length} symbols\n`);

  // Fetch data
  console.log('Fetching 5-minute data from Yahoo Finance...');
  const allIntraday = {};
  const allDaily = {};
  let fetched = 0;
  const BATCH = 20;

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (symbol) => {
      const [intraday, daily] = await Promise.all([
        fetchYahoo5Min(symbol),
        fetchYahooDaily(symbol),
      ]);
      return { symbol, intraday, daily };
    }));

    for (const { symbol, intraday, daily } of results) {
      if (intraday && intraday.length > 50) {
        allIntraday[symbol] = intraday;
        fetched++;
      }
      if (daily) {
        allDaily[symbol] = daily;
      }
    }

    process.stdout.write(`\r  Fetched: ${fetched}/${symbols.length} symbols with data`);

    if (i + BATCH < symbols.length) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  console.log(`\n  Got 5-min data for ${Object.keys(allIntraday).length} symbols\n`);

  const symbolsWithData = Object.keys(allIntraday);
  if (symbolsWithData.length < 10) {
    console.error('Too few symbols with data. Aborting.');
    process.exit(1);
  }

  // Run intraday backtest
  console.log('Running intraday strategy simulation...');
  const intradayResult = runIntradayBacktest(allIntraday, allDaily, symbolsWithData, DEFAULT_CONFIG);

  // Print results
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  INTRADAY STRATEGY RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total Return:    ${intradayResult.totalReturn >= 0 ? '+' : ''}${intradayResult.totalReturn.toFixed(2)}%`);
  console.log(`  Final Value:     $${intradayResult.finalValue.toFixed(2)}`);
  console.log(`  Sharpe Ratio:    ${intradayResult.sharpe.toFixed(3)}`);
  console.log(`  Max Drawdown:    -${intradayResult.maxDrawdown.toFixed(2)}%`);
  console.log(`  Total Trades:    ${intradayResult.totalTrades}`);
  console.log(`  Win Rate:        ${intradayResult.winRate.toFixed(1)}%`);
  console.log(`  Wins/Losses:     ${intradayResult.winTrades}/${intradayResult.lossTrades}`);

  // Print daily returns
  console.log('\n  Daily Portfolio Value:');
  const dr = intradayResult.dailyReturns;
  for (let i = 0; i < dr.length; i += 2) {
    const d = dr[i];
    const ret = ((d.value - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital * 100);
    const bar = '='.repeat(Math.min(30, Math.abs(Math.round(ret))));
    console.log(`  ${d.date}  $${d.value.toFixed(0).padStart(6)}  ${ret >= 0 ? '+' : ''}${ret.toFixed(1).padStart(6)}% ${bar}`);
  }

  // Compare with old strategy (from latest backtest run)
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  COMPARISON (run old backtest separately for exact numbers)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Old daily strategy (last run): ~+2.0% over 30 days');
  console.log(`  New intraday strategy:         ${intradayResult.totalReturn >= 0 ? '+' : ''}${intradayResult.totalReturn.toFixed(2)}% over ${dr.length} days`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
