// Technical Indicator Calculations

/**
 * Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];

  const sma: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];

  const multiplier = 2 / (period + 1);

  // Start with SMA for first EMA value
  const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const ema: number[] = [firstSMA];

  for (let i = period; i < prices.length; i++) {
    const newEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(newEMA);
  }

  return ema;
}

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [];

  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const gains = changes.map(c => (c > 0 ? c : 0));
  const losses = changes.map(c => (c < 0 ? -c : 0));

  // Calculate initial average gains/losses
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rsi: number[] = [];

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);

  if (emaSlow.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }

  // Align the EMAs (fast EMA starts earlier)
  const offset = slowPeriod - fastPeriod;
  const macd = emaFast.slice(offset).map((fast, i) => fast - emaSlow[i]);

  if (macd.length < signalPeriod) {
    return { macd, signal: [], histogram: [] };
  }

  const signal = calculateEMA(macd, signalPeriod);

  // Align MACD and signal for histogram
  const macdForHistogram = macd.slice(signalPeriod - 1);
  const histogram = macdForHistogram.map((m, i) => m - signal[i]);

  return { macd, signal, histogram };
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(prices, period);

  if (middle.length === 0) {
    return { upper: [], middle: [], lower: [] };
  }

  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = middle[i - period + 1];
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    upper.push(mean + stdDevMultiplier * std);
    lower.push(mean - stdDevMultiplier * std);
  }

  return { upper, middle, lower };
}

/**
 * Standard Deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Z-Score
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Average True Range (ATR) - for volatility
 */
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] {
  if (highs.length < 2 || highs.length !== lows.length || highs.length !== closes.length) {
    return [];
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i - 1]);
    const lowClose = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(highLow, highClose, lowClose));
  }

  // Use EMA for ATR
  return calculateEMA(trueRanges, period);
}

/**
 * Volume Weighted Average Price (VWAP) - simplified daily
 */
export function calculateVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number {
  if (highs.length === 0) return 0;

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < highs.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    cumulativeTPV += typicalPrice * volumes[i];
    cumulativeVolume += volumes[i];
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
}
