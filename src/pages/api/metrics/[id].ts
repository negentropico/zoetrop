/**
 * Single Metric API Endpoint
 *
 * GET /api/metrics/[id] - Get metric by ID
 * DELETE /api/metrics/[id] - Delete metric by ID
 */

import type { APIRoute } from 'astro';
import { SQLiteAdapter } from '@/lib/storage/sqlite';

export const prerender = false;

const DB_PATH = 'data/wellness.db';

function getAdapter(): SQLiteAdapter {
  return new SQLiteAdapter(DB_PATH);
}

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({
      error: { code: 'VALIDATION_ERROR', message: 'Metric ID required' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adapter = getAdapter();

  try {
    await adapter.initialize();
    const result = await adapter.getMetricById(id);
    adapter.close();

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!result.data) {
      return new Response(JSON.stringify({
        error: { code: 'NOT_FOUND', message: `Metric ${id} not found` },
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result.data), {
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

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({
      error: { code: 'VALIDATION_ERROR', message: 'Metric ID required' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adapter = getAdapter();

  try {
    await adapter.initialize();
    const result = await adapter.deleteMetric(id);
    adapter.close();

    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return new Response(JSON.stringify({ error: result.error }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ deleted: true, id }), {
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
