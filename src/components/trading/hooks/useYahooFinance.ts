import { useState, useCallback } from 'react';
import type { StockQuote, HistoricalData, OHLCV } from '../types';

interface YahooQuoteResult {
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  regularMarketTime: number;
  symbol: string;
}

interface YahooChartResult {
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: number[];
      high: number[];
      low: number[];
      close: number[];
      volume: number[];
    }>;
  };
}

/**
 * Custom hook for fetching stock data from Yahoo Finance via API proxy
 */
export function useYahooFinance() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current quote for a single symbol
   */
  const fetchQuote = useCallback(async (symbol: string): Promise<StockQuote | null> => {
    try {
      const response = await fetch(`/api/yahoo/v8/finance/quote?symbols=${symbol}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch quote for ${symbol}`);
      }

      const data = await response.json();
      const result = data?.quoteResponse?.result?.[0] as YahooQuoteResult | undefined;

      if (!result) {
        throw new Error(`No data returned for ${symbol}`);
      }

      return {
        symbol: result.symbol,
        price: result.regularMarketPrice,
        change: result.regularMarketChange,
        changePercent: result.regularMarketChangePercent,
        volume: result.regularMarketVolume,
        high: result.regularMarketDayHigh,
        low: result.regularMarketDayLow,
        open: result.regularMarketOpen,
        previousClose: result.regularMarketPreviousClose,
        timestamp: result.regularMarketTime * 1000,
      };
    } catch (err) {
      console.error(`Error fetching quote for ${symbol}:`, err);
      return null;
    }
  }, []);

  /**
   * Fetch quotes for multiple symbols
   */
  const fetchBatchQuotes = useCallback(
    async (symbols: string[]): Promise<Map<string, StockQuote>> => {
      const quotes = new Map<string, StockQuote>();
      setIsLoading(true);
      setError(null);

      try {
        // Batch symbols in groups of 10 to avoid rate limiting
        const batches = [];
        for (let i = 0; i < symbols.length; i += 10) {
          batches.push(symbols.slice(i, i + 10));
        }

        for (const batch of batches) {
          const symbolsStr = batch.join(',');
          const response = await fetch(`/api/yahoo/v8/finance/quote?symbols=${symbolsStr}`);

          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          const results = data?.quoteResponse?.result as YahooQuoteResult[] | undefined;

          if (results) {
            results.forEach((result: YahooQuoteResult) => {
              quotes.set(result.symbol, {
                symbol: result.symbol,
                price: result.regularMarketPrice,
                change: result.regularMarketChange,
                changePercent: result.regularMarketChangePercent,
                volume: result.regularMarketVolume,
                high: result.regularMarketDayHigh,
                low: result.regularMarketDayLow,
                open: result.regularMarketOpen,
                previousClose: result.regularMarketPreviousClose,
                timestamp: result.regularMarketTime * 1000,
              });
            });
          }

          // Small delay between batches to avoid rate limiting
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quotes');
      } finally {
        setIsLoading(false);
      }

      return quotes;
    },
    []
  );

  /**
   * Fetch historical OHLCV data for a symbol
   */
  const fetchHistorical = useCallback(
    async (
      symbol: string,
      range: '1mo' | '3mo' | '6mo' | '1y' = '3mo',
      interval: '1d' | '1wk' = '1d'
    ): Promise<HistoricalData | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/yahoo/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch historical data for ${symbol}`);
        }

        const data = await response.json();
        const result = data?.chart?.result?.[0] as
          | { timestamp: number[]; indicators: YahooChartResult['indicators'] }
          | undefined;

        if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
          throw new Error(`No historical data returned for ${symbol}`);
        }

        const { timestamp, indicators } = result;
        const quote = indicators.quote[0];

        const ohlcvData: OHLCV[] = timestamp
          .map((ts: number, i: number) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            open: quote.open[i],
            high: quote.high[i],
            low: quote.low[i],
            close: quote.close[i],
            volume: quote.volume[i],
          }))
          .filter(
            (d: OHLCV) =>
              d.open !== null && d.high !== null && d.low !== null && d.close !== null
          );

        return {
          symbol,
          data: ohlcvData,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch historical data');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    fetchQuote,
    fetchBatchQuotes,
    fetchHistorical,
    isLoading,
    error,
  };
}
