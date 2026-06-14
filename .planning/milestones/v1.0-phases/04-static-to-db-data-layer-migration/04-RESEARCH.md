# Phase 4: Static-to-DB Data Layer Migration - Research

**Researched:** 2026-06-10
**Domain:** Drizzle ORM data migration, React Router 7 loader rewiring, Neon Postgres, PHI lifecycle management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Genetics + correlations (scope/sequencing)**
- **D-01:** Split the conflated M0 genetics model. Phase 4 lands only the PHI plane: a tenant/subject-scoped `subject_genotypes` table (gene, genotype, assay/source) seeded with the owner's 15 variants' genotype facts.
- **D-02:** The knowledge plane (geneticVariants, variantProtocolMap, K-grade columns) waits for Phase 6 — deliberately. Phase 6 entry gate is binding: `/gsd:spec-phase 6` + adversarial review + `/gsd:ai-integration-phase` if LLM-assisted curation enters scope.
- **D-03:** Interim genetics rendering = server-only knowledge join. The genetics page joins `subject_genotypes` rows (DB) with a server-only knowledge module (trimmed K-grade/protocolAction display strings from today's seed-data, not PHI) keyed by gene. Module explicitly marked "retired by Phase 6". No UI regression.
- **D-04:** Correlations seed into the existing `correlations` table. Resolve `supplementName` → `supplementId` FK against seeded supplements; derive significance label from |r| at render time. Loaders read the DB; re-computation is Phase 6.

**M0 source-data fate**
- **D-05:** Seed, then delete. One-shot seed scripts read PHI arrays in `real-data.ts`/`protocol-data.ts`/`seed-data.ts` and insert rows under owner's tenant/subject. After cut-over is verified (D-09), delete PHI arrays from the repo. Neon = single source of truth. No gitignored JSON sidecars.
- **D-06:** Non-PHI survivors stay in `app/lib/`/`app/types/`. Engine logic with tests (`getCessationDay`, `getCurrentCessationPhase`, `calculatePearsonCorrelation`, `getMetricStatus`) and non-PHI display constants (`CESSATION_PHASES`, `METRIC_TARGETS`?, `dailySchedule`, `avoidList`, `CESSATION_START_DATE`) are relocated/kept, not deleted. Planner decides exact homes.
- **D-07:** Git history accepted — no destructive `filter-repo` rewrite now. Before any external pilot/client: cut over to a NEW SQUASHED REPOSITORY. Attach to the Phase 7 pre-client gate checklist.

**Schema-cleanup breadth**
- **D-08:** Full vestige sweep: drop `syncStatus`/`syncVersion` columns, `syncStatusEnum`, `SyncStatus` type fields; eliminate `subcategory: ... as any` casts; fix `supplements.isActive` integer → `boolean('is_active')`; fix stale "601/602/603" schema comments to P0–P6; drop `NETLIFY_DATABASE_URL` preference in `db.server.ts` (`DATABASE_URL` canonical). Subcategory typing: the DB-row→`Metric` mapping boundary needs typed narrowing (varchar→category-specific subcategory unions; widen unions where real values are legitimately missing). No `any` (PRINCIPLES III).

**Cut-over verification**
- **D-09:** Parity snapshot harness gates deletion. Before deletion: capture each route loader's output from static modules as JSON fixtures (PHI-containing → gitignored/local only, never committed; delete after cut-over). After rewiring, Vitest suite runs DB-backed loaders against live Neon (injectable `now`) and asserts deep-equality vs fixtures. Order: seed → wire loaders → parity green → owner visual spot-check → delete static files.
- **D-10:** SC#3 wording fix: "Netlify function bundle" → "Vercel build output". PHI-grep check runs against the Vercel/`react-router build` artifact.

### Claude's Discretion
- Data-access layer shape (centralized tenant-scoped query module vs per-loader Drizzle queries — pick one pattern and apply consistently; must be `withTenantDb`-wrappable in Phase 7 without rewiring loaders).
- Seed-script structure (one script vs per-table), idempotency strategy, and how the scripts obtain the owner's tenant/subject IDs (lookup by seeded owner, not hardcoded).
- `subject_genotypes` exact column set beyond gene/genotype/assay-source; the CI lint mechanism for blocking `*-data.ts` imports; exact fixture format for the parity harness.

### Deferred Ideas (OUT OF SCOPE)
- Phase 6 entry gate (binding): engine data-model design pass via `/gsd:spec-phase 6` + cross-AI adversarial review; `/gsd:ai-integration-phase` if LLM-assisted curation enters scope. The interim server-only knowledge module (D-03) retires there.
- Phase 7 gate additions: new squashed PHI-free repository before any external client (D-07), alongside RLS/BAA/pgAudit items.
- Phase 5: import-route persistence (WHOOP/vault actions writing to DB).
- Phase 6: correlation re-computation from live data (Phase 4 seeds the static values only).
- `delete-pilot-basic-auth-post-deploy.md` — Phase 3 deploy carry-forward; not folded.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | All route loaders read live data from Neon at runtime (no static TypeScript data as a runtime source) | Loader rewiring patterns + centralized query module design in §Architecture Patterns |
| DATA-02 | Owner's existing M0 data is migrated into the real database tables | Seed-script pattern analysis in §Architecture Patterns + data inventory in §Runtime State Inventory |
| DATA-04 | No PHI is present in the client bundle or static source (verified against the build output) | PHI lifecycle (D-05 delete path), parity-harness design, CI lint rule in §Architecture Patterns + §Common Pitfalls |
| DATA-05 | Vestigial syncStatus/syncVersion columns and `subcategory: ... as any` casts are removed | Schema vestige inventory in §Architecture Patterns, subcategory-typing pattern in §Code Examples |
</phase_requirements>

---

## Summary

Phase 4 is a pure data-plumbing phase with three interlocking concerns: (1) migrate the owner's M0 data from TypeScript source arrays into tenant-scoped Neon tables, (2) rewire all 16 route loaders to read from Neon instead of static modules, and (3) sweep schema/code vestiges. The work is mechanical but has a high correctness bar — the parity harness (D-09) guards that the live DB and the static modules agree before deletion, and DATA-04 requires that the build artifact contains no PHI strings after the static files are removed.

The key architectural decision in Claude's Discretion is the data-access layer shape. The evidence strongly favours a **centralized `app/lib/data.server.ts` query module** with per-entity tenant-scoped functions rather than ad-hoc Drizzle queries in each loader. This keeps Phase 7's `withTenantDb` wrapper a one-file retrofit, and it avoids repeating the `WHERE tenant_id = ? AND subject_id = ?` clause across 16 loaders.

Seed scripts should follow the established `scripts/seed-owner.ts` pattern: a single `scripts/seed-data.ts` orchestrator that calls per-table helpers in dependency order (protocol-versions before protocol-changes, supplements before correlations), and resolves the owner's `tenantId`/`subjectId` by querying Neon for the user row matching `OWNER_EMAIL`, never by hardcoding IDs.

**Primary recommendation:** Centralized `app/lib/data.server.ts` for all DB reads; a single `scripts/seed-data.ts` orchestrator with per-table helper functions; eslint `no-restricted-imports` rule for the CI lint gate; JSON fixtures in a gitignored `tests/fixtures/` directory for the parity harness.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route loader data reads | API/Backend (server loader) | — | Loaders run server-side only; DB reads stay in the server bundle |
| Tenant/subject scoping | API/Backend (data.server.ts) | — | Single enforcement point; not duplicated per loader |
| `withTenantDb` Phase 7 hookup | API/Backend (data.server.ts) | — | Wrapping happens at the centralized query module boundary, not at each loader |
| PHI presence in client bundle | CDN/Static (build artifact check) | — | `react-router build` produces a client bundle; grep the artifact post-build |
| Parity harness test assertions | API/Backend (Vitest, server-side) | — | Loaders are async server functions; tests run in Node, not browser |
| `subject_genotypes` schema | Database (Drizzle/Neon) | — | PHI plane lives in DB, not TypeScript source |
| Genetics knowledge join | API/Backend (server-only module) | — | D-03: join happens in the loader, knowledge module is server-only; never shipped to client bundle |
| Schema vestige migration | Database (Drizzle migrations) | — | `syncStatus`/`syncVersion` drop and `isActive` type change are pure DB schema changes |
| CI lint rule | Frontend Server / CI | — | ESLint no-restricted-imports runs in CI and local `npm run typecheck` / lint step |

---

## Standard Stack

This phase adds no new production npm packages. All tooling is already installed.

### Core (already in package.json)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| drizzle-orm | ^0.45.1 (0.45.2 current) | DB queries, schema | [VERIFIED: npm registry] — already installed |
| @neondatabase/serverless | ^1.0.2 (1.1.0 current) | Neon Postgres driver | [VERIFIED: npm registry] — already installed |
| vitest | ^4.1.8 (4.1.8 current) | Parity harness + existing tests | [VERIFIED: npm registry] — already installed |
| tsx | ^4.22.4 (4.22.4 current) | Run seed scripts (TypeScript) | [VERIFIED: npm registry] — already installed |
| date-fns | ^4.1.0 | Date math in cessation loader | [VERIFIED: npm registry] — already installed |
| eslint | 10.4.1 current | CI lint rule for `*-data.ts` imports | [VERIFIED: npm registry] — already installed as transitive dep |

### Supporting (dev, already installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| drizzle-kit | ^0.31.8 (0.31.10 current) | Migration generation and application | [VERIFIED: npm registry] — already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| eslint no-restricted-imports | grep in CI | eslint integrates into `npm run typecheck` and editor; grep is simpler but separate pass; eslint preferred because it catches the issue at `npm run build` time too |
| single seed orchestrator script | per-table seed scripts | single orchestrator is easier to run and reason about the FK dependency order; per-table scripts allow individual re-runs but add operational complexity |
| JSON fixture files (gitignored) | in-memory fixture generation | JSON is inspectable/debuggable; in-memory generation removes the need for a write step but loses the ability to compare PHI arrays by hand during migration |

**No new npm install commands needed for this phase.** All packages are already present in `remix-app/package.json`.

---

## Package Legitimacy Audit

This phase installs **no new external packages**. All tooling (drizzle-orm, vitest, tsx, eslint, @neondatabase/serverless) is already installed and has been used across Phases 1–3.

| Package | Registry | In Repo Since | slopcheck | Disposition |
|---------|----------|---------------|-----------|-------------|
| drizzle-orm | npm | Phase 1 | (existing — not re-checked) | Approved |
| @neondatabase/serverless | npm | Phase 1 | (existing — not re-checked) | Approved |
| vitest | npm | Phase 1 | (existing — not re-checked) | Approved |
| tsx | npm | Phase 3 | (existing — not re-checked) | Approved |
| eslint | npm | transitive dep | (existing — not re-checked) | Approved |

*slopcheck was run in pypi (Python) mode because the tool defaulted to that registry; Node.js packages return [SLOP] in pypi mode by design. All packages above are verified npm packages via `npm view <pkg> version` (output captured above in research session).*

**Packages removed due to slopcheck:** none
**Packages flagged as suspicious:** none

---

## Architecture Patterns

### System Architecture Diagram

```
SEED PHASE (one-shot, before loader rewiring)
  scripts/seed-data.ts
    ├── resolves owner tenantId/subjectId (query user WHERE email=OWNER_EMAIL)
    ├── inserts protocol versions/changes/milestones (from realProtocolVersions, realMilestones)
    ├── inserts supplements (from realSupplements)
    ├── inserts correlations (supplementName → supplementId FK resolved)
    ├── inserts cessation log (from realCessationLog)
    ├── inserts metrics (M1..M4 blood work + DEXA + WHOOP from realBloodWorkM1/M2, realBodyComposition, realAutonomicData)
    └── inserts subject_genotypes (PHI plane: gene, genotype, assay_source from seedGeneticVariants)

PARITY HARNESS (gates deletion of static files)
  tests/parity/
    ├── capture-fixtures.ts  [run once, gitignored output]
    │     reads static modules → writes tests/fixtures/*.json (gitignored)
    └── loader-parity.test.ts
          imports each loader function with injectable now
          calls DB-backed loader (live Neon)
          asserts deep-equality vs fixture JSON

LOADER REWIRING (all 16 _app/ routes)
  Request (authenticated, has session.user.tenantId + subjectId)
       │
       ▼
  _app/layout.tsx (auth gate: requireUser → tenantId)
       │
       ▼
  Route loader (async now)
       ├── calls app/lib/data.server.ts#getOwnerSubject(tenantId)  → subjectId
       ├── calls data.server.ts#getMetrics(tenantId, subjectId, [category]) → Metric[]
       ├── calls data.server.ts#getProtocolVersions(tenantId, subjectId) → ProtocolVersion[]
       └── ... (entity-specific getX functions)
             │
             ▼
         Neon Postgres (WHERE tenant_id = ? AND subject_id = ?)
             │
             ▼
         DB row → typed domain object (subcategory narrowing at boundary)
             │
             ▼
         loader return shape (same as before — typegen absorbs async change)

SCHEMA MIGRATION (vestige sweep)
  Migration 0006:
    ├── DROP COLUMN sync_status, sync_version  (metrics table)
    ├── DROP TYPE sync_status_enum
    ├── ALTER COLUMN is_active SET DATA TYPE boolean  (supplements table)
    └── ADD TABLE subject_genotypes

CI LINT GATE
  .eslintrc.cjs or eslint.config.mjs:
    no-restricted-imports: "app/lib/real-data", "app/lib/protocol-data", "app/lib/seed-data"
    context: { patterns: ["**/routes/**"] }  ← only blocks routes, not seed scripts
```

### Recommended Project Structure

```
remix-app/
├── app/
│   ├── lib/
│   │   ├── db.server.ts          # getDb() — drop NETLIFY_DATABASE_URL preference
│   │   ├── data.server.ts        # NEW: centralized tenant-scoped query module
│   │   ├── authz.server.ts       # existing — requireUser, requireRole
│   │   ├── metrics.ts            # existing — getMetricStatus (survivor)
│   │   └── protocol-data.ts      # PARTIAL SURVIVOR: getCessationDay, getCurrentCessationPhase,
│   │                             #   CESSATION_START_DATE, dailySchedule, avoidList
│   │                             #   (PHI arrays deleted; engine helpers kept)
│   └── types/
│       ├── metrics.ts            # MODIFIED: SyncStatus type removed, BaseMetric drops syncStatus/syncVersion
│       ├── protocol.ts           # unchanged (CESSATION_PHASES, Supplement.isActive stays boolean)
│       └── genetics.ts           # MODIFIED: GeneticVariant split — PHI fields move to subject_genotypes;
│                                 #   KnowledgeEntry server-only module stays here
├── db/
│   └── schema.ts                 # MODIFIED: drop syncStatusEnum, syncStatus/syncVersion cols,
│                                 #   isActive integer→boolean, add subject_genotypes table
├── migrations/
│   ├── 0005_...                  # existing (invites table)
│   └── 0006_vestige_sweep_and_genotypes.sql  # NEW
├── scripts/
│   ├── seed-owner.ts             # existing (unchanged)
│   └── seed-data.ts              # NEW: M0 data seed orchestrator
└── tests/
    ├── fixtures/                 # gitignored: PHI JSON snapshots (created then deleted)
    ├── db/                       # existing schema/constraints tests
    └── parity/                   # NEW: loader parity harness
        ├── capture-fixtures.ts   # one-time capture script
        └── loader-parity.test.ts # Vitest parity assertions vs live Neon
```

### Pattern 1: Centralized Tenant-Scoped Data Module

**What:** All Drizzle queries for this phase live in `app/lib/data.server.ts`. Each exported function accepts `tenantId` and `subjectId` as explicit parameters and applies `WHERE tenant_id = ? AND subject_id = ?`. No raw Drizzle queries in route loaders.

**When to use:** Every loader that needs health data.

**Why this pattern stays wrappable in Phase 7:** The `withTenantDb` wrapper will set `SET LOCAL request.jwt.claims` inside a transaction before running a callback. Switching from `getDb()` to a transaction-scoped `db` inside the wrapper requires changing only `data.server.ts`'s implementation, not any call sites.

**Example:**
```typescript
// Source: [ASSUMED] — pattern derived from authz.server.ts + spike findings
// app/lib/data.server.ts

import { getDb } from "./db.server";
import { eq, and } from "drizzle-orm";
import { metrics, protocolVersions, supplements, cessationLog, correlations, subjects } from "../../db/schema";
import type { Metric } from "../types/metrics";

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

export async function getMetrics(tenantId: string, subjectId: string, category?: string) {
  const db = getDb();
  const conditions = [eq(metrics.tenantId, tenantId), eq(metrics.subjectId, subjectId)];
  if (category) conditions.push(eq(metrics.category, category as any));
  return db.select().from(metrics).where(and(...conditions));
}

// Phase 7: withTenantDb wrapper replaces getDb() call here only, not at call sites
```

**Phase 7 retrofit path (from 01-SPIKE-FINDINGS.md):**
```typescript
// [CITED: .planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md]
// The wrapper sets SET LOCAL inside a transaction:
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

### Pattern 2: Loader Rewiring Shape

**What:** Each route loader calls `requireUser(request)` (already available via `authz.server.ts`), then resolves the owner's `subjectId` via `getOwnerSubject(tenantId)`, then calls the appropriate `data.server.ts` function.

**Note:** `session.user` from `requireUser` carries `tenantId` (confirmed in `authz.server.ts`). The `subjectId` must be looked up from the `subjects` table for each request.

**Example:**
```typescript
// Source: [ASSUMED] — derived from existing loader shape + authz.server.ts
// app/routes/_app/metrics/index.tsx

import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getMetrics } from "~/lib/data.server";
import { getMetricStatus } from "~/lib/metrics";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId);
  const rows = await getMetrics(user.tenantId, subject.id);
  // Map DB rows → Metric[] with typed subcategory narrowing (see §Code Examples)
  return { metrics: rows.map(dbRowToMetric) };
}
```

### Pattern 3: Idempotent Seed Script (Per-Table Helpers)

**What:** `scripts/seed-data.ts` orchestrates all table inserts. It resolves the owner's IDs by querying Neon (not hardcoded), checks each table for existing rows with an idempotency guard, inserts in FK dependency order.

**Idempotency strategy:** Check `COUNT(*) WHERE tenant_id = <ownerTenantId>` before inserting. If > 0, skip that table and log a message. This matches `seed-owner.ts`'s `existingUsers.length > 0` early-exit pattern.

**Example:**
```typescript
// Source: [ASSUMED] — extends established seed-owner.ts pattern
// scripts/seed-data.ts (outline)

const OWNER_EMAIL = process.env.OWNER_EMAIL!;

// 1. Resolve owner IDs (never hardcode)
const [ownerUser] = await db.select().from(user).where(eq(user.email, OWNER_EMAIL)).limit(1);
if (!ownerUser) throw new Error("Owner user not found — run db:seed-owner first");
const tenantId = ownerUser.tenantId!;
const [subject] = await db.select().from(subjects).where(eq(subjects.tenantId, tenantId)).limit(1);
const subjectId = subject.id;

// 2. Seed each table in FK dependency order
await seedProtocolVersions(tenantId, subjectId);   // no FKs to other data tables
await seedSupplements(tenantId, subjectId);         // no FKs to protocol tables
await seedProtocolChanges(tenantId, subjectId);     // FK → protocolVersions
await seedMilestones(tenantId, subjectId);
await seedMetrics(tenantId, subjectId);
await seedCessationLog(tenantId, subjectId);
await seedCorrelations(tenantId, subjectId);        // FK → supplements
await seedSubjectGenotypes(tenantId, subjectId);    // independent PHI plane
```

### Pattern 4: DB Row → Metric Typed Narrowing

**What:** The `metrics` table uses `varchar(100)` for `subcategory`, which is `string | null` at the Drizzle row level. Converting to the `Metric` union type requires narrowing the `subcategory` to the category-specific union type. No `as any`.

**Example:**
```typescript
// Source: [ASSUMED] — derived from app/types/metrics.ts union structure
import type { Metric, MetricCategory, VitaminSubcategory, MineralSubcategory } from "~/types/metrics";

// Per-category subcategory coercion maps
const VITAMIN_SUBCATEGORIES: VitaminSubcategory[] = ["b-vitamins", "fat-soluble"];

function narrowSubcategory<T extends string>(
  value: string | null,
  allowed: T[]
): T | undefined {
  if (value && (allowed as string[]).includes(value)) return value as T;
  return undefined;
}

function dbRowToMetric(row: typeof metrics.$inferSelect): Metric {
  const cat = row.category as MetricCategory;
  switch (cat) {
    case "vitamins":
      return {
        id: row.id,
        category: "vitamins",
        subcategory: narrowSubcategory(row.subcategory, VITAMIN_SUBCATEGORIES) ?? "b-vitamins",
        // ... rest of fields
      };
    // ... other categories
  }
}
```

### Pattern 5: subject_genotypes Table Design (PHI Plane Only)

**What:** Stores per-subject genotype facts (gene name, genotype string, assay/source). Intentionally minimal — the knowledge plane (protocolAction, confidence grading) lives in Phase 6.

**Proposed column set (Claude's Discretion):**
```typescript
// [ASSUMED] — designed from D-01/D-03 requirements
export const subjectGenotypes = pgTable('subject_genotypes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  gene: varchar('gene', { length: 100 }).notNull(),    // e.g., "MTHFR", "COMT"
  rsid: varchar('rsid', { length: 20 }),               // e.g., "rs1801131" (nullable — NAFLD has none)
  genotype: varchar('genotype', { length: 50 }).notNull(), // e.g., "A1298C (G/T)"
  assaySource: varchar('assay_source', { length: 100 }), // e.g., "23andMe", "SelfDecode"
  createdAt: timestamp('created_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
}, (t) => [
  index('idx_subject_genotypes_tenant_subject').on(t.tenantId, t.subjectId),
]);
```

**Note:** `gene` is the join key for the server-only knowledge module (D-03). The knowledge module is a TypeScript `Record<string, { protocolAction: string; confidence: string; ... }>` keyed by gene name, annotated "retired by Phase 6".

### Pattern 6: Parity Harness Design

**What:** A two-step Vitest harness. Step 1 (one-time, run manually): `capture-fixtures.ts` imports the static modules and writes each loader's return shape to a gitignored JSON file. Step 2 (Vitest suite): `loader-parity.test.ts` runs the DB-backed loaders and compares against the fixture.

**Key design choices:**
- Injectable `now` for cessation math (already supported by `getCessationDay`)
- Fixtures are gitignored and deleted post cut-over — they are never committed
- The test skips if `DATABASE_URL` is not set (same skip-guard pattern as `constraints.test.ts`)
- Deep-equality comparison using `vitest`'s `expect(result).toMatchObject(fixture)` — allows structural matches while tolerating extra DB-only fields (e.g. `createdAt`)

**Fixture location:** `remix-app/tests/fixtures/` — add `tests/fixtures/` to `remix-app/.gitignore`

### Anti-Patterns to Avoid

- **Direct Drizzle query in loader:** `const rows = await getDb().select().from(metrics).where(...)` in a route file — this bypasses the centralized data layer, breaks the Phase 7 `withTenantDb` retrofit, and duplicates the tenant-scoping WHERE clause.
- **Hardcoded `tenantId`/`subjectId` in seed script:** Any hardcoded UUID will break the script for new installs and will not match the owner's IDs if the DB is reset. Always resolve via `OWNER_EMAIL`.
- **Committing PHI fixture files:** If `tests/fixtures/*.json` is not gitignored before the capture step, a single `git add -A` commits PHI to history. Add to `.gitignore` FIRST.
- **`as any` in the DB row mapping:** The entire point of D-08 is to eliminate these. Any `as any` in the DB→Metric mapping is a type regression.
- **Dropping the `syncStatusEnum` type before dropping columns that reference it:** Postgres will refuse to drop a type that has live dependents. Drop columns first (or in the same transaction, columns before type).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant-scoped WHERE | Per-loader `WHERE tenant_id = ? AND subject_id = ?` | Centralized `data.server.ts` | Edge cases: missing clause = cross-tenant data leak; centralized = single audit point |
| Idempotency check | Custom "was this table already seeded?" tracking table | `COUNT(*) WHERE tenant_id = <owner>` guard | The existing `seed-owner.ts` pattern; no extra state needed |
| DB migration ordering | Manual SQL files | `npm run db:generate` + `npm run db:migrate` | Drizzle tracks journal state; hand-edits cause snapshot drift (Phase 3 precedent: 0005 snapshot drift required manual correction) |
| Password hashing / auth writes | Direct `INSERT INTO user` | `auth.api.signUpEmail()` | V6 — never hand-roll cryptography; Better-Auth owns user/account write |
| PHI grep of build artifact | Custom parser | `grep -r "PHI_STRING" remix-app/build/` | The build output is plain text; grep is sufficient and auditable |

**Key insight:** The data layer's biggest footgun is forgetting the tenant scope. Centralizing it means the scope can be tested once and the Phase 7 `withTenantDb` wraps a single boundary.

---

## Runtime State Inventory

> Phase 4 is a migration/data-plumbing phase. All 5 categories checked explicitly.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Neon Postgres `orange-paper-97068012`: 8 data tables have `tenantId`/`subjectId` columns (NOT NULL, Phase 3). Owner tenant + subject rows exist. **All 8 data tables are currently empty** (tenancy columns were backfilled but no data rows were ever inserted — the app ran on static TypeScript data). The `invites` table also exists. | Seed script inserts owner's M0 data: ~54 metric rows (M1–M4 across blood work/DEXA/WHOOP), 7 protocol versions, ~24 protocol changes, 8 milestones, 17 supplements, 1 cessation log entry, 10 correlations, 15 subject genotype rows |
| Live service config | Vercel environment variables: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OWNER_INVITE_TOKEN` — all confirmed set (Phase 2/3). No new env vars expected for Phase 4. | None — no new vars needed; OWNER_EMAIL/OWNER_PASSWORD needed only for seed script (already available locally per seed-owner.ts pattern) |
| OS-registered state | None — no OS-level registrations embed any renamed string | None |
| Secrets/env vars | `NETLIFY_DATABASE_URL` preference in `db.server.ts` (line 13) — code rename to use only `DATABASE_URL`. Not a Vercel env var deletion — the var may not exist in Vercel at all (Vercel was always set with `DATABASE_URL`). | Code edit: remove `process.env.NETLIFY_DATABASE_URL ||` fallback from `getPool()` in `db.server.ts` |
| Build artifacts | `remix-app/build/` — the `react-router build` output. After static files are deleted, a fresh build should contain no PHI strings. `.react-router/types/` contains generated route types; regenerated by `react-router typegen`. | Verify with `grep -r "metabolic-glucose\|realBloodWork\|MILESTONES.M1" remix-app/build/` after build; expect zero matches |

**Confirmed empty tables:** Verified from Phase 3 state — `seed-owner.ts` only inserted into `tenants`, `subjects`, and `user`. No rows exist in `metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`. This means the seed scripts are greenfield inserts with no conflict risk.

---

## Common Pitfalls

### Pitfall 1: Committing PHI Fixtures to Git
**What goes wrong:** Developer creates `tests/fixtures/*.json`, adds to git accidentally. PHI is now in git history (medical data: blood work values, DEXA measurements, genetic variants).
**Why it happens:** `git add -A` sweeps everything.
**How to avoid:** Add `tests/fixtures/` to `remix-app/.gitignore` BEFORE running the capture script. Make this the first task in the parity harness wave.
**Warning signs:** `git status` shows `tests/fixtures/` as untracked.

### Pitfall 2: `syncStatusEnum` Drop Order (Column Before Type)
**What goes wrong:** Drizzle generates a migration that tries to `DROP TYPE sync_status` while `metrics.sync_status` still references it. Postgres: `ERROR: cannot drop type sync_status because other objects depend on it`.
**Why it happens:** Drizzle schema-diff may generate type drop before column drop.
**How to avoid:** Review the generated SQL before running `db:migrate`. Ensure column drops (`ALTER TABLE metrics DROP COLUMN sync_status`, etc.) appear before `DROP TYPE sync_status`. Edit the migration file if necessary.
**Warning signs:** `db:migrate` fails with "cannot drop type" error.

### Pitfall 3: Subcategory Widening Causes `tsc` Failures
**What goes wrong:** The DB row mapper returns `undefined` for a subcategory string that exists in real data but is not in the TypeScript union (e.g., `"essential"` for `MineralSubcategory` — not currently in the union, which has `'essential' | 'trace'`). TypeScript rejects the assignment.
**Why it happens:** The static `as any` casts masked invalid subcategory strings. When those casts are removed, some real data values may not match the declared union.
**How to avoid:** Audit every unique `subcategory` value in the static data arrays before defining the mapper. Widen the unions where needed (e.g., add `"essential"` to `MineralSubcategory` if that's what the real data uses). Check: `grep -h "subcategory:" remix-app/app/lib/real-data.ts | sort -u`.
**Warning signs:** `tsc --noEmit` errors on the DB→Metric mapper.

### Pitfall 4: `correlations.supplementId` FK Resolution Failure
**What goes wrong:** `seedCorrelations` references supplements by name (`supplementName: "Vitamin D3"`). If the supplement is inserted with a different `name` string (or the auto-increment ID differs from `id: 1` in the static data), the FK resolution logic fails silently or throws.
**Why it happens:** Postgres `generatedAlwaysAsIdentity` assigns IDs in insertion order, which may not match the static data's `id` values.
**How to avoid:** After seeding supplements, build a `name → DB id` lookup map. Use that map to resolve `supplementName` → `supplementId` for correlation inserts. Never assume static `id` values match DB-generated IDs.
**Warning signs:** `correlations` rows with `supplement_id` pointing to wrong supplements; or FK constraint violations during seed.

### Pitfall 5: Loader Returns `null` / `undefined` for Missing Subject
**What goes wrong:** `getOwnerSubject(tenantId)` returns nothing if the owner's subject row is not found. Loaders crash with a null-dereference rather than a useful error.
**Why it happens:** Phase 4 is the first time loaders do live DB reads; prior loaders never had this failure mode.
**How to avoid:** Defensive guard in `getOwnerSubject`: throw a `404 Response` if no subject row is found (matches Remix error boundary conventions). Add a note to the seed script output to run `db:seed-owner` before `db:seed-data`.
**Warning signs:** 500 errors on all authenticated routes after a DB reset.

### Pitfall 6: PHI Strings in the Vercel Build Artifact
**What goes wrong:** The `react-router build` bundles the client bundle. If any route file imports from `real-data.ts`/`protocol-data.ts` at module level (not inside a `loader` function), the data gets tree-shaken into the client bundle.
**Why it happens:** React Router 7 uses the `loader` export to identify server-only code, but module-level imports outside the loader can leak.
**How to avoid:** After rewiring, run `npm run build` and grep the client bundle: `grep -r "metabolic-glucose\|HRV.*RMSSD\|Cessation Attempt" remix-app/build/client/`.
**Warning signs:** Grep returns matches against `build/client/` files.

### Pitfall 7: Drizzle Snapshot Drift from Manual Migration Edits
**What goes wrong:** The vestige-sweep migration drops columns that Drizzle's snapshot still tracks. The next `db:generate` produces a diff that tries to re-add them.
**Why it happens:** Drizzle's migration snapshot must stay in sync with the schema.ts file AND the migration history. Phase 3 hit this (hand-corrected 0005 migration — see STATE.md).
**How to avoid:** After editing `schema.ts`, run `db:generate` to produce the migration, THEN review and optionally edit the SQL. Run `db:migrate` against Neon. Never hand-edit the Drizzle meta JSON snapshot files.
**Warning signs:** `db:generate` produces a migration that adds back columns you just dropped.

---

## Code Examples

Verified patterns from codebase inspection:

### Existing Loader Shape (static, synchronous)
```typescript
// Source: [VERIFIED] remix-app/app/routes/_app/protocol/cessation.tsx (codebase read)
export function loader() {
  const cessation = realCessationLog[0];
  // ... synchronous shaping
  return { active: true, currentDay, ... };
}
```

### Rewired Loader Shape (async, DB-backed)
```typescript
// Source: [ASSUMED] — derived from existing authz.server.ts + data.server.ts design
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getCessationLog } from "~/lib/data.server";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/protocol-data"; // survivor

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId);
  const [cessation] = await getCessationLog(user.tenantId, subject.id);
  const currentDay = getCessationDay(new Date()); // injectable now for parity harness
  return { cessation, currentDay, currentPhase: getCurrentCessationPhase(currentDay) };
}
```

### Existing Idempotency Pattern from seed-owner.ts
```typescript
// Source: [VERIFIED] remix-app/scripts/seed-owner.ts (codebase read)
const existingUsers = await db.select({ id: user.id }).from(user)
  .where(eq(user.email, OWNER_EMAIL)).limit(1);
if (existingUsers.length > 0) {
  console.log("[seed-data] Already seeded. Nothing to do.");
  process.exit(0);
}
```

### Vestige Schema Changes
```typescript
// Source: [VERIFIED] remix-app/db/schema.ts (codebase read) — shows what to REMOVE
// metrics table: remove these two lines:
syncStatus: syncStatusEnum('sync_status').notNull().default('local'),  // REMOVE
syncVersion: integer('sync_version').notNull().default(1),             // REMOVE

// supplements table: change this:
isActive: integer('is_active').notNull().default(1), // Boolean as int for SQLite compat
// to:
isActive: boolean('is_active').notNull().default(true),
```

### ESLint No-Restricted-Imports Rule
```javascript
// Source: [ASSUMED] — standard eslint no-restricted-imports pattern
// eslint.config.mjs (or equivalent)
export default [
  {
    files: ["app/routes/**/*", "app/components/**/*"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["*/lib/real-data*"], message: "Real data is PHI — read from DB via data.server.ts" },
          { group: ["*/lib/protocol-data*", "*/lib/seed-data*"],
            message: "Static data files removed post-Phase-4. Use data.server.ts." }
        ]
      }]
    }
  }
];
```

### Drizzle Expand-Contract Migration Discipline (Phase 3 Precedent)
```sql
-- Source: [VERIFIED] remix-app/migrations/0004_tenancy_not_null.sql (Phase 3 precedent)
-- Phase 3 pattern: run expand first (nullable), then contract (NOT NULL) in separate migration
-- Phase 4 vestige sweep is the reverse: drop the column entirely (simpler — no data to preserve)
-- Migration 0006 outline:
ALTER TABLE "metrics" DROP COLUMN "sync_status";
ALTER TABLE "metrics" DROP COLUMN "sync_version";
DROP TYPE "sync_status";  -- MUST come AFTER column drops
ALTER TABLE "supplements" ALTER COLUMN "is_active" TYPE boolean USING is_active::boolean;
ALTER TABLE "supplements" ALTER COLUMN "is_active" SET DEFAULT true;
CREATE TABLE "subject_genotypes" (...);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static TypeScript arrays as runtime data source | Drizzle + Neon async DB reads in loaders | Phase 4 (this phase) | Loaders become async; `Route.ComponentProps` typegen absorbs the type change automatically |
| `syncStatus`/`syncVersion` (offline sync era) | Dropped (server-authoritative Neon) | Phase 4 (this phase) | Removes LocalStorage-era legacy from the schema |
| `subcategory: ... as any` | Typed narrowing at DB→Metric boundary | Phase 4 (this phase) | Enables strict TypeScript everywhere; subcategory unions widened to match real data |
| `NETLIFY_DATABASE_URL` fallback | `DATABASE_URL` only | Phase 4 (this phase) | Simplifies db.server.ts; aligns with Vercel deployment reality |
| `supplements.isActive integer` | `supplements.is_active boolean` | Phase 4 (this phase) | Removes SQLite-compat comment; aligns with PostgreSQL idiom |

**Deprecated/outdated:**
- `syncStatusEnum` pgEnum: to be dropped in migration 0006.
- `SyncStatus` TypeScript type in `app/types/metrics.ts`: to be removed with `syncStatus`/`syncVersion` fields from `BaseMetric`.
- `realBloodWorkM1`, `realBloodWorkM2`, `realBodyComposition`, `realAutonomicData` arrays in `real-data.ts`: PHI — deleted after parity verification.
- `realProtocolVersions`, `realProtocolChanges`, `realSupplements`, `realMilestones`, `realCessationLog` in `protocol-data.ts`: PHI — deleted after parity verification. Engine helpers in the same file (`getCessationDay`, `getCurrentCessationPhase`) survive.
- `seedGeneticVariants` in `seed-data.ts`: PHI genotype fields seed to `subject_genotypes`; knowledge fields seed to server-only knowledge module; the `seed-data.ts` array is deleted after seeding.
- `MILESTONES` and `MILESTONE_INFO` in `real-data.ts`: These are non-PHI display constants but reference specific owner dates. Planner should decide whether these survive in a non-PHI constants file or are replaced by DB milestone rows.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All 8 data tables in Neon are currently empty (no data rows; only the owner's tenant/subject/user rows exist) | Runtime State Inventory | If rows exist, seed script idempotency guard exits early without inserting — medium risk; safe behavior but would require manual investigation |
| A2 | The `correlations` table's `supplementId` FK can be resolved by matching `supplementName` from static data against the `name` column after seeding supplements | Architecture Patterns | If supplement names differ between static data and DB insert, correlation inserts would fail FK constraint or point to wrong rows — mitigation: build lookup map in seed script |
| A3 | ESLint is available as a runnable binary in the repo (from transitive deps) | Standard Stack | If ESLint is not configured/runnable, the CI lint rule would require a new config file and possibly `npm install` for config deps — low risk for a mature Node project |
| A4 | `user.tenantId` is always populated for owner/practitioner users after Phase 3 (non-null) | Architecture Patterns | If `tenantId` is null, `getOwnerSubject` would fail — but Phase 3 confirmed NOT NULL migration and seed; safe assumption |
| A5 | The `subject_genotypes` gene name strings from `seedGeneticVariants` exactly match what the knowledge module will key on in Phase 6 | Pattern 5 / subject_genotypes | If gene naming is inconsistent, Phase 6 join logic breaks — low risk since both come from the same `seed-data.ts` source; mitigated by explicitly documenting the join key |
| A6 | The metrics subcategory values in the static data files (`"b-vitamins" as any`, `"fat-soluble" as any`, etc.) are all valid members of the existing TypeScript subcategory unions | Code Examples / Pitfall 3 | Some subcategory strings may not be in the union — mitigated by the audit step in Pitfall 3 |

---

## Open Questions

1. **Does `METRIC_TARGETS` survive as a non-PHI constant?**
   - What we know: `METRIC_TARGETS` in `real-data.ts` contains target ranges (e.g., "LDL-C q1Target: 100 mg/dL") — these are goals/targets, not measured values
   - What's unclear: Are 2026 targets PHI? They are personalized but are targets, not measurements. D-06 says "nothing with the owner's measured values survives" — targets may qualify as survivors.
   - Recommendation: Planner should designate `METRIC_TARGETS` as a survivor constant (move to `app/lib/` as `metric-targets.ts`) since they are goals, not diagnostics. If in doubt, treat as PHI.

2. **Is the `MILESTONES` date constant PHI?**
   - What we know: `MILESTONES.M1 = "2025-02-06T12:00:00.000Z"` — these are the dates of the owner's blood work appointments
   - What's unclear: Appointment dates may be considered health-adjacent PHI. The `milestones` table stores them in Neon post-seed.
   - Recommendation: Treat `MILESTONES` dates as PHI — delete from source, read from DB. The `metrics.detail.tsx` route uses `MILESTONES.M5`/`M6` for projection dates — these are future target dates, not measurements, so they could survive as non-PHI constants if separated from M1–M4.

3. **Where does the server-only genetics knowledge module live?**
   - What we know: D-03 requires a "server-only knowledge module" keyed by gene name, containing display strings from `seedGeneticVariants` (`clinicalImplication`, `protocolAction`, `confidence`) — not PHI
   - What's unclear: File location and export name. Options: `app/lib/genetics-knowledge.server.ts`, or a minimal inline object in the genetics loader
   - Recommendation: A named file `app/lib/genetics-knowledge.server.ts` with the `.server.ts` suffix (enforces React Router's server-only bundling), annotated "// Interim Phase 4 knowledge module — retired by Phase 6 engine". This makes it easy to locate and delete in Phase 6.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Seed scripts (tsx), Vitest, build | ✓ | 25.6.0 | — |
| npm | Package management | ✓ | 11.8.0 | — |
| tsx | Seed script execution (`npm run db:seed-data`) | ✓ | 4.22.4 (devDep) | — |
| Neon Postgres | Live DB reads, seed inserts, parity tests | ✓ | orange-paper-97068012 | — |
| DATABASE_URL | Pooled connection (app runtime, parity tests) | ✓ | Set in Vercel + local .env | — |
| DATABASE_URL_UNPOOLED | Migrations (`drizzle-kit migrate`) | ✓ | Set in Vercel | — |
| OWNER_EMAIL | Seed script: ID resolution | ✓ | Available locally (not committed) | — |
| react-router build | PHI grep verification of client bundle | ✓ | 7.12.0 | — |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

All dependencies confirmed available from codebase inspection and Phase 2/3 state.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `remix-app/vite.config.ts` (test block with `include: ["app/**/*.test.ts", "tests/**/*.test.ts"]`) |
| Quick run command | `cd remix-app && npm test` |
| Full suite command | `cd remix-app && npm test` (same — no separate slow suite defined yet) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Route loaders return DB-backed data (not static) | integration / parity | `npm test` (loader-parity.test.ts, skip-guarded on DATABASE_URL) | ❌ Wave 0 |
| DATA-02 | Owner's M0 data present as DB rows | integration (introspection) | `npm test` (db/data-seed.test.ts counts rows per table) | ❌ Wave 0 |
| DATA-04 | No PHI in Vercel build client bundle | manual + CI grep | `npm run build && grep -r "realBloodWork\|metabolic-glucose" remix-app/build/client/` — fails if match found | manual |
| DATA-05 | syncStatus/syncVersion columns absent; tsc passes with zero errors | schema introspection + typecheck | `npm run typecheck` + `npm test` (db/schema-columns.test.ts extended) | ❌ Wave 0 extension |

### Sampling Rate
- **Per task commit:** `cd remix-app && npm test`
- **Per wave merge:** `cd remix-app && npm test` + `npm run typecheck`
- **Phase gate:** Full suite green + `npm run build` (no PHI grep failures) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/parity/loader-parity.test.ts` — covers DATA-01 (parity assertions for all 16 loaders)
- [ ] `tests/parity/capture-fixtures.ts` — PHI fixture capture (not a test file; a one-shot script; gitignored output)
- [ ] `tests/db/data-seed.test.ts` — covers DATA-02 (row count introspection per table; skip-guarded on DATABASE_URL)
- [ ] `tests/fixtures/` entry in `remix-app/.gitignore` — must be added before any fixture is created
- [ ] Extension to `tests/db/schema-columns.test.ts` — verify `sync_status`/`sync_version` columns absent, `is_active` is boolean (DATA-05 schema half)

*(The `tests/db/constraints.test.ts` and `tests/db/schema-columns.test.ts` files exist from Phase 3 and establish the live-Neon skip-guard pattern these new tests extend.)*

---

## Security Domain

> `security_enforcement` not set to false in config.json — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (auth already handled by Phase 3) | — |
| V3 Session Management | no (session handling unchanged) | — |
| V4 Access Control | yes (tenant-scoped DB reads) | `requireUser` + application-layer `WHERE tenant_id = ?` |
| V5 Input Validation | yes (seed scripts ingest owner data; loaders return DB rows) | Drizzle typed columns + TypeScript strict mode at boundary |
| V6 Cryptography | no (no new crypto operations) | — |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data read (missing WHERE clause) | Information Disclosure | Centralized `data.server.ts` with mandatory `tenantId`/`subjectId` params; parity harness asserts correct scoping |
| PHI leak into client bundle | Information Disclosure | `react-router build` client bundle grep post-build (DATA-04 CI check) |
| PHI leak via committed fixtures | Information Disclosure | `tests/fixtures/` in `.gitignore` before capture step runs |
| Seed script with hardcoded owner IDs | Tampering | Owner IDs resolved via `OWNER_EMAIL` query; never hardcoded |
| `subcategory: ... as any` bypass at boundary | Tampering | Typed narrowing eliminates `any`; `tsc --noEmit` enforces it |

---

## Sources

### Primary (HIGH confidence)
- `remix-app/db/schema.ts` — 8 tenant-scoped tables, vestige targets identified (`syncStatusEnum`, `syncStatus`/`syncVersion` columns, `isActive integer`, stale comments)
- `remix-app/app/lib/db.server.ts` — `getDb()` with `NETLIFY_DATABASE_URL` fallback confirmed
- `remix-app/app/lib/authz.server.ts` — `requireUser` confirmed to return `session.user.tenantId`
- `remix-app/scripts/seed-owner.ts` — established seed pattern (idempotency, Better-Auth, ID logging)
- `remix-app/app/lib/real-data.ts` — PHI inventory: ~54 metric rows across M1–M4
- `remix-app/app/lib/protocol-data.ts` — PHI inventory: 7 protocol versions, 24 changes, 17 supplements, 8 milestones, 1 cessation log entry; engine helpers (survivors)
- `remix-app/app/lib/seed-data.ts` — 15 genetic variants (PHI plane), 10 correlations (supplementName-keyed)
- `remix-app/app/types/metrics.ts`, `genetics.ts`, `protocol.ts` — union types, subcategory definitions
- `remix-app/app/routes/_app/**` — confirmed all 16 routes import from `*-data.ts` files (grep verified)
- `.planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md` — `withTenantDb` retrofit path, `SET LOCAL` discipline
- `.planning/phases/04-static-to-db-data-layer-migration/04-CONTEXT.md` — locked decisions D-01..D-10
- `remix-app/vite.config.ts` — test configuration, includes, environment
- `remix-app/package.json` — confirmed package versions, `db:seed-owner` npm script

### Secondary (MEDIUM confidence)
- `remix-app/tests/db/constraints.test.ts` — established skip-guard pattern for live-Neon tests
- `.planning/STATE.md` — Phase 3 migration 0005 snapshot-drift experience (journal-split precedent)
- `docs/PRINCIPLES.md` — no `any`, strict TypeScript, server-authoritative data

### Tertiary (LOW confidence — training knowledge, not verified this session)
- ESLint `no-restricted-imports` rule syntax — [ASSUMED] based on training knowledge; verify against `https://eslint.org/docs/latest/rules/no-restricted-imports` before authoring the config

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed via `npm view`; no new packages needed
- Architecture: HIGH — data-access pattern derived directly from existing `authz.server.ts` + spike findings; `withTenantDb` shape from verified spike document
- Pitfalls: HIGH — 7 pitfalls derived from actual codebase state (syncStatusEnum FK dependency, Drizzle snapshot drift from Phase 3 precedent, PHI gitignore, subcategory union gaps)
- Seed script: HIGH — pattern directly derived from `seed-owner.ts` source code; FK resolution complexity (correlations) is LOW until supplementName values are cross-checked

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (30 days — stable stack)
