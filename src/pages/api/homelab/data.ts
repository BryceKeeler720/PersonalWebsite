import type { APIRoute } from 'astro';
import { getHomelabLatest, getHomelabHistory } from '../../../lib/homelab/serverStorage';

export const GET: APIRoute = async () => {
  try {
    const [latest, history] = await Promise.all([
      getHomelabLatest(),
      getHomelabHistory(),
    ]);

    return new Response(
      JSON.stringify({
        latest,
        history,
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
    console.error('Error fetching homelab data:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch homelab data',
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
