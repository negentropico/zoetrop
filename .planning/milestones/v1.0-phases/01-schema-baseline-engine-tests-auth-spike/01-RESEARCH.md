# Phase 1: Schema Baseline + Engine Tests + Auth Spike — Research

**Researched:** 2026-06-07
**Domain:** Drizzle migrations baseline, Vitest harness on Vite 7, Better Auth JWT plugin + Neon pg_session_jwt spike
**Confidence:** HIGH (Vitest setup, migrations mechanics, Pearson/status test cases); MEDIUM (pg_session_jwt JWK path with Better Auth — seam has no worked example for this exact pairing)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Stay on Drizzle **0.45.x** for Phase 1. Do not adopt the 1.0 RC here.
- **D-02:** Drizzle 0.45.x → 1.0 upgrade is gated to Phase 3.
- **D-03:** Thin, timeboxed spike (~1 day). Prove three things: (a) Better-Auth-issued JWT verifies against Neon `pg_session_jwt`; (b) `tenantId`/`subjectId` claims readable via `auth.session()` inside a Postgres transaction; (c) one throwaway RLS-policy table confirms row-visibility flips with the claim. Tear the table down after.
- **D-04:** Fallback bar: if JWK verification cannot be made to work within the timebox, fail closed to `SET LOCAL app.tenant_id` pattern. Document the verdict in a SPIKE-FINDINGS note.
- **D-05:** The spike must explicitly exercise the `SET LOCAL` vs bare `SET` distinction — confirm tenant context does not leak across pooled connections.
- **D-06:** Exactly two prerequisite refactors: (1) extract duplicated `getMetricStatus` into `app/lib/metrics.ts`; (2) inject `now: Date` (default `new Date()`) into `getCessationDay`/cessation phase math.
- **D-07:** Test scope is three pure functions only: status classification (4 boundaries), cessation phase math (days 1/21/22/60/61/120/121/post), Pearson (known inputs + zero-denominator + degenerate arrays). Parsers deferred to Phase 5.
- **D-08:** Baseline migration is a pure as-is snapshot (`drizzle-kit generate`) committed under `remix-app/migrations/`.
- **D-09:** All schema drift cleanup deferred to Phase 4 / DATA-05.

### Claude's Discretion

- Task ordering, file/module naming, Vitest config specifics, and exact spike harness layout, provided decisions above hold.

### Deferred Ideas (OUT OF SCOPE)

- Drizzle 1.0 upgrade → Phase 3.
- Schema drift cleanup → Phase 4 / DATA-05.
- Import-parser tests → Phase 5 / LAB.
- LLM-provider BAA decision → Phase 2 gate / Phase 5 use.
- `withTenantDb` real implementation + RLS on actual tables → Phase 3.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-03 | A committed Drizzle `migrations/` baseline exists; all schema changes go through migrations | §Migrations Baseline: `drizzle-kit generate` command sequence, pitfall when tables already exist, journal mechanics |
| COMP-01 | Engine logic (status classification, cessation phase math with injectable `now`, Pearson correlation) has passing unit tests covering boundary cases | §Vitest Setup, §Test Cases: exact boundary inputs, degenerate cases, canonical test file locations |
</phase_requirements>

---

## Summary

Phase 1 is three isolated work streams that share no runtime code with each other: a migrations snapshot, a Vitest harness, and a throwaway spike. Each can be sequenced, but none blocks the other until the final integration point (SPIKE-FINDINGS feeds Phase 3).

**Migrations baseline** is mechanically straightforward: `drizzle-kit generate` against `db/schema.ts` with `out: './migrations'` already configured in `drizzle.config.ts` — the directory just doesn't exist yet. Because the Neon database already has the 8 tables, the generated SQL will include full `CREATE TABLE` + `CREATE TYPE` DDL for all 8 tables and 7 enums. Running `drizzle-kit migrate` against the already-provisioned DB will fail with "relation already exists" unless the migration is marked as applied in the tracking table first. The correct protocol is: generate → inspect the SQL → manually mark the baseline migration as applied in `__drizzle_migrations` (or use `drizzle-kit migrate` on a clean Neon branch to verify the SQL is idempotent, then record it as applied on prod). No `drizzle-kit push` in any direction.

**Engine test harness** requires exactly two refactors before tests can be written (D-06). The `getMetricStatus` function has FOUR diverging inline implementations (confirmed in `home.tsx` line 28, `metrics/index.tsx` line 52, `metrics/category.tsx` line 131, and `metrics/detail.tsx` line 309). The cessation functions in `protocol-data.ts` line 29–31 call `new Date()` internally. Vitest 4.1.8 installs clean on Vite 7.3.1 with a single `test:` block added to the existing `vite.config.ts` — no separate config file needed.

**Auth spike** has one high-uncertainty seam: Better Auth uses opaque session tokens by default, not signed JWTs. The JWT plugin (`better-auth/plugins`) is a separate opt-in that adds a `/api/auth/jwks` JWKS endpoint and a `/api/auth/token` endpoint returning a signed JWT. That JWT can be passed to Neon's `pg_session_jwt` via `auth.jwt_session_init(token)` inside a transaction. The JWKS URL is configured at the Neon project level (dashboard or API, not PGOPTIONS in this path — PGOPTIONS is the libpq/connection-time approach). The JWK-native path is the first target; the `SET LOCAL request.jwt.claims` fallback (no signature validation) is the documented alternative.

**Primary recommendation:** Run all three streams in parallel after Wave 0 (Vitest install + refactors). Generate the migrations baseline first (lowest risk, highest value). Write tests before the spike so any spike code written in TypeScript can be covered by the same harness.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Migrations baseline | Database / Storage | — | Schema DDL lives at the database tier; Drizzle Kit is the migration toolchain |
| Engine pure functions | API / Backend (lib module) | — | Pure TS with no I/O — callable outside loaders; must stay dependency-free |
| Vitest harness | Dev tooling | — | Test runner operates at build/CI tier, not runtime |
| Auth/RLS spike code | Spike / throwaway | — | Spike lives in `spikes/` or `scripts/`, never in app runtime paths |
| `SET LOCAL` vs `SET` validation | Database / Storage | API / Backend | Lease-safety is a pooler concern proven via a DB query, confirmed from app code |

---

## Standard Stack

### Core (Phase 1 only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | 4.1.8 [VERIFIED: npm registry] | Test runner | Native Vite integration; zero additional bundler config on Vite 7 |
| `@vitest/coverage-v8` | 4.1.8 [VERIFIED: npm registry] | Coverage (optional for Phase 1) | Matches vitest version; v8 is the native coverage provider |
| `drizzle-kit` | 0.31.8 (installed) / 0.31.10 (latest) [VERIFIED: npm registry] | Migration generation | Already in `devDependencies`; no upgrade needed for baseline |
| `better-auth` | 1.6.14 [VERIFIED: npm registry] | Auth (spike only) | Session management + JWT plugin JWKS endpoint for Neon verification |

### Spike-Only (throwaway, not committed to app runtime)

| Library | Purpose | Notes |
|---------|---------|-------|
| `better-auth/plugins` `jwt` plugin | Expose JWKS endpoint + signed JWT token | Opt-in; separate from default Better Auth session model |
| `@neondatabase/serverless` | Already installed (1.0.2) | Raw SQL driver for spike transaction harness |

**Installation (Phase 1 additions only):**
```bash
cd remix-app
npm install -D vitest@^4 @vitest/coverage-v8@^4
# better-auth is Phase 3 production install — spike can use it as devDependency or ephemeral
npm install -D better-auth@^1.6
```

**Version verification:**
```bash
npm view vitest version           # 4.1.8 confirmed 2026-06-07 [VERIFIED: npm registry]
npm view @vitest/coverage-v8 version  # 4.1.8 confirmed 2026-06-07 [VERIFIED: npm registry]
npm view better-auth version      # 1.6.14 confirmed 2026-06-07 [VERIFIED: npm registry]
npm view drizzle-kit version      # 0.31.10 (project has 0.31.8, compatible) [VERIFIED: npm registry]
```

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages below are tagged `[ASSUMED]` for slopcheck column; planner must verify or gate with checkpoint:human-verify before install.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `vitest` | npm | ~4 yrs | >5M/wk | github.com/vitest-dev/vitest | [ASSUMED] | Approved — well-established |
| `@vitest/coverage-v8` | npm | ~3 yrs | >3M/wk | github.com/vitest-dev/vitest | [ASSUMED] | Approved — official vitest org |
| `better-auth` | npm | ~2 yrs | >200K/wk | github.com/better-auth/better-auth | [ASSUMED] | Approved — confirmed in STACK.md research |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none (all are established packages from official organizations per prior research)

*slopcheck unavailable at research time — planner should confirm before install.*

---

## Architecture Patterns

### System Architecture Diagram

```
Phase 1 Work Streams (parallel, no shared runtime code)

[db/schema.ts] --drizzle-kit generate--> [migrations/0000_init.sql]
                                                    |
                                          drizzle-kit migrate (on Neon branch)
                                                    |
                                          verify SQL + mark applied on prod

[app/lib/metrics.ts (new)]  <-- extract from --  [home.tsx | metrics/index.tsx | metrics/category.tsx | metrics/detail.tsx]
[app/lib/protocol-data.ts]  <-- inject now: Date --  [getCessationDay / getCurrentCessationPhase]
[app/lib/seed-data.ts]  (calculatePearsonCorrelation — already pure, no refactor)
        |                         |                             |
        v                         v                             v
[app/lib/metrics.test.ts]  [app/lib/protocol-data.test.ts]  [app/lib/seed-data.test.ts]
        |                         |                             |
        `-------- vitest run --------'-------- vitest run ------'
                        (CI: npm run test)

[spikes/auth-rls/]  -- Better Auth JWT plugin + pg_session_jwt spike --
  spike-server.ts     -- minimal Better Auth instance, jwt() plugin, JWKS endpoint
  spike-db.ts         -- @neondatabase/serverless transaction calling auth.jwt_session_init
  spike-rls.sql       -- throwaway table CREATE + RLS policy + DROP
  SPIKE-FINDINGS.md   -- verdict: JWK-native vs SET LOCAL fallback
```

### Recommended Project Structure (Phase 1 additions)

```
remix-app/
├── app/
│   └── lib/
│       ├── metrics.ts               # NEW: canonical getMetricStatus (extracted from 4 routes)
│       ├── metrics.test.ts          # NEW: status classification tests
│       ├── protocol-data.ts         # MODIFIED: getCessationDay(now?: Date) signature
│       ├── protocol-data.test.ts    # NEW: cessation phase boundary tests
│       └── seed-data.test.ts        # NEW: Pearson correlation tests
├── migrations/                      # NEW: created by drizzle-kit generate
│   ├── 0000_baseline.sql            # CREATE TABLE for all 8 tables + 7 enums
│   └── meta/
│       ├── _journal.json            # drizzle-kit migration journal
│       └── 0000_snapshot.json       # schema snapshot for diff tracking
├── spikes/
│   └── auth-rls/                    # NEW: throwaway spike — delete after SPIKE-FINDINGS committed
│       ├── spike-server.ts
│       ├── spike-db.ts
│       └── SPIKE-FINDINGS.md
└── vite.config.ts                   # MODIFIED: add test: { ... } block
```

---

## Stream 1: Vitest Setup

### Config Pattern

The existing `vite.config.ts` uses `defineConfig` from `vite`. Vitest reads this file automatically. Add a `test` block **without** changing the import to `vitest/config` — add a `/// <reference types="vitest/config" />` triple-slash directive at the top instead, which gives TypeScript type-checking for the `test` key while keeping the existing `defineConfig` from `vite`. [CITED: vitest.dev/guide]

```typescript
/// <reference types="vitest/config" />
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
    // No setupFiles needed for pure function tests
  },
});
```

**Why `environment: "node"`:** The three target functions (`getMetricStatus`, `getCessationDay`, `calculatePearsonCorrelation`) have zero DOM dependencies. `jsdom` adds startup overhead and is not needed. [ASSUMED — based on function signatures; no DOM imports observed]

**Why `tsconfigPaths()` handles `~/` aliases:** The plugin is already in the Vite config that Vitest reads. The `~/` → `./app/` alias is inherited by Vitest automatically — test files can import `from "~/lib/metrics"`. [CITED: vitest.dev/guide — Vite plugins are reused]

**Add to `package.json` scripts:**
```json
"test": "vitest run",
"test:watch": "vitest"
```

### Anti-Patterns to Avoid

- **Do not create a separate `vitest.config.ts`:** A dedicated `vitest.config.ts` overrides `vite.config.ts` entirely, losing the `tsconfigPaths()` plugin and breaking `~/` alias resolution in test files. Stay with the single-file approach for this project.
- **Do not install Jest:** Jest requires `ts-jest` or `babel-jest` transforms that conflict with Vite's ESM-first module resolution. React Router 7's route type generation produces `.js`-extension imports that Jest mishandles.
- **Do not use `jsdom` environment for pure function tests:** Adds no value and slows test startup.

---

## Stream 2: Engine Test Cases

### 2a. `getMetricStatus` — Status Classification

**Canonical implementation to extract (`app/lib/metrics.ts`):**

Comparing the four inline copies:

- `home.tsx` (line 28–37): checks `optimalRange` first; if `referenceRange` is absent, falls through to `"optimal"`. Reads `metric.optimalRange` and `metric.referenceRange` directly.
- `metrics/index.tsx` (line 52–72): identical logic, slightly more readable form.
- `metrics/category.tsx` (line 131–145): identical logic.
- `metrics/detail.tsx` (line 309–329): identical logic (the fourth copy — missed by the initial duplication scan; confirmed via `grep -rn "function getMetricStatus" app/routes/`).

All four agree on the boundary semantics:
1. `optimalRange && value >= min && value <= max` → `"optimal"`
2. `referenceRange && value < min` → `"deficient"`
3. `referenceRange && value > max` → `"excess"`
4. `referenceRange && (value is within reference but not optimal)` → `"borderline"`
5. No `referenceRange` (and not optimal) → `"optimal"` (defensive fallback)

The `Metric` type carries both `optimalRange?: { min: number; max: number }` and `referenceRange?: { min: number; max: number }`. The util signature is:

```typescript
// app/lib/metrics.ts
import type { Metric, MetricStatus } from "~/types/metrics";

export function getMetricStatus(metric: Metric): MetricStatus {
  const { value, optimalRange, referenceRange } = metric;
  if (optimalRange && value >= optimalRange.min && value <= optimalRange.max) return "optimal";
  if (referenceRange) {
    if (value < referenceRange.min) return "deficient";
    if (value > referenceRange.max) return "excess";
    return "borderline";
  }
  return "optimal";
}
```

**Boundary test matrix (all 4 status outcomes + edge cases):**

| Test case | referenceRange | optimalRange | value | Expected |
|-----------|---------------|--------------|-------|----------|
| Exactly at optimal min | [50, 150] | [70, 120] | 70 | `"optimal"` |
| Exactly at optimal max | [50, 150] | [70, 120] | 120 | `"optimal"` |
| Within reference, below optimal | [50, 150] | [70, 120] | 60 | `"borderline"` |
| Within reference, above optimal | [50, 150] | [70, 120] | 135 | `"borderline"` |
| Below reference min | [50, 150] | [70, 120] | 30 | `"deficient"` |
| Exactly at reference min | [50, 150] | [70, 120] | 50 | `"borderline"` (within ref, below optimal) |
| Above reference max | [50, 150] | [70, 120] | 200 | `"excess"` |
| Exactly at reference max | [50, 150] | [70, 120] | 150 | `"borderline"` |
| No referenceRange, no optimalRange | undefined | undefined | 42 | `"optimal"` (defensive fallback) |
| No referenceRange, has optimalRange, in range | undefined | [70, 120] | 90 | `"optimal"` |
| No referenceRange, has optimalRange, out of range | undefined | [70, 120] | 50 | `"optimal"` (no ref → falls through) |

The last case is a known fallback: if `referenceRange` is absent, the function returns `"optimal"` even when the value is outside `optimalRange`. This is the existing behavior — tests must assert it to lock the contract.

### 2b. Cessation Phase Math

**Refactor to `getCessationDay(now?: Date): number`:**

```typescript
// app/lib/protocol-data.ts — modified signature
export function getCessationDay(now: Date = new Date()): number {
  return differenceInDays(now, parseISO(CESSATION_START_DATE));
}
```

`getCurrentCessationPhase(day: number)` is already pure (takes `day` as a parameter) — no change needed. The cessation start date `CESSATION_START_DATE = "2025-12-23T00:00:00.000Z"` remains hardcoded (Phase 4 will move this to the DB). [ASSUMED — confirmed by reading source; deferred per D-09]

**Phase boundary definitions from `cessationPhaseEnum` in schema.ts and `CESSATION_PHASES` in protocol.ts:**

| Phase | dayRange.start | dayRange.end |
|-------|---------------|-------------|
| acute | 1 | 21 |
| stabilization | 22 | 60 |
| clearing | 61 | 120 |
| optimization | 121 | 150 |

**IMPORTANT — phase identity field is `.phase`, NOT `.name`** (confirmed in `types/protocol.ts` `CESSATION_PHASES`; resolves Open Question 1 / Assumption A3). Every `getCurrentCessationPhase(...)` assertion in the test examples below uses `.phase`. `CessationPhase = 'acute' | 'stabilization' | 'clearing' | 'optimization'`.

**Boundary test matrix (test each crossing in both directions):**

| Injected day | Expected phase | Notes |
|-------------|----------------|-------|
| 1 | `"acute"` | First day |
| 21 | `"acute"` | Last day of acute |
| 22 | `"stabilization"` | First day of stabilization |
| 60 | `"stabilization"` | Last day of stabilization |
| 61 | `"clearing"` | First day of clearing |
| 120 | `"clearing"` | Last day of clearing |
| 121 | `"optimization"` | First day of optimization |
| 150 | `"optimization"` | Last defined day |
| 151 | `"optimization"` | Post-endpoint: falls through to last phase (existing behavior — `CESSATION_PHASES[CESSATION_PHASES.length - 1]`) |
| 167 | `"optimization"` | Current real day as of 2026-06-07 |
| 0 | Verify — `find()` returns `undefined`, falls back to last phase | Pre-start edge case |

**How to inject `now` in tests:**

```typescript
// app/lib/protocol-data.test.ts
import { describe, it, expect } from "vitest";
import { parseISO, addDays } from "date-fns";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/protocol-data";

const START = parseISO("2025-12-23T00:00:00.000Z");

describe("getCessationDay", () => {
  it("returns 1 on the first day", () => {
    const now = addDays(START, 1);
    expect(getCessationDay(now)).toBe(1);
  });
  it("returns 21 on day 21", () => {
    const now = addDays(START, 21);
    expect(getCessationDay(now)).toBe(21);
  });
  // ...
});

describe("getCurrentCessationPhase", () => {
  it("returns acute on day 1", () => {
    expect(getCurrentCessationPhase(1).phase).toBe("acute"); // .phase, NOT .name
  });
  // etc.
});
```

Note: `differenceInDays` in `date-fns` 4.x computes calendar-day difference (truncated, not rounded). Injecting `addDays(START, N)` at midnight UTC gives exactly `N`. [ASSUMED — based on date-fns 4.x docs behavior; consistent with reading the source]

### 2c. Pearson Correlation

**Source location:** `app/lib/seed-data.ts` lines 605–622.

The function is already pure. No refactor needed — import directly in the test file.

```typescript
// calculatePearsonCorrelation(x: number[], y: number[]): number
// returns 0 if x.length !== y.length || x.length === 0
// returns 0 if denominator === 0
// returns Pearson r otherwise (range −1..1)
```

**Test matrix:**

| Test case | x | y | Expected | Notes |
|-----------|---|---|----------|-------|
| Known positive correlation | [1,2,3,4,5] | [1,2,3,4,5] | 1.0 | Perfect positive |
| Known negative correlation | [1,2,3,4,5] | [5,4,3,2,1] | −1.0 | Perfect negative |
| No correlation | [1,2,3,4,5] | [3,3,3,3,3] | 0.0 | Constant y → denominator = 0 → returns 0 |
| Degenerate: empty arrays | [] | [] | 0 | Guard: `x.length === 0` |
| Degenerate: mismatched lengths | [1,2] | [1,2,3] | 0 | Guard: `x.length !== y.length` |
| Single element | [5] | [5] | 0 | denominator = 0 (n=1, variance = 0) |
| Two elements | [1,3] | [2,4] | 1.0 | Perfect two-point positive |
| Weak correlation | [1,2,3,4,5] | [2,1,4,3,5] | ~0.7 | Verify approximate to 2 decimals |

**Floating point:** Use `toBeCloseTo(val, 10)` for exact cases (perfect correlation), `toBeCloseTo(val, 1)` for approximate cases.

---

## Stream 3: Drizzle Migrations Baseline

### Current State

- `drizzle.config.ts` is fully configured: `dialect: 'postgresql'`, `schema: './db/schema.ts'`, `out: './migrations'`, `dbCredentials.url` reads from `NETLIFY_DATABASE_URL || DATABASE_URL`. [VERIFIED: file read]
- `remix-app/migrations/` directory does **not** exist. [VERIFIED: filesystem check]
- drizzle-kit 0.31.8 is installed; latest is 0.31.10 — minor patch, no upgrade required. [VERIFIED: npm registry]
- The 8 tables and 7 enums already exist on the Neon database (they were created outside the migrations workflow).

### Command Sequence

```bash
cd remix-app

# Step 1: Generate the baseline snapshot
# drizzle-kit reads db/schema.ts, diffs against an empty state (no prior snapshot),
# and generates the full CREATE TABLE + CREATE TYPE DDL for all 8 tables and 7 enums.
# Creates migrations/ directory automatically.
npm run db:generate
# Produces:
#   migrations/0000_baseline.sql        (full CREATE TABLE/TYPE statements)
#   migrations/meta/_journal.json       (migration journal, tag "init")
#   migrations/meta/0000_snapshot.json  (schema snapshot for future diffs)

# Step 2: Inspect the generated SQL
# Verify it matches the 8 expected tables:
#   metrics, protocol_versions, protocol_changes, milestones,
#   supplements, supplement_log, correlations, cessation_log
# Verify 7 enums:
#   metric_category, metric_status, data_source, sync_status,
#   supplement_tier, protocol_change_type, cessation_phase

# Step 3: Validate on a Neon branch (NOT production)
# Create a clean branch in Neon dashboard or CLI:
#   neon branch create baseline-test
# Point DATABASE_URL to the branch connection string temporarily, then:
npm run db:migrate
# On the clean branch, this runs successfully (tables don't exist yet).
# If it fails, the SQL has a problem — fix before committing.

# Step 4: Mark the migration as applied on production
# The production DB already has the tables. Running db:migrate against prod
# will fail with "relation already exists". Two safe approaches:
#
# Option A — Manual insert into tracking table (recommended):
# Connect to Neon production via Drizzle Studio or psql and run:
#   INSERT INTO __drizzle_migrations (hash, created_at)
#   VALUES ('<hash from _journal.json>', extract(epoch from now()) * 1000);
#
# Option B — Run db:migrate against a clean copy of prod to verify,
# then manually insert the tracking record.
#
# Do NOT run db:migrate directly against production without this step.

# Step 5: Commit
git add remix-app/migrations/
git commit -m "feat: add drizzle migrations baseline (8 tables, 7 enums, as-is snapshot)"
```

### The "Already Exists" Problem

This is the key pitfall. `drizzle-kit migrate` applies pending migrations by checking the `__drizzle_migrations` table (auto-created on first migrate). On a fresh Neon DB (clean branch), it runs fine. On production where the tables exist but `__drizzle_migrations` doesn't, it will fail with PostgreSQL error `42P07` ("relation already exists") on the first `CREATE TABLE`. [CITED: drizzle-kit migrate docs + GitHub issue #2815]

**Resolution:** Use the Neon branch to prove the SQL is correct, then mark the migration as applied on production via a manual INSERT — never run `drizzle-kit push` against production.

### What Gets Generated

From `db/schema.ts` (201 lines), the generated migration will include:

**Enums (CREATE TYPE):**
- `metric_category` (9 values)
- `metric_status` (4 values)
- `data_source` (6 values)
- `sync_status` (3 values — including the vestigial `local/synced/pending`)
- `supplement_tier` (4 values)
- `protocol_change_type` (5 values)
- `cessation_phase` (4 values)

**Tables (CREATE TABLE):** `metrics`, `protocol_versions`, `protocol_changes`, `milestones`, `supplements`, `supplement_log`, `correlations`, `cessation_log`.

**Note:** The `syncStatus`/`syncVersion` columns and `isActive: integer` SQLite relic are included as-is per D-09. Do not fix them now.

---

## Stream 4: Auth/RLS Spike

### The Core Seam

Better Auth uses **opaque session tokens** by default (stored in a `session` table, not JWTs). To use Neon `pg_session_jwt`, a signed JWT is required. The **JWT plugin** (`better-auth/plugins` → `jwt()`) is a separate opt-in that adds:

- A `/api/auth/jwks` endpoint returning the JWKS (JSON Web Key Set) for token verification
- A `/api/auth/token` endpoint returning a short-lived signed JWT (default 15-minute expiry)
- Configurable `definePayload` to control which claims are included

[CITED: better-auth.com/docs/plugins/jwt]

### JWK Configuration Paths

**Path A — Neon Data API (Dashboard config):**
Neon allows configuring a custom JWKS URL in the Neon project dashboard or via the API (`POST /projects/{id}/jwks`). The JWKS URL from Better Auth (`https://your-app.netlify.app/api/auth/jwks`) is registered. Neon's Data API then validates JWTs automatically per-request via the `Authorization: Bearer <jwt>` header. The `auth.user_id()` and `auth.session()` functions then work in the Data API context. [CITED: neon.com/docs/data-api/custom-authentication-providers]

**Path B — PGOPTIONS at connection time (direct driver):**
For the `@neondatabase/serverless` WebSocket driver (which the app already uses), the JWK is supplied via libpq connection options at connection initialization:
```bash
PGOPTIONS="-c pg_session_jwt.jwk=$MY_JWK"
```
Then within a transaction:
```sql
SELECT auth.jwt_session_init('eyJ...');  -- initialize JWT session
SELECT auth.user_id();                    -- reads 'sub' claim
SELECT auth.session()->>'tenantId';       -- reads custom claim
```
[CITED: github.com/neondatabase/pg_session_jwt]

**For the spike, Path A (Neon Data API) is simpler** because it avoids embedding the JWK in a connection string. However, the existing app uses the WebSocket driver for Drizzle, not the Data API. Path B matches the existing driver pattern but requires the JWK to be embedded in PGOPTIONS.

**Recommendation for the spike:** Test both paths. Start with Path A (Data API + JWKS URL config in dashboard) to prove the JWT round-trip quickly, then test Path B in the transaction wrapper to prove it works with the `@neondatabase/serverless` driver pattern the app actually uses.

### Spike Harness Structure

```typescript
// spikes/auth-rls/spike-db.ts
// Requires: DATABASE_URL env pointing to a dedicated Neon spike branch

import { neon } from "@neondatabase/serverless";

export async function testJwtRls(jwtToken: string) {
  const sql = neon(process.env.DATABASE_URL!);

  // Path B: set JWK via PGOPTIONS at connection level (see spike-server.ts for PGOPTIONS)
  // Inside transaction: call auth.jwt_session_init, then read claims
  const result = await sql.transaction(async (tx) => {
    // Initialize JWT session — this is the critical call
    await tx`SELECT auth.jwt_session_init(${jwtToken})`;

    // Read the sub claim
    const [userId] = await tx`SELECT auth.user_id() AS uid`;

    // Read a custom claim (tenantId must be in the JWT payload)
    const [session] = await tx`SELECT auth.session() AS payload`;

    // Test RLS: query the throwaway table
    const rows = await tx`SELECT * FROM spike_rls_test WHERE tenant_id = (auth.session()->>'tenantId')::text`;

    return { userId, session, rows };
  });

  return result;
}
```

### SET LOCAL vs bare SET — D-05 Requirement

The spike **must** prove transaction isolation for tenant context. Two modes to test:

**Mode 1 — JWK-verified path:**
`auth.jwt_session_init()` sets session state that is automatically scoped to the transaction by `pg_session_jwt`. No separate `SET LOCAL` needed — the extension handles isolation. Verify by opening two sequential transactions on the same connection and asserting the second transaction does not inherit the first JWT's claims.

**Mode 2 — Fallback path (no JWK):**
Without JWK, set claims manually:
```sql
-- WRONG (leaks across pooled connections):
SET request.jwt.claims = '{"sub": "user-123", "tenantId": "tenant-abc"}';

-- CORRECT (scoped to this transaction):
SET LOCAL request.jwt.claims = '{"sub": "user-123", "tenantId": "tenant-abc"}';
```

Then read via:
```sql
SELECT auth.user_id();          -- reads from request.jwt.claims
SELECT auth.session();          -- returns entire claims JSONB
```

Test: run two sequential requests through PgBouncer (transaction mode) and assert the second request gets `NULL` or an empty claims object, not the first request's claims. [CITED: PITFALLS.md §Pitfall 1 — SET vs SET LOCAL]

### Throwaway RLS Table Pattern

```sql
-- Create throwaway table on spike Neon branch
CREATE TABLE spike_rls_test (
  id serial PRIMARY KEY,
  tenant_id text NOT NULL,
  data text
);

ALTER TABLE spike_rls_test ENABLE ROW LEVEL SECURITY;

-- Policy: only see rows where tenant_id matches the JWT's tenantId claim
CREATE POLICY spike_tenant_isolation ON spike_rls_test
  USING ((auth.session()->>'tenantId') = tenant_id);

-- Insert test rows
INSERT INTO spike_rls_test (tenant_id, data) VALUES ('tenant-a', 'A data'), ('tenant-b', 'B data');

-- With JWT for tenant-a: should return only 1 row
-- With JWT for tenant-b: should return only 1 row
-- Cross-tenant isolation confirmed if row count matches

-- Cleanup after spike
DROP TABLE spike_rls_test;
```

### SPIKE-FINDINGS Note Template

The deliverable is a short markdown file:

```markdown
# Auth/RLS Spike Findings

**Spike date:** 2026-06-07
**Time spent:** [X hours]
**Verdict:** [JWK-native / SET LOCAL fallback]

## Verdict Details
- [ ] JWT from Better Auth JWT plugin verifies against pg_session_jwt: [Y/N]
- [ ] Claims readable via auth.session() inside transaction: [Y/N]
- [ ] Row visibility flips on tenant claim: [Y/N]
- [ ] SET LOCAL isolation confirmed (no cross-connection leak): [Y/N]

## Path Taken for Phase 3
[JWK-native path: configure JWKS URL in Neon dashboard, pass jwt() plugin to Better Auth]
  OR
[SET LOCAL fallback: set request.jwt.claims in db.transaction() from app-layer-verified session]

## Phase 3 Implications
[What Phase 3 must implement given this outcome]
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test runner | Custom test harness | Vitest 4.x | Native Vite integration; handles ESM, aliases, TypeScript out of the box |
| JWT verification | Custom JWK validator | `pg_session_jwt.jwt_session_init()` | Extension handles JWK verification, claim extraction, and session lifecycle |
| Schema snapshot | Manual `CREATE TABLE` SQL files | `drizzle-kit generate` | Generates idempotent DDL with proper enum + FK ordering; diff-aware for future changes |
| Migration tracking | Custom table/logic | `__drizzle_migrations` table managed by drizzle-kit | Schema-checksum-based tracking; `drizzle-kit migrate` understands the journal format |
| Pearson correlation | Alternative implementation | `calculatePearsonCorrelation` in seed-data.ts already exists | Function is correct and pure; tests validate it, no rewrite needed |

**Key insight:** The only bespoke code Phase 1 writes is the `metrics.ts` util (an extraction, not new logic), the `getCessationDay` signature change (adding one parameter), and the tests themselves. Everything else is tooling invocation.

---

## Common Pitfalls

### Pitfall 1: `drizzle-kit migrate` Fails with "relation already exists" on Production

**What goes wrong:** The production Neon DB has all 8 tables but no `__drizzle_migrations` tracking table. Running `npm run db:migrate` generates the `__drizzle_migrations` table, then tries to run `0000_baseline.sql` which contains `CREATE TABLE metrics ...` — fails immediately.

**How to avoid:** Always validate the baseline SQL on a clean Neon branch first. Then mark the migration as applied on production by directly inserting its hash into `__drizzle_migrations` without running the DDL.

**Warning signs:** Running `npm run db:migrate` against a DB that was previously managed with `drizzle-kit push` (CONCERNS.md confirms this risk).

### Pitfall 2: `vite.config.ts` Broken by Wrong Vitest Import

**What goes wrong:** Changing `import { defineConfig } from "vite"` to `import { defineConfig } from "vitest/config"` breaks the `reactRouter()` plugin because `vitest/config`'s `defineConfig` doesn't recognize Vite plugins the same way.

**How to avoid:** Keep `import { defineConfig } from "vite"`. Add `/// <reference types="vitest/config" />` at the top of the file for TypeScript typing of the `test:` block. Do not change the import.

**Warning signs:** TypeScript errors on the `test:` block; `reactRouter()` plugin warnings in dev server output.

### Pitfall 3: `getMetricStatus` Behavioral Divergence During Extraction

**What goes wrong:** The four inline copies have subtle differences that aren't immediately visible. Extracting one version and swapping all four imports may silently change behavior for some input shapes.

**How to avoid:** Write the status classification tests **against the inline version** first (import `getMetricStatus` from `home.tsx` test helper or copy the logic into the test). Verify tests pass. Then extract to `app/lib/metrics.ts`, swap all four imports, verify same tests still pass. This is a behavioral contract test, not just a refactor test.

**Warning signs:** Any test that was green before the import swap goes red → behavioral divergence found; investigate before proceeding.

### Pitfall 4: Better Auth JWT Token Expiry in Spike Tests

**What goes wrong:** The JWT plugin issues tokens with a 15-minute default expiry. If the spike script runs slowly or the tester pauses, the token expires before `auth.jwt_session_init()` is called, and the extension returns an error or treats it as unauthenticated.

**How to avoid:** Configure a longer expiry for the spike only: `jwt({ jwt: { expirationTime: "1h" } })`. Or regenerate the token immediately before each test call. This is spike code, so simplicity matters more than security.

**Warning signs:** `auth.user_id()` returns NULL or an error when the token was just issued.

### Pitfall 5: `getCessationDay` Test Using `new Date()` Without Injection

**What goes wrong:** A test that calls `getCessationDay()` without injecting `now` will return a different number on different days, making the test date-coupled and fragile.

**How to avoid:** The D-06 refactor adds `now: Date = new Date()` as a default parameter. Every test **must** pass an explicit `now` value — never call `getCessationDay()` without arguments in a test. Linter or review can enforce this.

### Pitfall 6: Spike Code Landing in App Runtime Paths

**What goes wrong:** Spike code (`spike-server.ts`, throwaway DB calls) is placed under `app/routes/` or `app/lib/` and gets bundled into the production build.

**How to avoid:** Keep all spike code under `spikes/auth-rls/`. The `vite.config.ts` `include` pattern only covers `app/**/*.test.ts` — spike files won't be picked up by the test harness either. After the SPIKE-FINDINGS note is committed, delete the `spikes/` directory.

---

## Code Examples

### Vitest Test File Structure (canonical form)

```typescript
// app/lib/metrics.test.ts
import { describe, it, expect } from "vitest";
import { getMetricStatus } from "~/lib/metrics";
import type { Metric } from "~/types/metrics";

function makeMetric(
  value: number,
  referenceRange?: { min: number; max: number },
  optimalRange?: { min: number; max: number }
): Metric {
  // Minimal metric fixture — only fields getMetricStatus reads
  return {
    id: "test",
    name: "Test Metric",
    value,
    unit: "units",
    category: "vitamins",
    subcategory: undefined,
    timestamp: "2025-01-01T00:00:00.000Z",
    source: "manual",
    improvement: "target range",
    referenceRange,
    optimalRange,
    syncStatus: "local",
    syncVersion: 1,
  } as unknown as Metric; // The `as unknown as Metric` is acceptable in test fixtures only
}

describe("getMetricStatus", () => {
  it("returns optimal when value is within optimal range", () => {
    expect(getMetricStatus(makeMetric(90, { min: 50, max: 150 }, { min: 70, max: 120 }))).toBe("optimal");
  });
  it("returns borderline when within reference but below optimal min", () => {
    expect(getMetricStatus(makeMetric(60, { min: 50, max: 150 }, { min: 70, max: 120 }))).toBe("borderline");
  });
  it("returns deficient when below reference min", () => {
    expect(getMetricStatus(makeMetric(30, { min: 50, max: 150 }, { min: 70, max: 120 }))).toBe("deficient");
  });
  it("returns excess when above reference max", () => {
    expect(getMetricStatus(makeMetric(200, { min: 50, max: 150 }, { min: 70, max: 120 }))).toBe("excess");
  });
  it("returns optimal when no ranges defined", () => {
    expect(getMetricStatus(makeMetric(42))).toBe("optimal");
  });
  it("handles exact boundary at reference min (borderline, not deficient)", () => {
    expect(getMetricStatus(makeMetric(50, { min: 50, max: 150 }, { min: 70, max: 120 }))).toBe("borderline");
  });
  it("handles exact boundary at optimal min (optimal)", () => {
    expect(getMetricStatus(makeMetric(70, { min: 50, max: 150 }, { min: 70, max: 120 }))).toBe("optimal");
  });
});
```

### Cessation Phase Test (date injection)

```typescript
// app/lib/protocol-data.test.ts
import { describe, it, expect } from "vitest";
import { parseISO, addDays } from "date-fns";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/protocol-data";

const START = parseISO("2025-12-23T00:00:00.000Z");
const day = (n: number) => addDays(START, n);

describe("getCessationDay with injected now", () => {
  it("day 1", () => expect(getCessationDay(day(1))).toBe(1));
  it("day 21 (last acute)", () => expect(getCessationDay(day(21))).toBe(21));
  it("day 22 (first stabilization)", () => expect(getCessationDay(day(22))).toBe(22));
  it("day 60 (last stabilization)", () => expect(getCessationDay(day(60))).toBe(60));
  it("day 61 (first clearing)", () => expect(getCessationDay(day(61))).toBe(61));
  it("day 120 (last clearing)", () => expect(getCessationDay(day(120))).toBe(120));
  it("day 121 (first optimization)", () => expect(getCessationDay(day(121))).toBe(121));
  it("day 150 (last defined)", () => expect(getCessationDay(day(150))).toBe(150));
  it("day 151 (post-endpoint)", () => expect(getCessationDay(day(151))).toBe(151));
});

// NOTE: phase identity is `.phase` (NOT `.name`) — see Stream 2b and types/protocol.ts CESSATION_PHASES.
describe("getCurrentCessationPhase", () => {
  it("day 1 → acute", () => expect(getCurrentCessationPhase(1).phase).toBe("acute"));
  it("day 21 → acute", () => expect(getCurrentCessationPhase(21).phase).toBe("acute"));
  it("day 22 → stabilization", () => expect(getCurrentCessationPhase(22).phase).toBe("stabilization"));
  it("day 60 → stabilization", () => expect(getCurrentCessationPhase(60).phase).toBe("stabilization"));
  it("day 61 → clearing", () => expect(getCurrentCessationPhase(61).phase).toBe("clearing"));
  it("day 120 → clearing", () => expect(getCurrentCessationPhase(120).phase).toBe("clearing"));
  it("day 121 → optimization", () => expect(getCurrentCessationPhase(121).phase).toBe("optimization"));
  it("day 151 → optimization (post-endpoint fallback)", () => expect(getCurrentCessationPhase(151).phase).toBe("optimization"));
});
```

### Pearson Test

```typescript
// app/lib/seed-data.test.ts
import { describe, it, expect } from "vitest";
import { calculatePearsonCorrelation } from "~/lib/seed-data";

describe("calculatePearsonCorrelation", () => {
  it("perfect positive correlation", () => {
    expect(calculatePearsonCorrelation([1,2,3,4,5], [1,2,3,4,5])).toBeCloseTo(1.0, 10);
  });
  it("perfect negative correlation", () => {
    expect(calculatePearsonCorrelation([1,2,3,4,5], [5,4,3,2,1])).toBeCloseTo(-1.0, 10);
  });
  it("zero denominator (constant y) → 0", () => {
    expect(calculatePearsonCorrelation([1,2,3,4,5], [3,3,3,3,3])).toBe(0);
  });
  it("empty arrays → 0", () => {
    expect(calculatePearsonCorrelation([], [])).toBe(0);
  });
  it("mismatched lengths → 0", () => {
    expect(calculatePearsonCorrelation([1,2], [1,2,3])).toBe(0);
  });
  it("single element → 0 (zero denominator)", () => {
    expect(calculatePearsonCorrelation([5], [5])).toBe(0);
  });
  it("two-element perfect correlation", () => {
    expect(calculatePearsonCorrelation([1,3], [2,4])).toBeCloseTo(1.0, 10);
  });
});
```

### `drizzle-kit generate` — Expected Output (illustrative)

The generated `migrations/0000_baseline.sql` will contain statements in this order (enums before tables that reference them, FKs after all tables):

```sql
-- drizzle-kit will generate something like this
DO $$ BEGIN
  CREATE TYPE "public"."metric_category" AS ENUM('vitamins','minerals','inflammatory','metabolic','hormones','autonomic','bodyComposition','lipids','hematology');
EXCEPTION WHEN duplicate_object THEN null; END $$;
-- ... (6 more enums)

CREATE TABLE IF NOT EXISTS "metrics" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  -- ... all columns from schema.ts
);
-- ... (7 more tables)
```

The `IF NOT EXISTS` / `DO $$ BEGIN ... EXCEPTION` pattern is standard drizzle-kit output for Postgres. On a clean DB it runs cleanly; on the production DB with pre-existing objects, it would still fail in older drizzle-kit versions (the exception block in the DO construct handles enum conflicts but not table conflicts). This is why the Neon branch validation + manual tracking insert is the safe path. [ASSUMED — behavior based on drizzle-kit 0.31.x Postgres output patterns; actual SQL should be verified after generation]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `drizzle-kit push` for schema changes | `drizzle-kit generate` + `migrate` | Enforced from Phase 1 | Deterministic migration history; no silent destructive operations |
| Inline `getMetricStatus` per-route | Shared `app/lib/metrics.ts` util | Phase 1 (D-06) | Single source of truth; testable |
| `getCessationDay()` with `new Date()` hardcoded | `getCessationDay(now: Date = new Date())` | Phase 1 (D-06) | Deterministic tests at any date |
| Better Auth opaque sessions (default) | Better Auth JWT plugin + JWKS | Phase 1 spike | Enables Neon `pg_session_jwt` JWK verification |

**Deprecated/outdated:**
- `drizzle-kit push`: Retired for any environment with real data. Use only for local dev against throw-away databases.
- `new Date()` inside pure functions: Replaced by `now: Date` injection pattern for testability.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `differenceInDays(addDays(START, N), START)` returns exactly `N` in date-fns 4.x (no rounding/DST issues when inputs are UTC midnight) | Stream 2b Cessation test matrix | Tests may be off by 1 on DST-transition dates; low risk since START is UTC |
| A2 | `drizzle-kit generate` output for Postgres uses `DO $$ BEGIN ... EXCEPTION` blocks for enums (not bare `CREATE TYPE`) | Stream 3 command sequence | If it uses bare CREATE TYPE, the Neon branch test may fail differently; verify after generation |
| A3 | RESOLVED: `getCurrentCessationPhase` returns an object whose phase identity field is `.phase` (NOT `.name`) — confirmed against `types/protocol.ts` CESSATION_PHASES and PATTERNS.md. All test examples in this doc use `.phase`. | Test examples | No risk — resolved; assertions corrected to `.phase` |
| A4 | `category.tsx` does not import or re-export `getMetricStatus` from any shared location (confirmed the inline copy exists at line 131) | Stream 2a refactor | Confirmed by grep — no risk |
| A5 | `pg_session_jwt` is pre-installed on all Neon Postgres instances (not a manual CREATE EXTENSION step) | Stream 4 spike | If it requires opt-in, the spike must run `CREATE EXTENSION pg_session_jwt` first; check Neon project settings |
| A6 | The `test: {}` block with `environment: "node"` and `include: ["app/**/*.test.ts"]` in `vite.config.ts` is sufficient for running Vitest — no separate `vitest.config.ts` needed | Stream 1 config | If the `reactRouter()` plugin crashes Vitest (it runs in a Node context, not a browser), a separate config may be needed to exclude the plugin from the test run |

---

## Open Questions (RESOLVED)

1. **Does `getCurrentCessationPhase` return an object with a `.name` property?**
   - **RESOLVED:** No — the phase identity field is `.phase` (type `CessationPhase`), NOT `.name`. Confirmed against `app/types/protocol.ts` `CESSATION_PHASES` and `.planning/phases/01-.../01-PATTERNS.md`. All cessation phase test examples in this doc and in Plan 01-05 use `.phase`. (Resolves Assumption A3.)
   - What we knew: `protocol-data.ts` line 36–41 calls `CESSATION_PHASES.find(...)` and returns the phase object; `CESSATION_PHASES` is imported from `types/protocol.ts`.

2. **Does the `reactRouter()` Vite plugin interfere with Vitest in node environment?**
   - **RESOLVED:** Handled via the fallback `vitest.config.ts` step in Plan 01 (Vitest setup). The primary path adds a `test:` block to the existing `vite.config.ts`; if `vitest run` fails with `reactRouter()`-plugin-related errors, Plan 01 falls back to a separate `vitest.config.ts` that imports `tsconfigPaths()` only (not `reactRouter()`/`tailwindcss()`). Either way the harness runs.
   - What we knew: Vitest reads `vite.config.ts` including all plugins; React Router's plugin does server-side work that may not be Vitest-compatible.

3. **Does `pg_session_jwt` require `CREATE EXTENSION` on the Neon project?**
   - **RESOLVED:** Addressed in Plan 03's spike setup — the spike's first step runs `CREATE EXTENSION IF NOT EXISTS pg_session_jwt` on the spike Neon branch and verifies no error (idempotent). If it fails with "permission denied," the spike escalates to Neon support per Plan 03. (Resolves Assumption A5 within the spike's own setup, on a throwaway branch.)
   - What we knew: Neon docs say the extension is available; it is auto-configured when the Neon Data API is enabled.

4. **Is `better-auth@1.6.14` the correct version to install for the spike, or should it be a devDependency slated for Phase 3?**
   - **RESOLVED:** Install as a **devDependency** for the spike per Plan 01 (`npm install -D better-auth@^1.6`). Phase 3 will promote it to a regular `dependency` when the production auth layer lands. No conflict — npm handles the dev→prod promotion cleanly.
   - What we knew: STACK.md recommends Better Auth 1.6.14 for the Phase 3 production auth layer.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, drizzle-kit | ✓ | 25.x (local), 20 (CI/Netlify) | — |
| npm | Package install | ✓ | 11.x | — |
| Neon database (branch capability) | Migrations dry-run | ✓ [ASSUMED] | — | Use prod with manual tracking insert only |
| `DATABASE_URL` or `NETLIFY_DATABASE_URL` env | drizzle-kit generate/migrate | ✓ [ASSUMED] | — | Must be set; no app fallback for CLI tools |
| Better Auth JWT plugin | Auth spike | via npm install | 1.6.14 | — |
| `@neondatabase/serverless` | Spike transaction harness | ✓ | 1.0.2 (installed) | — |

**Missing dependencies with no fallback:**
- None for the core work streams.

**Missing dependencies with fallback:**
- Neon branch capability (for safe migrations dry-run): if branch creation is unavailable, manually inspect the generated SQL instead of executing it.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `remix-app/vite.config.ts` (add `test:` block) |
| Quick run command | `cd remix-app && npm run test` (`vitest run`) |
| Full suite command | `cd remix-app && npm run test` (same — all tests in one run for Phase 1) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | `getMetricStatus` returns correct status for all 4 boundary cases | unit | `npm run test` | ❌ Wave 0 |
| COMP-01 | `getCessationDay(now)` with injected now returns correct integer | unit | `npm run test` | ❌ Wave 0 |
| COMP-01 | `getCurrentCessationPhase(day)` returns correct phase at all 8 boundary days | unit | `npm run test` | ❌ Wave 0 |
| COMP-01 | `calculatePearsonCorrelation` returns 0 for empty/degenerate inputs | unit | `npm run test` | ❌ Wave 0 |
| COMP-01 | `calculatePearsonCorrelation` returns 1.0 for perfect positive correlation | unit | `npm run test` | ❌ Wave 0 |
| DATA-03 | `migrations/0000_baseline.sql` exists and contains all 8 tables + 7 enums | manual inspection + CI artifact | `ls remix-app/migrations/` | ❌ Wave 0 |
| DATA-03 | Migration runs cleanly on a clean Neon branch | manual (Neon branch) | `npm run db:migrate` against branch | ❌ manual |
| D-05 (spike) | `SET LOCAL` scopes tenant context to transaction; bare `SET` leaks | spike integration test | custom spike script | ❌ throwaway |

### Sampling Rate

- **Per task commit:** `cd remix-app && npm run test` (all unit tests, < 5 seconds)
- **Per wave merge:** `cd remix-app && npm run test && npm run typecheck`
- **Phase gate:** All tests green + `npm run typecheck` clean + migrations committed before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `remix-app/app/lib/metrics.ts` — canonical `getMetricStatus` util (extracted from all FOUR routes)
- [ ] `remix-app/app/lib/metrics.test.ts` — status classification tests (11 cases)
- [ ] `remix-app/app/lib/protocol-data.test.ts` — cessation phase boundary tests (17 cases)
- [ ] `remix-app/app/lib/seed-data.test.ts` — Pearson correlation tests (7 cases)
- [ ] `remix-app/vite.config.ts` — add `test: { environment: "node", include: [...] }` block
- [ ] `remix-app/package.json` — add `"test": "vitest run"` script
- [ ] `remix-app/migrations/` — directory created by `npm run db:generate`

---

## Security Domain

> `security_enforcement` not explicitly set to false in config — section included.

### Applicable ASVS Categories (Phase 1 scope only)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 1 spike is throwaway, not production auth) | — |
| V3 Session Management | No (spike only) | — |
| V4 Access Control | Partially (spike proves RLS row visibility) | pg_session_jwt + RLS policy on throwaway table |
| V5 Input Validation | No | — |
| V6 Cryptography | Partially (JWT signature verification via JWKS) | pg_session_jwt extension + Better Auth JWT plugin (RS256 or ES256) |

### Known Threat Patterns for Phase 1 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tenant context leak via bare `SET` in transaction pooler | Information Disclosure | Always `SET LOCAL` inside `db.transaction()` — proven in spike |
| JWT token reuse after expiry | Spoofing | pg_session_jwt validates `exp` claim; Better Auth JWT plugin defaults to 15-min expiry |
| Spike code promoted to production | Elevation of Privilege | `spikes/` directory not under `app/` — excluded from Vite build; delete after SPIKE-FINDINGS committed |
| `__drizzle_migrations` manual insert with wrong hash | Tampering | Compare hash from `_journal.json` exactly; verify with `drizzle-kit migrate --dry-run` on branch first |

---

## Sources

### Primary (HIGH confidence)

- `remix-app/db/schema.ts` (read directly) — 8 tables, 7 enums, exact column definitions
- `remix-app/app/routes/home.tsx`, `metrics/index.tsx`, `metrics/category.tsx`, `metrics/detail.tsx` (read directly + `grep -rn "function getMetricStatus" app/routes/`) — FOUR inline `getMetricStatus` implementations confirmed identical
- `remix-app/app/lib/protocol-data.ts` (read directly) — `getCessationDay` time-coupling confirmed at line 29–31
- `remix-app/app/lib/seed-data.ts` lines 605–622 (read directly) — `calculatePearsonCorrelation` implementation
- `remix-app/drizzle.config.ts` (read directly) — `out: './migrations'` already set
- `npm view vitest version` → 4.1.8 [VERIFIED: npm registry]
- `npm view @vitest/coverage-v8 version` → 4.1.8 [VERIFIED: npm registry]
- `npm view better-auth version` → 1.6.14 [VERIFIED: npm registry]
- `npm view drizzle-kit version` → 0.31.10 [VERIFIED: npm registry]
- [better-auth.com/docs/plugins/jwt](https://www.better-auth.com/docs/plugins/jwt) — JWT plugin, JWKS endpoint URL `/api/auth/jwks`, `definePayload`, `authClient.token()` API [CITED]
- [github.com/neondatabase/pg_session_jwt](https://github.com/neondatabase/pg_session_jwt) — `auth.jwt_session_init(jwt text)`, `auth.user_id()`, `auth.uid()`, `auth.session()`, PGOPTIONS JWK config, fallback `SET request.jwt.claims` [CITED]
- [neon.com/docs/extensions/pg_session_jwt](https://neon.com/docs/extensions/pg_session_jwt) — function descriptions, JWK configuration, fallback mode [CITED]
- [vitest.dev/guide](https://vitest.dev/guide/) — `vite.config.ts` reuse, `/// <reference types="vitest/config" />` pattern [CITED]

### Secondary (MEDIUM confidence)

- [neon.com/docs/data-api/custom-authentication-providers](https://neon.com/docs/data-api/custom-authentication-providers) — custom JWKS URL registration via Neon dashboard, `auth.user_id()` in Data API context [CITED]
- [orm.drizzle.team/docs/drizzle-kit-generate](https://orm.drizzle.team/docs/drizzle-kit-generate) — generates migrations directory + SQL + snapshot [CITED]
- [orm.drizzle.team/docs/drizzle-kit-migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate) — `__drizzle_migrations` tracking table, journal-based apply logic [CITED]
- GitHub issue #2815 (drizzle-orm) — `ER_TABLE_EXISTS_ERROR` when migrating against an existing DB [CITED]
- `.planning/research/STACK.md` — Vitest 4.1.8 + Vite 7 compatibility confirmed, Better Auth 1.6.14 rationale [CITED]
- `.planning/research/PITFALLS.md` — SET vs SET LOCAL pooler leak, migrations-baseline-first constraint, cessation time-coupling detail [CITED]
- `.planning/codebase/CONCERNS.md` — zero-test baseline confirmed, `getMetricStatus` duplication confirmed (note: original scan counted three; a fourth copy in `metrics/detail.tsx:309` was found during planning revision), cessation time-coupling confirmed [CITED]

### Tertiary (LOW confidence)

- WebSearch result: `drizzle-kit migrate --no-init` flag for pre-existing tables — referenced in community discussions but not confirmed in official docs; treat as unverified [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack (Vitest, drizzle-kit commands): HIGH — verified against npm registry + official docs
- Test case matrix (status, cessation, Pearson): HIGH — derived directly from reading source code
- Migrations baseline command sequence: HIGH — confirmed against drizzle.config.ts + drizzle-kit docs
- "Already exists" pitfall resolution (manual tracking insert): MEDIUM — documented in community discussions; official docs don't have a step-by-step
- Auth spike (JWK-native path with Better Auth + Neon): MEDIUM — each component is documented separately; the exact Better Auth JWT plugin + pg_session_jwt + @neondatabase/serverless combination has no worked example; spike exists precisely to resolve this
- SET LOCAL isolation behavior: HIGH — confirmed in PITFALLS.md research against official Neon + Postgres docs

**Research date:** 2026-06-07
**Valid until:** 2026-07-07 (stable stack; Vitest/drizzle-kit patch releases won't break this)
