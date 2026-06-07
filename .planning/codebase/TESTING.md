# Testing Patterns

**Analysis Date:** 2026-06-07

## Testing Reality: No Tests Exist

**There is currently no test runner, no test framework, and no test files in this repository.**

`remix-app/package.json` has no `test` script. The `devDependencies` include no test runner (no Vitest, Jest, Playwright, or similar). No `*.test.*` or `*.spec.*` files exist anywhere in `remix-app/`.

This is a known, documented gap. From `docs/PRINCIPLES.md`:

> **🎯 Tests (currently a gap)**
> The constitution mandates test-first + 80% coverage. **There is no test runner and no tests in the repo today** (`package.json` has no `test` script). For an n=1 instrument that was tolerable; for M1 it is not — the moment per-client PHI and a protocol-decision engine are in play, the engine and the ingest/parse path need real coverage. **Schedule "testing-as-first-class" as an early M1 phase**, don't inherit the breach.

## Current Type Safety Substitute

The only automated code correctness mechanism is TypeScript's type checker:

```bash
npm run typecheck    # react-router typegen && tsc --noEmit
```

Run from `remix-app/`. This catches type errors but not logic bugs, runtime behavior, or integration failures.

## Test Framework

**Runner:** Not installed
**Assertion Library:** Not installed
**E2E Framework:** Not installed

**Run Commands:**
```bash
# No test commands exist. The only check is:
cd remix-app && npm run typecheck    # Type generation + type check only
```

## High-Priority Testing Gaps

Ordered by risk, derived from `docs/PRINCIPLES.md` M1 priorities:

**Critical (must be addressed before M1 PHI/multi-tenant work):**
- `remix-app/app/lib/real-data.ts` — data parsing and `getLatestRealMetrics`, `getRealMetrics`, `getProjections` functions (1344 lines, untested)
- `remix-app/app/lib/protocol-data.ts` — `getCessationDay`, `getCurrentCessationPhase`, protocol version lookups (741 lines, untested)
- `remix-app/app/routes/import/whoop.tsx` — `parseWhoopReport` action handler: the only path that processes external data input
- `remix-app/app/routes/import/vault.tsx` — vault markdown parsing action handler

**High (business logic):**
- `getMetricStatus` — duplicated in `home.tsx`, `metrics/index.tsx`, and `metrics/detail.tsx` with slightly diverging logic; needs canonical implementation + tests
- Status classification logic: the `optimal | borderline | deficient | excess` taxonomy is the core UX contract

**Medium (UI behavior):**
- `remix-app/app/components/TrendChart.tsx` — chart rendering edge cases (empty data, single point, projections)
- Route loaders — 404 `throw new Response(...)` paths for invalid category/metric/version params

## Recommended Framework When Tests Are Added

Based on the stack (React Router 7, Vite, TypeScript, React 19):

**Unit/Integration:** Vitest — native Vite integration, no config overhead
- `vitest.config.ts` alongside `vite.config.ts` in `remix-app/`
- `@vitest/ui` for local test UI

**Component Testing:** Vitest + `@testing-library/react`
- Install: `@testing-library/react`, `@testing-library/user-event`, `jsdom` or `happy-dom`

**E2E:** Playwright — recommended for Remix route testing
- Install separately, config in `remix-app/playwright.config.ts`

## Where to Place Test Files (When Created)

**Co-location pattern** is preferred (consistent with React Router/Vite conventions):

```
remix-app/
├── app/
│   ├── lib/
│   │   ├── real-data.ts
│   │   ├── real-data.test.ts        # Unit tests for lib functions
│   │   ├── protocol-data.ts
│   │   └── protocol-data.test.ts
│   ├── components/
│   │   ├── TrendChart.tsx
│   │   └── TrendChart.test.tsx      # Component tests
│   └── routes/
│       └── import/
│           ├── whoop.tsx
│           └── whoop.test.ts        # Action/loader tests
├── tests/                           # E2E tests (Playwright)
│   └── routes/
│       └── metrics.spec.ts
└── vitest.config.ts
```

## Patterns to Follow When Tests Are Written

**Lib function (unit test):**
```typescript
import { describe, it, expect } from 'vitest';
import { getCessationDay, getCurrentCessationPhase } from '~/lib/protocol-data';

describe('getCessationDay', () => {
  it('returns positive number after cessation start date', () => {
    const day = getCessationDay();
    expect(day).toBeGreaterThan(0);
  });
});
```

**Status classification (unit test — the duplicated function that should be extracted):**
```typescript
import { describe, it, expect } from 'vitest';

describe('getMetricStatus', () => {
  it('returns optimal when value within optimal range', () => { ... });
  it('returns deficient when value below reference min', () => { ... });
  it('returns borderline when within reference but outside optimal', () => { ... });
});
```

**Action handler (integration test with Remix test utilities):**
```typescript
// Test parseWhoopReport isolation (export from whoop.tsx when extracted to lib)
import { describe, it, expect } from 'vitest';

describe('parseWhoopReport', () => {
  it('extracts HRV from daily_metrics', () => { ... });
  it('falls back to summary when no daily_metrics', () => { ... });
  it('handles malformed JSON gracefully', () => { ... });
});
```

## Coverage

**Requirements:** None enforced (no test runner configured)

**Target when established (per `docs/PRINCIPLES.md`):** 80% line coverage — especially on:
- `remix-app/app/lib/real-data.ts`
- `remix-app/app/lib/protocol-data.ts`
- Any future ingest/parse pipeline added at M1

---

*Testing analysis: 2026-06-07*
