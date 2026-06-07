# Phase 1: Schema Baseline + Engine Tests + Auth Spike - Pattern Map

**Mapped:** 2026-06-07
**Files analyzed:** 9 (new/modified)
**Analogs found:** 7 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `remix-app/app/lib/metrics.ts` | utility | transform | `remix-app/app/lib/seed-data.ts` (exported pure fn) | role-match |
| `remix-app/app/lib/metrics.test.ts` | test | transform | none (zero tests today) | no-analog |
| `remix-app/app/lib/protocol-data.ts` (modified) | utility | transform | itself (narrow signature change) | exact |
| `remix-app/app/lib/protocol-data.test.ts` | test | transform | none (zero tests today) | no-analog |
| `remix-app/app/lib/seed-data.test.ts` | test | transform | none (zero tests today) | no-analog |
| `remix-app/vite.config.ts` (modified) | config | — | itself (add `test:` block) | exact |
| `remix-app/package.json` (modified) | config | — | itself (add scripts) | exact |
| `remix-app/migrations/` (generated) | migration | batch | `remix-app/drizzle.config.ts` (toolchain config) | toolchain |
| `remix-app/spikes/auth-rls/` (throwaway) | spike | request-response | `remix-app/app/lib/db.server.ts` (Neon driver pattern) | partial |

---

## Pattern Assignments

### `remix-app/app/lib/metrics.ts` (utility, transform)

**Analog:** `remix-app/app/lib/seed-data.ts` (exported pure function pattern) and the three inline copies being consolidated.

**Imports pattern** — copy from `remix-app/app/lib/protocol-data.ts` lines 5–13 (type-only imports from types dir using `~/` alias via `import type`):
```typescript
import type { Metric, MetricStatus } from "~/types/metrics";
```
Note: `verbatimModuleSyntax: true` requires `import type` for type-only imports. Use `~/` alias, not relative paths.

**Core extraction pattern** — extracted verbatim from `remix-app/app/routes/home.tsx` lines 28–37 (the most compact of the three identical copies):
```typescript
// home.tsx lines 28-37 — canonical inline version to extract
function getMetricStatus(metric: Metric): MetricStatus {
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
The other two copies (`metrics/index.tsx` lines 52–72, `metrics/category.tsx` lines 131–148) are semantically identical but use multiline `if` bodies. The `home.tsx` version is the most compact and the canonical form to extract. Both three agree on boundary semantics — the extracted util must be behaviorally identical.

**JSDoc pattern** — copy from `remix-app/app/lib/protocol-data.ts` lines 26–28 (JSDoc on exported lib functions):
```typescript
/**
 * Calculate current cessation day from the real start date
 */
export function getCessationDay(): number { ... }
```

**Full target file shape:**
```typescript
// remix-app/app/lib/metrics.ts
import type { Metric, MetricStatus } from "~/types/metrics";

/**
 * Classify a metric's value against its optimal and reference ranges.
 * Returns "optimal" | "borderline" | "deficient" | "excess".
 * Falls back to "optimal" when no referenceRange is defined.
 */
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

**Import swap in consuming routes** — replace the inline `function getMetricStatus` in each of the three routes with:
```typescript
import { getMetricStatus } from "~/lib/metrics";
```
Remove the `type MetricStatus` import from the route's types import if it is only used via `getMetricStatus` return type (check per-file — `home.tsx` still uses `MetricStatus` directly in `statusCounts`).

---

### `remix-app/app/lib/protocol-data.ts` — modified signature (utility, transform)

**Analog:** itself. Narrow change: add `now: Date = new Date()` parameter to `getCessationDay`.

**Current signature** (`remix-app/app/lib/protocol-data.ts` lines 29–31):
```typescript
export function getCessationDay(): number {
  return differenceInDays(new Date(), parseISO(CESSATION_START_DATE));
}
```

**Target signature** (D-06 requirement — injectable `now` for deterministic tests):
```typescript
export function getCessationDay(now: Date = new Date()): number {
  return differenceInDays(now, parseISO(CESSATION_START_DATE));
}
```

**`getCurrentCessationPhase`** (`remix-app/app/lib/protocol-data.ts` lines 36–41) — already pure, no change needed:
```typescript
export function getCurrentCessationPhase(day: number): typeof CESSATION_PHASES[0] {
  const phase = CESSATION_PHASES.find(
    (p) => day >= p.dayRange.start && day <= p.dayRange.end
  );
  return phase || CESSATION_PHASES[CESSATION_PHASES.length - 1];
}
```

**`CESSATION_PHASES` shape** — confirmed from `remix-app/app/types/protocol.ts` lines 89–118. Each entry has properties `phase`, `label`, `dayRange: { start, end }`, `focus`, `description`. Tests must use `.phase` (not `.name`) to assert phase identity:
```typescript
// CORRECT — property is "phase", not "name"
expect(getCurrentCessationPhase(1).phase).toBe("acute");
// WRONG — there is no .name property on CessationPhaseInfo
expect(getCurrentCessationPhase(1).name).toBe("acute"); // TypeScript error
```
This resolves RESEARCH.md Open Question 1 (A3 assumption was wrong — use `.phase`, not `.name`).

**Call site in `home.tsx`** (line 55) uses `getCessationDay()` with no args — the default parameter preserves this:
```typescript
const cessationDay = cessation ? getCessationDay() : 0; // unchanged call — still works
```

---

### `remix-app/app/lib/metrics.test.ts` (test, transform)

**Analog:** None (zero tests in codebase). Pattern comes from RESEARCH.md Code Examples and project conventions.

**Test file location convention (D-07 / RESEARCH.md):** Colocated in `app/lib/` alongside the source file. The Vitest `include` pattern `app/**/*.test.ts` picks this up automatically. No `__tests__/` subdirectory — colocated is the established pattern per RESEARCH.md.

**Import pattern for test files:**
```typescript
import { describe, it, expect } from "vitest";
import { getMetricStatus } from "~/lib/metrics";
import type { Metric } from "~/types/metrics";
```
- `~/` alias works in test files because `tsconfigPaths()` plugin is inherited by Vitest from `vite.config.ts`.
- `import type` for Metric (type-only, `verbatimModuleSyntax: true` enforced).

**Fixture factory pattern** (from RESEARCH.md — the only way to build Metric objects without full field overhead):
```typescript
function makeMetric(
  value: number,
  referenceRange?: { min: number; max: number },
  optimalRange?: { min: number; max: number }
): Metric {
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
  } as unknown as Metric;
  // `as unknown as Metric` acceptable in test fixtures only — CONVENTIONS.md §any Usage
}
```

**Test structure pattern:**
```typescript
describe("getMetricStatus", () => {
  it("returns optimal when value is within optimal range", () => {
    expect(getMetricStatus(makeMetric(90, { min: 50, max: 150 }, { min: 70, max: 120 }))).toBe("optimal");
  });
  // ... 11 boundary cases total per RESEARCH.md §2a boundary matrix
});
```

---

### `remix-app/app/lib/protocol-data.test.ts` (test, transform)

**Analog:** None (zero tests in codebase).

**Import pattern:**
```typescript
import { describe, it, expect } from "vitest";
import { parseISO, addDays } from "date-fns";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/protocol-data";
```
`date-fns` is already in `dependencies` (`^4.1.0`) — no install needed.

**Date injection pattern:**
```typescript
const START = parseISO("2025-12-23T00:00:00.000Z");
const day = (n: number) => addDays(START, n);
```

**Assertion property fix** — use `.phase` not `.name`:
```typescript
// CORRECT (confirmed from types/protocol.ts lines 89-118)
expect(getCurrentCessationPhase(1).phase).toBe("acute");
expect(getCurrentCessationPhase(22).phase).toBe("stabilization");
expect(getCurrentCessationPhase(61).phase).toBe("clearing");
expect(getCurrentCessationPhase(121).phase).toBe("optimization");
```

**Never call `getCessationDay()` without args in tests** (Pitfall 5):
```typescript
// WRONG in tests:
expect(getCessationDay()).toBe(167); // date-coupled, breaks tomorrow

// CORRECT in tests:
expect(getCessationDay(day(21))).toBe(21);
```

---

### `remix-app/app/lib/seed-data.test.ts` (test, transform)

**Analog:** The target function is already pure at `remix-app/app/lib/seed-data.ts` lines 605–622.

**Source function** (`seed-data.ts` lines 605–622):
```typescript
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}
```
No refactor needed — import directly.

**Import pattern:**
```typescript
import { describe, it, expect } from "vitest";
import { calculatePearsonCorrelation } from "~/lib/seed-data";
```

**Floating-point assertion pattern:**
```typescript
// Exact cases (denominator is precise): use toBeCloseTo with high precision
expect(calculatePearsonCorrelation([1,2,3,4,5], [1,2,3,4,5])).toBeCloseTo(1.0, 10);

// Guard cases: use exact toBe(0)
expect(calculatePearsonCorrelation([], [])).toBe(0);
expect(calculatePearsonCorrelation([1,2,3,4,5], [3,3,3,3,3])).toBe(0);
```

---

### `remix-app/vite.config.ts` — modified (config)

**Current file** (`remix-app/vite.config.ts` lines 1–8 — full file):
```typescript
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
```

**Target pattern** (add `/// <reference>` directive + `test:` block; do NOT change the `defineConfig` import):
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
  },
});
```

**Critical constraint:** Keep `import { defineConfig } from "vite"` — do NOT change to `vitest/config`. Changing the import breaks the `reactRouter()` plugin (RESEARCH.md Pitfall 2). The `/// <reference types="vitest/config" />` directive gives TypeScript types for the `test:` block without changing the import.

**Open question (RESEARCH.md Q2):** If `vitest run` errors due to `reactRouter()` plugin incompatibility in Node context, add `exclude: ['app/routes/**', 'app/root.tsx']` to the `test:` block as a first fix before resorting to a separate `vitest.config.ts`.

---

### `remix-app/package.json` — modified (config)

**Current scripts block** (lines 5–13):
```json
"scripts": {
  "build": "react-router build",
  "dev": "react-router dev",
  "start": "react-router-serve ./build/server/index.js",
  "typecheck": "react-router typegen && tsc",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

**Target — add two scripts:**
```json
"scripts": {
  "build": "react-router build",
  "dev": "react-router dev",
  "start": "react-router-serve ./build/server/index.js",
  "typecheck": "react-router typegen && tsc",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

**New devDependencies to add:**
```json
"devDependencies": {
  "vitest": "^4.1.8",
  "@vitest/coverage-v8": "^4.1.8",
  "better-auth": "^1.6.14"
}
```
`better-auth` goes in `devDependencies` for Phase 1 spike only; Phase 3 moves it to `dependencies`.

---

### `remix-app/migrations/` — generated by drizzle-kit (migration, batch)

**Not a hand-authored file.** Generated by `npm run db:generate` from `remix-app/db/schema.ts`.

**Config analog** (`remix-app/drizzle.config.ts` lines 1–10 — full file):
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL!,
  },
});
```
`out: './migrations'` is already set — the directory just does not exist yet. Running `npm run db:generate` creates it.

**Expected output structure:**
```
remix-app/migrations/
├── 0000_baseline.sql          # Full CREATE TYPE + CREATE TABLE DDL for 8 tables + 7 enums
└── meta/
    ├── _journal.json          # Migration journal — contains hash needed for manual apply
    └── 0000_snapshot.json     # Schema snapshot for future drizzle-kit diff
```

**D-08 constraint:** This is a pure as-is snapshot. No schema cleanup. The generated SQL will include `syncStatus`/`syncVersion` columns and `isActive: integer` exactly as-is per D-09.

**Production apply pattern** (do NOT run `db:migrate` directly against prod — RESEARCH.md Pitfall 1):
```sql
-- After verifying SQL runs cleanly on a fresh Neon branch, mark it applied on prod:
INSERT INTO __drizzle_migrations (hash, created_at)
VALUES ('<hash from migrations/meta/_journal.json>', extract(epoch from now()) * 1000);
```

---

### `remix-app/spikes/auth-rls/` — throwaway spike (spike, request-response)

**Analog:** `remix-app/app/lib/db.server.ts` — shares the `@neondatabase/serverless` driver. Copy the Neon connection pattern.

**Driver pattern analog** (`remix-app/app/lib/db.server.ts` lines 1–3):
```typescript
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../../db/schema';
```

**Spike uses `neon()` (HTTP/SQL-tagged-template) not `Pool`** — for simpler transaction harness:
```typescript
// spikes/auth-rls/spike-db.ts — throwaway, delete after SPIKE-FINDINGS committed
import { neon } from "@neondatabase/serverless";
```
`@neondatabase/serverless` exports both `Pool` (WebSocket, used by `db.server.ts`) and `neon` (HTTP tagged-template). The spike uses `neon` because it has a simpler `.transaction()` API for the JWK round-trip test.

**Spike file structure:**
```
remix-app/spikes/auth-rls/
├── spike-server.ts    # Better Auth instance with jwt() plugin, JWKS endpoint
├── spike-db.ts        # neon() transaction harness calling auth.jwt_session_init
├── spike-rls.sql      # throwaway table CREATE + RLS policy + test INSERTs + DROP
└── SPIKE-FINDINGS.md  # verdict note (this file is committed; spike-*.ts files are deleted)
```

**Import pattern for spike files** — use relative paths (not `~/` alias) since spike files are outside `app/`:
```typescript
// spikes are not under app/ — use process.env directly, no alias
import { neon } from "@neondatabase/serverless";
```

**Security constraint (RESEARCH.md):** Spike files live under `spikes/`, never under `app/routes/` or `app/lib/`. Vite's `include: ["app/**/*.test.ts"]` pattern does not pick up spike files. After SPIKE-FINDINGS.md is committed, delete `spike-server.ts`, `spike-db.ts`, `spike-rls.sql`.

---

## Shared Patterns

### TypeScript Import Convention (applies to all new files)

**Source:** `remix-app/app/lib/protocol-data.ts` lines 5–13 + CONVENTIONS.md

`verbatimModuleSyntax: true` is active. Every type-only import must use `import type`:
```typescript
// CORRECT
import type { Metric, MetricStatus } from "~/types/metrics";
import { describe, it, expect } from "vitest";          // value imports: no "type"

// WRONG — will fail tsc with verbatimModuleSyntax
import { Metric, MetricStatus } from "~/types/metrics"; // types imported as values
```

### Path Alias Convention (applies to all `app/` files)

**Source:** `remix-app/tsconfig.json` + CONVENTIONS.md §Path Aliases

Use `~/` for any file under `app/`:
```typescript
import { getMetricStatus } from "~/lib/metrics";        // CORRECT
import { getMetricStatus } from "../lib/metrics";        // WRONG — use alias
import { getMetricStatus } from "../../lib/metrics";     // WRONG — use alias
```
Exception: files in `spikes/` (outside `app/`) must use relative or absolute imports — `~/` does not resolve there.

### JSDoc on Exported Lib Functions

**Source:** `remix-app/app/lib/protocol-data.ts` lines 20–28

All exported functions in `app/lib/*.ts` get a JSDoc block:
```typescript
/**
 * One-line description.
 */
export function myFunction(...): ReturnType { ... }
```
Route files and test files do not use JSDoc.

### Section Divider Comments in Large Lib Files

**Source:** `remix-app/app/lib/protocol-data.ts` (741 lines), `remix-app/app/lib/real-data.ts` (1344 lines)
```typescript
// =============================================================================
// SECTION HEADING
// =============================================================================
```
Not needed for the small new `metrics.ts` file. Applies if future additions to `protocol-data.ts` exceed one logical section.

### Error Pattern in DB/Server Code

**Source:** `remix-app/app/lib/db.server.ts` lines 14–18

For missing env vars or configuration errors, throw `new Error(...)` with a descriptive message:
```typescript
if (!connectionString) {
  throw new Error(
    'Database connection string not found. Set NETLIFY_DATABASE_URL or DATABASE_URL.'
  );
}
```
The spike harness should follow the same pattern for missing `DATABASE_URL`.

---

## No Analog Found

Files with no close match in the codebase — planner should use RESEARCH.md patterns and test conventions established above.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `remix-app/app/lib/metrics.test.ts` | test | transform | Zero test files exist in codebase; no test runner configured yet |
| `remix-app/app/lib/protocol-data.test.ts` | test | transform | Zero test files exist in codebase |
| `remix-app/app/lib/seed-data.test.ts` | test | transform | Zero test files exist in codebase |

**Established convention for all three test files (no existing analog — derive from RESEARCH.md):**
- Location: colocated alongside source in `remix-app/app/lib/` (e.g., `metrics.test.ts` beside `metrics.ts`)
- Naming: `{source-file}.test.ts` — e.g., `metrics.test.ts`, `protocol-data.test.ts`, `seed-data.test.ts`
- Structure: `describe` / `it` / `expect` from `vitest` (not Jest — no Jest in this project)
- Fixture factories: inline `function make...()` helpers at top of file for complex objects (see `makeMetric` above)
- No `beforeEach`/`afterEach` needed for pure functions — all inputs are passed directly
- `as unknown as Metric` casts acceptable in test fixtures only per CONVENTIONS.md §any Usage

---

## Key Behavioral Contracts to Preserve

### `getMetricStatus` — boundary semantics (all three inline copies agree)

| input | expected |
|-------|----------|
| `value` within `optimalRange` | `"optimal"` |
| `value` within `referenceRange` but below `optimalRange.min` | `"borderline"` |
| `value` within `referenceRange` but above `optimalRange.max` | `"borderline"` |
| `value < referenceRange.min` | `"deficient"` |
| `value > referenceRange.max` | `"excess"` |
| `value === referenceRange.min` | `"borderline"` (within ref, not in optimal) |
| `value === referenceRange.max` | `"borderline"` (within ref, not in optimal) |
| no `referenceRange` defined | `"optimal"` (defensive fallback — even if value outside optimalRange) |

The last row is a known quirk. Tests must assert it to lock the contract before extraction.

### `getCessationDay` — `now` injection

After D-06 modification, the function signature becomes `getCessationDay(now: Date = new Date()): number`. All existing call sites pass no argument (e.g., `home.tsx` line 55 `getCessationDay()`). The default parameter preserves this behavior — no call sites need updating.

### `getCurrentCessationPhase` — property name

Phase identity is accessed via `.phase` (type `CessationPhase = 'acute' | 'stabilization' | 'clearing' | 'optimization'`), not `.name`. Confirmed by reading `remix-app/app/types/protocol.ts` lines 80–87 (`interface CessationPhaseInfo` has `phase: CessationPhase` field).

---

## Metadata

**Analog search scope:** `remix-app/app/lib/`, `remix-app/app/routes/`, `remix-app/app/types/`, `remix-app/`
**Files read:** 14 source files
**Pattern extraction date:** 2026-06-07
