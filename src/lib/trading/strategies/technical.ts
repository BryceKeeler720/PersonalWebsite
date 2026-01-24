import { calculateMACD, calculateRSI, calculateSMA } from '../indicators';
import type { StrategySignal, OHLCV } from '../../../components/trading/types';

/**
 * Technical Indicators Strategy
 * Combines MACD, RSI, and volume analysis for trading signals.
 *
 * Signals:
 * - MACD crossover (bullish/bearish)
 * - MACD histogram momentum
 * - RSI divergence
 * - Volume confirmation
 */
export function calculateTechnicalSignal(data: OHLCV[]): StrategySignal {
  if (data.length < 30) {
    return {
      name: 'Technical',
      score: 0,
      confidence: 0.1,
      reason: 'Insufficient data for technical analysis',
    };
  }

  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);

  // MACD
  const { macd, signal, histogram } = calculateMACD(closes, 12, 26, 9);

  if (macd.length < 2 || signal.length < 2 || histogram.length < 2) {
    return {
      name: 'Technical',
      score: 0,
      confidence: 0.1,
      reason: 'Unable to calculate MACD',
    };
  }

  const currentMacd = macd[macd.length - 1];
  const currentSignal = signal[signal.length - 1];
  const currentHistogram = histogram[histogram.length - 1];
  const prevHistogram = histogram[histogram.length - 2];

  // RSI
  const rsi = calculateRSI(closes, 14);
  const currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : 50;

  // Volume analysis
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;

  let score = 0;
  const reasons: string[] = [];

  // 1. MACD Crossover Signal (-0.35 to +0.35)
  if (currentMacd > currentSignal) {
    if (macd[macd.length - 2] <= signal[signal.length - 2]) {
      // Fresh bullish crossover
      score += 0.35;
      reasons.push('MACD bullish crossover');
    } else {
      // Already above
      score += 0.15;
      reasons.push('MACD above signal line');
    }
  } else {
    if (macd[macd.length - 2] >= signal[signal.length - 2]) {
      // Fresh bearish crossover
      score -= 0.35;
      reasons.push('MACD bearish crossover');
    } else {
      // Already below
      score -= 0.15;
      reasons.push('MACD below signal line');
    }
  }

  // 2. MACD Histogram Momentum (-0.2 to +0.2)
  if (currentHistogram > 0 && currentHistogram > prevHistogram) {
    score += 0.2;
    reasons.push('MACD histogram rising');
  } else if (currentHistogram < 0 && currentHistogram < prevHistogram) {
    score -= 0.2;
    reasons.push('MACD histogram falling');
  }

  // 3. RSI Signal (-0.25 to +0.25)
  if (currentRsi < 35) {
    score += 0.25;
    reasons.push(`RSI oversold (${currentRsi.toFixed(1)})`);
  } else if (currentRsi < 45) {
    score += 0.1;
  } else if (currentRsi > 65) {
    score -= 0.25;
    reasons.push(`RSI overbought (${currentRsi.toFixed(1)})`);
  } else if (currentRsi > 55) {
    score -= 0.1;
  }

  // 4. Volume Confirmation (multiplier)
  if (volumeRatio > 1.5) {
    // High volume confirms the signal
    score *= 1.2;
    reasons.push(`High volume (${(volumeRatio * 100).toFixed(0)}% of avg)`);
  } else if (volumeRatio < 0.5) {
    // Low volume weakens the signal
    score *= 0.8;
    reasons.push(`Low volume (${(volumeRatio * 100).toFixed(0)}% of avg)`);
  }

  // Clamp score
  score = Math.max(-1, Math.min(1, score));

  // Confidence based on signal agreement
  let confidence = 0.6;
  const signalCount = reasons.length;
  if (signalCount >= 4) confidence = 0.85;
  else if (signalCount >= 3) confidence = 0.75;
  else if (signalCount >= 2) confidence = 0.65;

  return {
    name: 'Technical',
    score,
    confidence,
    reason: reasons.join('; ') || 'Neutral technical indicators',
  };
}
