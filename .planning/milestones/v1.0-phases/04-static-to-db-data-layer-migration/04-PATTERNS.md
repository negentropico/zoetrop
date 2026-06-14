# Phase 4: Static-to-DB Data Layer Migration - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 16 (new/modified)
**Analogs found:** 14 / 16

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `remix-app/app/lib/data.server.ts` | service | CRUD | `remix-app/app/lib/authz.server.ts` | role-match |
| `remix-app/app/lib/genetics-knowledge.server.ts` | utility | transform | `remix-app/app/lib/metrics.ts` | role-match |
| `remix-app/scripts/seed-data.ts` | utility | batch | `remix-app/scripts/seed-owner.ts` | exact |
| `remix-app/db/schema.ts` (modified) | model | CRUD | `remix-app/db/schema.ts` (self) | exact |
| `remix-app/app/lib/db.server.ts` (modified) | utility | request-response | `remix-app/app/lib/db.server.ts` (self) | exact |
| `remix-app/app/lib/protocol-data.ts` (partial survivor) | utility | transform | `remix-app/app/lib/metrics.ts` | role-match |
| `remix-app/app/types/metrics.ts` (modified) | model | transform | `remix-app/app/types/metrics.ts` (self) | exact |
| `remix-app/app/routes/_app/protocol/cessation.tsx` (loader) | route | request-response | self (existing loader) | exact |
| `remix-app/app/routes/_app/metrics/index.tsx` (loader) | route | CRUD | self (existing loader) | exact |
| `remix-app/app/routes/_app/insights/genetics.tsx` (loader) | route | request-response | self (existing loader) | exact |
| `remix-app/app/routes/_app/insights/correlations.tsx` (loader) | route | CRUD | self (existing loader) | exact |
| `remix-app/app/routes/_app/protocol/supplements.tsx` (loader) | route | CRUD | self (existing loader) | exact |
| `remix-app/app/routes/_app/protocol/versions.tsx` (loader) | route | CRUD | self (existing loader) | exact |
| `remix-app/tests/db/schema-columns.test.ts` (extended) | test | request-response | `remix-app/tests/db/schema-columns.test.ts` (self) | exact |
| `remix-app/tests/db/data-seed.test.ts` | test | request-response | `remix-app/tests/db/constraints.test.ts` | exact |
| `remix-app/tests/parity/loader-parity.test.ts` | test | request-response | `remix-app/tests/db/constraints.test.ts` | role-match |

---

## Pattern Assignments

### `remix-app/app/lib/data.server.ts` (service, CRUD)

**Analog:** `remix-app/app/lib/authz.server.ts` (server-side module pattern) + `remix-app/db/schema.ts` (table/column names)

**Imports pattern** — copy from `authz.server.ts` lines 1-3 + schema names from `db/schema.ts` lines 1-14:
```typescript
import { getDb } from "./db.server";
import { eq, and } from "drizzle-orm";
import {
  metrics, protocolVersions, protocolChanges, milestones,
  supplements, cessationLog, correlations, subjectGenotypes, subjects,
} from "../../db/schema";
import type { Metric } from "../types/metrics";
```

**Core tenant-scoped query pattern** — all functions accept `tenantId` + `subjectId` as explicit params; this is the single enforcement point for Phase 7 `withTenantDb` retrofit:
```typescript
export async function getOwnerSubject(tenantId: string) {
  const db = getDb();
  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.tenantId, tenantId))
    .limit(1);
  if (!subject) throw new Response("Subject not found", { status: 404 });
  return subject;
}

export async function getMetrics(
  tenantId: string,
  subjectId: string,
  category?: string
) {
  const db = getDb();
  const conditions = [
    eq(metrics.tenantId, tenantId),
    eq(metrics.subjectId, subjectId),
  ];
  if (category) conditions.push(eq(metrics.category, category as MetricCategory));
  return db.select().from(metrics).where(and(...conditions));
}
```

**Phase 7 retrofit note** (from `.planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md`): Replace `getDb()` here only — call sites in loaders do not change:
```typescript
// Phase 7: withTenantDb replaces getDb() inside data.server.ts exclusively.
// Each exported function passes its db param down rather than calling getDb() directly.
export async function withTenantDb<T>(
  tenantId: string, subjectId: string,
  fn: (db: DrizzleClient) => Promise<T>
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('request.jwt.claims',
      ${JSON.stringify({ tenantId, subjectId })}, true)`);
    return fn(tx);
  });
}
```

**Error guard pattern** — match the `requireUser` throw-Response pattern in `authz.server.ts` lines 28-34:
```typescript
// authz.server.ts lines 28-34 — copy the throw-Response convention:
if (!session) {
  const url = new URL(request.url);
  throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
}
// For data.server.ts — same principle, 404 for missing subject:
if (!subject) throw new Response("Subject not found", { status: 404 });
```

---

### `remix-app/app/lib/genetics-knowledge.server.ts` (utility, transform)

**Analog:** `remix-app/app/lib/metrics.ts` (server-only utility, typed exports, no side effects)

**File header annotation** — mark explicitly for Phase 6 deletion:
```typescript
/**
 * genetics-knowledge.server.ts
 * Interim Phase 4 knowledge module — retired by Phase 6 engine.
 *
 * The `.server.ts` suffix prevents React Router from bundling this into
 * the client bundle. Do NOT import from client components.
 *
 * Join key: `gene` (string, case-sensitive) — matches subject_genotypes.gene.
 */
```

**Imports pattern** — pure TypeScript, no DB calls (source: `app/lib/metrics.ts` lines 1-2):
```typescript
import type { ConfidenceLevel } from "../types/genetics";
```

**Core export shape** — keyed Record, typed entry:
```typescript
export interface GeneticKnowledgeEntry {
  confidence: ConfidenceLevel;
  category: string;          // e.g. "methylation"
  impact: string;            // e.g. "high"
  clinicalImplication: string;
  protocolAction: string;
  notes?: string;
}

// Record<gene, entry> — gene is the join key with subject_genotypes.gene
export const GENETIC_KNOWLEDGE: Record<string, GeneticKnowledgeEntry> = {
  MTHFR: {
    confidence: "K1",
    category: "methylation",
    // ... trimmed from seedGeneticVariants in seed-data.ts (non-PHI fields only)
  },
  // ...
};
```

---

### `remix-app/scripts/seed-data.ts` (utility, batch)

**Analog:** `remix-app/scripts/seed-owner.ts` — exact pattern to follow

**Env-var validation pattern** (seed-owner.ts lines 38-53):
```typescript
const OWNER_EMAIL = process.env.OWNER_EMAIL;
if (!OWNER_EMAIL) {
  throw new Error("OWNER_EMAIL env var is required — set it before running db:seed-owner.");
}
```

**Idempotency pattern** (seed-owner.ts lines 59-68):
```typescript
const db = getDb();
const existingUsers = await db
  .select({ id: user.id, email: user.email })
  .from(user)
  .where(eq(user.email, OWNER_EMAIL))
  .limit(1);

if (existingUsers.length > 0) {
  console.log(`[seed-owner] Owner already exists (email=${OWNER_EMAIL}). Nothing to do.`);
  process.exit(0);
}
```
Adapt for data seed — check `COUNT(*) WHERE tenant_id = ownerTenantId` on the first table (protocolVersions) and early-exit if rows found:
```typescript
const existing = await db
  .select({ id: protocolVersions.id })
  .from(protocolVersions)
  .where(eq(protocolVersions.tenantId, tenantId))
  .limit(1);
if (existing.length > 0) {
  console.log("[seed-data] Already seeded. Nothing to do.");
  process.exit(0);
}
```

**ID resolution pattern** (seed-owner.ts lines 59-68 adapted for data seed):
```typescript
// Resolve owner IDs from DB — NEVER hardcode
const [ownerUser] = await db
  .select()
  .from(user)
  .where(eq(user.email, OWNER_EMAIL))
  .limit(1);
if (!ownerUser) throw new Error("Owner user not found — run db:seed-owner first");
const tenantId = ownerUser.tenantId!;
const [subject] = await db
  .select()
  .from(subjects)
  .where(eq(subjects.tenantId, tenantId))
  .limit(1);
if (!subject) throw new Error("Owner subject not found");
const subjectId = subject.id;
```

**Logging pattern** (seed-owner.ts lines 79, 92, 114, 126-127):
```typescript
console.log(`[seed-data] Protocol versions seeded: ${versions.length} rows`);
// ...
console.log("");
console.log("[seed-data] Seed complete.");
console.log(`  tenantId:  ${tenantId}`);
console.log(`  subjectId: ${subjectId}`);
```

**FK dependency insertion order** — supplements before correlations; protocolVersions before protocolChanges:
```typescript
await seedProtocolVersions(db, tenantId, subjectId);
await seedSupplements(db, tenantId, subjectId);       // must precede correlations
await seedProtocolChanges(db, tenantId, subjectId);   // FK → protocolVersions
await seedMilestones(db, tenantId, subjectId);
await seedMetrics(db, tenantId, subjectId);
await seedCessationLog(db, tenantId, subjectId);
await seedCorrelations(db, tenantId, subjectId);      // FK → supplements (lookup by name)
await seedSubjectGenotypes(db, tenantId, subjectId);
```

**Imports pattern** (mirror seed-owner.ts lines 31-34):
```typescript
import { getDb } from "../app/lib/db.server";
import { user, tenants, subjects, metrics, protocolVersions, protocolChanges,
         milestones, supplements, cessationLog, correlations, subjectGenotypes } from "../db/schema";
import { eq } from "drizzle-orm";
// Static source arrays (consumed then deleted after cut-over):
import { realBloodWorkM1, realBloodWorkM2, realBodyComposition, realAutonomicData }
  from "../app/lib/real-data";
import { realProtocolVersions, realProtocolChanges, realSupplements,
         realMilestones, realCessationLog } from "../app/lib/protocol-data";
import { seedGeneticVariants, seedCorrelations as rawCorrelations } from "../app/lib/seed-data";
```

---

### `remix-app/db/schema.ts` (model, CRUD) — modifications

**Analog:** self — existing file at lines 1-291

**Vestige removal targets** (exact lines to change):
- Line 46-50: Delete the `syncStatusEnum` declaration block
- Line 113-114: Delete `syncStatus` and `syncVersion` columns from `metrics` table
- Line 174: Change `isActive: integer('is_active').notNull().default(1)` to `isActive: boolean('is_active').notNull().default(true)`

**New table pattern** — copy index convention from `protocolVersions` table (lines 130-135):
```typescript
export const subjectGenotypes = pgTable('subject_genotypes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  gene: varchar('gene', { length: 100 }).notNull(),        // join key for knowledge module
  rsid: varchar('rsid', { length: 20 }),                   // nullable — some variants lack rsid
  genotype: varchar('genotype', { length: 50 }).notNull(),
  assaySource: varchar('assay_source', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
}, (t) => [
  index('idx_subject_genotypes_tenant_subject').on(t.tenantId, t.subjectId),
]);
```

**Relations block pattern** — copy from `supplementsRelations` at lines 259-262:
```typescript
export const subjectGenotypesRelations = relations(subjectGenotypes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subjectGenotypes.tenantId],
    references: [tenants.id],
  }),
  subject: one(subjects, {
    fields: [subjectGenotypes.subjectId],
    references: [subjects.id],
  }),
}));
```

**Stale comment fix** — lines 122-124 and throughout: replace "601/602/603" with "P0–P6"; replace "Plan 04" references with "Phase 3".

---

### `remix-app/app/lib/db.server.ts` (utility, request-response) — modification

**Analog:** self — existing file

**Change target** (line 12-13): Remove `NETLIFY_DATABASE_URL` fallback:
```typescript
// BEFORE (lines 9-23):
function getPool(): Pool {
  if (_pool) return _pool;
  const connectionString =
    process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'Database connection string not found. Set NETLIFY_DATABASE_URL or DATABASE_URL.'
    );
  }
  _pool = new Pool({ connectionString });
  return _pool;
}

// AFTER — DATABASE_URL only:
function getPool(): Pool {
  if (_pool) return _pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Set it in .env or Vercel environment variables.');
  }
  _pool = new Pool({ connectionString });
  return _pool;
}
```

---

### `remix-app/app/types/metrics.ts` (model, transform) — modification

**Analog:** self — existing file

**Vestige removal target** (lines 7, 66-68):
- Remove `SyncStatus` type declaration (line 7)
- Remove `syncStatus: SyncStatus` and `syncVersion: number` fields from `BaseMetric` (lines 66-68)

**Subcategory union audit** — before writing the DB→Metric mapper, verify every subcategory string in static data matches the declared unions. Existing unions (lines 22-30) are the ground truth; widen only where real data has legitimate values not yet listed. No `as any` at the mapping boundary.

---

### Route Loader Rewiring: All `remix-app/app/routes/_app/**` loaders

All 13 data-returning route loaders follow the same three-step rewire. Three representative shapes are documented below.

#### Shape A: Simple list query (e.g., `protocol/supplements.tsx`, `protocol/versions.tsx`)

**Current pattern** (supplements.tsx lines 17-42, synchronous static read):
```typescript
export function loader() {
  const supplements = realSupplements;
  // ... shape and return
  return { supplements, byTier, stats };
}
```

**Rewired pattern** — async, requireUser + getOwnerSubject + data.server.ts call:
```typescript
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getSupplements } from "~/lib/data.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId);
  const supplements = await getSupplements(user.tenantId, subject.id);
  // same shaping logic as before
  return { supplements, byTier, stats };
}
```

**Key import changes:**
- Remove: `import { realSupplements } from "~/lib/protocol-data";`
- Add: `import type { LoaderFunctionArgs } from "react-router";`
- Add: `import { requireUser } from "~/lib/authz.server";`
- Add: `import { getOwnerSubject, getSupplements } from "~/lib/data.server";`

#### Shape B: Date-math with injectable `now` (e.g., `protocol/cessation.tsx`)

**Current pattern** (cessation.tsx lines 22-109 — synchronous, imports `realCessationLog` line 4):
```typescript
export function loader() {
  const cessation = realCessationLog[0];
  // uses new Date() directly — not injectable
  const currentDay = differenceInDays(new Date(), startDate);
  return { cessation, currentDay, ... };
}
```

**Rewired pattern** — async DB read; injectable `now` for parity harness compatibility (matches existing `getCessationDay(now: Date = new Date())` signature in protocol-data.ts lines 29-31):
```typescript
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getCessationLog } from "~/lib/data.server";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/protocol-data"; // survivor

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId);
  const [cessation] = await getCessationLog(user.tenantId, subject.id);
  const now = new Date();
  const currentDay = getCessationDay(now);
  const currentPhase = getCurrentCessationPhase(currentDay);
  // same return shape as before
  return { cessation, currentDay, currentPhase, ... };
}
```

#### Shape C: DB join with server-only knowledge module (e.g., `insights/genetics.tsx`)

**Current pattern** (genetics.tsx lines 33-67 — imports `seedGeneticVariants` directly):
```typescript
export function loader() {
  const variants = seedGeneticVariants;
  // group, count, return
  return { variants, byCategory, stats };
}
```

**Rewired pattern** — PHI rows from DB joined with server-only knowledge module (D-03):
```typescript
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getSubjectGenotypes } from "~/lib/data.server";
import { GENETIC_KNOWLEDGE } from "~/lib/genetics-knowledge.server"; // .server.ts = never bundled client-side

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId);
  const genotypeRows = await getSubjectGenotypes(user.tenantId, subject.id);

  // Join PHI plane (DB) with knowledge plane (server module) by gene name
  const variants = genotypeRows.map((row) => ({
    id: String(row.id),
    gene: row.gene,
    rsid: row.rsid ?? undefined,
    genotype: row.genotype,
    assaySource: row.assaySource ?? undefined,
    ...GENETIC_KNOWLEDGE[row.gene],  // confidence, category, impact, clinicalImplication, protocolAction
  }));

  // same grouping/stats logic as before
  return { variants, byCategory, stats };
}
```

---

### `remix-app/tests/db/data-seed.test.ts` (test, request-response)

**Analog:** `remix-app/tests/db/constraints.test.ts` — exact skip-guard and Pool pattern

**Skip-guard pattern** (constraints.test.ts lines 17-18, 39-47, 52):
```typescript
const connectionString =
  process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

afterAll(async () => {
  if (pool) await pool.end();
});

describe.skipIf(!connectionString)("DATA-02 seed row counts (live Neon)", () => {
  // assertions go here
});
```

**Row-count assertion pattern** — extend the `DATA_TABLES` approach from `schema-columns.test.ts` lines 21-30:
```typescript
const SEEDED_TABLES = [
  { table: "metrics",            minRows: 40 },
  { table: "protocol_versions",  minRows: 7  },
  { table: "supplements",        minRows: 15 },
  { table: "correlations",       minRows: 10 },
  { table: "cessation_log",      minRows: 1  },
  { table: "subject_genotypes",  minRows: 15 },
] as const;

for (const { table, minRows } of SEEDED_TABLES) {
  it(`${table} has at least ${minRows} seeded rows`, async () => {
    const { rows } = await getPool().query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ${table} WHERE tenant_id IS NOT NULL`
    );
    expect(parseInt(rows[0].count, 10)).toBeGreaterThanOrEqual(minRows);
  });
}
```

---

### `remix-app/tests/db/schema-columns.test.ts` (extended, test, request-response)

**Analog:** self — existing file lines 1-101

**Extension pattern** — add a new `describe.skipIf` block after the existing TEN-01 suite (same file, append below line 101):
```typescript
describe.skipIf(!connectionString)(
  "DATA-05 vestige columns absent (live Neon)",
  () => {
    it("metrics table has no sync_status column", async () => {
      const { rows } = await getPool().query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'metrics'
            AND column_name = ANY($1)`,
        [["sync_status", "sync_version"]]
      );
      expect(rows).toHaveLength(0);
    });

    it("supplements.is_active is boolean not integer", async () => {
      const { rows } = await getPool().query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'supplements'
            AND column_name = 'is_active'`
      );
      expect(rows[0]?.data_type).toBe("boolean");
    });

    it("subject_genotypes table exists with gene and genotype columns", async () => {
      const { rows } = await getPool().query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'subject_genotypes'`
      );
      const cols = rows.map((r) => r.column_name);
      expect(cols).toContain("gene");
      expect(cols).toContain("genotype");
    });
  }
);
```

---

### `remix-app/tests/parity/loader-parity.test.ts` (test, request-response)

**Analog:** `remix-app/tests/db/constraints.test.ts` — skip-guard; `remix-app/app/lib/protocol-data.ts` lines 29-31 for injectable `now`

**Skip-guard** — identical to constraints.test.ts lines 17-18:
```typescript
const connectionString =
  process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];
```

**Injectable `now` pattern** — `getCessationDay` already accepts `now: Date = new Date()` (protocol-data.ts line 29); pass a fixed date in tests:
```typescript
const FIXED_NOW = new Date("2026-06-10T00:00:00.000Z"); // pin for deterministic assertions
```

**Deep-equality assertion** — `toMatchObject` tolerates extra DB-only fields (`createdAt`, `id`) while verifying shape:
```typescript
describe.skipIf(!connectionString)("loader parity (live Neon vs fixture)", () => {
  it("cessation loader shape matches fixture", async () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../fixtures/cessation.json"), "utf8")
    );
    const result = await cessationLoader({ request: mockRequest, now: FIXED_NOW });
    expect(result).toMatchObject(fixture);
  });
});
```

**Fixture gitignore note** — `remix-app/tests/fixtures/` must be in `remix-app/.gitignore` BEFORE `capture-fixtures.ts` is run. Add this line to `.gitignore`:
```
tests/fixtures/
```

---

## Shared Patterns

### Authentication / Session Gate
**Source:** `remix-app/app/lib/authz.server.ts` lines 28-34
**Apply to:** All 13 rewired route loaders
```typescript
// requireUser is the canonical session gate — use it at the top of every async loader.
// It throws redirect("/login?redirect=...") if unauthenticated.
const { user } = await requireUser(request);
// user.tenantId is non-null for owner/practitioner (Phase 3 confirmed NOT NULL migration)
```

### Tenant-Scoped DB Access
**Source:** `remix-app/app/lib/data.server.ts` (new file, Pattern 1 above)
**Apply to:** All route loaders that read health data; all per-table seed helpers in `seed-data.ts`
- Rule: `tenantId` AND `subjectId` in every WHERE clause; no direct Drizzle query in route files.
- Phase 7 retrofit boundary: `getDb()` call is isolated inside `data.server.ts` only.

### Drizzle Table Import Convention
**Source:** `remix-app/scripts/seed-owner.ts` lines 31-34; `remix-app/db/schema.ts` lines 1-14
**Apply to:** `data.server.ts`, `seed-data.ts`, schema migration work
```typescript
import { getDb } from "../app/lib/db.server";     // or "~/lib/db.server" inside app/
import { eq, and } from "drizzle-orm";
import { metrics, subjects, ... } from "../../db/schema"; // or "../../../db/schema" depending on depth
```

### Vitest Live-Neon Skip Guard
**Source:** `remix-app/tests/db/schema-columns.test.ts` lines 17-101; `remix-app/tests/db/constraints.test.ts` lines 17-108
**Apply to:** `tests/db/data-seed.test.ts`, `tests/parity/loader-parity.test.ts`, extended `schema-columns.test.ts` block
```typescript
const connectionString =
  process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

// Pool lifecycle (always in the file):
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString });
  return pool;
}
afterAll(async () => { if (pool) await pool.end(); });

// Test suite:
describe.skipIf(!connectionString)("suite name (live Neon)", () => { ... });
```

### ESLint No-Restricted-Imports (CI Lint Gate)
**Source:** No existing ESLint config in repo (eslintConfig: {} in package.json) — create new `remix-app/eslint.config.mjs`
**Apply to:** All files under `app/routes/` and `app/components/` (not seed scripts)
```javascript
// eslint.config.mjs
export default [
  {
    files: ["app/routes/**/*", "app/components/**/*"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["*/lib/real-data*", "*/lib/real-data"],
            message: "real-data.ts contains PHI — read from DB via data.server.ts",
          },
          {
            group: ["*/lib/seed-data*"],
            message: "seed-data.ts is a seed-only file — use data.server.ts in routes",
          },
        ],
      }],
    },
  },
];
```
Add `"lint": "eslint app/routes app/components"` to `package.json` scripts.

### Loader Async Upgrade (`.loader()` → `async loader()`)
**Source:** `remix-app/app/routes/_app/layout.tsx` lines 11-28 (already async)
**Apply to:** All 13 route loaders being rewired
- Change `export function loader()` to `export async function loader({ request }: LoaderFunctionArgs)`
- Add `import type { LoaderFunctionArgs } from "react-router";` if not present
- React Router typegen via `Route.ComponentProps` absorbs the async→typed-loader change automatically; no component changes needed.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `remix-app/tests/parity/capture-fixtures.ts` | utility | batch | No existing fixture-capture script; this is a one-shot PHI output script (not a Vitest test); closest pattern is `seed-owner.ts` for the "run once, log output" shape but the I/O model (write JSON files) has no direct analog in the codebase |

For `capture-fixtures.ts`: use `seed-owner.ts` as the structural template (env validation, DB connection via `getDb()`, explicit console logging). The output is `fs.writeFileSync("tests/fixtures/<name>.json", JSON.stringify(data, null, 2))` for each loader's static return value.

---

## Metadata

**Analog search scope:** `remix-app/app/lib/`, `remix-app/app/routes/_app/`, `remix-app/scripts/`, `remix-app/tests/db/`, `remix-app/db/schema.ts`
**Files scanned:** 18
**Pattern extraction date:** 2026-06-10
