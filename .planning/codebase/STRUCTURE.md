# Codebase Structure

**Analysis Date:** 2026-06-07

## Directory Layout

```
zoetrop/                          # Repo root
├── remix-app/                    # The entire application (all commands run from here)
│   ├── app/                      # Application source
│   │   ├── root.tsx              # HTML shell, global nav header, error boundary
│   │   ├── app.css               # Global CSS (Tailwind 4 entry point)
│   │   ├── routes.ts             # Explicit route config — single source of truth for routing
│   │   ├── routes/               # Route modules (one file per page/layout)
│   │   │   ├── home.tsx          # Dashboard — GET /
│   │   │   ├── metrics/
│   │   │   │   ├── layout.tsx    # Sidebar category nav, wraps metrics/* routes
│   │   │   │   ├── index.tsx     # GET /metrics
│   │   │   │   ├── category.tsx  # GET /metrics/:category
│   │   │   │   └── detail.tsx    # GET /metrics/:category/:metricId
│   │   │   ├── protocol/
│   │   │   │   ├── layout.tsx    # Tab nav, wraps protocol/* routes
│   │   │   │   ├── index.tsx     # GET /protocol
│   │   │   │   ├── versions.tsx          # GET /protocol/versions
│   │   │   │   ├── version-detail.tsx    # GET /protocol/versions/:version
│   │   │   │   ├── supplements.tsx       # GET /protocol/supplements
│   │   │   │   ├── cessation.tsx         # GET /protocol/cessation
│   │   │   │   └── compare.tsx           # GET /protocol/compare
│   │   │   ├── insights/
│   │   │   │   ├── layout.tsx    # Tab nav, wraps insights/* routes
│   │   │   │   ├── index.tsx     # GET /insights
│   │   │   │   ├── correlations.tsx      # GET /insights/correlations
│   │   │   │   └── genetics.tsx          # GET /insights/genetics
│   │   │   └── import/
│   │   │       ├── layout.tsx    # Tab nav, wraps import/* routes
│   │   │       ├── index.tsx     # GET /import
│   │   │       ├── whoop.tsx     # POST /import/whoop (file upload + parse)
│   │   │       └── vault.tsx     # POST /import/vault (markdown parse)
│   │   ├── components/           # Shared UI components
│   │   │   └── TrendChart.tsx    # Exports TrendChart + TrendSparkline (Recharts)
│   │   ├── lib/                  # Data and server-side logic
│   │   │   ├── real-data.ts      # Static health metric arrays (1344 lines, M1–M4 history)
│   │   │   ├── protocol-data.ts  # Protocol versions P0–P6, supplements, cessation log
│   │   │   ├── seed-data.ts      # Correlations + genetic variants (static dev data)
│   │   │   └── db.server.ts      # Drizzle + Neon client (server-only, lazy init)
│   │   └── types/                # TypeScript types and domain constants
│   │       ├── index.ts          # Re-exports metrics + protocol + genetics
│   │       ├── metrics.ts        # MetricCategory, Metric union, CATEGORY_INFO
│   │       ├── protocol.ts       # Supplement/cessation types, CESSATION_PHASES, SUPPLEMENT_TIERS
│   │       └── genetics.ts       # GeneticVariant, CONFIDENCE_LEVELS, VARIANT_CATEGORIES
│   ├── db/
│   │   ├── schema.ts             # Drizzle table definitions (8 tables, 7 enums)
│   │   └── wellness.db           # SQLite artifact (legacy/local — Neon Postgres used in prod)
│   ├── public/
│   │   └── favicon.ico
│   ├── build/                    # Compiled output (gitignored)
│   │   ├── client/               # Static assets served by Netlify CDN
│   │   └── server/               # SSR handler
│   ├── .react-router/            # Generated route types (gitignored, committed artifact)
│   │   └── types/app/routes/+types/  # Per-route Route.* type modules
│   ├── vite.config.ts            # Vite + React Router + Tailwind + tsconfigPaths plugins
│   ├── drizzle.config.ts         # Drizzle Kit config (postgresql, schema → ./migrations)
│   ├── tsconfig.json             # strict mode, paths: ~/* → ./app/*, rootDirs includes .react-router/types
│   └── package.json              # npm scripts: dev, build, typecheck, db:*
├── .planning/                    # GSD planning documents (not committed to main)
│   └── codebase/                 # Architecture maps written by map-codebase agent
├── .github/
│   └── workflows/ci.yml          # Type check + build on push to dev/main
├── docs/                         # Platform documentation
├── _notes/                       # Developer scratch notes (gitignored)
├── data/                         # Raw data files (JSON exports)
├── netlify.toml                  # Build config: base=remix-app, publish=build/client
└── CLAUDE.md                     # Project instructions for Claude
```

## Directory Purposes

**`remix-app/app/routes/`:**
- Purpose: All page-level code lives here — one file per URL segment
- Contains: Route modules with `loader`, `action`, `meta`, default component exports
- Key files: `home.tsx` (dashboard), `metrics/layout.tsx` (section shell), `import/whoop.tsx` (file upload action)

**`remix-app/app/lib/`:**
- Purpose: Server-side data access and business logic; imported only by loaders/actions
- Contains: Static data modules (`real-data.ts`, `protocol-data.ts`, `seed-data.ts`) and the DB client (`db.server.ts`)
- Key files: `real-data.ts` is the primary data source for all metrics routes; `db.server.ts` is the future DB entry point

**`remix-app/app/types/`:**
- Purpose: Shared TypeScript types, discriminated unions, and domain constant records
- Contains: Three domain modules re-exported from `index.ts`
- Key files: `metrics.ts` (defines the 9-category system and `CATEGORY_INFO`), `protocol.ts` (defines `CESSATION_PHASES` and `SUPPLEMENT_TIERS`)

**`remix-app/app/components/`:**
- Purpose: Reusable React components used across multiple routes
- Contains: `TrendChart.tsx` only — both `TrendChart` and `TrendSparkline` are exported from this single file
- Note: Route-local UI components (cards, progress bars) are defined inline in their route file, not here

**`remix-app/db/`:**
- Purpose: Database schema definition and ORM configuration
- Contains: `schema.ts` (Drizzle table definitions), `wellness.db` (SQLite artifact — unused in production)
- Generated: Migrations written to `remix-app/migrations/` (not yet present)

**`remix-app/.react-router/types/`:**
- Purpose: Auto-generated per-route type modules
- Generated: Yes — by `npx react-router typegen` (run before `tsc`)
- Committed: Yes (present in repo)
- Usage: Each route imports `type { Route } from "./+types/{filename}"` for `LoaderArgs`, `ComponentProps`, etc.

## Key File Locations

**Entry Points:**
- `remix-app/app/root.tsx`: HTML shell, global `<Header>` nav, root `<Outlet>`, error boundary
- `remix-app/app/routes.ts`: Canonical route registry — add new routes here
- `remix-app/app/routes/home.tsx`: Dashboard aggregating all domain data

**Configuration:**
- `remix-app/vite.config.ts`: Build tool config
- `remix-app/tsconfig.json`: TypeScript config with `~/*` alias
- `remix-app/drizzle.config.ts`: Database ORM config
- `netlify.toml`: Deployment config (build base and publish dir)

**Core Domain Data:**
- `remix-app/app/lib/real-data.ts`: All real health metric data (blood work, DEXA, WHOOP) — the primary data source
- `remix-app/app/lib/protocol-data.ts`: Protocol versions, supplements, cessation data
- `remix-app/app/types/metrics.ts`: `CATEGORY_INFO` record and `Metric` union type
- `remix-app/app/types/protocol.ts`: `CESSATION_PHASES` array and `SUPPLEMENT_TIERS` record

**Database:**
- `remix-app/db/schema.ts`: Drizzle table definitions (authoritative schema)
- `remix-app/app/lib/db.server.ts`: Database client — `getDb()` returns the Drizzle instance

**Testing:**
- No test files detected; no test runner configured.

## Naming Conventions

**Files:**
- Route files: `kebab-case.tsx` — e.g., `version-detail.tsx`, `home.tsx`
- Lib files: `kebab-case.ts` — e.g., `real-data.ts`, `protocol-data.ts`
- Server-only files: `*.server.ts` suffix — e.g., `db.server.ts` (excluded from client bundle by React Router)
- Component files: `PascalCase.tsx` — e.g., `TrendChart.tsx`
- Type files: `kebab-case.ts` — e.g., `metrics.ts`, `genetics.ts`

**Directories:**
- Route section folders: lowercase — `metrics/`, `protocol/`, `insights/`, `import/`
- Each section folder contains a `layout.tsx` providing the section shell

**Exports:**
- Route modules: named `loader`, `action`, `meta`; default export is the page component (`function Dashboard`, `function MetricsLayout`, etc.)
- Types: PascalCase interfaces (`BaseMetric`, `GeneticVariant`); `SCREAMING_SNAKE_CASE` constants (`CATEGORY_INFO`, `CESSATION_PHASES`, `SUPPLEMENT_TIERS`, `CONFIDENCE_LEVELS`)

**Functions:**
- Data accessors in `lib/`: camelCase — `getLatestRealMetrics()`, `getRealMetrics()`, `getCessationDay()`, `getCurrentCessationPhase()`
- Utility/helper functions inline in route files: camelCase — `getMetricStatus()`, `isValidCategory()`

## Where to Add New Code

**New top-level section (e.g., `/goals`):**
1. Create `remix-app/app/routes/goals/layout.tsx` — section shell with nav tabs
2. Create `remix-app/app/routes/goals/index.tsx` — overview page
3. Register in `remix-app/app/routes.ts`: `layout("routes/goals/layout.tsx", [ route("goals", "routes/goals/index.tsx"), ... ])`
4. Add `<NavLink to="/goals">` in `remix-app/app/root.tsx` Header

**New page within an existing section:**
1. Create the route file under the section folder, e.g., `remix-app/app/routes/protocol/timeline.tsx`
2. Add `route("protocol/timeline", "routes/protocol/timeline.tsx")` inside the existing `layout()` block in `remix-app/app/routes.ts`
3. Add the nav link to the section's `layout.tsx`

**New shared component:**
- Implementation: `remix-app/app/components/ComponentName.tsx`
- Import with alias: `import { ComponentName } from "~/components/ComponentName"`

**New data/domain logic:**
- Server-only (DB access): `remix-app/app/lib/feature.server.ts`
- Shared data/utilities: `remix-app/app/lib/feature.ts`
- Import in loaders with `~/lib/feature`

**New types:**
- Add to the relevant existing type file: `remix-app/app/types/metrics.ts`, `protocol.ts`, or `genetics.ts`
- For a new domain: create `remix-app/app/types/newdomain.ts` and add `export * from './newdomain'` to `remix-app/app/types/index.ts`

**Connecting routes to the database:**
- Import `getDb` from `~/lib/db.server` inside the `loader` or `action` (server-only context)
- Never import `db.server` in components or non-server files

## Special Directories

**`remix-app/.react-router/`:**
- Purpose: Auto-generated TypeScript route types
- Generated: Yes — `npx react-router typegen` (part of `npm run typecheck`)
- Committed: Yes — needed for IDE and CI type checking without a separate codegen step

**`remix-app/build/`:**
- Purpose: Production build output
- Generated: Yes — `npm run build`
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: GSD planning documents (phase plans, codebase maps)
- Generated: By GSD agents
- Committed: No (gitignored)

**`.archive/`:**
- Purpose: Old Astro app artifacts
- Committed: No (gitignored)
- Note: Ignore entirely — all active code lives in `remix-app/`

---

*Structure analysis: 2026-06-07*
