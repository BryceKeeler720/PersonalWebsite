import { calculateSMA, calculateEMA, calculateRSI } from '../indicators';
import type { StrategySignal, OHLCV } from '../../../components/trading/types';

/**
 * Momentum Strategy
 * Uses moving average crossovers and RSI to identify trend strength and direction.
 *
 * Signals:
 * - SMA20 above SMA50 = bullish trend
 * - Price above SMA20 = short-term momentum
 * - RSI < 30 = oversold (buy), RSI > 70 = overbought (sell)
 */
export function calculateMomentumSignal(data: OHLCV[]): StrategySignal {
  if (data.length < 50) {
    return {
      name: 'Momentum',
      score: 0,
      confidence: 0.1,
      reason: 'Insufficient data for momentum analysis',
    };
  }

  const closes = data.map(d => d.close);
  const currentPrice = closes[closes.length - 1];

  // Moving averages
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);

  if (sma20.length === 0 || sma50.length === 0) {
    return {
      name: 'Momentum',
      score: 0,
      confidence: 0.1,
      reason: 'Unable to calculate moving averages',
    };
  }

  const currentSma20 = sma20[sma20.length - 1];
  const currentSma50 = sma50[sma50.length - 1];

  // RSI
  const rsi = calculateRSI(closes, 14);
  const currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : 50;

  // Calculate component scores
  let score = 0;
  const reasons: string[] = [];

  // 1. Moving Average Crossover (-0.35 to +0.35)
  const maCrossoverRatio = (currentSma20 - currentSma50) / currentSma50;
  if (currentSma20 > currentSma50) {
    const maScore = Math.min(0.35, maCrossoverRatio * 10);
    score += maScore;
    reasons.push(`SMA20 > SMA50 (bullish trend)`);
  } else {
    const maScore = Math.max(-0.35, maCrossoverRatio * 10);
    score += maScore;
    reasons.push(`SMA20 < SMA50 (bearish trend)`);
  }

  // 2. Price vs SMA20 (-0.25 to +0.25)
  const priceVsSma20 = (currentPrice - currentSma20) / currentSma20;
  if (priceVsSma20 > 0.02) {
    score += Math.min(0.25, priceVsSma20 * 5);
    reasons.push(`Price ${(priceVsSma20 * 100).toFixed(1)}% above SMA20`);
  } else if (priceVsSma20 < -0.02) {
    score += Math.max(-0.25, priceVsSma20 * 5);
    reasons.push(`Price ${(Math.abs(priceVsSma20) * 100).toFixed(1)}% below SMA20`);
  }

  // 3. RSI Signal (-0.4 to +0.4)
  if (currentRsi < 30) {
    score += 0.4;
    reasons.push(`RSI oversold at ${currentRsi.toFixed(1)}`);
  } else if (currentRsi < 40) {
    score += 0.2;
    reasons.push(`RSI low at ${currentRsi.toFixed(1)}`);
  } else if (currentRsi > 70) {
    score -= 0.4;
    reasons.push(`RSI overbought at ${currentRsi.toFixed(1)}`);
  } else if (currentRsi > 60) {
    score -= 0.2;
    reasons.push(`RSI high at ${currentRsi.toFixed(1)}`);
  }

  // Clamp score to -1 to 1
  score = Math.max(-1, Math.min(1, score));

  // Confidence based on signal clarity and trend strength
  let confidence = 0.5;
  if (Math.abs(score) > 0.6) confidence = 0.85;
  else if (Math.abs(score) > 0.4) confidence = 0.7;
  else if (Math.abs(score) > 0.2) confidence = 0.55;

  return {
    name: 'Momentum',
    score,
    confidence,
    reason: reasons.join('; '),
  };
}
