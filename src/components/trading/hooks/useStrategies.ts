import { useState, useCallback } from 'react';
import type { SignalSnapshot, HistoricalData, StrategyWeights } from '../types';
import { calculateMomentumSignal } from '../../../lib/trading/strategies/momentum';
import { calculateMeanReversionSignal } from '../../../lib/trading/strategies/meanReversion';
import { calculateSentimentSignal, generateMockNews } from '../../../lib/trading/strategies/sentiment';
import { calculateTechnicalSignal } from '../../../lib/trading/strategies/technical';
import { combineSignals, DEFAULT_WEIGHTS } from '../../../lib/trading/signalCombiner';

/**
 * Custom hook for calculating trading strategy signals
 */
export function useStrategies(weights: StrategyWeights = DEFAULT_WEIGHTS) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [signals, setSignals] = useState<Map<string, SignalSnapshot>>(new Map());

  /**
   * Analyze a single stock and calculate combined signal
   */
  const analyzeStock = useCallback(
    async (symbol: string, historicalData: HistoricalData): Promise<SignalSnapshot> => {
      const data = historicalData.data;

      // Calculate each strategy signal
      const momentum = calculateMomentumSignal(data);
      const meanReversion = calculateMeanReversionSignal(data);
      const technical = calculateTechnicalSignal(data);

      // For sentiment, use mock news (in production, fetch real news)
      const mockNews = generateMockNews(symbol);
      const sentiment = calculateSentimentSignal(mockNews);

      // Combine all signals
      const combined = combineSignals(symbol, momentum, meanReversion, sentiment, technical, weights);

      return combined;
    },
    [weights]
  );

  /**
   * Analyze multiple stocks in parallel
   */
  const analyzeStocks = useCallback(
    async (
      symbols: string[],
      fetchHistorical: (symbol: string) => Promise<HistoricalData | null>
    ): Promise<Map<string, SignalSnapshot>> => {
      setIsAnalyzing(true);
      const newSignals = new Map<string, SignalSnapshot>();

      try {
        // Process in batches of 5 to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < symbols.length; i += batchSize) {
          const batch = symbols.slice(i, i + batchSize);

          const results = await Promise.all(
            batch.map(async symbol => {
              try {
                const historicalData = await fetchHistorical(symbol);
                if (!historicalData) return null;

                const signal = await analyzeStock(symbol, historicalData);
                return { symbol, signal };
              } catch (error) {
                console.error(`Error analyzing ${symbol}:`, error);
                return null;
              }
            })
          );

          results.forEach(result => {
            if (result) {
              newSignals.set(result.symbol, result.signal);
            }
          });

          // Small delay between batches
          if (i + batchSize < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        setSignals(newSignals);
      } finally {
        setIsAnalyzing(false);
      }

      return newSignals;
    },
    [analyzeStock]
  );

  /**
   * Get top buy candidates sorted by combined score
   */
  const getTopBuyCandidates = useCallback(
    (limit: number = 5): SignalSnapshot[] => {
      return Array.from(signals.values())
        .filter(s => s.recommendation === 'BUY' || s.recommendation === 'STRONG_BUY')
        .sort((a, b) => b.combined - a.combined)
        .slice(0, limit);
    },
    [signals]
  );

  /**
   * Get top sell candidates sorted by combined score
   */
  const getTopSellCandidates = useCallback(
    (limit: number = 5): SignalSnapshot[] => {
      return Array.from(signals.values())
        .filter(s => s.recommendation === 'SELL' || s.recommendation === 'STRONG_SELL')
        .sort((a, b) => a.combined - b.combined)
        .slice(0, limit);
    },
    [signals]
  );

  /**
   * Get signal for a specific symbol
   */
  const getSignal = useCallback(
    (symbol: string): SignalSnapshot | undefined => {
      return signals.get(symbol);
    },
    [signals]
  );

  /**
   * Clear all signals
   */
  const clearSignals = useCallback(() => {
    setSignals(new Map());
  }, []);

  return {
    signals,
    isAnalyzing,
    analyzeStock,
    analyzeStocks,
    getTopBuyCandidates,
    getTopSellCandidates,
    getSignal,
    clearSignals,
  };
}
