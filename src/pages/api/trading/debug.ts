import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

export const GET: APIRoute = async () => {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    const redis = new Redis({
      url: url || '',
      token: token || '',
    });

    // Test write
    await redis.set('test:debug', { message: 'Hello from debug', timestamp: new Date().toISOString() });

    // Test read
    const result = await redis.get('test:debug');

    return new Response(
      JSON.stringify({
        success: true,
        envVarsSet: {
          url: !!url,
          token: !!token,
        },
        urlPreview: url ? url.substring(0, 20) + '...' : 'NOT SET',
        testWrite: 'OK',
        testRead: result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const prerender = false;
