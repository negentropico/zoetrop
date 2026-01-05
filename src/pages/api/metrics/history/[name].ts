/**
 * Metric History API Endpoint
 *
 * GET /api/metrics/history/[name] - Get all readings for a metric by name
 */

import type { APIRoute } from 'astro';
import { SQLiteAdapter } from '@/lib/storage/sqlite';

export const prerender = false;

const DB_PATH = 'data/wellness.db';

export const GET: APIRoute = async ({ params }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({
      error: { code: 'VALIDATION_ERROR', message: 'Metric name required' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adapter = new SQLiteAdapter(DB_PATH);

  try {
    await adapter.initialize();
    const result = await adapter.getMetricHistory(decodeURIComponent(name));
    adapter.close();

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      name: decodeURIComponent(name),
      history: result.data,
      count: result.data?.length ?? 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    adapter.close();
    return new Response(JSON.stringify({
      error: { code: 'UNKNOWN', message: String(error) },
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
