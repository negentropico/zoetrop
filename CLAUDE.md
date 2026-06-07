# Zoetrop - CLAUDE.md

## Project Overview

Comprehensive wellness tracking dashboard consolidating WHOOP biometrics, blood work, body composition, and protocol progress.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Router 7 (Remix) |
| Language | TypeScript 5.x (strict mode) |
| UI | React 19 + Tailwind CSS 4.x |
| Charts | Recharts |
| Database | Neon Postgres + Drizzle ORM |
| Deployment | Netlify |

## Directory Structure

The app lives in `remix-app/`. All build commands run from that directory.

```
remix-app/
├── app/
│   ├── components/
│   │   └── TrendChart.tsx     # Shared chart (exports TrendChart + TrendSparkline)
│   ├── lib/
│   │   ├── real-data.ts       # Real blood work, body comp, WHOOP data
│   │   ├── protocol-data.ts   # Protocol versions (P0–P6), supplements, cessation
│   │   ├── seed-data.ts       # Seed data for correlations, genetics
│   │   └── db.server.ts       # Neon/Drizzle server-side client
│   ├── routes/                # Config-based routing — see app/routes.ts
│   │   ├── home.tsx
│   │   ├── metrics/           # layout.tsx + index/category/detail
│   │   ├── protocol/          # layout.tsx + index/versions/version-detail/supplements/cessation/compare
│   │   ├── insights/          # layout.tsx + index/correlations/genetics
│   │   └── import/            # layout.tsx + index/whoop/vault
│   ├── routes.ts              # Explicit route table (RouteConfig), not file-name convention
│   └── types/
│       ├── metrics.ts         # 9 categories with CATEGORY_INFO
│       └── protocol.ts        # Protocol types, CESSATION_PHASES, SUPPLEMENT_TIERS
├── db/
│   └── schema.ts              # Drizzle table definitions (201 lines, 8 tables)
├── drizzle.config.ts          # Drizzle ORM configuration
├── vite.config.ts
├── tsconfig.json
└── package.json
```

> Routing is **explicit** via `app/routes.ts` (`@react-router/dev/routes` — `index`/`route`/`layout`), not the flat file-name convention. Each section folder has a `layout.tsx` wrapping its child routes.

## Route Structure

| Route | File | Description |
|-------|------|-------------|
| `/` | `routes/home.tsx` | Dashboard with cessation tracker |
| `/metrics` | `routes/metrics/index.tsx` | Metrics overview |
| `/metrics/:category` | `routes/metrics/category.tsx` | Category detail |
| `/metrics/:category/:metricId` | `routes/metrics/detail.tsx` | Metric detail |
| `/protocol` | `routes/protocol/index.tsx` | Protocol overview |
| `/protocol/versions` | `routes/protocol/versions.tsx` | Version history |
| `/protocol/versions/:version` | `routes/protocol/version-detail.tsx` | Version detail |
| `/protocol/supplements` | `routes/protocol/supplements.tsx` | Supplement tiers |
| `/protocol/cessation` | `routes/protocol/cessation.tsx` | Cessation timeline |
| `/protocol/compare` | `routes/protocol/compare.tsx` | Version comparison |
| `/insights` | `routes/insights/index.tsx` | Insights overview |
| `/insights/correlations` | `routes/insights/correlations.tsx` | Metric correlations |
| `/insights/genetics` | `routes/insights/genetics.tsx` | Genetic variants |
| `/import` | `routes/import/index.tsx` | Import overview |
| `/import/whoop` | `routes/import/whoop.tsx` | WHOOP data import |
| `/import/vault` | `routes/import/vault.tsx` | Obsidian vault import |

Each section also has a `layout.tsx` (`metrics`/`protocol`/`insights`/`import`) that wraps its children.

## 9 Metric Categories

1. **Vitamins** - B-vitamins, fat-soluble
2. **Minerals** - Zn, Mg, Fe, trace elements
3. **Inflammatory** - hs-CRP, homocysteine
4. **Metabolic** - Glucose, kidney, electrolytes
5. **Hormones** - Sex, thyroid, cortisol
6. **Autonomic** - HRV, RHR, recovery, sleep (WHOOP)
7. **Body Composition** - DEXA, lean mass
8. **Lipids** - Cholesterol, triglycerides
9. **Hematology** - CBC, WBC, hemoglobin

## Status Classification

| Status | Color | Meaning |
|--------|-------|---------|
| optimal | green | Within optimal range |
| borderline | yellow | Within reference but outside optimal |
| deficient | red | Below reference range |
| excess | orange | Above reference range |

## Data Sources

### WHOOP Integration
- Manual JSON import from Whoop Analyzer
- Location: `/Users/mac/Code/Whoop/results/whoop_analysis_report.json`
- Key metrics: HRV, recovery, RHR, TDEE, sleep

### Obsidian Vault Reference
- Protocol docs: `/Users/mac/vaults/#Bwell/602/`
- Key files:
  - `05_Physiological_Metrics.md` - targets
  - `08_Cessation_Protocol.md` - 120-day FAAH timeline
  - `09_Targets_2026.md` - goals

## Cessation Protocol

- **Start date**: December 23, 2025
- **Target**: FAAH-informed 120+ day protocol

| Phase | Days | Focus |
|-------|------|-------|
| Acute | 1-21 | Sleep support, light training |
| Stabilization | 22-60 | Progressive overload |
| Clearing | 61-120 | FAAH metabolic clearing |
| Optimization | 121-150 | Tier 1 supplements only |

## Database (Neon + Drizzle)

- **Provider**: Neon Postgres (via Netlify extension)
- **ORM**: Drizzle ORM
- **Site**: zoetrop (Netlify ID: `0abb12f6-d11b-4f81-8a8d-86b44e99088f`)
- **Repo**: github.com/negentropico/zoetrop

### Database Commands
```bash
cd remix-app
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations to Neon
npm run db:studio    # Open Drizzle Studio
```

## Development Commands

All commands run from `remix-app/`:

```bash
npm run dev          # Start dev server
npm run build        # Production build (react-router build)
npm run typecheck    # Type generation + type check
npm run start        # Serve production build
```

### Build Pipeline
```bash
npx react-router typegen   # Generate route types (must run before tsc)
npx tsc --noEmit           # Type check
npx react-router build     # Production build
```

## Deployment

| Environment | URL |
|-------------|-----|
| Production | https://zoetrop.netlify.app |
| Dev preview | https://dev--zoetrop.netlify.app |
| Branch previews | https://{branch}--zoetrop.netlify.app |

### CI/CD
- **GitHub Actions**: Type check + build on push to `dev`/`main`
- **Netlify**: Auto-deploys all branches with unique preview URLs

## Naming & Direction

- **Codename**: `Zoetrop` (internal — matches `zoetrop.netlify.app`). Formalized 2026-05-20, replacing the old "Tracker"/"Wellness Tracker" name. The public brand is **deferred**; the venture-naming hunt is paused with clean survivors recorded in `docs/NAMING.md` (do not relitigate — Sanskrit/Eastern lean, MAGA-adjacency killed, any "Zoe-" name dead).
- **Direction doc**: `docs/PLATFORM.md` — the product brief. Today = n=1 personal instrument (**M0, done**); the arc is M1 (single practitioner, multi-client + identity/tenancy + lab ingest + report gen) → M2 (client app) → M3 (multi-coach + productize). Engine-first inversion: the confidence-graded protocol-decision engine is the moat; coaching-ops is layered on top.
- **Flagship**: commercialized via HIGHER (Tara Garrison) as the M1 proving tenant — see `ngtops/clients/higher/PLATFORM-FOR-HIGHER.md` (outside this repo).

## Planning Workflow (GSD / superpowers)

Planning runs on **GSD**, initialized 2026-06-07. The legacy **spec-kit** scaffolding is retired (archived to `.archive/specify/`, gitignored). `.planning/` is the source of truth:

- **`.planning/ROADMAP.md`** — the M1 roadmap (6 phases). **`.planning/STATE.md`** — current position. **`.planning/PROJECT.md`** — project context. **`.planning/REQUIREMENTS.md`** — 28 v1 requirements + traceability.
- **`.planning/codebase/`** — 7-doc codebase map. **`.planning/research/`** — M1 stack/features/architecture/pitfalls + SUMMARY.
- **Direction & constraints**: `docs/PLATFORM.md` (M0→M3 product brief) and `docs/PRINCIPLES.md` (engineering constraints) are the narrative companions to the GSD roadmap.
- **Two open decisions before later phases**: LLM-provider PHI/BAA (lab-ingest, Phase 5) and the Better-Auth↔Neon-JWK seam (Phase-1 spike). See `.planning/research/SUMMARY.md`.
- **Next step**: `/gsd:discuss-phase 1` (or `/gsd:plan-phase 1`) — Phase 1 = schema baseline + engine tests + auth spike.
- ⚠️ The archived constitution describes the retired **Astro/LocalStorage era** — ground truth = the Tech Stack table above + `docs/PRINCIPLES.md`.

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

---

*Last Updated: June 7, 2026*
