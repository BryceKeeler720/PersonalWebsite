#!/usr/bin/env node
/**
 * Trading Bot Backtest Script
 * Simulates the trading algorithm over historical data to evaluate performance.
 *
 * Usage: node scripts/backtest.mjs [--days=30] [--symbols=50]
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
const MAX_SYMBOLS = parseInt(args.symbols || '100', 10);
const VERBOSE = args.verbose === 'true';

// Representative symbol list (top liquid stocks, ETFs, crypto)
const BACKTEST_SYMBOLS = [
  // Mega cap
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AVGO', 'TSLA',
  'BRK-B', 'LLY', 'WMT', 'JPM', 'V', 'XOM', 'JNJ', 'ORCL', 'MA', 'COST',
  'AMD', 'PLTR', 'ABBV', 'HD', 'BAC', 'NFLX', 'PG', 'CVX', 'UNH', 'KO',
  // Mid-large cap
  'GE', 'CSCO', 'CAT', 'GS', 'IBM', 'MRK', 'CRM', 'INTC', 'DIS', 'BA',
  'UBER', 'ADBE', 'NOW', 'PANW', 'ISRG', 'BKNG', 'INTU', 'LOW', 'TXN',
  'NEE', 'PFE', 'QCOM', 'LMT', 'DE', 'SYK', 'COP', 'ETN', 'PH',
  // Growth / mid-cap
  'CRWD', 'SNOW', 'DDOG', 'NET', 'SQ', 'SHOP', 'COIN', 'MELI', 'ARM',
  'SMCI', 'MRVL', 'RIVN', 'SOFI', 'RKLB', 'IONQ', 'DKNG', 'CVNA',
  // ETFs
  'SPY', 'QQQ', 'IWM', 'DIA', 'GLD', 'XLF', 'XLK', 'XLE', 'XLV', 'SMH',
  // Crypto
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'DOGE-USD',
  'DOT-USD', 'AVAX-USD', 'LINK-USD',
].slice(0, MAX_SYMBOLS);

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
  if (data.length < 50) return { name: 'momentum', score: 0, confidence: 0, reason: 'Insufficient data' };
  const currentPrice = data[data.length - 1].close;
  const sma20 = calculateSMA(data, 20);
  const sma50 = calculateSMA(data, 50);
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  let score = 0;
  if (currentPrice > sma20) score += 0.25; else score -= 0.25;
  if (currentPrice > sma50) score += 0.25; else score -= 0.25;
  if (sma20 > sma50) score += 0.25; else score -= 0.25;
  if (ema12 > ema26) score += 0.25; else score -= 0.25;

  return { name: 'momentum', score: Math.max(-1, Math.min(1, score)), confidence: 0.7 };
}

function calculateMeanReversionSignal(data) {
  if (data.length < 20) return { name: 'meanReversion', score: 0, confidence: 0 };
  const currentPrice = data[data.length - 1].close;
  const sma20 = calculateSMA(data, 20);
  const prices = data.slice(-20).map(d => d.close);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length);
  const zScore = stdDev > 0 ? (currentPrice - sma20) / stdDev : 0;

  let score = 0;
  if (zScore < -2) score = 0.8;
  else if (zScore < -1) score = 0.4;
  else if (zScore > 2) score = -0.8;
  else if (zScore > 1) score = -0.4;

  return { name: 'meanReversion', score, confidence: 0.6 };
}

function calculateTechnicalSignal(data) {
  if (data.length < 20) return { name: 'technical', score: 0, confidence: 0 };
  const rsi = calculateRSI(data);
  let score = 0;
  if (rsi < 30) score += 0.5;
  else if (rsi < 40) score += 0.25;
  else if (rsi > 70) score -= 0.5;
  else if (rsi > 60) score -= 0.25;

  const recentData = data.slice(-5);
  const avgVolume = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
  const recentVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / 5;
  if (recentVolume > avgVolume * 1.5) {
    const priceChange = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close;
    if (priceChange > 0) score += 0.25;
    else score -= 0.25;
  }

  return { name: 'technical', score: Math.max(-1, Math.min(1, score)), confidence: 0.65 };
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
  return { name: 'sentiment', score, confidence: 0.3 };
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
// Backtest engine
// ────────────────────────────────────────────

async function runBacktest() {
  console.log('═'.repeat(60));
  console.log('TRADING BOT BACKTEST');
  console.log(`Period: ${BACKTEST_DAYS} trading days`);
  console.log(`Symbols: ${BACKTEST_SYMBOLS.length}`);
  console.log(`Initial Capital: $${DEFAULT_CONFIG.initialCapital.toLocaleString()}`);
  console.log('═'.repeat(60));
  console.log('');

  // Step 1: Fetch all historical data
  console.log('Fetching historical data...');
  const allData = {};
  const BATCH_SIZE = 15;

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
      await new Promise(r => setTimeout(r, 400));
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

  // Determine backtest window
  const warmupDays = 50;
  const startIdx = Math.max(warmupDays, allDates.length - BACKTEST_DAYS);
  const backtestDates = allDates.slice(startIdx);

  console.log(`Warmup: ${startIdx} days | Backtest: ${backtestDates.length} trading days`);
  console.log(`Date range: ${backtestDates[0]} → ${backtestDates[backtestDates.length - 1]}`);
  console.log('');

  // Step 3: Initialize portfolio
  let portfolio = {
    cash: DEFAULT_CONFIG.initialCapital,
    holdings: [],
    totalValue: DEFAULT_CONFIG.initialCapital,
  };

  const trades = [];
  const portfolioHistory = [];
  const dailyReturns = [];

  // Also track SPY for benchmark
  const spyStart = spyData.find(d => d.date === backtestDates[0])?.close;
  const spyBenchmark = [];

  // Step 4: Simulate each trading day
  for (let dayIdx = 0; dayIdx < backtestDates.length; dayIdx++) {
    const date = backtestDates[dayIdx];
    const dateIndex = allDates.indexOf(date);

    // Calculate signals for all symbols using data up to this date
    const allSignals = {};
    for (const symbol of symbols) {
      const symbolData = allData[symbol];
      // Find data up to this date
      const dataUpToDate = symbolData.filter(d => d.date <= date);
      if (dataUpToDate.length < 50) continue;

      const momentum = calculateMomentumSignal(dataUpToDate);
      const meanReversion = calculateMeanReversionSignal(dataUpToDate);
      const technical = calculateTechnicalSignal(dataUpToDate);
      const sentiment = calculateSentimentSignal(symbol, date);
      const signal = combineSignals(symbol, momentum, meanReversion, sentiment, technical, DEFAULT_CONFIG.strategyWeights);
      allSignals[symbol] = signal;
    }

    // Get current prices (close price on this date)
    const currentPrices = {};
    for (const symbol of symbols) {
      const candle = allData[symbol].find(d => d.date === date);
      if (candle) currentPrices[symbol] = candle.close;
    }

    // Update holding prices
    for (const holding of portfolio.holdings) {
      const price = currentPrices[holding.symbol];
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
      const price = currentPrices[holding.symbol];
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

        const price = currentPrices[holding.symbol];
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

      const price = currentPrices[signal.symbol];
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
  // Step 5: Calculate and display results
  // ────────────────────────────────────────────

  console.log('\n' + '═'.repeat(60));
  console.log('BACKTEST RESULTS');
  console.log('═'.repeat(60));

  // Portfolio performance
  const finalValue = portfolio.totalValue;
  const totalReturn = ((finalValue - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital) * 100;
  const spyFinal = spyBenchmark[spyBenchmark.length - 1]?.value || DEFAULT_CONFIG.initialCapital;
  const spyReturn = ((spyFinal - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital) * 100;

  console.log('\n📊 Portfolio Performance:');
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

  console.log('\n📈 Trade Statistics:');
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

  console.log('\n⚖️  Risk Metrics:');
  console.log(`  Sharpe Ratio:       ${sharpe.toFixed(2)}`);
  console.log(`  Volatility (ann.):  ${volatility.toFixed(1)}%`);
  console.log(`  Max Drawdown:       -${(maxDrawdown * 100).toFixed(2)}%`);
  console.log(`  Data Points:        ${dailyReturns.length}`);

  // Strategy breakdown
  const strategyStats = {
    momentum: { wins: 0, losses: 0 },
    meanReversion: { wins: 0, losses: 0 },
    sentiment: { wins: 0, losses: 0 },
    technical: { wins: 0, losses: 0 },
  };

  // We can't easily attribute trades to strategies without the full signal data,
  // but we can show the overall distribution
  console.log('\n🔄 Position Summary:');
  console.log(`  Final Holdings:     ${portfolio.holdings.length}`);
  console.log(`  Final Cash:         $${portfolio.cash.toFixed(2)}`);
  console.log(`  Invested:           $${(portfolio.totalValue - portfolio.cash).toFixed(2)}`);

  // Top winners and losers
  if (sells.length > 0) {
    const sortedSells = [...sells].sort((a, b) => (b.gainLossPercent ?? 0) - (a.gainLossPercent ?? 0));

    console.log('\n🏆 Top 5 Winners:');
    for (const t of sortedSells.slice(0, 5)) {
      console.log(`  ${t.symbol.padEnd(10)} ${t.date}  ${(t.gainLossPercent ?? 0) >= 0 ? '+' : ''}${(t.gainLossPercent ?? 0).toFixed(2)}%  $${(t.gainLoss ?? 0).toFixed(2)}`);
    }

    console.log('\n💀 Top 5 Losers:');
    for (const t of sortedSells.slice(-5).reverse()) {
      console.log(`  ${t.symbol.padEnd(10)} ${t.date}  ${(t.gainLossPercent ?? 0) >= 0 ? '+' : ''}${(t.gainLossPercent ?? 0).toFixed(2)}%  $${(t.gainLoss ?? 0).toFixed(2)}`);
    }
  }

  // Daily portfolio value (sparkline)
  console.log('\n📉 Portfolio Value Over Time:');
  const step = Math.max(1, Math.floor(portfolioHistory.length / 15));
  for (let i = 0; i < portfolioHistory.length; i += step) {
    const p = portfolioHistory[i];
    const spyP = spyBenchmark[i];
    const pctChange = ((p.totalValue - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital) * 100;
    const bar = '█'.repeat(Math.max(0, Math.round(Math.abs(pctChange) * 2)));
    const spyPct = spyP ? ((spyP.value - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital * 100).toFixed(1) : '?';
    console.log(`  ${p.date}  $${p.totalValue.toFixed(0).padStart(6)}  ${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1).padStart(5)}% ${pctChange >= 0 ? '\x1b[32m' : '\x1b[31m'}${bar}\x1b[0m  (SPY: ${spyPct}%)`);
  }
  // Always show last day
  const last = portfolioHistory[portfolioHistory.length - 1];
  if (last) {
    const pctChange = ((last.totalValue - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital) * 100;
    const spyLast = spyBenchmark[spyBenchmark.length - 1];
    const spyPct = spyLast ? ((spyLast.value - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital * 100).toFixed(1) : '?';
    console.log(`  ${last.date}  $${last.totalValue.toFixed(0).padStart(6)}  ${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1).padStart(5)}% (FINAL)  (SPY: ${spyPct}%)`);
  }

  console.log('\n' + '═'.repeat(60));

  // Write results to JSON for the frontend performance chart
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outputPath = join(__dirname, '..', 'public', 'backtest-results.json');
  const output = {
    generatedAt: new Date().toISOString(),
    config: DEFAULT_CONFIG,
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
  };
}

runBacktest().catch(console.error);
