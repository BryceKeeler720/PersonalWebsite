import type { APIRoute } from 'astro';
import { getSignals, getMetrics } from '../../../lib/trading/serverStorage';

export const GET: APIRoute = async () => {
  try {
    const [signals, metrics] = await Promise.all([
      getSignals(),
      getMetrics(),
    ]);

    return new Response(
      JSON.stringify({
        signals,
        metrics,
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
    console.error('Error fetching market data:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch market data',
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
