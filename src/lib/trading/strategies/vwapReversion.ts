import { calculateVWAP } from '../indicators';
import type { StrategySignal, OHLCV } from '../../../components/trading/types';

/**
 * VWAP Reversion Strategy
 * Uses Volume Weighted Average Price with Z-score to measure deviation from fair value.
 *
 * Signals:
 * - Z-score below -2: strong buy (price significantly below fair value)
 * - Z-score above +2: strong sell (price significantly above fair value)
 * - Dynamic confidence: ranges from 0.30 to 0.80 based on deviation extremity
 */
export function calculateVWAPReversionSignal(data: OHLCV[]): StrategySignal {
  if (data.length < 20) {
    return {
      name: 'VWAP Reversion',
      score: 0,
      confidence: 0,
      reason: 'Insufficient data for VWAP analysis',
    };
  }

  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  const currentPrice = closes[closes.length - 1];

  // Calculate VWAP
  const vwap = calculateVWAP(highs, lows, closes, volumes);

  if (vwap === 0) {
    return {
      name: 'VWAP Reversion',
      score: 0,
      confidence: 0.2,
      reason: 'Unable to calculate VWAP (no volume data)',
    };
  }

  // Calculate standard deviation of closes from VWAP
  const deviations = closes.map(c => c - vwap);
  const meanDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const squaredDiffs = deviations.map(d => Math.pow(d - meanDeviation, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return {
      name: 'VWAP Reversion',
      score: 0,
      confidence: 0.3,
      reason: 'No price deviation from VWAP',
    };
  }

  // Calculate Z-score: how many standard deviations from VWAP
  const zScore = (currentPrice - vwap) / stdDev;

  // Generate signal based on Z-score
  let score = 0;
  let confidence = 0.3;
  const reasons: string[] = [];

  const absZ = Math.abs(zScore);
  const deviationPct = ((currentPrice - vwap) / vwap) * 100;

  if (zScore < -2) {
    // Strong buy signal - price significantly below fair value
    score = Math.min(1, 0.5 + (absZ - 2) * 0.25);
    confidence = Math.min(0.8, 0.5 + (absZ - 2) * 0.15);
    reasons.push(`Z-score ${zScore.toFixed(2)} (strongly oversold)`);
    reasons.push(`${Math.abs(deviationPct).toFixed(1)}% below VWAP`);
  } else if (zScore < -1) {
    // Moderate buy signal
    score = 0.3 + (absZ - 1) * 0.2;
    confidence = 0.4 + (absZ - 1) * 0.1;
    reasons.push(`Z-score ${zScore.toFixed(2)} (oversold)`);
    reasons.push(`${Math.abs(deviationPct).toFixed(1)}% below VWAP`);
  } else if (zScore > 2) {
    // Strong sell signal - price significantly above fair value
    score = Math.max(-1, -0.5 - (absZ - 2) * 0.25);
    confidence = Math.min(0.8, 0.5 + (absZ - 2) * 0.15);
    reasons.push(`Z-score +${zScore.toFixed(2)} (strongly overbought)`);
    reasons.push(`${deviationPct.toFixed(1)}% above VWAP`);
  } else if (zScore > 1) {
    // Moderate sell signal
    score = -0.3 - (absZ - 1) * 0.2;
    confidence = 0.4 + (absZ - 1) * 0.1;
    reasons.push(`Z-score +${zScore.toFixed(2)} (overbought)`);
    reasons.push(`${deviationPct.toFixed(1)}% above VWAP`);
  } else {
    // Near VWAP - neutral
    score = -zScore * 0.15; // Slight contrarian lean
    confidence = 0.3;
    reasons.push(`Z-score ${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)} (near fair value)`);
  }

  // Clamp score
  score = Math.max(-1, Math.min(1, score));

  return {
    name: 'VWAP Reversion',
    score,
    confidence,
    reason: reasons.join('; '),
  };
}
