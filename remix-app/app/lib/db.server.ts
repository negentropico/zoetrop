import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../../db/schema';

// Lazy initialization for connection
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required. Set it in .env or Vercel environment variables.'
    );
  }

  _pool = new Pool({ connectionString });
  return _pool;
}

export function getDb() {
  if (_db) return _db;

  const pool = getPool();
  _db = drizzle(pool, { schema });
  return _db;
}

// Named export for convenience
export const db = {
  get instance() {
    return getDb();
  },
};

// Re-export schema for convenience
export { schema };
