import type { APIRoute } from 'astro';
import {
  getPortfolio,
  getTrades,
  getSignals,
  getLastRun,
  getPortfolioHistory,
  getSPYBenchmark,
} from '../../../lib/trading/serverStorage';

export const GET: APIRoute = async () => {
  try {
    const [portfolio, trades, signals, lastRun, history, spyBenchmark] = await Promise.all([
      getPortfolio(),
      getTrades(),
      getSignals(),
      getLastRun(),
      getPortfolioHistory(),
      getSPYBenchmark(),
    ]);

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
