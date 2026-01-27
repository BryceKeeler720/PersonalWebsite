#!/usr/bin/env node
/**
 * Intraday Strategy Backtest
 * Tests intraday strategies (VWAP Reversion, Intraday Momentum, RSI+Volume, Gap Fade)
 * over configurable periods using Yahoo Finance (≤59 days) or Alpaca (any duration).
 *
 * Usage:
 *   node scripts/backtest-intraday.mjs [--days=30] [--symbols=100] [--verbose]
 *   node scripts/backtest-intraday.mjs --days=365 --source=alpaca
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file if present (simple inline loader)
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

// Alpaca API (required when --source=alpaca or --days > 59)
const ALPACA_API_KEY = process.env.ALPACA_API_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const ALPACA_DATA_URL = 'https://data.alpaca.markets';

// ────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────

const DEFAULT_CONFIG = {
  initialCapital: 10000,
  maxPositionSize: 0.07,
  maxPositions: 15,
  minTradeValue: 15,
  targetCashRatio: 0.05,
  buyThreshold: 0.35,
  riskPerTrade: 0.01,
  atrStopMultiplier: 2,
  atrProfit1Multiplier: 3,
  atrProfit2Multiplier: 5,
  maxNewPositionsPerCycle: 3,
  minHoldBars: 24,
  transactionCostBps: 5,
};

const REGIME_WEIGHTS = {
  TRENDING_UP:   { trend: 0.80, reversion: 0.20 },
  TRENDING_DOWN: { trend: 0.80, reversion: 0.20 },
  RANGE_BOUND:   { trend: 0.20, reversion: 0.80 },
  UNKNOWN:       { trend: 0.50, reversion: 0.50 },
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
const TRADE_INTERVAL_BARS = 12; // Every 12 × 5-min bars = 1 hour
// Auto-select Alpaca for periods Yahoo can't handle (>59 days)
const DATA_SOURCE = args.source || (BACKTEST_DAYS > 59 ? 'alpaca' : 'yahoo');
const ALPACA_BATCH_SIZE = 50;
const ALPACA_BATCH_DELAY_MS = 350;

// Override params from CLI
if (args.maxPositions) DEFAULT_CONFIG.maxPositions = parseInt(args.maxPositions, 10);
if (args.maxPositionSize) DEFAULT_CONFIG.maxPositionSize = parseFloat(args.maxPositionSize);
if (args.buyThreshold) DEFAULT_CONFIG.buyThreshold = parseFloat(args.buyThreshold);
if (args.atrStop) DEFAULT_CONFIG.atrStopMultiplier = parseFloat(args.atrStop);

// ────────────────────────────────────────────
// Symbol loading — stratified sampling
// ────────────────────────────────────────────

// Deterministic shuffle (Fisher-Yates with seeded PRNG)
function seededShuffle(arr, seed = 42) {
  const a = [...arr];
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadSymbols() {
  const assetsPath = join(__dirname, '..', 'src', 'lib', 'trading', 'assets.ts');
  const content = readFileSync(assetsPath, 'utf-8');

  // Parse each named array separately for stratified sampling
  const buckets = {};
  const arrayRegex = /export const (\w+)\s*=\s*\[([\s\S]*?)\]\s*as\s*const/g;
  let arrayMatch;
  while ((arrayMatch = arrayRegex.exec(content)) !== null) {
    const name = arrayMatch[1];
    const body = arrayMatch[2];
    const syms = [];
    const symbolRegex = /'([^']+)'/g;
    let symMatch;
    while ((symMatch = symbolRegex.exec(body)) !== null) {
      const sym = symMatch[1];
      if (!sym.endsWith('=X') && !sym.endsWith('=F')) {
        syms.push(sym);
      }
    }
    if (syms.length > 0) {
      buckets[name] = [...new Set(syms)]; // dedupe within each array
    }
  }

  // Skip ALL_SYMBOLS (it's just a union of the others)
  delete buckets['ALL_SYMBOLS'];

  const totalUniverse = Object.values(buckets).reduce((sum, b) => sum + b.length, 0);
  console.log(`  Symbol universe: ${totalUniverse} across ${Object.keys(buckets).length} categories`);

  // Proportional allocation per bucket
  const selected = new Set();
  const remaining = MAX_SYMBOLS;
  const bucketEntries = Object.entries(buckets);

  for (const [name, syms] of bucketEntries) {
    const proportion = syms.length / totalUniverse;
    const count = Math.max(1, Math.round(proportion * remaining)); // at least 1 per bucket
    const shuffled = seededShuffle(syms);
    let added = 0;
    for (const sym of shuffled) {
      if (added >= count) break;
      if (!selected.has(sym)) {
        selected.add(sym);
        added++;
      }
    }
    if (VERBOSE) console.log(`    ${name}: ${syms.length} total → ${added} sampled (${(proportion * 100).toFixed(1)}%)`);
  }

  // If we're short due to rounding/dedup, fill from largest bucket
  if (selected.size < MAX_SYMBOLS) {
    const largest = bucketEntries.sort((a, b) => b[1].length - a[1].length)[0][1];
    for (const sym of seededShuffle(largest)) {
      if (selected.size >= MAX_SYMBOLS) break;
      selected.add(sym);
    }
  }

  return [...selected].slice(0, MAX_SYMBOLS);
}

// Symbol type helpers
function isCryptoSymbol(sym) { return sym.endsWith('-USD'); }
function isForexOrFutures(sym) { return sym.endsWith('=X') || sym.endsWith('=F'); }
function toAlpacaStockSymbol(sym) { return sym.replace('-', '.'); }
function fromAlpacaStockSymbol(sym) { return sym.replace('.', '-'); }
function toAlpacaCryptoSymbol(sym) { return sym.replace('-', '/'); }
function fromAlpacaCryptoSymbol(sym) { return sym.replace('/', '-'); }

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
// Alpaca data fetching (for periods > 59 days)
// ────────────────────────────────────────────

function parseAlpacaBars(bars) {
  return bars.map(b => ({
    date: b.t,
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v,
    vwap: b.vw,
  }));
}

async function fetchAlpacaBars(symbols, timeframe, days, isCrypto = false) {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    console.error('Alpaca API keys required for --source=alpaca. Set ALPACA_API_KEY and ALPACA_SECRET_KEY.');
    process.exit(1);
  }

  const allBars = {};
  const alpacaSymbols = isCrypto ? symbols.map(toAlpacaCryptoSymbol) : symbols.map(toAlpacaStockSymbol);
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const endpoint = isCrypto
    ? `${ALPACA_DATA_URL}/v1beta3/crypto/us/bars`
    : `${ALPACA_DATA_URL}/v2/stocks/bars`;

  for (let i = 0; i < alpacaSymbols.length; i += ALPACA_BATCH_SIZE) {
    const batch = alpacaSymbols.slice(i, i + ALPACA_BATCH_SIZE);
    const symbolsParam = batch.join(',');

    try {
      let pageToken = null;
      let pageCount = 0;
      const symbolBars = {};
      batch.forEach(s => { symbolBars[s] = []; });

      do {
        const url = new URL(endpoint);
        url.searchParams.set('symbols', symbolsParam);
        url.searchParams.set('timeframe', timeframe);
        url.searchParams.set('start', start);
        url.searchParams.set('limit', '10000');
        if (pageToken) url.searchParams.set('page_token', pageToken);

        // Throttle between page requests to stay under 200 req/min
        if (pageCount > 0) {
          await new Promise(r => setTimeout(r, 350));
        }

        let response;
        let retries = 0;
        const maxRetries = 5;
        while (retries <= maxRetries) {
          response = await fetch(url.toString(), {
            headers: {
              'APCA-API-KEY-ID': ALPACA_API_KEY,
              'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
            },
          });
          if (response.status === 429 && retries < maxRetries) {
            const backoff = Math.pow(2, retries + 1) * 1000;
            if (retries === 0) process.stdout.write(`  Rate limited, backing off...`);
            await new Promise(r => setTimeout(r, backoff));
            retries++;
          } else {
            break;
          }
        }

        if (!response.ok) {
          console.error(`  Alpaca bars fetch failed (${response.status}): ${await response.text()}`);
          break;
        }

        const data = await response.json();
        const bars = data.bars || {};
        let pageBars = 0;
        for (const [sym, barList] of Object.entries(bars)) {
          if (!symbolBars[sym]) symbolBars[sym] = [];
          symbolBars[sym].push(...barList);
          pageBars += barList.length;
        }
        pageToken = data.next_page_token || null;
        pageCount++;

        const totalBars = Object.values(symbolBars).reduce((sum, b) => sum + b.length, 0);
        process.stdout.write(`\r    Batch ${Math.floor(i / ALPACA_BATCH_SIZE) + 1}: page ${pageCount}, ${totalBars.toLocaleString()} bars fetched...`);
      } while (pageToken);

      process.stdout.write('\n');

      for (const [alpacaSym, bars] of Object.entries(symbolBars)) {
        const originalSym = isCrypto ? fromAlpacaCryptoSymbol(alpacaSym) : fromAlpacaStockSymbol(alpacaSym);
        if (bars.length > 0) {
          allBars[originalSym] = parseAlpacaBars(bars);
        }
      }
    } catch (error) {
      console.error(`  Alpaca batch fetch error:`, error.message);
    }

    if (i + ALPACA_BATCH_SIZE < alpacaSymbols.length) {
      await new Promise(r => setTimeout(r, ALPACA_BATCH_DELAY_MS));
    }
  }

  return allBars;
}

async function fetchAlpacaAllData(symbols) {
  const stockSymbols = symbols.filter(s => !isCryptoSymbol(s) && !isForexOrFutures(s));
  const cryptoSymbols = symbols.filter(s => isCryptoSymbol(s));
  const days = BACKTEST_DAYS + 30; // extra for warmup/daily indicators

  console.log(`  Fetching Alpaca data: ${stockSymbols.length} stocks, ${cryptoSymbols.length} crypto, ${days} days`);

  const allIntraday = {};
  const allDaily = {};

  // Fetch sequentially to avoid rate limits
  if (stockSymbols.length > 0) {
    console.log('  Fetching stock 5-min bars...');
    const stockIntraday = await fetchAlpacaBars(stockSymbols, '5Min', days, false);
    Object.assign(allIntraday, stockIntraday);

    console.log('  Fetching stock daily bars...');
    const stockDaily = await fetchAlpacaBars(stockSymbols, '1Day', days, false);
    // Convert daily bars to date-only format
    for (const [sym, bars] of Object.entries(stockDaily)) {
      allDaily[sym] = bars.map(b => ({ ...b, date: b.date.split('T')[0] }));
    }
  }

  if (cryptoSymbols.length > 0) {
    console.log('  Fetching crypto 5-min bars...');
    const cryptoIntraday = await fetchAlpacaBars(cryptoSymbols, '5Min', days, true);
    Object.assign(allIntraday, cryptoIntraday);

    console.log('  Fetching crypto daily bars...');
    const cryptoDaily = await fetchAlpacaBars(cryptoSymbols, '1Day', days, true);
    for (const [sym, bars] of Object.entries(cryptoDaily)) {
      allDaily[sym] = bars.map(b => ({ ...b, date: b.date.split('T')[0] }));
    }
  }

  return { allIntraday, allDaily };
}

// ────────────────────────────────────────────
// Indicator Utilities (mirrors trading-bot.mjs)
// ────────────────────────────────────────────

function computeSMA(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < prices.length; i++) changes.push(prices[i] - prices[i - 1]);
  const recent = changes.slice(-period);
  const gains = recent.filter(c => c > 0);
  const losses = recent.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function computeMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod + signalPeriod) return null;
  const macdLine = [];
  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);
  let emaFast = prices.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
  let emaSlow = prices.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;
  for (let i = 1; i < prices.length; i++) {
    if (i >= fastPeriod) emaFast = prices[i] * kFast + emaFast * (1 - kFast);
    if (i >= slowPeriod) emaSlow = prices[i] * kSlow + emaSlow * (1 - kSlow);
    if (i >= slowPeriod) macdLine.push(emaFast - emaSlow);
  }
  if (macdLine.length < signalPeriod) return null;
  const kSig = 2 / (signalPeriod + 1);
  let signal = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdLine.length; i++) {
    signal = macdLine[i] * kSig + signal * (1 - kSig);
  }
  const macd = macdLine[macdLine.length - 1];
  let prevHistogram = null;
  if (macdLine.length >= 2) {
    let sig2 = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    for (let i = signalPeriod; i < macdLine.length - 1; i++) {
      sig2 = macdLine[i] * kSig + sig2 * (1 - kSig);
    }
    prevHistogram = macdLine[macdLine.length - 2] - sig2;
  }
  return { macd, signal, histogram: macd - signal, prevHistogram };
}

function computeBollingerBands(prices, period = 20, mult = 2) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: mean + mult * stdDev, middle: mean, lower: mean - mult * stdDev, stdDev, width: (2 * mult * stdDev) / mean };
}

function computeATR(highs, lows, closes, period = 14) {
  if (highs.length < period + 1) return null;
  let atrSum = 0;
  const start = Math.max(1, highs.length - period);
  for (let i = start; i < highs.length; i++) {
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    atrSum += tr;
  }
  return atrSum / Math.min(period, highs.length - 1);
}

function computeADX(highs, lows, closes, period = 14) {
  if (highs.length < period * 2 + 1) return null;
  const plusDM = [], minusDM = [], tr = [];
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  const dx = [];
  for (let i = period; i < plusDM.length; i++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    smoothTR = smoothTR - smoothTR / period + tr[i];
    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diSum = plusDI + minusDI;
    dx.push(diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0);
  }
  if (dx.length < period) return null;
  let adx = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dx.length; i++) adx = (adx * (period - 1) + dx[i]) / period;
  return adx;
}

function computeROC(prices, period) {
  if (prices.length <= period) return null;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return past !== 0 ? ((current - past) / past) * 100 : 0;
}

// ────────────────────────────────────────────
// Regime Detection + Strategy Functions
// ────────────────────────────────────────────

function detectRegime(dailyCloses, dailyHighs, dailyLows) {
  if (dailyCloses.length < 60) return 'UNKNOWN';
  const adx = computeADX(dailyHighs, dailyLows, dailyCloses, 14);
  if (adx === null) return 'UNKNOWN';
  const sma20 = computeSMA(dailyCloses, 20);
  const sma50 = computeSMA(dailyCloses, 50);
  if (sma20 === null || sma50 === null) return 'UNKNOWN';
  if (adx > 25) return sma20 > sma50 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  return 'RANGE_BOUND';
}

function trendMomentumStrategy(dailyCloses) {
  if (dailyCloses.length < 50) return { name: 'Trend Momentum', score: 0, confidence: 0, reason: 'Insufficient data' };
  let score = 0;
  const sma10 = computeSMA(dailyCloses, 10);
  const sma20 = computeSMA(dailyCloses, 20);
  const sma50 = computeSMA(dailyCloses, 50);
  const price = dailyCloses[dailyCloses.length - 1];
  if (sma10 > sma20 && sma20 > sma50) score += 0.4;
  else if (sma10 < sma20 && sma20 < sma50) score -= 0.4;
  else if (sma10 > sma20) score += 0.15;
  else if (sma10 < sma20) score -= 0.15;
  const roc20 = computeROC(dailyCloses, 20);
  if (roc20 !== null) {
    if (roc20 > 10) score += 0.3;
    else if (roc20 > 3) score += 0.15;
    else if (roc20 < -10) score -= 0.3;
    else if (roc20 < -3) score -= 0.15;
  }
  const high50 = Math.max(...dailyCloses.slice(-50));
  const low50 = Math.min(...dailyCloses.slice(-50));
  if (price >= high50 * 0.98) score += 0.2;
  else if (price <= low50 * 1.02) score -= 0.2;
  if (dailyCloses.length >= 25) {
    const sma20_5ago = computeSMA(dailyCloses.slice(0, -5), 20);
    if (sma20_5ago !== null && sma20 > sma20_5ago) score += 0.1;
    else if (sma20_5ago !== null && sma20 < sma20_5ago) score -= 0.1;
  }
  return { name: 'Trend Momentum', score: Math.max(-1, Math.min(1, score)), confidence: 0.7, reason: '' };
}

function macdTrendStrategy(intradayCloses) {
  if (intradayCloses.length < 40) return { name: 'MACD Trend', score: 0, confidence: 0, reason: 'Insufficient data' };
  const macd = computeMACD(intradayCloses);
  if (!macd) return { name: 'MACD Trend', score: 0, confidence: 0, reason: 'Cannot compute' };
  let score = 0;
  if (macd.histogram > 0) score += 0.3; else score -= 0.3;
  if (macd.prevHistogram !== null) {
    const slope = macd.histogram - macd.prevHistogram;
    if (slope > 0 && macd.histogram > 0) score += 0.25;
    else if (slope < 0 && macd.histogram < 0) score -= 0.25;
    else if (slope > 0 && macd.histogram < 0) score += 0.15;
    else if (slope < 0 && macd.histogram > 0) score -= 0.15;
  }
  if (macd.macd > macd.signal) score += 0.2; else score -= 0.2;
  return { name: 'MACD Trend', score: Math.max(-1, Math.min(1, score)), confidence: 0.6, reason: '' };
}

function bollingerRSIReversionStrategy(intradayCloses) {
  if (intradayCloses.length < 25) return { name: 'BB+RSI Reversion', score: 0, confidence: 0, reason: 'Insufficient data' };
  const bb = computeBollingerBands(intradayCloses, 20, 2);
  const rsi = computeRSI(intradayCloses, 14);
  if (!bb) return { name: 'BB+RSI Reversion', score: 0, confidence: 0, reason: 'Cannot compute' };
  if (bb.width < 0.01) return { name: 'BB+RSI Reversion', score: 0, confidence: 0.3, reason: 'BB too narrow' };
  const price = intradayCloses[intradayCloses.length - 1];
  let score = 0;
  if (price < bb.lower) {
    score += 0.5;
    if (rsi < 30) score += 0.3;
    else if (rsi < 40) score += 0.15;
  } else if (price > bb.upper) {
    score -= 0.5;
    if (rsi > 70) score -= 0.3;
    else if (rsi > 60) score -= 0.15;
  } else {
    const position = (price - bb.lower) / (bb.upper - bb.lower);
    if (position < 0.2) score += 0.2;
    else if (position > 0.8) score -= 0.2;
  }
  return { name: 'BB+RSI Reversion', score: Math.max(-1, Math.min(1, score)), confidence: 0.7, reason: '' };
}

function vwapReversionStrategy(sessionBars) {
  if (!sessionBars || sessionBars.length < 6) return { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'Insufficient data' };
  let cumVolPrice = 0, cumVol = 0;
  for (const bar of sessionBars) {
    const tp = (bar.high + bar.low + bar.close) / 3;
    cumVolPrice += tp * bar.volume;
    cumVol += bar.volume;
  }
  if (cumVol === 0) return { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'No volume' };
  const vwap = cumVolPrice / cumVol;
  const currentPrice = sessionBars[sessionBars.length - 1].close;
  const squaredDiffs = sessionBars.map(b => { const tp = (b.high + b.low + b.close) / 3; return Math.pow(tp - vwap, 2); });
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
  return { name: 'VWAP Reversion', score, confidence, reason: '' };
}

function weightedAvg(signals) {
  let totalWeight = 0, totalScore = 0;
  for (const s of signals) {
    if (s.confidence > 0) { totalScore += s.score * s.confidence; totalWeight += s.confidence; }
  }
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function combineSignals(trendSignals, reversionSignals, regime) {
  const weights = REGIME_WEIGHTS[regime] || REGIME_WEIGHTS.UNKNOWN;
  const trendScore = weightedAvg(trendSignals);
  const reversionScore = weightedAvg(reversionSignals);
  const combined = trendScore * weights.trend + reversionScore * weights.reversion;
  let recommendation;
  if (combined > 0.55) recommendation = 'STRONG_BUY';
  else if (combined > 0.35) recommendation = 'BUY';
  else if (combined < -0.55) recommendation = 'STRONG_SELL';
  else if (combined < -0.35) recommendation = 'SELL';
  else recommendation = 'HOLD';
  return { combined, recommendation };
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
  let totalTxCosts = 0;

  // Build a sorted timeline of all unique 5-min timestamps across all symbols
  const allTimestamps = new Set();
  for (const symbol of symbols) {
    const bars = allIntraday[symbol];
    if (!bars) continue;
    for (const bar of bars) allTimestamps.add(bar.date);
  }
  const sortedTimestamps = [...allTimestamps].sort();

  // Group timestamps by trading day
  const dayMap = new Map();
  for (const ts of sortedTimestamps) {
    const dayStr = ts.split('T')[0];
    if (!dayMap.has(dayStr)) dayMap.set(dayStr, []);
    dayMap.get(dayStr).push(ts);
  }

  const tradingDays = [...dayMap.keys()].sort();
  const startIdx = Math.max(0, tradingDays.length - BACKTEST_DAYS);
  const backtestDays = tradingDays.slice(startIdx);

  console.log(`  Trading days available: ${tradingDays.length}, backtest period: ${backtestDays.length} days`);
  console.log(`  Period: ${backtestDays[0]} to ${backtestDays[backtestDays.length - 1]}`);

  // Pre-compute daily data arrays for regime detection
  const dailyDataCache = {};
  for (const symbol of symbols) {
    const daily = allDaily[symbol];
    if (daily && daily.length > 0) {
      dailyDataCache[symbol] = {
        closes: daily.map(b => b.close),
        highs: daily.map(b => b.high),
        lows: daily.map(b => b.low),
      };
    }
  }

  let prevDayEndValue = config.initialCapital;

  for (const dayStr of backtestDays) {
    const dayTimestamps = dayMap.get(dayStr);
    if (!dayTimestamps || dayTimestamps.length < 6) continue;

    // Trade every TRADE_INTERVAL_BARS bars (every 1 hour)
    for (let barIdx = TRADE_INTERVAL_BARS; barIdx < dayTimestamps.length; barIdx += TRADE_INTERVAL_BARS) {
      const currentTs = dayTimestamps[barIdx];

      const allSignals = {};
      const priceCache = {};
      const atrCache = {};

      for (const symbol of symbols) {
        const bars = allIntraday[symbol];
        if (!bars) continue;

        const barsUpToNow = bars.filter(b => b.date <= currentTs);
        if (barsUpToNow.length < 12) continue;

        const sessionBars = barsUpToNow.filter(b => b.date.split('T')[0] === dayStr);
        if (sessionBars.length < 3) continue;

        const lastPrice = barsUpToNow[barsUpToNow.length - 1].close;
        priceCache[symbol] = lastPrice;

        const intradayCloses = barsUpToNow.slice(-80).map(b => b.close);
        const intradayHighs = barsUpToNow.slice(-80).map(b => b.high);
        const intradayLows = barsUpToNow.slice(-80).map(b => b.low);

        // Daily data for regime + trend strategy (up to simulated date)
        const dailyData = dailyDataCache[symbol];
        let dailyCloses = [], dailyHighs = [], dailyLows = [];
        if (dailyData) {
          // Use daily bars up to current sim date
          const daily = allDaily[symbol];
          const dailyUpToNow = daily.filter(b => b.date <= dayStr);
          dailyCloses = dailyUpToNow.map(b => b.close);
          dailyHighs = dailyUpToNow.map(b => b.high);
          dailyLows = dailyUpToNow.map(b => b.low);
        }

        // Detect regime from daily data
        const regime = detectRegime(dailyCloses, dailyHighs, dailyLows);

        // Group A — Trend-Following
        const trendMom = trendMomentumStrategy(dailyCloses);
        const macdTrend = macdTrendStrategy(intradayCloses);

        // Group B — Mean-Reversion
        const bbRsi = bollingerRSIReversionStrategy(intradayCloses);
        const vwap = vwapReversionStrategy(sessionBars);

        // Regime-weighted combination
        const { combined, recommendation } = combineSignals([trendMom, macdTrend], [bbRsi, vwap], regime);

        // ATR for position sizing
        const atr = computeATR(intradayHighs, intradayLows, intradayCloses, 14);
        if (atr) atrCache[symbol] = atr;

        allSignals[symbol] = { symbol, combined, recommendation };
      }

      // Update holdings — prices, high water marks, bars held
      for (const holding of portfolio.holdings) {
        const price = priceCache[holding.symbol];
        if (price) {
          holding.currentPrice = price;
          holding.marketValue = holding.shares * price;
          holding.gainLoss = (price - holding.avgCost) * holding.shares;
          holding.gainLossPercent = ((price - holding.avgCost) / holding.avgCost) * 100;
          holding.highWaterMark = Math.max(holding.highWaterMark || holding.avgCost, price);
        }
        holding.barsHeld = (holding.barsHeld || 0) + 1;
      }

      // Sell logic — ATR trailing stops + profit tiers + min hold
      for (const holding of [...portfolio.holdings]) {
        const signal = allSignals[holding.symbol];
        const price = priceCache[holding.symbol];
        if (!price) continue;

        const entryATR = holding.entryATR || atrCache[holding.symbol];
        const barsHeld = holding.barsHeld || 0;

        // ATR trailing stop always fires
        const hwm = holding.highWaterMark || holding.avgCost;
        const isTrailingStop = entryATR ? price <= hwm - config.atrStopMultiplier * entryATR : false;

        if (!isTrailingStop && barsHeld < config.minHoldBars) continue;

        let sellPercent = 0;
        if (isTrailingStop) {
          sellPercent = 1.0;
        } else if (!signal) {
          sellPercent = 1.0;
        } else if (signal.recommendation === 'STRONG_SELL') {
          sellPercent = 1.0;
        } else if (signal.recommendation === 'SELL') {
          sellPercent = 0.75;
        } else if (entryATR) {
          const gain = price - holding.avgCost;
          if (gain >= config.atrProfit2Multiplier * entryATR) sellPercent = 0.50;
          else if (gain >= config.atrProfit1Multiplier * entryATR) sellPercent = 0.25;
        }

        if (sellPercent > 0) {
          const sharesToSell = Math.round(holding.shares * sellPercent * 10000) / 10000 || holding.shares;
          const total = sharesToSell * price;
          const txCost = total * config.transactionCostBps / 10000;
          totalTxCosts += txCost;
          portfolio.cash += total - txCost;

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
        .filter(s => s.combined > config.buyThreshold && !portfolio.holdings.some(h => h.symbol === s.symbol))
        .length;

      if (strongBuyCandidates > 0 && (availableCash < config.minTradeValue || portfolio.holdings.length >= config.maxPositions)) {
        const holdingsWithSignals = portfolio.holdings
          .map(h => ({ holding: h, signal: allSignals[h.symbol] }))
          .filter(h => h.signal && (h.holding.barsHeld || 0) >= config.minHoldBars)
          .sort((a, b) => a.signal.combined - b.signal.combined);

        let rotated = 0;
        for (const { holding, signal } of holdingsWithSignals) {
          if (rotated >= 3) break;
          if (signal.combined >= config.buyThreshold) break;
          const price = priceCache[holding.symbol];
          if (!price) continue;
          const total = holding.shares * price;
          const txCost = total * config.transactionCostBps / 10000;
          totalTxCosts += txCost;
          portfolio.cash += total - txCost;
          portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
          rotated++;
          totalTrades++;
        }
      }

      // Buy logic — ATR position sizing, capped new positions
      const openSlots = config.maxPositions - portfolio.holdings.length;
      const buyCandidates = Object.values(allSignals)
        .filter(s => s.combined > config.buyThreshold && !portfolio.holdings.some(h => h.symbol === s.symbol))
        .sort((a, b) => b.combined - a.combined)
        .slice(0, Math.min(openSlots, config.maxNewPositionsPerCycle));

      if (buyCandidates.length > 0) {
        let cashAvail = Math.max(0, portfolio.cash - portfolio.totalValue * config.targetCashRatio);

        for (const signal of buyCandidates) {
          if (cashAvail < config.minTradeValue) break;
          const price = priceCache[signal.symbol];
          if (!price) continue;

          // ATR-based position sizing
          const atr = atrCache[signal.symbol];
          let shares;
          if (atr && atr > 0) {
            const riskAmount = portfolio.totalValue * config.riskPerTrade;
            const stopDistance = config.atrStopMultiplier * atr;
            shares = riskAmount / stopDistance;
            const maxShares = (portfolio.totalValue * config.maxPositionSize) / price;
            shares = Math.min(shares, maxShares);
          } else {
            shares = (portfolio.totalValue * config.maxPositionSize) / price;
          }
          shares = Math.round(shares * 10000) / 10000;
          let total = shares * price;
          if (total > cashAvail) {
            shares = Math.round((cashAvail / price) * 10000) / 10000;
            total = shares * price;
          }
          if (shares < 0.0001 || total < config.minTradeValue) continue;

          const txCost = total * config.transactionCostBps / 10000;
          totalTxCosts += txCost;
          portfolio.cash -= total + txCost;
          cashAvail -= total + txCost;
          portfolio.holdings.push({
            symbol: signal.symbol,
            shares,
            avgCost: price,
            currentPrice: price,
            marketValue: total,
            gainLoss: 0,
            gainLossPercent: 0,
            highWaterMark: price,
            entryATR: atr || null,
            barsHeld: 0,
          });
          totalTrades++;
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
      console.log(`  ${dayStr}: $${portfolio.totalValue.toFixed(0)} (${totalReturn}%) | Holdings: ${portfolio.holdings.length} | Trades: ${totalTrades}`);
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
    totalTxCosts,
  };
}

// ────────────────────────────────────────────
// Main
// ────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Regime-Adaptive Strategy Backtest');
  console.log(`  Period: ${BACKTEST_DAYS} days | Symbols: ${MAX_SYMBOLS} | Source: ${DATA_SOURCE}`);
  console.log(`  Trade interval: every ${TRADE_INTERVAL_BARS * 5} minutes | Tx cost: ${DEFAULT_CONFIG.transactionCostBps} bps/side`);
  console.log('═══════════════════════════════════════════════════════\n');

  const symbols = loadSymbols();
  console.log(`Loaded ${symbols.length} symbols (stratified sample)\n`);

  // Fetch data — use Alpaca for long periods, Yahoo for short
  let allIntraday, allDaily;

  if (DATA_SOURCE === 'alpaca') {
    console.log('Fetching data from Alpaca...');
    const data = await fetchAlpacaAllData(symbols);
    allIntraday = data.allIntraday;
    allDaily = data.allDaily;
  } else {
    console.log('Fetching 5-minute data from Yahoo Finance...');
    allIntraday = {};
    allDaily = {};
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
  }

  console.log(`\n  Got 5-min data for ${Object.keys(allIntraday).length} symbols\n`);

  const symbolsWithData = Object.keys(allIntraday);
  if (symbolsWithData.length < 10) {
    console.error('Too few symbols with data. Aborting.');
    process.exit(1);
  }

  // Sweep mode: fetch once, run all position-sizing configs
  if (args.sweep === 'true') {
    const sweepConfigs = [
      { maxPositions: 15, maxPositionSize: 0.07, buyThreshold: 0.25 },
      { maxPositions: 15, maxPositionSize: 0.07, buyThreshold: 0.35 },
      { maxPositions: 15, maxPositionSize: 0.07, buyThreshold: 0.45 },
      { maxPositions: 10, maxPositionSize: 0.10, buyThreshold: 0.35 },
      { maxPositions: 20, maxPositionSize: 0.05, buyThreshold: 0.35 },
      { maxPositions: 15, maxPositionSize: 0.07, buyThreshold: 0.35, atrStopMultiplier: 3 },
    ];

    console.log(`\n=== PARAMETER SWEEP: Regime-Adaptive Strategy (${BACKTEST_DAYS} days) ===\n`);

    for (const sc of sweepConfigs) {
      const config = { ...DEFAULT_CONFIG, ...sc };
      console.log(`--- maxPos=${sc.maxPositions} posSize=${sc.maxPositionSize} buyThr=${sc.buyThreshold} atrStop=${sc.atrStopMultiplier || DEFAULT_CONFIG.atrStopMultiplier} ---`);
      const result = runIntradayBacktest(allIntraday, allDaily, symbolsWithData, config);
      console.log(`  Total Return:    ${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(2)}%`);
      console.log(`  Final Value:     $${result.finalValue.toFixed(2)}`);
      console.log(`  Sharpe Ratio:    ${result.sharpe.toFixed(3)}`);
      console.log(`  Max Drawdown:    -${result.maxDrawdown.toFixed(2)}%`);
      console.log(`  Total Trades:    ${result.totalTrades}`);
      console.log(`  Win Rate:        ${result.winRate.toFixed(1)}%`);
      console.log(`  Tx Costs:        $${result.totalTxCosts.toFixed(2)}`);
      console.log('');
    }

    console.log('=== SWEEP COMPLETE ===\n');
    return;
  }

  // Single run mode
  console.log('Running intraday strategy simulation...');
  const intradayResult = runIntradayBacktest(allIntraday, allDaily, symbolsWithData, DEFAULT_CONFIG);

  // Print results
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  REGIME-ADAPTIVE STRATEGY RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total Return:    ${intradayResult.totalReturn >= 0 ? '+' : ''}${intradayResult.totalReturn.toFixed(2)}%`);
  console.log(`  Final Value:     $${intradayResult.finalValue.toFixed(2)}`);
  console.log(`  Sharpe Ratio:    ${intradayResult.sharpe.toFixed(3)}`);
  console.log(`  Max Drawdown:    -${intradayResult.maxDrawdown.toFixed(2)}%`);
  console.log(`  Total Trades:    ${intradayResult.totalTrades}`);
  console.log(`  Win Rate:        ${intradayResult.winRate.toFixed(1)}%`);
  console.log(`  Wins/Losses:     ${intradayResult.winTrades}/${intradayResult.lossTrades}`);
  console.log(`  Tx Costs:        $${intradayResult.totalTxCosts.toFixed(2)}`);

  // Print daily returns
  console.log('\n  Daily Portfolio Value:');
  const dr = intradayResult.dailyReturns;
  const step = dr.length > 60 ? Math.ceil(dr.length / 30) : 2; // show ~30 rows max
  for (let i = 0; i < dr.length; i += step) {
    const d = dr[i];
    const ret = ((d.value - DEFAULT_CONFIG.initialCapital) / DEFAULT_CONFIG.initialCapital * 100);
    const bar = '='.repeat(Math.min(30, Math.abs(Math.round(ret))));
    console.log(`  ${d.date}  $${d.value.toFixed(0).padStart(6)}  ${ret >= 0 ? '+' : ''}${ret.toFixed(1).padStart(6)}% ${bar}`);
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
