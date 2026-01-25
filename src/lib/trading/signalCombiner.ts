import type { SignalSnapshot, StrategySignal, StrategyWeights } from '../../components/trading/types';

/**
 * Default strategy weights
 * Momentum and Technical get higher weights as they're more reliable
 * Sentiment gets lower weight due to simplified implementation
 */
export const DEFAULT_WEIGHTS: StrategyWeights = {
  momentum: 0.3,
  meanReversion: 0.25,
  sentiment: 0.15,
  technical: 0.3,
};

/**
 * Combine multiple strategy signals into a single trading signal
 *
 * The combination uses both score and confidence:
 * - Score indicates direction (-1 sell to +1 buy)
 * - Confidence weights how much we trust each signal
 *
 * Final score = weighted average of (score * confidence) / total confidence
 */
export function combineSignals(
  symbol: string,
  momentum: StrategySignal,
  meanReversion: StrategySignal,
  sentiment: StrategySignal,
  technical: StrategySignal,
  weights: StrategyWeights = DEFAULT_WEIGHTS
): SignalSnapshot {
  // Normalize weights to sum to 1
  const totalWeight = weights.momentum + weights.meanReversion + weights.sentiment + weights.technical;
  const normalizedWeights = {
    momentum: weights.momentum / totalWeight,
    meanReversion: weights.meanReversion / totalWeight,
    sentiment: weights.sentiment / totalWeight,
    technical: weights.technical / totalWeight,
  };

  // Calculate weighted score considering both weight and confidence
  const weightedScore =
    momentum.score * momentum.confidence * normalizedWeights.momentum +
    meanReversion.score * meanReversion.confidence * normalizedWeights.meanReversion +
    sentiment.score * sentiment.confidence * normalizedWeights.sentiment +
    technical.score * technical.confidence * normalizedWeights.technical;

  // Total confidence for normalization
  const totalConfidence =
    momentum.confidence * normalizedWeights.momentum +
    meanReversion.confidence * normalizedWeights.meanReversion +
    sentiment.confidence * normalizedWeights.sentiment +
    technical.confidence * normalizedWeights.technical;

  // Normalize by confidence to get final score
  const combined = totalConfidence > 0 ? weightedScore / totalConfidence : 0;

  // Determine recommendation based on combined score
  const recommendation = getRecommendation(combined);

  return {
    symbol,
    timestamp: new Date().toISOString(),
    momentum,
    meanReversion,
    sentiment,
    technical,
    combined,
    recommendation,
  };
}

/**
 * Get recommendation label from combined score
 */
export function getRecommendation(
  score: number
): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' {
  // Very low thresholds for high-frequency trading
  if (score > 0.25) return 'STRONG_BUY';
  if (score > 0.04) return 'BUY';
  if (score < -0.25) return 'STRONG_SELL';
  if (score < -0.04) return 'SELL';
  return 'HOLD';
}

/**
 * Get color for recommendation
 */
export function getRecommendationColor(
  recommendation: SignalSnapshot['recommendation']
): string {
  switch (recommendation) {
    case 'STRONG_BUY':
      return '#22c55e'; // green-500
    case 'BUY':
      return '#4ade80'; // green-400
    case 'HOLD':
      return '#94a3b8'; // slate-400
    case 'SELL':
      return '#f87171'; // red-400
    case 'STRONG_SELL':
      return '#ef4444'; // red-500
  }
}

/**
 * Check if signal suggests taking action
 */
export function shouldTrade(signal: SignalSnapshot, minScore: number = 0.25): boolean {
  return Math.abs(signal.combined) >= minScore;
}

/**
 * Calculate position size based on signal strength
 * Stronger signals = larger positions (up to max)
 */
export function calculatePositionSize(
  signal: SignalSnapshot,
  availableCash: number,
  maxPositionPercent: number = 0.2
): number {
  const baseSize = availableCash * maxPositionPercent;

  // Scale by signal strength (0.25 to 1.0 maps to 0.5x to 1.0x)
  const strengthMultiplier = 0.5 + Math.abs(signal.combined) * 0.5;

  return baseSize * strengthMultiplier;
}
