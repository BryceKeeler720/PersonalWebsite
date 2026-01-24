import { calculateSMA, calculateBollingerBands, calculateZScore, calculateStdDev } from '../indicators';
import type { StrategySignal, OHLCV } from '../../../components/trading/types';

/**
 * Mean Reversion Strategy
 * Assumes prices will revert to their historical mean.
 *
 * Signals:
 * - Price below lower Bollinger Band = oversold (buy)
 * - Price above upper Bollinger Band = overbought (sell)
 * - Z-score indicates how far price has deviated from mean
 */
export function calculateMeanReversionSignal(data: OHLCV[]): StrategySignal {
  if (data.length < 50) {
    return {
      name: 'Mean Reversion',
      score: 0,
      confidence: 0.1,
      reason: 'Insufficient data for mean reversion analysis',
    };
  }

  const closes = data.map(d => d.close);
  const currentPrice = closes[closes.length - 1];

  // Bollinger Bands (20-day, 2 std dev)
  const bb = calculateBollingerBands(closes, 20, 2);

  if (bb.upper.length === 0 || bb.lower.length === 0) {
    return {
      name: 'Mean Reversion',
      score: 0,
      confidence: 0.1,
      reason: 'Unable to calculate Bollinger Bands',
    };
  }

  const upperBand = bb.upper[bb.upper.length - 1];
  const lowerBand = bb.lower[bb.lower.length - 1];
  const middleBand = bb.middle[bb.middle.length - 1];

  // Calculate Z-score from 50-day mean
  const sma50 = calculateSMA(closes, 50);
  const currentSma50 = sma50[sma50.length - 1];
  const recentCloses = closes.slice(-50);
  const stdDev = calculateStdDev(recentCloses);
  const zScore = calculateZScore(currentPrice, currentSma50, stdDev);

  let score = 0;
  const reasons: string[] = [];

  // 1. Bollinger Band Position (-0.5 to +0.5)
  const bandWidth = upperBand - lowerBand;
  const bbPosition = (currentPrice - lowerBand) / bandWidth; // 0 to 1

  if (currentPrice < lowerBand) {
    // Below lower band - strong buy signal
    const deviation = (lowerBand - currentPrice) / bandWidth;
    score += Math.min(0.5, 0.4 + deviation * 0.5);
    reasons.push(`Price below lower Bollinger Band (oversold)`);
  } else if (currentPrice > upperBand) {
    // Above upper band - strong sell signal
    const deviation = (currentPrice - upperBand) / bandWidth;
    score -= Math.min(0.5, 0.4 + deviation * 0.5);
    reasons.push(`Price above upper Bollinger Band (overbought)`);
  } else if (bbPosition < 0.25) {
    score += 0.25;
    reasons.push(`Price in lower 25% of Bollinger Bands`);
  } else if (bbPosition > 0.75) {
    score -= 0.25;
    reasons.push(`Price in upper 25% of Bollinger Bands`);
  }

  // 2. Z-Score Signal (-0.5 to +0.5)
  if (zScore < -2) {
    score += 0.5;
    reasons.push(`Z-score ${zScore.toFixed(2)} (significantly below mean)`);
  } else if (zScore < -1) {
    score += 0.25;
    reasons.push(`Z-score ${zScore.toFixed(2)} (below mean)`);
  } else if (zScore > 2) {
    score -= 0.5;
    reasons.push(`Z-score ${zScore.toFixed(2)} (significantly above mean)`);
  } else if (zScore > 1) {
    score -= 0.25;
    reasons.push(`Z-score ${zScore.toFixed(2)} (above mean)`);
  }

  // Clamp score
  score = Math.max(-1, Math.min(1, score));

  // Confidence based on deviation extremity
  let confidence = 0.5;
  if (Math.abs(zScore) > 2) confidence = 0.8;
  else if (Math.abs(zScore) > 1.5) confidence = 0.7;
  else if (Math.abs(zScore) > 1) confidence = 0.6;

  return {
    name: 'Mean Reversion',
    score,
    confidence,
    reason: reasons.join('; '),
  };
}
