import { calculateBollingerBands, calculateRSI } from '../indicators';
import type { StrategySignal, OHLCV } from '../../../components/trading/types';

/**
 * BB+RSI Reversion Strategy
 * Combines Bollinger Bands with RSI-14 for mean reversion signals.
 *
 * Signals:
 * - Price below lower Bollinger Band + RSI oversold = strong buy
 * - Price above upper Bollinger Band + RSI overbought = strong sell
 * - Bandwidth filter: skip if bands are too narrow (no reversion edge)
 */
export function calculateMeanReversionSignal(data: OHLCV[]): StrategySignal {
  if (data.length < 25) {
    return {
      name: 'BB+RSI Reversion',
      score: 0,
      confidence: 0,
      reason: 'Insufficient data for BB+RSI analysis',
    };
  }

  const closes = data.map(d => d.close);
  const currentPrice = closes[closes.length - 1];

  // Bollinger Bands (20-period, 2 std dev)
  const bb = calculateBollingerBands(closes, 20, 2);

  if (bb.upper.length === 0 || bb.lower.length === 0) {
    return {
      name: 'BB+RSI Reversion',
      score: 0,
      confidence: 0,
      reason: 'Unable to calculate Bollinger Bands',
    };
  }

  const upperBand = bb.upper[bb.upper.length - 1];
  const lowerBand = bb.lower[bb.lower.length - 1];
  const middleBand = bb.middle[bb.middle.length - 1];

  // Bandwidth filter: skip if bands are too narrow (no mean to revert to)
  const bandWidth = (upperBand - lowerBand) / middleBand;
  if (bandWidth < 0.01) {
    return {
      name: 'BB+RSI Reversion',
      score: 0,
      confidence: 0.3,
      reason: 'BB too narrow — no reversion edge',
    };
  }

  // RSI-14
  const rsiValues = calculateRSI(closes, 14);
  const rsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50;

  let score = 0;
  const reasons: string[] = [];

  // Price relative to Bollinger Bands
  if (currentPrice < lowerBand) {
    score += 0.5;
    reasons.push('Below lower BB');
    if (rsi < 30) {
      score += 0.3;
      reasons.push(`RSI oversold (${rsi.toFixed(0)})`);
    } else if (rsi < 40) {
      score += 0.15;
      reasons.push(`RSI low (${rsi.toFixed(0)})`);
    }
  } else if (currentPrice > upperBand) {
    score -= 0.5;
    reasons.push('Above upper BB');
    if (rsi > 70) {
      score -= 0.3;
      reasons.push(`RSI overbought (${rsi.toFixed(0)})`);
    } else if (rsi > 60) {
      score -= 0.15;
      reasons.push(`RSI high (${rsi.toFixed(0)})`);
    }
  } else {
    // Inside bands — weaker signal based on position
    const bbRange = upperBand - lowerBand;
    const position = (currentPrice - lowerBand) / bbRange;
    if (position < 0.2) {
      score += 0.2;
      reasons.push('Near lower BB');
    } else if (position > 0.8) {
      score -= 0.2;
      reasons.push('Near upper BB');
    } else {
      reasons.push('Mid-band');
    }
  }

  // Clamp score
  score = Math.max(-1, Math.min(1, score));

  // Confidence based on signal strength
  const confidence = Math.abs(score) > 0.5 ? 0.8 : Math.abs(score) > 0.2 ? 0.7 : 0.5;

  return {
    name: 'BB+RSI Reversion',
    score,
    confidence,
    reason: reasons.join('; '),
  };
}
