import type { APIRoute } from 'astro';
import {
  getPortfolio,
  getTrades,
  getSignals,
  getLastRun,
  getPortfolioHistory,
} from '../../../lib/trading/serverStorage';

export const GET: APIRoute = async () => {
  try {
    const [portfolio, trades, signals, lastRun, history] = await Promise.all([
      getPortfolio(),
      getTrades(),
      getSignals(),
      getLastRun(),
      getPortfolioHistory(),
    ]);

    return new Response(
      JSON.stringify({
        portfolio,
        trades,
        signals,
        lastRun,
        history,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // Cache for 1 minute
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
