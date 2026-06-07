# Coding Conventions

**Analysis Date:** 2026-06-07

## Naming Patterns

**Files:**
- Route files: `kebab-case.tsx` — e.g., `version-detail.tsx`, `whoop.tsx`
- Component files: `PascalCase.tsx` — e.g., `TrendChart.tsx`
- Library/util files: `kebab-case.ts` — e.g., `real-data.ts`, `protocol-data.ts`, `seed-data.ts`
- Server-only files: `name.server.ts` suffix — e.g., `db.server.ts`
- Type files: `singular noun.ts` — e.g., `metrics.ts`, `protocol.ts`, `genetics.ts`
- Schema file: `schema.ts` (one schema file at `remix-app/db/schema.ts`)

**Functions:**
- Named functions: `PascalCase` for React components — e.g., `TrendChart`, `StatusDot`, `CategoryCard`
- Helper/utility functions: `camelCase` — e.g., `getMetricStatus`, `getMilestoneLabel`, `parseWhoopReport`
- Route exports: exact React Router convention names — `loader`, `action`, `meta`, `ErrorBoundary`, `default`
- DB accessors: `camelCase` verbs — e.g., `getCessationDay`, `getCurrentCessationPhase`, `getLatestRealMetrics`

**Variables and Constants:**
- Module-level constants: `SCREAMING_SNAKE_CASE` — e.g., `CATEGORY_INFO`, `CESSATION_PHASES`, `SUPPLEMENT_TIERS`, `MILESTONE_LABELS`, `METRIC_TARGETS`
- Local variables: `camelCase`
- Boolean flags: `camelCase` verb prefix — e.g., `isSubmitting`, `dragActive`, `trendUp`

**Types and Interfaces:**
- Interfaces: `PascalCase` — e.g., `BaseMetric`, `ProtocolVersion`, `CessationPhaseInfo`
- Type aliases: `PascalCase` — e.g., `MetricStatus`, `MetricCategory`, `SupplementTier`
- String union types used extensively over enums in TypeScript layer; pgEnums used in Drizzle schema
- Category-specific metric types follow `${Category}Metric` pattern — e.g., `VitaminMetric`, `LipidMetric`

**Database (Drizzle schema at `remix-app/db/schema.ts`):**
- Table variables: `camelCase` — e.g., `metrics`, `supplements`, `protocolVersions`
- Enum variables: `camelCase` + `Enum` suffix — e.g., `metricCategoryEnum`, `supplementTierEnum`

## Code Style

**Formatting:**
- No Prettier or ESLint config files detected in the repo — formatting is unenforced by tooling
- Indentation: 2 spaces throughout (consistent in all observed files)
- Trailing commas: present in multi-line arrays/objects
- Semicolons: present
- String quotes: double quotes in JSX/TSX, single quotes in `.ts` type files

**TypeScript:**
- `strict: true` in `remix-app/tsconfig.json` — non-negotiable per `docs/PRINCIPLES.md`
- `verbatimModuleSyntax: true` — all type-only imports MUST use `import type { ... }`, not `import { ... }`
- `noEmit: true` — TypeScript is used for type checking only; Vite handles bundling
- Target: `ES2022`, module resolution: `bundler`
- Path alias: `~/*` maps to `./app/*` — use `~/types/metrics` not relative paths from deeply nested files

**Linting/Formatting:**
- No ESLint, Prettier, or Biome config found — no automated enforcement
- TypeScript strict mode is the primary correctness gate (`npm run typecheck` runs `react-router typegen && tsc`)

## Import Organization

**Order observed across all route and component files:**
1. External framework imports (`react-router`, `react`, `date-fns`, `recharts`)
2. Generated route types (`import type { Route } from "./+types/routename"`)
3. Internal type imports (`~/types/metrics`, `~/types/protocol`, `~/types/genetics`) — always `import type`
4. Internal library imports (`~/lib/real-data`, `~/lib/protocol-data`, `~/lib/seed-data`)
5. Internal component imports (`~/components/TrendChart`)
6. CSS imports (`./app.css` — root only)

**Path Aliases:**
- `~/` resolves to `remix-app/app/` — prefer this over relative paths in route files
- Generated types at `.react-router/types/` accessed via `./+types/routename` (relative, always)

**`import type` enforcement:**
- `verbatimModuleSyntax: true` requires `import type` for any import used only as a type
- Pattern: `import type { Route } from "./+types/home"` — seen in every route file
- Mixed imports: `import { CATEGORY_INFO, type MetricCategory, type MetricStatus } from "~/types/metrics"` — value and type in one statement

## Error Handling

**Loader 404 pattern (loaders only):**
```typescript
if (!version) {
  throw new Response("Version not found", { status: 404 });
}
```
Used in: `remix-app/app/routes/metrics/detail.tsx`, `remix-app/app/routes/metrics/category.tsx`, `remix-app/app/routes/protocol/version-detail.tsx`

**Action try/catch pattern:**
```typescript
try {
  // parse / process
  return { success: true, ... };
} catch (error) {
  return {
    error: `Failed to parse: ${error instanceof Error ? error.message : "Unknown error"}`,
    success: false,
  };
}
```
Used in: `remix-app/app/routes/import/whoop.tsx`, `remix-app/app/routes/import/vault.tsx`

**Root ErrorBoundary (`remix-app/app/root.tsx`):**
- Handles `isRouteErrorResponse` for 404/HTTP errors
- Shows stack trace only in `import.meta.env.DEV`
- All routes inherit this — no per-route `ErrorBoundary` exports observed beyond the root

**DB connection errors:**
- `remix-app/app/lib/db.server.ts` throws `new Error(...)` with message when `DATABASE_URL` is absent

## Logging

- No logging framework detected — `console.*` calls are absent from app code
- No structured logging, no log levels
- Errors surface via React Router's `ErrorBoundary` or action return values

## Comments

**Section dividers in large lib files:**
```typescript
// =============================================================================
// SECTION HEADING
// =============================================================================
```
Used heavily in `remix-app/app/lib/protocol-data.ts` (741 lines) and `remix-app/app/lib/real-data.ts` (1344 lines)

**JSDoc on exported functions in lib files:**
```typescript
/**
 * Calculate current cessation day from the real start date
 */
export function getCessationDay(): number { ... }
```
Used in `remix-app/app/lib/protocol-data.ts` — not used in route files or components

**Inline comments:**
- Source attribution on data: `// Source: 602/04_Blood_Work.md`
- Rationale on non-obvious logic: `// Add 10% padding for visual breathing room`
- `TODO`/`FIXME`/`HACK` markers: zero detected in current codebase

## Function Design

**Size:** Route default components run 100–350 lines. The target per `docs/PRINCIPLES.md` is ≤300 lines per component — `home.tsx` (525 lines) and `real-data.ts` (1344 lines) exceed this.

**Sub-components:** Route files define private sub-components above the default export — e.g., `StatusDot`, `CategoryCard`, `CessationProgress` are all defined inside `home.tsx`. This keeps co-located UI logic readable without separate files.

**Parameters:** Prefer destructured props objects with inline type annotation:
```typescript
function StatusDot({ status }: { status: MetricStatus }) { ... }
function CategoryCard({ category, metrics }: { category: MetricCategory; metrics: Metric[] }) { ... }
```

**Return Values:** Loaders return plain objects (serialized by React Router). Actions return `{ success: boolean, error?: string, ... }` shape.

## Module Design

**Exports:**
- Route files: named exports (`loader`, `action`, `meta`, `ErrorBoundary`) + `default` component
- Type files: named exports only — no default export
- Lib files: named exports of data arrays and utility functions
- Barrel: `remix-app/app/types/index.ts` re-exports from all three type modules via `export * from './metrics'` etc.

**`.server.ts` convention:**
- Files suffixed `.server.ts` (e.g., `db.server.ts`) are server-only and never bundled into the client
- Only `remix-app/app/lib/db.server.ts` uses this pattern currently

**Tailwind CSS approach:**
- Tailwind 4.x with `@tailwindcss/vite` plugin — no `tailwind.config.js` file
- Classes applied inline via JSX `className` strings
- Dark mode: `dark:` prefix used throughout — e.g., `bg-white dark:bg-gray-900`
- Status color mapping done via `Record<MetricStatus, string>` lookup objects defined locally in each component (not centralized)

## `any` Usage

**Policy:** `strict: true` prohibits implicit `any`. However, explicit `any` casts appear in two contexts:
- Recharts callback props in `TrendChart.tsx`: `({ active, payload }: any)`, `dot={(props: any) => ...}` — Recharts types are incomplete
- Data literal workarounds in `real-data.ts` and `seed-data.ts`: `subcategory: "glucose" as any` — the `subcategory` field typing vs. the category-discriminated metric union is not fully resolved

**Do not introduce new `any` casts** outside these two existing contexts.

---

*Convention analysis: 2026-06-07*
