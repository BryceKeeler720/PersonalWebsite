import type { APIRoute } from 'astro';
import {
  getPortfolio,
  getTrades,
  getSignals,
  getLastRun,
  getPortfolioHistory,
} from '../../../lib/trading/serverStorage';

interface BenchmarkPoint {
  timestamp: string;
  value: number;
}

async function fetchSPYBenchmark(startDate: string): Promise<BenchmarkPoint[]> {
  try {
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(Date.now() / 1000);

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${start}&period2=${end}&interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Yahoo Finance API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
      console.error('Invalid Yahoo Finance response structure');
      return [];
    }

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const firstValidClose = closes.find((c: number | null) => c !== null) || closes[0];

    return timestamps
      .map((ts: number, i: number) => ({
        timestamp: new Date(ts * 1000).toISOString(),
        value: closes[i] !== null ? (closes[i] / firstValidClose) * 10000 : null,
      }))
      .filter((p: BenchmarkPoint | { value: null }) => p.value !== null);
  } catch (error) {
    console.error('Error fetching SPY benchmark:', error);
    return [];
  }
}

export const GET: APIRoute = async () => {
  try {
    const [portfolio, trades, signals, lastRun, history] = await Promise.all([
      getPortfolio(),
      getTrades(),
      getSignals(),
      getLastRun(),
      getPortfolioHistory(),
    ]);

    const benchmarkStart = history.length > 0
      ? history[0].timestamp
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const spyBenchmark = await fetchSPYBenchmark(benchmarkStart);

    return new Response(
      JSON.stringify({
        portfolio,
        trades,
        signals,
        lastRun,
        history,
        spyBenchmark,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching trading data:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch trading data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const prerender = false;
