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
| Deployment | Vercel |

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
│   │   ├── auth.server.ts     # Better-Auth instance (email/password)
│   │   └── db.server.ts       # Neon/Drizzle server-side client
│   ├── routes/                # Explicit routing — see app/routes.ts
│   │   ├── landing.tsx        # Public landing page (root `/`)
│   │   ├── auth/              # login.tsx, logout.tsx (public)
│   │   ├── api.auth.$.ts      # Better-Auth catch-all handler
│   │   └── _app/              # Authenticated app — gated by _app/layout.tsx (302→/login)
│   │       ├── layout.tsx
│   │       ├── dashboard.tsx
│   │       ├── metrics/       # index/category/detail
│   │       ├── protocol/      # index/versions/version-detail/supplements/cessation/compare
│   │       ├── insights/      # index/correlations/genetics
│   │       ├── import/        # index/whoop/vault
│   │       ├── ingest/        # index/upload/review/consent/document(-raw)
│   │       ├── reports/       # index/generate/detail
│   │       ├── clients/       # index/new
│   │       ├── settings/      # index/invites/assignments
│   │       └── subject-switch.ts  # action-only, sets zt-subject cookie
│   ├── routes.ts              # Explicit route table (RouteConfig), not file-name convention
│   └── types/
│       ├── metrics.ts         # 9 categories with CATEGORY_INFO
│       └── protocol.ts        # Protocol types, CESSATION_PHASES, SUPPLEMENT_TIERS
├── db/
│   └── schema.ts              # Drizzle table definitions (636 lines, 22 tables)
├── drizzle.config.ts          # Drizzle ORM configuration
├── vite.config.ts
├── tsconfig.json
└── package.json
```

> Routing is **explicit** via `app/routes.ts` (`@react-router/dev/routes` — `index`/`route`/`layout`), not the flat file-name convention. The authenticated app is registered flat under a single `_app/layout.tsx` (consolidated left sidebar owns section nav — no per-section layouts).

> **Design root** (since 2026-06-29): single top-level `design-bridge/` — LIVE `remix-app/app/` · DS PACKAGE `design-bridge/design-system/` · MACHINERY `design-bridge/` (harness + diagrams).

> **Auth**: Better-Auth email/password. `app/lib/auth.server.ts` builds the instance; `routes/api.auth.$.ts` is the catch-all handler; authenticated routes 302→`/login` via the `_app/layout.tsx` loader when there is no session.

## Route Structure

**Public (no auth):**

| Route | File | Description |
|-------|------|-------------|
| `/` | `routes/landing.tsx` | Landing page (NOT the dashboard) |
| `/login` | `routes/auth/login.tsx` | Sign in |
| `/logout` | `routes/auth/logout.tsx` | Sign out |
| `/api/auth/*` | `routes/api.auth.$.ts` | Better-Auth catch-all handler |

**Authenticated** — all children of `routes/_app/layout.tsx`, whose loader 302s to `/login?redirect=<pathname>` when there is no session:

| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `routes/_app/dashboard.tsx` | Dashboard with cessation tracker |
| `/metrics` | `routes/_app/metrics/index.tsx` | Metrics overview |
| `/metrics/:category` | `routes/_app/metrics/category.tsx` | Category detail |
| `/metrics/:category/:metricId` | `routes/_app/metrics/detail.tsx` | Metric detail |
| `/protocol` | `routes/_app/protocol/index.tsx` | Protocol overview |
| `/protocol/versions` | `routes/_app/protocol/versions.tsx` | Version history |
| `/protocol/versions/:version` | `routes/_app/protocol/version-detail.tsx` | Version detail |
| `/protocol/supplements` | `routes/_app/protocol/supplements.tsx` | Supplement tiers |
| `/protocol/cessation` | `routes/_app/protocol/cessation.tsx` | Cessation timeline |
| `/protocol/compare` | `routes/_app/protocol/compare.tsx` | Version comparison |
| `/insights` | `routes/_app/insights/index.tsx` | Insights overview |
| `/insights/correlations` | `routes/_app/insights/correlations.tsx` | Metric correlations |
| `/insights/genetics` | `routes/_app/insights/genetics.tsx` | Genetic variants |
| `/import` | `routes/_app/import/index.tsx` | Import overview |
| `/import/whoop` | `routes/_app/import/whoop.tsx` | WHOOP data import |
| `/import/vault` | `routes/_app/import/vault.tsx` | Obsidian vault import |
| `/ingest`, `/ingest/upload`, `/ingest/review`, `/ingest/consent` | `routes/_app/ingest/*.tsx` | Lab-ingest pipeline |
| `/ingest/documents/:id`, `/ingest/documents/:id/raw` | `routes/_app/ingest/document(-raw).tsx` | Document viewer + raw PDF bytes |
| `/reports`, `/reports/generate`, `/reports/:reportId` | `routes/_app/reports/*.tsx` | Confidence-graded report generation |
| `/clients`, `/clients/new` | `routes/_app/clients/*.tsx` | Practitioner client management |
| `/settings`, `/settings/assignments` | `routes/_app/settings/*.tsx` | Account, subject assignments |
| `/settings/invites/:inviteId/revoke` | `routes/_app/settings/invites.ts` | Invite revoke action |
| `/subject-switch` | `routes/_app/subject-switch.ts` | Action-only; sets `zt-subject` cookie |

Section routes are registered flat under one `_app/layout.tsx` — the consolidated left sidebar (AppShell) owns section navigation; no per-section layouts.

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

- **Provider**: Neon Postgres (connection via Vercel environment variables — `DATABASE_URL` pooled, `DATABASE_URL_UNPOOLED` direct for migrations)
- **ORM**: Drizzle ORM
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
| Production | https://zoetrop.vercel.app |
| Preview deployments | Per-branch preview URLs auto-generated by Vercel |

### CI/CD
- **GitHub Actions**: Type check + build on push to `dev`/`main`
- **Vercel**: Auto-deploys all pushes; per-branch preview URLs generated automatically

## Naming & Direction

- **Codename**: `Zoetrop` (internal — matches `zoetrop.vercel.app`). Formalized 2026-05-20, replacing the old "Tracker"/"Wellness Tracker" name. The public brand is **deferred**; the venture-naming hunt is paused with clean survivors recorded in `docs/NAMING.md` (do not relitigate — Sanskrit/Eastern lean, MAGA-adjacency killed, any "Zoe-" name dead).
- **Direction doc**: `docs/PLATFORM.md` — the product brief. Today = n=1 personal instrument (**M0, done**); the arc is M1 (single practitioner, multi-client + identity/tenancy + lab ingest + report gen) → M2 (client app) → M3 (multi-coach + productize). Engine-first inversion: the confidence-graded protocol-decision engine is the moat; coaching-ops is layered on top.
- **History doc**: `docs/HISTORY.md` — canonical record of the platform's full evolution (Bwell vault → Tracker → Zoetrop)
- **Flagship**: commercialized via HIGHER (Tara Garrison) as the M1 proving tenant — see `ngtops/clients/higher/PLATFORM-FOR-HIGHER.md` (outside this repo).

## Planning Workflow (GSD / superpowers)

Planning runs on **GSD**, initialized 2026-06-07. The legacy **spec-kit** scaffolding is retired (archived to `.archive/specify/`, gitignored). `.planning/` is the source of truth:

- **v1.0 "M1 Foundations" SHIPPED 2026-06-14**: 9 phases / 50 plans / 116 tasks; 27/29 requirements satisfied (COMP-02/03 deferred to the v1.1 compliance gate); tagged `v1.0`. Archived to `.planning/milestones/v1.0-*`.
- **Current milestone: v1.1 "First Client (practitioner-operated)" — EXECUTING.** 5 phases, 12 requirements (ONB/ING/PRO/LIB/PROOF/POL). Phase 01 (client-onboarding-practitioner-operated) is in progress.
- **`.planning/ROADMAP.md`** — the v1.1 roadmap. **`.planning/STATE.md`** — current position. **`.planning/PROJECT.md`** — project context. **`.planning/REQUIREMENTS.md`** — requirements + traceability.
- **`.planning/codebase/`** — 7-doc codebase map. **`.planning/research/`** — M1 stack/features/architecture/pitfalls + SUMMARY.
- **Direction & constraints**: `docs/PLATFORM.md` (M0→M3 product brief) and `docs/PRINCIPLES.md` (engineering constraints) are the narrative companions to the GSD roadmap.
- **Resolved decisions**: the Better-Auth↔Neon-JWK seam was resolved by the v1.0 auth implementation (SET LOCAL + NOBYPASSRLS `app_user` RLS pattern, not JWK-native). The LLM-provider PHI/BAA question was re-decided 2026-06-12 as a pilot-first deferral — HIPAA/BAA/RLS hardening is deferred to a pre-first-external-client gate; stay on Neon in the meantime. See `.planning/research/SUMMARY.md` and `.planning/PROJECT.md` Key Decisions.
- **Next step**: Phase 01 (client onboarding, practitioner-operated) is executing — see `.planning/STATE.md` for current plan/position.
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

*Last Updated: July 4, 2026*
