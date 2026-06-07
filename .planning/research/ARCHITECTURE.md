# Architecture Research

**Domain:** Multi-tenant functional-health operations platform (brownfield Remix + Neon/Drizzle)
**Researched:** 2026-06-07
**Confidence:** HIGH (current state mapped from codebase; M1 additions grounded in Neon/Drizzle docs + PLATFORM.md §5–6)

---

## Standard Architecture

### System Overview (M1 Target State)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Browser / React 19 (unchanged)                        │
│  Dashboard  │  Metrics  │  Protocol  │  Insights  │  Import  │  Admin   │
└──────┬───────┴─────┬─────┴─────┬──────┴─────┬──────┴────┬─────┴──┬──────┘
       │             │           │             │           │        │
       ▼             ▼           ▼             ▼           ▼        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Route Modules  (React Router 7 SSR — unchanged)            │
│  All loaders/actions → server only; no DB access in components           │
│  New routes: /admin/* (tenant mgmt), /ingest/* (lab pipeline)            │
└──────┬──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Identity / Auth Middleware                           │
│  auth.server.ts — session read, role check, tenant/subject extraction    │
│  Injects: { tenantId, userId, subjectId, role } into every loader ctx    │
└──────┬──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────┬──────────────────────────────────────────┐
│   Decision Engine (lib/)     │   Ingest Pipeline (lib/ingest/)          │
│   engine.server.ts           │   upload → llm-parse → review → commit   │
│   • status classification    │   State: pending|reviewing|approved|      │
│   • cessation phase math     │          rejected|committed               │
│   • Pearson correlation       │   Human review gate before DB write      │
│   • K1–K4 variant mapping    │                                           │
│   Pure functions, no I/O     │   Background-safe: no Remix loader dep    │
│   Callable from routes,      │                                           │
│   report-gen, tests          │                                           │
└──────┬───────────────────────┴──────────────────────────────────────────┘
       │                                        │
       ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Tenancy-Scoped DB Layer  (lib/db.server.ts)                 │
│  getDb(tenantId, subjectId?) → Drizzle instance with RLS context set    │
│  Every query: set_config('app.tenant_id', ...) + set_config('app.sub')  │
│  inside a transaction before executing                                   │
└──────┬──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Neon Postgres  (single DB, shared schema)                   │
│  Identity spine:    tenants · users · subjects                           │
│  Health data:       metrics* · protocolVersions* · protocolChanges*      │
│                     milestones* · supplements* · supplementLog*           │
│                     correlations* · cessationLog*   (* = RLS-scoped)     │
│  Engine schema:     geneticVariants · variantProtocolMap                 │
│  Ingest pipeline:   labDocuments · labExtractions                        │
│  Reports:           reports                                              │
│  Audit:             auditLog                                             │
│  RLS enforced on every tenant-scoped table via pgPolicy                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| Identity spine tables | `tenants`, `users` (with role), `subjects` — the scoping anchor | `db/schema.ts` (new tables) |
| Auth middleware | Session decode → `{ tenantId, userId, subjectId, role }` context; rejects unauthenticated/unauthorized | `app/lib/auth.server.ts` (new) |
| Tenancy-scoped DB accessor | `getDb(ctx)` — wraps every DB call in `set_config` transaction to activate RLS; replaces naked `getDb()` | `app/lib/db.server.ts` (extended) |
| RLS policies | Postgres enforces `app.tenant_id` and `app.subject_id` session vars match row columns; defense-in-depth | `db/schema.ts` via `pgPolicy` |
| Decision engine | Pure TypeScript: status classification, cessation phase math, Pearson, K1–K4 variant→protocol mapping | `app/lib/engine.server.ts` (new, extracted) |
| Genetics schema | `geneticVariants` + `variantProtocolMap` (K1–K4 confidence + citation); replaces `seed-data.ts` genetics | `db/schema.ts` (new tables) |
| Lab ingest pipeline | `labDocuments` (upload receipt) → LLM extraction → `labExtractions` (pending review) → human approve/reject → commit to `metrics` | `app/lib/ingest/` (new module) |
| Report generator | Reads engine output + subject metrics → produces confidence-graded `reports` row; PDF/markdown render | `app/lib/reports.server.ts` (new) |
| Audit log | Append-only `auditLog` table; written on every mutation (ingest commit, report gen, protocol change) | `db/schema.ts` (new table) |
| Existing static data (`real-data.ts`, `protocol-data.ts`) | Retired to seed/migration scripts once DB wired; loaders switch to `getDb()` queries | `app/lib/` (deprecate in M1) |

---

## Recommended Project Structure (M1 additions)

```
remix-app/
├── app/
│   ├── lib/
│   │   ├── auth.server.ts          # Session decode, role/tenancy extraction
│   │   ├── db.server.ts            # Extended: getDb(ctx) with RLS set_config
│   │   ├── engine.server.ts        # Decision engine — pure fns, no I/O
│   │   ├── reports.server.ts       # Report generation + render
│   │   └── ingest/
│   │       ├── pipeline.server.ts  # Orchestrate upload→parse→review→commit
│   │       ├── llm-parse.server.ts # LLM extraction call, returns labExtraction draft
│   │       └── review.server.ts    # Human approval gate — commits to metrics
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── layout.tsx          # Owner/practitioner-only shell
│   │   │   ├── index.tsx           # Tenant dashboard
│   │   │   └── subjects.tsx        # Client/subject list
│   │   └── ingest/
│   │       ├── layout.tsx
│   │       ├── upload.tsx          # POST lab document
│   │       └── review.tsx          # Human review queue
│   └── middleware/
│       └── tenancy.server.ts       # Remix middleware: attach auth ctx to all requests
├── db/
│   ├── schema.ts                   # Extended with new tables + RLS policies
│   └── migrations/                 # Drizzle-generated SQL migrations (first baseline here)
└── vitest.config.ts                # Test harness (new)
```

### Structure Rationale

- `lib/engine.server.ts` is deliberately isolated with no Drizzle imports — pure functions only. This makes it testable in Vitest without DB setup and callable from any context (routes, report-gen, background jobs).
- `lib/ingest/` is a sub-module, not a top-level lib file, because it has three distinct stages that grow into separate concerns.
- `db/migrations/` must exist before M1 ships — the first Drizzle migration baseline commits the schema and the retrofit columns together.

---

## Architectural Patterns

### Pattern 1: RLS-via-Session-Config (the tenancy mechanism)

**What:** Every request that touches the DB runs inside a Drizzle transaction that first calls `set_config('app.tenant_id', tenantId, true)` and `set_config('app.subject_id', subjectId, true)`. RLS policies on every tenant-scoped table read `current_setting('app.tenant_id')` in their `USING` clause. The app-level `getDb(ctx)` function enforces this wrapping — routes never open a raw Drizzle connection.

**When to use:** Every loader/action that reads or writes tenant-scoped data.

**Trade-offs:** RLS is the safety net, not the primary filter. Keep explicit `WHERE tenantId = ctx.tenantId` in Drizzle queries too — the planner uses WHERE clauses for index selection; RLS policies alone can produce slow full-table scans. Defense-in-depth: app filter + DB policy.

**Example:**
```typescript
// app/lib/db.server.ts
export async function withTenantDb<T>(
  ctx: { tenantId: string; subjectId?: string },
  fn: (tx: DrizzleTransaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`
    );
    if (ctx.subjectId) {
      await tx.execute(
        sql`select set_config('app.subject_id', ${ctx.subjectId}, true)`
      );
    }
    return fn(tx);
  });
}

// db/schema.ts — policy on metrics table
export const metrics = pgTable('metrics', { ...columns }, (t) => [
  pgPolicy('tenant_isolation', {
    for: 'all',
    using: sql`tenant_id = current_setting('app.tenant_id')::uuid`,
    withCheck: sql`tenant_id = current_setting('app.tenant_id')::uuid`,
  }),
]);
```

### Pattern 2: Engine-as-Pure-Module

**What:** The decision engine (`engine.server.ts`) contains only pure TypeScript functions: `classifyMetricStatus()`, `getCessationPhase()`, `computePearson()`, `mapVariantToProtocol()`. It takes typed inputs and returns typed outputs — no DB calls, no Remix context, no side effects.

**When to use:** Called by route loaders (for display), by `reports.server.ts` (for report gen), and by Vitest unit tests (the test suite calls the engine directly).

**Trade-offs:** Requires callers to own data fetching. This is the point — the engine's correctness is testable in isolation. The only coupling risk is when input types drift; enforce with Zod schemas at the boundary.

**Example:**
```typescript
// app/lib/engine.server.ts — no imports from drizzle or remix
export function classifyMetricStatus(
  value: number,
  refs: { refMin?: number; refMax?: number; optMin?: number; optMax?: number }
): MetricStatus { ... }

export function mapVariantToProtocol(
  variantId: string,
  variants: GeneticVariant[],
  map: VariantProtocolMap[]
): ProtocolAction[] { ... }
```

### Pattern 3: Lab Ingest as a State Machine

**What:** A `labDocuments` row progresses through explicit states: `uploaded → parsing → pending_review → approved | rejected → committed`. Each state transition is a separate action. The LLM extraction call happens in the `parsing` transition and writes to `labExtractions` (draft, unconfirmed). Human review reads `labExtractions`, edits if needed, and approves — which triggers `committed` and inserts into `metrics`.

**When to use:** Any LLM-assisted data intake where errors in parsed data have downstream clinical consequences. Human review must be a hard gate, not an optional step.

**Trade-offs:** Adds latency before data appears in the dashboard. Acceptable — PHI ingest correctness trumps speed. The review queue is the practitioner's workflow, not an obstacle.

**Example (state column):**
```typescript
export const labStatusEnum = pgEnum('lab_status', [
  'uploaded',       // raw file received
  'parsing',        // LLM extraction in progress
  'pending_review', // extraction done, awaiting human
  'approved',       // human confirmed extraction
  'rejected',       // human rejected — needs re-upload
  'committed',      // metrics written to metrics table
]);
```

---

## Data Flow

### Request Flow (M1 — authenticated read)

```
Browser GET /metrics/vitamins
    ↓
React Router → loader() [server]
    ↓
auth.server.ts → decode session → { tenantId, subjectId, role }
    ↓
withTenantDb(ctx, tx => tx.select().from(metrics)
  .where(and(eq(metrics.tenantId, ctx.tenantId),
              eq(metrics.subjectId, ctx.subjectId),
              eq(metrics.category, 'vitamins'))))
    ↓ (RLS double-checks via policy)
Neon Postgres → rows scoped to tenant+subject
    ↓
engine.server.ts → classifyMetricStatus() on each row
    ↓
loaderData → component → render
```

### Ingest Data Flow

```
POST /ingest/upload (multipart/form-data: PDF/CSV, labPanelType)
    ↓
action() → write labDocuments row (status: 'uploaded')
    ↓
trigger LLM parse (inline async or background job)
    ↓
llm-parse.server.ts → LLM call → structured extraction draft
    → write labExtractions rows (status: 'pending_review')
    → update labDocuments.status = 'pending_review'
    ↓
Practitioner opens /ingest/review queue
    ↓
Review UI → shows labExtractions for subject, allows edit
    ↓
POST /ingest/review/:id (approve | reject)
    ↓
approve: insert metrics rows (tenantId+subjectId scoped)
         update labDocuments.status = 'committed'
         write auditLog entry
         re-run engine → update correlations if needed
reject:  update labDocuments.status = 'rejected'
         write auditLog entry
    ↓
Dashboard loader reads committed metrics → engine → display
```

### Report Generation Flow

```
POST /reports/generate (subjectId, reportType)
    ↓
reports.server.ts:
  1. fetch subject metrics (withTenantDb)
  2. fetch geneticVariants + variantProtocolMap
  3. fetch protocolVersions for subject
  4. call engine.server.ts — classifyAll(), mapVariants()
  5. render markdown/PDF template with confidence grades (K1–K4)
  6. write reports row (tenantId, subjectId, generatedAt, content)
  7. write auditLog entry
    ↓
GET /reports/:id → serve rendered report
```

---

## Build Order (Dependency-Ordered)

The build order is constrained by hard dependencies. Each step unlocks the next.

### Step 1: Identity + Tenancy Spine (blocks everything else)

Add `tenants`, `users` (with `role` enum: `owner|practitioner|client`), `subjects` tables. Add auth library (recommend BetterAuth or Lucia with Neon adapter — evaluate in phase-specific research). Generate and apply the first Drizzle migration baseline that includes the new identity tables.

**Why first:** Every subsequent table needs `tenantId`/`subjectId` FK references. The RLS policies reference a session variable that auth sets. Nothing else can be tenant-scoped without this spine.

### Step 2: RLS Retrofit on the 8 Existing Tables (highest migration risk — see below)

Add `tenantId` + `subjectId` columns to all 8 existing tables. Backfill with Mac's tenant/subject IDs (the n=1 owner). Add `pgPolicy` on each table in `schema.ts`. Generate migration.

**Why second:** Once the identity spine exists, all 8 tables can be scoped. The DB is otherwise useless for multi-tenancy. Retire `syncStatus`/`syncVersion` vestigial columns in the same migration (one pass, not two).

### Step 3: Static Data → DB Migration

Wire route loaders to `getDb()` instead of `real-data.ts`, `protocol-data.ts`, `seed-data.ts`. Write a seed/migration script that inserts the static TypeScript data into the real tables under Mac's tenant/subject. Delete the static lib files once all routes pass.

**Why third:** Requires Steps 1–2 (tables exist with tenant scope). Unblocks all subsequent features that need live DB reads.

### Step 4: Engine Extraction + Test Harness

Extract classification/correlation/cessation/variant-mapping logic into `engine.server.ts`. Install Vitest. Write unit tests against the engine (no DB required). Engine must be stable before report-gen (Step 6) can rely on it.

**Why fourth:** Engine is pure TS — can be done in parallel with Step 3 in principle, but in practice needs Step 3 done so integration tests can run against real data.

### Step 5: Genetics Schema Promotion

Add `geneticVariants` + `variantProtocolMap` tables with `confidence` (K1–K4 enum) + `citation` field. Migrate seed genetics data from `seed-data.ts` into these tables. Update engine to read from DB instead of static arrays.

**Why fifth:** Depends on Step 3 (DB wired) and Step 4 (engine separated). This step makes K1–K4 a first-class, queryable, versionable schema rather than app constants.

### Step 6: Lab Ingest Pipeline

Add `labDocuments` + `labExtractions` tables with state machine column. Build upload action, LLM-parse module, review route, and commit action. Add `auditLog` table.

**Why sixth:** Depends on Steps 1–3 (tenancy + DB wired) and Step 4 (engine available for post-commit re-classification). The state machine is the riskiest new feature — doing it sixth keeps blast radius small.

### Step 7: Report Generation

Add `reports` table. Build `reports.server.ts` that orchestrates engine → template → render. Wire `/reports/*` routes.

**Why seventh:** Depends on Steps 4 (engine), 5 (genetics schema), 6 (committed metrics available). Report gen is the "proof slice" that validates the whole stack end-to-end.

---

## RLS Retrofit: The Largest Migration Risk

**What it is:** Adding `tenantId uuid NOT NULL` and `subjectId uuid NOT NULL` to all 8 existing tables, backfilling, then enabling RLS with policies on each. This is a single coordinated migration on live data.

**Why it is risky:**

1. `NOT NULL` on `tenantId`/`subjectId` requires backfill before the constraint is applied, or a two-step migration (add nullable → backfill → add constraint). In Neon with existing rows, the single-step `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT ...` form works for fresh tables but requires the backfill value to be known at migration time. Use `ALTER TABLE ... ADD COLUMN tenant_id uuid; UPDATE ...; ALTER TABLE ... ALTER COLUMN tenant_id SET NOT NULL;` in a single transaction to be safe.

2. 8 tables × 2 columns = 16 column additions + 16 index additions (for `WHERE tenant_id = $1 AND subject_id = $1` query patterns). Missing an index causes full-table scans once load grows.

3. RLS policies that are wrong in the `USING` clause cause silent row hiding, not errors. A misconfigured policy on `metrics` would make the practitioner's dashboard look empty rather than throwing — hard to detect.

4. Vestigial `syncStatus`/`syncVersion` removal in the same migration is correct (one pass), but must be verified that no route reads these columns before removal.

**Mitigation strategy:**

- Write the migration in a Neon branch (`db branch create rls-retrofit`), test end-to-end before merging to main.
- After adding `pgPolicy`, run a canary query as the `authenticated` role (not the admin role) and verify row visibility matches expectation.
- Add integration tests for the RLS boundary: a query as `tenantA` must return zero rows from `tenantB` data.
- Keep `SUPERUSER` / admin Drizzle client for migrations and seeding; use the `authenticated` role (with JWT context) for all application queries.

---

## Anti-Patterns

### Anti-Pattern 1: Bypassing RLS with the Admin Connection

**What people do:** Use the same admin/superuser Drizzle connection for application queries because it's simpler.

**Why it is wrong:** Superusers bypass all RLS policies. Cross-tenant data leaks silently. The entire point of RLS is defeated.

**Do this instead:** Maintain two Drizzle clients: `adminDb` (migrations/seeding only, never in route loaders) and `appDb` (authenticated role, used via `withTenantDb(ctx, fn)`).

### Anti-Pattern 2: Engine Logic in Route Loaders

**What people do:** Write `classifyMetricStatus()` inline inside a loader, or mix DB queries with classification logic in the same function.

**Why it is wrong:** The engine becomes untestable (requires Remix context and DB), undiscoverable (buried in a route file), and duplicated across routes.

**Do this instead:** All classification, phase math, and variant mapping lives in `engine.server.ts`. Loaders fetch data, call engine functions on the result, return the classified output.

### Anti-Pattern 3: Committing LLM Output Directly to `metrics`

**What people do:** Skip the review step and insert `labExtractions` directly into `metrics` on LLM completion.

**Why it is wrong:** LLMs misread lab reference ranges, unit formats, and panel layouts — especially for non-standard panels (HTMA, DUTCH). An unreviewed commit can corrupt a subject's longitudinal metric history.

**Do this instead:** `labExtractions` is always `pending_review` until a practitioner explicitly approves. The commit action is a separate, explicit step — not automatic on parse completion.

### Anti-Pattern 4: Per-Subject Protocol Versions as Global Rows

**What people do:** Add a `subjectId` column to `protocolVersions` and query by it — leaving the table's global identity intact.

**Why it is wrong:** Protocol versions are already scoped by the RLS retrofit, but without a design decision that "one lineage per subject" means `version` is unique within `(tenantId, subjectId)`, the `UNIQUE(version)` constraint on the current schema will conflict across subjects.

**Do this instead:** Change the unique constraint to `UNIQUE(tenant_id, subject_id, version)` so P0–P6 can exist independently per subject. The protocol identity is `(subject, version)`, not just `version`.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Neon Postgres | Two Drizzle clients: admin (migrations) + app (RLS-authenticated, `withTenantDb`) | Use `@neondatabase/serverless` pool for Remix SSR; Neon Serverless driver is edge-compatible |
| Auth provider (BetterAuth / Lucia) | Session cookie → decode in `auth.server.ts` → extract `{ tenantId, userId, subjectId, role }` | Needs phase-specific research — provider choice not locked |
| LLM provider (OpenAI / Anthropic) | Server-side call in `llm-parse.server.ts` inside ingest action; never client-side | Extraction only, never final judgment; structured output (JSON mode / tool_use) required |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Route loaders → engine | Direct import; engine is pure TS, no async | Loaders own data fetching; engine owns classification |
| Route loaders → DB | Via `withTenantDb(ctx, fn)` only; never raw `getDb()` in routes | Tenancy ctx injected by auth middleware before loader runs |
| Ingest pipeline → engine | `pipeline.server.ts` calls engine after commit to reclassify | Keeps engine as the single status-classification authority |
| Reports → engine | `reports.server.ts` calls engine with fetched metrics + variants | Report is a rendered snapshot of engine output |
| Admin routes vs practitioner routes | Role check in loader; `owner` can see all subjects, `practitioner` only assigned subjects | App-level RBAC check; RLS is the fallback guarantee |

---

## Scaling Considerations

This is a practitioner-scale (10s of subjects per tenant, 10s of tenants at M1/M2) system. Neon's shared-schema multi-tenancy with RLS is appropriate and recommended for this scale. Database-per-tenant is overkill until M3.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 tenant, 10 subjects (M1) | Single Neon project, shared schema + RLS; monolith Remix app; inline LLM parse in action |
| 5–10 tenants, 100 subjects (M2) | Same DB model; add Neon connection pooling (PgBouncer mode); move LLM parse to background job (Netlify background functions or a queue) |
| 50+ tenants, 1000+ subjects (M3+) | Evaluate schema-per-tenant for highest-value tenants; extract engine as a standalone service (the §5.6 extraction); consider Neon branching for tenant provisioning |

**First bottleneck:** LLM parse latency blocks the ingest action response. Mitigation at M1: return immediately after writing the `uploaded` row, trigger parse asynchronously. At M2: dedicated background job queue.

**Second bottleneck:** Correlation recompute (Pearson over all supplement/metric pairs) is O(n²) per subject. At M1 with 10 subjects this is negligible. At M2+ move recompute to a scheduled background job triggered by metric commits.

---

## Sources

- [Neon Row-Level Security guide](https://neon.com/docs/guides/row-level-security) — HIGH confidence
- [Neon secure backend RLS with JWT + set_config](https://neon.com/docs/guides/rls-query-execution) — HIGH confidence
- [Drizzle ORM RLS docs — pgTable.withRLS, pgPolicy, crudPolicy](https://orm.drizzle.team/docs/rls) — HIGH confidence (Context7 verified)
- [Neon blog: Is Postgres RLS for everything and everyone?](https://neon.com/blog/is-postgres-rls-for-everything-and-everyone) — HIGH confidence (performance + policy gotchas)
- [Neon multitenancy patterns](https://neon.com/docs/guides/multitenancy) — HIGH confidence
- `docs/PLATFORM.md` §5.2–5.6 — authoritative product brief (primary source)
- `.planning/codebase/ARCHITECTURE.md` — current-state baseline (do not re-derive)
- `remix-app/db/schema.ts` — 8 existing tables, confirmed column-by-column

---

*Architecture research for: Zoetrop M1 — multi-tenant RLS retrofit + engine extraction + lab ingest*
*Researched: 2026-06-07*
