import type { APIRoute } from 'astro';

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com';

export const GET: APIRoute = async ({ params, request }) => {
  const path = params.path || '';
  const url = new URL(request.url);
  const queryString = url.search;

  // Construct the Yahoo Finance URL
  const targetUrl = `${YAHOO_BASE_URL}/${path}${queryString}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: 'Yahoo Finance API error',
          status: response.status,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('Yahoo Finance proxy error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch from Yahoo Finance',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const prerender = false;
