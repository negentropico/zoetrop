# Phase 7: PHI Compliance Hardening — Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 10 new/modified files
**Analogs found:** 9 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `remix-app/app/lib/db.server.ts` | utility/config | request-response | self (existing file being modified) | exact |
| `remix-app/app/lib/withTenantDb.server.ts` | utility/middleware | request-response | `remix-app/app/lib/db.server.ts` (current pattern, inverted) | role-match |
| `remix-app/app/lib/data.server.ts` | service | CRUD | self (retrofit — 3 call-site swap) | exact |
| `remix-app/app/lib/consent.server.ts` | service | CRUD | self (retrofit — call-site swap) | exact |
| `remix-app/app/lib/audit.server.ts` | service | event-driven | self (retrofit — call-site swap + auth events) | exact |
| `remix-app/app/lib/authz.server.ts` | middleware/utility | request-response | self (AUTH-03 extension of `assertSubjectAccess`) | exact |
| `remix-app/db/schema.ts` | model | CRUD | self (`practitioner_subject_assignments` table addition) | exact |
| `remix-app/migrations/0010_rls_policies.sql` | migration | batch | `remix-app/migrations/0009_natural_night_thrasher.sql` | role-match |
| `remix-app/app/routes/_app/settings/assignments.tsx` | component/route | request-response | `remix-app/app/routes/_app/settings/index.tsx` | role-match |
| `remix-app/tests/db/rls-isolation.test.ts` | test | batch | `remix-app/tests/db/constraints.test.ts` | role-match |

---

## Pattern Assignments

### `remix-app/app/lib/db.server.ts` (config, request-response)

**Analog:** self — existing file, driver swap only

**Current imports pattern** (`remix-app/app/lib/db.server.ts` lines 1–3):
```typescript
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../../db/schema';
```

**Replace with** (per CONTEXT.md D-02 — stay on Neon, plain-GUC RLS; D-01 note: despite RESEARCH.md's Supabase framing, D-02 finalizes plain GUC `current_setting('app.tenant_id')` on Neon — driver stays Neon for Phase 7):
```typescript
// db.server.ts stays on @neondatabase/serverless for Phase 7 (D-01).
// The driver swap to postgres-js is Phase 8 work if a host migration occurs.
// Phase 7 only adds: withTenantDb exported from this file.
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../../db/schema';
```

**Core lazy-init pattern** (`remix-app/app/lib/db.server.ts` lines 6–30):
```typescript
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Set it in .env or Vercel environment variables.');
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
```

**withTenantDb addition** lands in this same file, beside `getDb()`. The new export wraps any `fn(tx)` in a transaction that issues `SET LOCAL` GUCs before calling `fn`.

---

### `remix-app/app/lib/withTenantDb.server.ts` (utility, request-response)

**Analog:** `remix-app/app/lib/db.server.ts` (wrapper pattern) + `remix-app/.planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md` (proven mechanism)

**Key findings from 01-SPIKE-FINDINGS.md** that drive the implementation:
- Line 4: `SET LOCAL request.jwt.claims` confirmed non-leaking; bare `SET` leaks across the pooler.
- Line 24: App DB role must be `NOBYPASSRLS`. `neondb_owner` bypasses RLS silently even with `FORCE ROW LEVEL SECURITY`.
- Line 32: Empty-claims guard required: `NULLIF(current_setting('request.jwt.claims', true), '')::jsonb` — plain cast throws on unset GUC (fail-closed).
- Line 38: Pattern: `SET LOCAL request.jwt.claims = '{"sub":...,"tenantId":...}'` + `SET LOCAL ROLE <app_role>`.

**GUC claim key names** (D-02 finalizes plain GUC, not Supabase JWT):
- Use `app.tenant_id` and `app.subject_id` (plain Postgres GUC names, host-portable, no `auth.jwt()` dependency).
- RLS policy USING clause: `(NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id)`.

**withTenantDb signature** (inferred from CONTEXT.md, RESEARCH.md §Architecture Patterns, and existing call-site comment shape in `data.server.ts` header):
```typescript
// remix-app/app/lib/db.server.ts (added beside getDb)
import { sql } from 'drizzle-orm';

export interface TenantCtx {
  userId: string;
  tenantId: string;
  subjectId: string;
}

export async function withTenantDb<T>(
  ctx: TenantCtx,
  fn: (tx: ReturnType<typeof getDb>) => Promise<T>
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    // SET LOCAL = transaction-scoped (confirmed non-leaking in 01-SPIKE-FINDINGS)
    await tx.execute(
      sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true),
                 set_config('app.subject_id', ${ctx.subjectId}, true),
                 set_config('app.user_id', ${ctx.userId}, true)`
    );
    await tx.execute(sql`SET LOCAL ROLE app_user`);  // NOBYPASSRLS role
    return fn(tx);
  });
}
```

**Error handling pattern** — mirrors existing `data.server.ts` / service layer: no try/catch in the wrapper itself; callers let errors propagate and Remix catches them as Response throws or 500s. The transaction auto-rolls back on error (Drizzle behavior).

---

### `remix-app/app/lib/data.server.ts` (service, CRUD — retrofit)

**Analog:** self — surgical `getDb()` → `withTenantDb(ctx, fn)` swap at each call site

**Current import + isolation comment** (`remix-app/app/lib/data.server.ts` lines 1–11):
```typescript
/**
 * data.server.ts — Centralized tenant-scoped read module (DATA-01)
 *
 * Phase 7 withTenantDb retrofit boundary:
 *   getDb() is called ONLY inside this file. To add RLS-based access control,
 *   Phase 7 replaces `getDb()` with `withTenantDb(tenantId, subjectId, fn)` here
 *   exclusively — route loaders (Plan 04 call sites) do NOT change. Keep getDb()
 *   isolated: do NOT call getDb() in loaders or other modules.
 */

import { getDb } from "./db.server";
```

**After retrofit**, import changes to:
```typescript
import { withTenantDb } from "./db.server";
import type { TenantCtx } from "./db.server";
```

**Core CRUD pattern — before** (`remix-app/app/lib/data.server.ts` lines 57–74):
```typescript
export async function getMetrics(
  tenantId: string,
  subjectId: string,
  category?: MetricCategory
) {
  const db = getDb();
  const conditions = [
    eq(metrics.tenantId, tenantId),
    eq(metrics.subjectId, subjectId),
  ] as const;
  if (category !== undefined) {
    return db.select().from(metrics)
      .where(and(...conditions, eq(metrics.category, category)));
  }
  return db.select().from(metrics).where(and(...conditions));
}
```

**After retrofit** — function signatures unchanged (loaders do not change), only internals:
```typescript
export async function getMetrics(
  ctx: TenantCtx,
  category?: MetricCategory
) {
  return withTenantDb(ctx, async (tx) => {
    // RLS enforces tenant+subject scoping at DB layer; app-layer WHERE is defense-in-depth
    const conditions = [
      eq(metrics.tenantId, ctx.tenantId),
      eq(metrics.subjectId, ctx.subjectId),
    ] as const;
    if (category !== undefined) {
      return tx.select().from(metrics)
        .where(and(...conditions, eq(metrics.category, category)));
    }
    return tx.select().from(metrics).where(and(...conditions));
  });
}
```

**All 9 functions** (`getOwnerSubject`, `getMetrics`, `getProtocolVersions`, `getProtocolChanges`, `getMilestones`, `getSupplements`, `getCorrelations`, `getCessationLog`, `getSubjectGenotypes`, `getReports`, `getReport`) follow this same pattern: wrap body in `withTenantDb(ctx, async (tx) => { ... })`, replace `db.` with `tx.`.

---

### `remix-app/app/lib/consent.server.ts` (service, CRUD — retrofit)

**Analog:** self — same `getDb()` → `withTenantDb` swap pattern

**Current pattern** (`remix-app/app/lib/consent.server.ts` lines 18–59):
```typescript
import { getDb } from "./db.server";

export async function checkConsent(subjectId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: consentLog.id })
    .from(consentLog)
    .where(eq(consentLog.subjectId, subjectId))
    .limit(1);
  return !!row;
}

export async function insertConsent(
  subjectId: string, userId: string, version: string
): Promise<void> {
  const db = getDb();
  await db.insert(consentLog).values({
    subjectId,
    consentedAt: new Date(),
    consentVersion: version,
    consentedByUserId: userId,
  });
}
```

**After retrofit** — `consent_log` has `subjectId` only (no `tenantId`), per RESEARCH.md table map. Policy is subject-only. `checkConsent` and `insertConsent` accept a `ctx: TenantCtx` (subjectId extracted from ctx):
```typescript
import { withTenantDb } from "./db.server";
import type { TenantCtx } from "./db.server";

export async function checkConsent(ctx: TenantCtx): Promise<boolean> {
  return withTenantDb(ctx, async (tx) => {
    const [row] = await tx
      .select({ id: consentLog.id })
      .from(consentLog)
      .where(eq(consentLog.subjectId, ctx.subjectId))
      .limit(1);
    return !!row;
  });
}
```

---

### `remix-app/app/lib/audit.server.ts` (service, event-driven — retrofit + auth events)

**Analog:** self — `getDb()` → `withTenantDb` swap; plus new auth-event wiring (D-09)

**Current pattern** (`remix-app/app/lib/audit.server.ts` lines 14–53):
```typescript
import { getDb } from "./db.server";
import { auditLog } from "../../db/schema";
import type { AppRole } from "./authz.server";

export interface AuditLogEntry {
  userId: string;
  role: AppRole;
  action: string;
  tableName?: string;
  operation?: string;
  tenantId: string;
  subjectId: string;
  entityId?: string;
}

export async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
  const db = getDb();
  await db.insert(auditLog).values({
    userId: entry.userId, role: entry.role, action: entry.action,
    tableName: entry.tableName, operation: entry.operation,
    tenantId: entry.tenantId, subjectId: entry.subjectId,
    entityId: entry.entityId, timestamp: new Date(),
  });
}
```

**AUTH-04 note:** `audit_log` gets INSERT+SELECT RLS policies only (no UPDATE/DELETE), making it immutable at the DB layer. `insertAuditLog` uses `withTenantDb` for PHI-adjacent writes (the policy allows INSERT for the app role). An **admin path** variant using `getDb()` directly (bypassing RLS) is needed for auth-event writes from Better-Auth hooks where no subject context exists at sign-in time — use `getDb()` for auth events only, `withTenantDb` for ingest lifecycle events.

**Auth-event additions** (D-09) — new exported function beside `insertAuditLog`:

> **CORRECTED at Plan 04 checkpoint:** the original "tenantId as subjectId stub" was
> impossible against the live schema — `audit_log.subject_id` has an FK to `subjects(id)`
> and no subjects row carries a tenant id (`audit_log_subject_id_subjects_id_fk` violation).
> Migration 0013 made `subject_id` nullable; auth events write `subjectId: null`
> (semantically honest — no clinical subject exists at auth time). The FK still
> validates when non-NULL. The audit_log RLS policies are keyed on `app.tenant_id`
> only, so NULL-subject rows remain visible to tenant reads.

```typescript
// Auth events: no subjectId at sign-in time; use getDb() admin path (no RLS on these writes)
// Wired from Better-Auth hooks (databaseHooks.session.create.after, etc.)
export async function insertAuthAuditLog(entry: {
  userId: string;
  action: 'sign-in' | 'sign-out' | 'sign-up' | 'sign-in-failed' | 'invite-redeemed' | 'role-changed';
  tenantId: string;
  entityId?: string;
}): Promise<void> {
  const db = getDb();  // admin path — no subject context at auth time
  await db.insert(auditLog).values({
    userId: entry.userId,
    role: 'owner',  // auth events are always user-initiated; role resolved from session post-auth
    action: entry.action,
    tenantId: entry.tenantId,
    subjectId: null,  // auth events have no clinical subject (nullable since migration 0013)
    entityId: entry.entityId,
    timestamp: new Date(),
  });
}
```

**Better-Auth hook wiring analog** — see `remix-app/app/lib/auth.server.ts` `databaseHooks` pattern (not read in detail — it is in the "do not retrofit" list but its hook structure is where D-09 wiring lands).

---

### `remix-app/app/lib/authz.server.ts` (middleware/utility, request-response — AUTH-03 extension)

**Analog:** self — `assertSubjectAccess` extension only; existing structure unchanged

**Current `assertSubjectAccess`** (`remix-app/app/lib/authz.server.ts` lines 61–76):
```typescript
export function assertSubjectAccess(
  user: { role?: string | null },
  subject: { tenantId: string },
  userTenantId: string
): void {
  if (user.role === "client") {
    throw new Response("You don't have permission to view this.", { status: 403 });
  }
  if (subject.tenantId !== userTenantId) {
    throw new Response("You don't have permission to view this.", { status: 403 });
  }
}
```

**AUTH-03 extension** — add a `userId` parameter and an `assignments` array; owners bypass assignment check (tenant-wide access), practitioners must appear in the array:
```typescript
// AUTH-03: extended signature — owners retain tenant-wide access; practitioners
// are checked against their assigned subjects (per practitioner_subject_assignments).
export function assertSubjectAccess(
  user: { role?: string | null; id: string },
  subject: { tenantId: string; id: string },
  userTenantId: string,
  // Only required when user.role === 'practitioner'; pass [] for owners
  assignedSubjectIds?: string[]
): void {
  if (user.role === "client") {
    throw new Response("You don't have permission to view this.", { status: 403 });
  }
  if (subject.tenantId !== userTenantId) {
    throw new Response("You don't have permission to view this.", { status: 403 });
  }
  // AUTH-03: practitioner per-assignment check
  if (user.role === "practitioner" && assignedSubjectIds !== undefined) {
    if (!assignedSubjectIds.includes(subject.id)) {
      throw new Response("You don't have permission to view this.", { status: 403 });
    }
  }
}
```

**Header comment update** (lines 1–13) — remove the "do NOT add it here" note and add the Phase 7 completion note.

---

### `remix-app/db/schema.ts` (model — `practitioner_subject_assignments` addition)

**Analog:** existing table definitions in `remix-app/db/schema.ts`, specifically `invites` (lines 96–110) for a tenant-scoped junction table pattern, and `supplements` (lines 177–192) for a standard two-FK tenant/subject-scoped table.

**`invites` table as index/FK pattern** (`remix-app/db/schema.ts` lines 96–110):
```typescript
export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  role: appRoleEnum('role').notNull(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  createdBy: text('created_by').notNull().references(() => user.id),
  // ...
}, (t) => [
  index('idx_invites_tenant').on(t.tenantId),
  index('idx_invites_token_hash').on(t.tokenHash),
]);
```

**New `practitioner_subject_assignments` table** — copy the `invites` index pattern; junction between practitioner user, subject, and tenant:
```typescript
// practitioner_subject_assignments — AUTH-03 (Phase 7)
// Maps which subjects a practitioner is assigned to within a tenant.
// RLS policy: tenant-scoped (owner/practitioner can read their own tenant's assignments).
export const practitionerSubjectAssignments = pgTable(
  'practitioner_subject_assignments',
  {
    id: text('id').primaryKey(),                                          // crypto.randomUUID()
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    practitionerId: text('practitioner_id').notNull().references(() => user.id),
    subjectId: text('subject_id').notNull().references(() => subjects.id),
    assignedBy: text('assigned_by').notNull().references(() => user.id),  // owner who created
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'),                                    // null = active
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('idx_psa_tenant').on(t.tenantId),
    index('idx_psa_practitioner').on(t.practitionerId),
    index('idx_psa_subject').on(t.subjectId),
    // Unique active assignment per (tenant, practitioner, subject)
    uniqueIndex('idx_psa_active_unique').on(t.tenantId, t.practitionerId, t.subjectId),
  ]
);
```

**Enum additions** — none required; `appRoleEnum` already covers roles.

**Re-export** — add `practitionerSubjectAssignments` to the barrel at the bottom of the file (existing `export * from './auth-schema'` is the pattern; just add the new export in the table definitions area).

---

### `remix-app/migrations/0010_rls_policies.sql` (migration, batch)

**Analog:** `remix-app/migrations/0009_natural_night_thrasher.sql` — most recent migration, shows DDL conventions (statement-breakpoint separator, FK constraint naming).

**Most recent migration structure** (`remix-app/migrations/0009_natural_night_thrasher.sql` lines 1–57):
```sql
CREATE TYPE "public"."evidence_tier" AS ENUM('k1', 'k2', 'k3', 'k4');--> statement-breakpoint
CREATE TABLE "genetic_variants" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY ...
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_tenants_id_fk" ...;
--> statement-breakpoint
CREATE INDEX "idx_genetic_variants_gene" ON "genetic_variants" USING btree ("gene");
```

**Migration 0010 structure** — this is a hand-authored SQL migration (not Drizzle-generated) because RLS DDL (`ALTER TABLE ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`) is not tracked by Drizzle's schema diffing. Must be placed in `remix-app/migrations/` with the `0010_` prefix and registered in `remix-app/drizzle/meta/_journal.json` manually. The `drizzle.config.ts` `out: './migrations'` path confirms correct location.

**RLS migration pattern** (informed by 01-SPIKE-FINDINGS.md + CONTEXT.md D-02 GUC names):
```sql
-- 0010_rls_policies.sql
-- Phase 7: Atomic RLS enable + policies for all tenant/subject-scoped tables.
-- REHEARSE on a Neon branch before applying to the live project (D-10).
-- Rollback: disable RLS (ALTER TABLE ... DISABLE ROW LEVEL SECURITY) — see rollback plan.

-- Step 1: Create the NOBYPASSRLS app role (01-SPIKE-FINDINGS line 24)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN;
  END IF;
END $$;--> statement-breakpoint

-- Grant DML (not ownership) to app_user on all data tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;--> statement-breakpoint
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;--> statement-breakpoint

-- Step 2: Enable RLS on each tenant+subject-scoped table (with FORCE for owner safety)
-- Pattern per table (01-SPIKE-FINDINGS line 25: FORCE required for owner role safety):
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE metrics FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- ... (repeat for all 14 tenant-scoped tables) ...

-- Step 3: CREATE POLICY per table — tenant+subject isolation
-- Empty-claims guard (01-SPIKE-FINDINGS line 32):
CREATE POLICY "tenant_subject_isolation" ON metrics
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

-- Step 4: audit_log — INSERT+SELECT only (no UPDATE/DELETE — AUTH-04 immutability)
CREATE POLICY "audit_immutable_select" ON audit_log
  FOR SELECT TO app_user
  USING (NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id);--> statement-breakpoint
CREATE POLICY "audit_insert_only" ON audit_log
  FOR INSERT TO app_user
  WITH CHECK (NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id);--> statement-breakpoint
-- No UPDATE or DELETE policy for app_user on audit_log → those operations are blocked.

-- Step 5: consent_log — subject-only (no tenantId column)
CREATE POLICY "subject_isolation" ON consent_log
  FOR ALL TO app_user
  USING (NULLIF(current_setting('app.subject_id', true), '')::text = subject_id)
  WITH CHECK (NULLIF(current_setting('app.subject_id', true), '')::text = subject_id);--> statement-breakpoint

-- Step 6: practitioner_subject_assignments — tenant-scoped
ALTER TABLE practitioner_subject_assignments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE practitioner_subject_assignments FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "psa_tenant_isolation" ON practitioner_subject_assignments
  FOR ALL TO app_user
  USING (NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id)
  WITH CHECK (NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id);
```

**drizzle.config.ts** — no change needed. `DATABASE_URL_UNPOOLED || DATABASE_URL` already resolves to the direct connection (lines 8–9), correct for applying migrations.

---

### `remix-app/app/routes/_app/settings/assignments.tsx` (component/route, request-response — AUTH-03 UI)

**Analog:** `remix-app/app/routes/_app/settings/index.tsx` — existing settings page with loader + action + Form pattern

**Loader + auth pattern** (`remix-app/app/routes/_app/settings/index.tsx` lines 30–52):
```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const canInviteClient = can(user, "invite:client") && !!user.tenantId;
  // ... load data only for roles that can access ...
  return { user, invites, canInviteClient, canInvitePractitioner };
}
```

**Action with intent-dispatch pattern** (`remix-app/app/routes/_app/settings/index.tsx` lines 56–203):
```typescript
export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("_intent") as string;

  if (intent === "generate-invite") {
    requireRole(user, ["owner", "practitioner"]);
    // ... validate + execute ...
    return { intent: "generate-invite", success: true, ... };
  }
  return { intent: null, success: false, error: "Unknown intent" };
}
```

**Action-only resource route analog** (`remix-app/app/routes/_app/settings/invites.ts` lines 20–54):
```typescript
export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);
  // ... validate params + call service + return success/error ...
  return { success: true };
}
// No loader, no default export — action-only resource route
```

**Assignment UI structure** — copy the `index.tsx` Card+Form+Table structure; adapt for assign/unassign actions. Owner-only gate via `requireRole(user, ["owner"])`. Data: list of subjects in the tenant + list of practitioners + current assignment rows. Form intents: `assign-subject`, `unassign-subject`.

**Route registration** — add to `remix-app/app/routes.ts` beside existing settings routes (lines 47–48):
```typescript
route("settings", "routes/_app/settings/index.tsx"),
route("settings/invites/:inviteId/revoke", "routes/_app/settings/invites.ts"),
// ADD:
route("settings/assignments", "routes/_app/settings/assignments.tsx"),
```

---

### `remix-app/tests/db/rls-isolation.test.ts` (test, batch — TEN-02/TEN-03)

**Analog:** `remix-app/tests/db/constraints.test.ts` — live-DB introspection test with skip-guard

**Skip-guard pattern** (`remix-app/tests/db/constraints.test.ts` lines 17–19):
```typescript
const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];
```

**`describe.skipIf` pattern** (`remix-app/tests/db/constraints.test.ts` lines 53–108):
```typescript
describe.skipIf(!connectionString)(
  "TEN-04 protocol_versions uniqueness constraint swap (live Neon)",
  () => {
    async function uniqueConstraints(): Promise<ConstraintRow[]> {
      // pool.query() introspection ...
    }
    it("has a composite UNIQUE on (tenant_id, subject_id, version)", async () => {
      const constraints = await uniqueConstraints();
      // ... assertions ...
    });
  }
);
```

**afterAll pool cleanup** (`remix-app/tests/db/constraints.test.ts` lines 49–51):
```typescript
afterAll(async () => {
  if (pool) await pool.end();
});
```

**RLS isolation test structure** — copy the skip-guard + `describe.skipIf` + `afterAll` cleanup exactly. Test bodies implement the TEN-02/TEN-03 assertions from CONTEXT.md:

```typescript
// TEN-02: Cross-tenant isolation
describe.skipIf(!connectionString)("TEN-02: RLS cross-tenant isolation (live Neon)", () => {
  it("Tenant B reads zero rows written by Tenant A", async () => {
    // 1. withTenantDb(tenantA ctx) → INSERT a metrics row
    // 2. withTenantDb(tenantB ctx) → SELECT metrics WHERE tenantId = tenantA
    // assert result.length === 0
  });

  it("WITH CHECK rejects mismatched-tenant INSERT", async () => {
    // withTenantDb(tenantA ctx) → INSERT metrics with tenant_id = tenantB
    // assert rejected with policy error
  });
});

// TEN-03: Pool-reuse context non-leak
describe.skipIf(!connectionString)("TEN-03: withTenantDb context non-leak (live Neon)", () => {
  it("Tenant context does not bleed to the next request on a pooled connection", async () => {
    // 1. withTenantDb(tenantA ctx) → INSERT row → commit
    // 2. withTenantDb(tenantB ctx) on same pool → SELECT same table
    // assert tenantA row is NOT returned (SET LOCAL cleared on COMMIT)
  });
});
```

**Note:** These tests require test-tenant setup/teardown. Follow the pattern from `constraints.test.ts` using `afterAll` cleanup. Do not use `neondb_owner` for these assertions — connect as `app_user` (the NOBYPASSRLS role) or parameterize the connection per ctx via `SET LOCAL ROLE`.

---

## Shared Patterns

### Authentication gate (all routes)
**Source:** `remix-app/app/lib/authz.server.ts` lines 28–35 (`requireUser`)
**Apply to:** All loader and action functions in new/modified routes
```typescript
const { user } = await requireUser(request);
// user.tenantId is the session-derived tenantId for withTenantDb ctx
```

### Role enforcement (owner-only surfaces)
**Source:** `remix-app/app/lib/authz.server.ts` lines 43–52 (`requireRole`)
**Apply to:** Assignment management UI action, and any new admin actions
```typescript
requireRole(user, ["owner"]);  // assignment management: owner only
```

### withTenantDb ctx derivation from session
**Source:** `remix-app/app/routes/_app/settings/index.tsx` lines 30–52 (session → user.tenantId pattern)
**Apply to:** All call sites replacing `getDb()` with `withTenantDb`
```typescript
// ctx built from the requireUser session result + subject lookup:
const ctx: TenantCtx = {
  userId: user.id,
  tenantId: user.tenantId!,   // requireUser + tenantId guard before any withTenantDb call
  subjectId: subject.id,      // from getOwnerSubject(tenantId) or from route param
};
```

### Error response pattern (fail-closed)
**Source:** `remix-app/app/lib/authz.server.ts` lines 48–51 and `remix-app/app/routes/_app/settings/invites.ts` lines 32–35
**Apply to:** All new server functions and route actions
```typescript
throw new Response("You don't have permission to view this.", { status: 403 });
// or:
throw new Response("Not found", { status: 404 });
```

### Form intent dispatch
**Source:** `remix-app/app/routes/_app/settings/index.tsx` lines 56–203 (multi-intent action)
**Apply to:** `assignments.tsx` route action
```typescript
const intent = formData.get("_intent") as string;
if (intent === "assign-subject") { ... }
if (intent === "unassign-subject") { ... }
return { intent: null, success: false, error: "Unknown intent" };
```

### TS strict — no `any`, no non-null assertions without guard
**Source:** `remix-app/app/routes/_app/settings/invites.ts` lines 26–30 (explicit param validation)
**Apply to:** All new TypeScript files
```typescript
if (!params.subjectId) {
  throw new Response("Not found", { status: 404 });
}
// Never: params.subjectId! without a guard
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| *(none)* | — | — | All new files have a close codebase analog or are retrofits of existing files |

Note: The RLS SQL DDL pattern (CREATE POLICY, ENABLE ROW LEVEL SECURITY, NOBYPASSRLS role creation) has no direct analog in the codebase — it is pure Postgres DDL. Use the 01-SPIKE-FINDINGS.md proven pattern + CONTEXT.md D-02 GUC names as the source of truth, not the existing migration SQL files (which contain only Drizzle-generated CREATE TABLE / ALTER TABLE DDL, not RLS).

---

## Metadata

**Analog search scope:**
- `remix-app/app/lib/` (all `.server.ts` files)
- `remix-app/db/schema.ts`
- `remix-app/migrations/` (all `.sql` files)
- `remix-app/tests/db/` and `remix-app/tests/lib/` (test pattern files)
- `remix-app/app/routes/_app/settings/` (UI pattern)
- `.planning/phases/01-.../01-SPIKE-FINDINGS.md` (proven RLS mechanism)

**Files scanned:** 18 source files read directly
**Pattern extraction date:** 2026-06-12

### Key Patterns Summary
- `withTenantDb` wraps `db.transaction()` with `set_config` + `SET LOCAL ROLE` (proven non-leaking per 01-SPIKE-FINDINGS); lives in `db.server.ts` alongside `getDb()`
- GUC names: `app.tenant_id` / `app.subject_id` / `app.user_id` (plain Postgres, host-portable, not Supabase `auth.jwt()`)
- RLS policy predicate: `NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id` (empty-claims guard from 01-SPIKE-FINDINGS line 32)
- `audit_log` immutability: INSERT+SELECT policies only for `app_user` — no UPDATE/DELETE policy means those operations are blocked by RLS
- Live-DB tests: `describe.skipIf(!connectionString)` pattern from `constraints.test.ts`; skip-guard: `process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"]`
- Settings UI: Card + Form + `_intent` dispatch from `settings/index.tsx`; action-only resource route from `settings/invites.ts`
