<!-- refreshed: 2026-06-07 -->
# Architecture

**Analysis Date:** 2026-06-07

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          Browser / React 19                             │
│  Dashboard  │  Metrics  │  Protocol  │  Insights  │  Import             │
└──────┬───────┴─────┬─────┴─────┬──────┴─────┬──────┴────┬──────────────┘
       │             │           │             │           │
       ▼             ▼           ▼             ▼           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Route Modules  (React Router 7 SSR)                    │
│  `remix-app/app/routes/home.tsx`                                        │
│  `remix-app/app/routes/metrics/{layout,index,category,detail}.tsx`      │
│  `remix-app/app/routes/protocol/{layout,index,versions,...}.tsx`        │
│  `remix-app/app/routes/insights/{layout,index,correlations,genetics}.tsx`│
│  `remix-app/app/routes/import/{layout,index,whoop,vault}.tsx`           │
│                                                                         │
│  Each module exports: loader | action | meta | default component        │
└──────┬──────────────────────────────────────────────────────────────────┘
       │  calls
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Data Layer  (`app/lib/`)                          │
│  `real-data.ts`       — static health metrics (blood work, DEXA, WHOOP)│
│  `protocol-data.ts`   — supplement protocols, cessation log             │
│  `seed-data.ts`       — correlations, genetic variants (dev/static)     │
│  `db.server.ts`       — lazy Drizzle+Neon connection (server-only)      │
└──────┬──────────────────────────────────────────────────────────────────┘
       │  imports schema from
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Database  (Neon Postgres via Drizzle)                  │
│  `remix-app/db/schema.ts`  — 8 tables, 7 enums                         │
│  Connection: NETLIFY_DATABASE_URL | DATABASE_URL                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | HTML shell, sticky header, global nav, error boundary | `remix-app/app/root.tsx` |
| Route registry | Explicit route config via `index/route/layout` | `remix-app/app/routes.ts` |
| Home / Dashboard | Aggregate KPIs, cessation tracker, category grid | `remix-app/app/routes/home.tsx` |
| Metrics layout | Sidebar category nav + `<Outlet>` | `remix-app/app/routes/metrics/layout.tsx` |
| Metrics index | Category overview cards with status counts | `remix-app/app/routes/metrics/index.tsx` |
| Metrics category | Per-category metric list with sparklines | `remix-app/app/routes/metrics/category.tsx` |
| Metrics detail | Single metric deep-dive with TrendChart | `remix-app/app/routes/metrics/detail.tsx` |
| Protocol layout | Tab nav (Overview/Versions/Supplements/Cessation/Compare) + `<Outlet>` | `remix-app/app/routes/protocol/layout.tsx` |
| Insights layout | Tab nav (Overview/Correlations/Genetics) + `<Outlet>` | `remix-app/app/routes/insights/layout.tsx` |
| Import layout | Tab nav (Overview/WHOOP/Vault) + `<Outlet>` | `remix-app/app/routes/import/layout.tsx` |
| TrendChart | Recharts line chart with reference bands, milestones, projections | `remix-app/app/components/TrendChart.tsx` |
| real-data | Static metric arrays across 9 categories, M1–M4 history | `remix-app/app/lib/real-data.ts` |
| protocol-data | Protocol versions P0–P6, supplements, cessation log | `remix-app/app/lib/protocol-data.ts` |
| seed-data | Correlation and genetic variant static arrays | `remix-app/app/lib/seed-data.ts` |
| db.server | Lazy Drizzle client, server-only, not yet called by routes | `remix-app/app/lib/db.server.ts` |
| schema | 8 Drizzle tables: metrics, protocolVersions, protocolChanges, milestones, supplements, supplementLog, correlations, cessationLog | `remix-app/db/schema.ts` |

## Pattern Overview

**Overall:** React Router 7 full-stack SSR with static in-module data (no DB reads at runtime yet)

**Key Characteristics:**
- Explicit route config at `remix-app/app/routes.ts` — no file-name convention, no magic
- Each section uses a `layout.tsx` for shared chrome (sidebar or tab nav), child routes render inside `<Outlet>`
- All loaders run on the server; data is serialized and passed as `loaderData` to the default component
- Current data layer is entirely static TypeScript modules (`real-data.ts`, `protocol-data.ts`, `seed-data.ts`) — the Drizzle client exists but no route uses it yet
- Import routes (`whoop.tsx`, `vault.tsx`) use `action` (POST) for client-submitted file parsing; no DB persistence wired yet
- TypeScript strict mode enforced; path alias `~/*` maps to `remix-app/app/*`

## Layers

**Routing / Presentation Layer:**
- Purpose: Render pages, define loaders/actions, export meta
- Location: `remix-app/app/routes/`
- Contains: Route modules — one file per page, each with `loader`, optional `action`, `meta`, and a default React component
- Depends on: `app/lib/` for data, `app/types/` for shapes, `app/components/` for shared UI
- Used by: React Router framework (server and client)

**Shared UI Components:**
- Purpose: Reusable visual widgets used across multiple routes
- Location: `remix-app/app/components/`
- Contains: `TrendChart.tsx` (exports `TrendChart` and `TrendSparkline`)
- Depends on: Recharts, date-fns
- Used by: `metrics/category.tsx`, `metrics/detail.tsx`

**Data / Business Logic Layer:**
- Purpose: Provide typed data to loaders; encapsulate domain logic
- Location: `remix-app/app/lib/`
- Contains: `real-data.ts`, `protocol-data.ts`, `seed-data.ts`, `db.server.ts`
- Depends on: `app/types/`, `date-fns`, Drizzle (db.server.ts only)
- Used by: route loaders

**Type Definitions:**
- Purpose: Shared TypeScript interfaces, union types, and domain constants
- Location: `remix-app/app/types/`
- Contains: `metrics.ts` (9 category types + `CATEGORY_INFO`), `protocol.ts` (supplement/cessation types + `CESSATION_PHASES`), `genetics.ts` (`GeneticVariant` + `CONFIDENCE_LEVELS`), `index.ts` (re-exports all)
- Depends on: nothing (pure types and constants)
- Used by: all layers

**Database Schema:**
- Purpose: Drizzle table definitions and relations for Neon Postgres
- Location: `remix-app/db/schema.ts`
- Contains: 8 tables, 7 pgEnums
- Depends on: `drizzle-orm/pg-core`
- Used by: `db.server.ts`, `drizzle.config.ts`

## Data Flow

### Primary Read Path (Loader → Component)

1. Browser requests route (e.g., `/metrics/vitamins`)
2. React Router calls `loader()` in `remix-app/app/routes/metrics/category.tsx` on the server
3. Loader imports `getRealMetrics()` from `remix-app/app/lib/real-data.ts` — returns in-memory static array
4. Loader filters, sorts, and shapes data; returns plain object
5. React Router serializes return value and hydrates `loaderData` prop on the default component
6. Component renders with typed `loaderData` (typed via `Route.ComponentProps` from `.react-router/types/`)

### Import / Write Path (Action → Response)

1. User submits file via `<Form method="post">` on `/import/whoop` or `/import/vault`
2. React Router calls `action()` in the respective route on the server
3. Action reads `FormData`, parses JSON/Markdown, returns parsed metric array or error
4. `useActionData()` hook gives component access to action return value
5. No DB persistence wired — parsed data is only returned to the client currently

### Nested Layout Rendering

1. `root.tsx` renders `<Header>` (global nav) + `<main><Outlet/></main>`
2. Layout routes (e.g., `metrics/layout.tsx`) render section chrome (sidebar/tabs) + `<Outlet>`
3. Leaf routes (e.g., `metrics/category.tsx`) render page content

**State Management:**
- No client-side global state (no Redux, Zustand, Context)
- All state flows via loader return values and action return values
- URL params (`category`, `metricId`, `version`) drive which data is fetched

## Key Abstractions

**`CATEGORY_INFO`:**
- Purpose: Maps the 9 `MetricCategory` string literals to display metadata (label, icon, color, description)
- Location: `remix-app/app/types/metrics.ts` (line 152)
- Pattern: `Record<MetricCategory, CategoryInfo>` constant — used as the source of truth for category iteration everywhere

**`CESSATION_PHASES`:**
- Purpose: Array of 4 phase objects (acute/stabilization/clearing/optimization) with day ranges and focus text
- Location: `remix-app/app/types/protocol.ts` (line 89)
- Pattern: Static typed array — `getCurrentCessationPhase(day)` in `protocol-data.ts` selects the active phase by day range

**`Metric` union type:**
- Purpose: Discriminated union of 9 category-specific metric interfaces (all extending `BaseMetric`)
- Location: `remix-app/app/types/metrics.ts` (line 117)
- Pattern: Narrowed by `category` discriminant throughout the codebase

**`getLatestRealMetrics()` / `getRealMetrics()`:**
- Purpose: Primary data access functions — `getRealMetrics()` returns all historical entries, `getLatestRealMetrics()` returns most recent per metric name
- Location: `remix-app/app/lib/real-data.ts`
- Pattern: Pure functions over static arrays; no async, no DB

**Route type generation:**
- Purpose: Per-route `Route.LoaderArgs`, `Route.ComponentProps`, `Route.MetaArgs`, `Route.ActionArgs` types
- Location: `remix-app/.react-router/types/app/routes/+types/{routename}.d.ts` (generated)
- Pattern: Each route imports `type { Route } from "./+types/{filename}"` for full type safety

## Entry Points

**Application shell:**
- Location: `remix-app/app/root.tsx`
- Triggers: Every request; wraps all routes
- Responsibilities: HTML document, global header/nav, Outlet, error boundary

**Route registry:**
- Location: `remix-app/app/routes.ts`
- Triggers: Build time + runtime route matching
- Responsibilities: Declares all routes via `index()`, `route()`, `layout()` from `@react-router/dev/routes`

**Dashboard:**
- Location: `remix-app/app/routes/home.tsx`
- Triggers: `GET /`
- Responsibilities: Aggregates all domain data (metrics, protocol, cessation, correlations, genetics) into a single loader

**Database client:**
- Location: `remix-app/app/lib/db.server.ts`
- Triggers: Called via `getDb()` — lazy-initialized on first use
- Responsibilities: Creates and caches `drizzle(pool, { schema })` instance; reads `NETLIFY_DATABASE_URL` or `DATABASE_URL`

## Architectural Constraints

- **Server/client boundary:** `db.server.ts` is server-only (`.server.` filename convention prevents client bundle inclusion). All data fetching must happen in `loader` or `action` exports.
- **Static data first:** All routes currently read from in-memory TypeScript modules, not the database. The DB schema and client are prepared but unused by route loaders.
- **Threading:** Node.js single-threaded event loop; Neon serverless pool handles async DB queries when connected.
- **Global state:** Module-level singleton for DB pool and Drizzle instance in `db.server.ts`. Static data arrays in `real-data.ts`, `protocol-data.ts`, and `seed-data.ts` are module-level singletons (acceptable — read-only).
- **Circular imports:** None detected. Types flow one direction: `types/ → lib/ → routes/`.
- **Path alias:** `~/*` resolves to `remix-app/app/*` via `vite-tsconfig-paths`. Use `~/lib/real-data` not relative paths from deep route files.

## Anti-Patterns

### Direct date computation in multiple loaders

**What happens:** `differenceInDays(new Date(), parseISO(cessation.startDate))` is duplicated in `home.tsx` loader and `protocol/index.tsx` loader independently.
**Why it's wrong:** Two sources of truth for cessation day; drift risk if logic changes.
**Do this instead:** Use the shared `getCessationDay()` from `remix-app/app/lib/protocol-data.ts` — it is already exported.

### Action data not persisted

**What happens:** `import/whoop.tsx` and `import/vault.tsx` parse files and return metrics but never write to DB.
**Why it's wrong:** Imported data exists only for the lifetime of the action response; refreshing loses it.
**Do this instead:** Insert parsed metrics into the `metrics` table via `getDb()` inside the action before returning.

## Error Handling

**Strategy:** React Router's `throw new Response()` pattern for 404s; root `ErrorBoundary` for unhandled errors.

**Patterns:**
- Invalid URL params (category, metricId, version): `throw new Response("...", { status: 404 })` in loader — caught by nearest `ErrorBoundary`
- Unexpected errors in dev: `ErrorBoundary` in `root.tsx` renders error message and stack trace
- Missing DB connection: `db.server.ts` throws `Error` with descriptive message at connection time

## Cross-Cutting Concerns

**Logging:** `console.log/error` only — no structured logging library.
**Validation:** URL param validation via `isValidCategory()` guard functions in loaders; no runtime schema validation library.
**Authentication:** None — application is single-user, no auth layer.

---

*Architecture analysis: 2026-06-07*
