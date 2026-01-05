/**
 * Metrics API Endpoint
 *
 * GET /api/metrics - List metrics with optional filtering
 * POST /api/metrics - Import metrics
 * DELETE /api/metrics - Clear all metrics (requires ?confirm=true)
 */

import type { APIRoute } from 'astro';
import { SQLiteAdapter } from '@/lib/storage/sqlite';
import type { MetricQuery } from '@/lib/storage/adapter';
import type { MetricCategory } from '@/types/metrics';

export const prerender = false;

const DB_PATH = 'data/wellness.db';

function getAdapter(): SQLiteAdapter {
  const adapter = new SQLiteAdapter(DB_PATH);
  return adapter;
}

export const GET: APIRoute = async ({ url }) => {
  const adapter = getAdapter();

  try {
    await adapter.initialize();

    // Parse query parameters
    const category = url.searchParams.get('category') as MetricCategory | null;
    const name = url.searchParams.get('name');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const query: MetricQuery = {};
    if (category) query.category = category;
    if (name) query.name = name;
    if (startDate) query.startDate = new Date(startDate);
    if (endDate) query.endDate = new Date(endDate);
    if (limit) query.limit = parseInt(limit, 10);
    if (offset) query.offset = parseInt(offset, 10);

    const result = await adapter.getMetrics(Object.keys(query).length > 0 ? query : undefined);
    adapter.close();

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      metrics: result.data,
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

export const POST: APIRoute = async ({ request }) => {
  const adapter = getAdapter();

  try {
    await adapter.initialize();

    const body = await request.json();
    const metrics = Array.isArray(body) ? body : body.metrics;

    if (!metrics || !Array.isArray(metrics)) {
      adapter.close();
      return new Response(JSON.stringify({
        error: { code: 'VALIDATION_ERROR', message: 'Request body must contain metrics array' },
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await adapter.importMetrics(metrics);
    adapter.close();

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      imported: result.data?.length ?? 0,
      metrics: result.data,
    }), {
      status: 201,
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

export const DELETE: APIRoute = async ({ url }) => {
  const confirm = url.searchParams.get('confirm') === 'true';

  if (!confirm) {
    return new Response(JSON.stringify({
      error: { code: 'VALIDATION_ERROR', message: 'Add ?confirm=true to delete all metrics' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adapter = getAdapter();

  try {
    await adapter.initialize();
    const result = await adapter.clearMetrics(true);
    adapter.close();

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ cleared: true }), {
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
