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

    // Append a live snapshot so the chart updates every poll (every ~60s)
    const now = new Date();
    const liveHistory = [...history];
    const lastSnapshot = liveHistory[liveHistory.length - 1];
    const lastSnapshotAge = lastSnapshot
      ? now.getTime() - new Date(lastSnapshot.timestamp).getTime()
      : Infinity;

    if (lastSnapshotAge > 30000 && portfolio && portfolio.totalValue > 0) {
      liveHistory.push({
        timestamp: now.toISOString(),
        totalValue: portfolio.totalValue,
      });
    }

    return new Response(
      JSON.stringify({
        portfolio,
        trades,
        signals,
        lastRun,
        history: liveHistory,
        spyBenchmark,
        timestamp: now.toISOString(),
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
