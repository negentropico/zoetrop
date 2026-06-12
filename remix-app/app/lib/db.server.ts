// db.server.ts — Drizzle/Neon client + withTenantDb wrapper (Phase 7, D-01/D-02).
//
// D-01: Driver stays @neondatabase/serverless for Phase 7. The postgres-js swap is Phase 8
//       work if a host migration occurs (07-CONTEXT.md §D-01).
// D-02: GUC names are plain Postgres — app.tenant_id / app.subject_id / app.user_id.
//       Host-portable: no Supabase auth.jwt() dependency. Same SQL runs on Neon, RDS, or DO.
// D-11: App-layer authz (requireRole/assertSubjectAccess) is the first line; RLS is the DB
//       backstop. Both must agree. No app_user empty-claims guard in this wrapper — that
//       lives in the RLS policy predicate (Plan 02).

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
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

// ── Tenant-scoped DB access (Phase 7 — D-02 host-portable GUC RLS) ───────────
//
// TenantCtx: the three GUC values required for every tenant-scoped query.
// Sourced from the authenticated session: userId = better-auth user.id,
// tenantId = user.tenantId (from requireUser), subjectId = subject.id.
export interface TenantCtx {
  userId: string;
  tenantId: string;
  subjectId: string;
}

// TenantTx: the Drizzle transaction type passed to withTenantDb callbacks.
// Inferred from the transaction callback parameter so it stays in sync with the Drizzle version.
type TenantTx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

// withTenantDb — wraps fn in a Drizzle transaction that:
//   1. Issues SET LOCAL GUCs (transaction-scoped, non-leaking — 01-SPIKE-FINDINGS confirms
//      SET LOCAL does NOT leak across pooled connections; bare SET does).
//   2. Switches to the NOBYPASSRLS app_user role (provisioned in Plan 02 migration 0010).
//      neondb_owner silently bypasses RLS even with FORCE ROW LEVEL SECURITY
//      (01-SPIKE-FINDINGS line 24) — this switch is mandatory.
//   3. Calls fn(tx) and returns its value.
//   4. Rolls back automatically on error (Drizzle transaction default — no try/catch here).
//
// IMPORTANT: app_user role must exist before this wrapper is called with a live DB.
//   The role is created by migration 0010 (Plan 02). Until then, SET LOCAL ROLE app_user
//   will throw "role app_user does not exist" — the intended RED state for rls-isolation.test.ts.
export async function withTenantDb<T>(
  ctx: TenantCtx,
  fn: (tx: TenantTx) => Promise<T>
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    // SET LOCAL = transaction-local (3rd arg `true` = is_local).
    // A single statement issuing all three GUCs atomically (01-SPIKE-FINDINGS D-05).
    await tx.execute(
      sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true),
                 set_config('app.subject_id', ${ctx.subjectId}, true),
                 set_config('app.user_id', ${ctx.userId}, true)`
    );
    // Switch to NOBYPASSRLS role. Created by Plan 02 migration 0010.
    await tx.execute(sql`SET LOCAL ROLE app_user`);
    return fn(tx);
  });
}

// Named export for convenience
export const db = {
  get instance() {
    return getDb();
  },
};

// Re-export schema for convenience
export { schema };
