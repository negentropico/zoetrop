# Wellness Tracker - CLAUDE.md

## Project Overview

Comprehensive wellness tracking dashboard consolidating WHOOP biometrics, blood work, body composition, and protocol progress.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5 + React 19 |
| Styling | Tailwind CSS 4.x |
| Charts | Recharts |
| Storage | LocalStorage + Neon Postgres |
| ORM | Drizzle ORM |
| Deployment | Netlify |

## Directory Structure

```
db/
├── schema.ts         # Drizzle table definitions
drizzle.config.ts     # Drizzle ORM configuration
migrations/           # Generated SQL migrations

src/
├── components/
│   ├── charts/       # Recharts visualizations
│   ├── data/         # Import/export components
│   ├── layout/       # Header, footer, nav
│   ├── metrics/      # MetricCard, StatusBadge, TrendIndicator
│   └── protocol/     # Timeline, cessation tracker
├── hooks/            # useMetrics, useStorage, useCessation
├── layouts/          # Astro layouts
├── lib/
│   ├── calculations/ # Metric math
│   ├── storage/      # LocalStorage + Postgres adapters
│   └── whoop/        # JSON parser, mapper
├── pages/
│   ├── api/          # Netlify functions
│   ├── vitamins/     # Category views
│   ├── minerals/
│   ├── inflammatory/
│   ├── metabolic/
│   ├── hormones/
│   ├── autonomic/    # WHOOP data
│   ├── body-composition/
│   └── lipids/
├── styles/           # global.css
└── types/            # TypeScript interfaces
```

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

## Cessation Protocol Phases

| Phase | Days | Focus |
|-------|------|-------|
| Acute | 1-21 | Sleep support, light training |
| Stabilization | 22-60 | Progressive overload |
| Clearing | 61-120 | FAAH metabolic clearing |
| Optimization | 121-150 | Tier 1 supplements only |

## Porting From Existing Projects

### From Dash (`/Users/mac/Code/Dash`)
- `src/types/metrics/types.ts` → `src/types/metrics.ts`
- `src/hooks/useMetrics.ts` → `src/hooks/useMetrics.ts`
- `src/components/metrics/MetricCard.tsx` → `src/components/metrics/`
- `src/utils/storage/` → `src/lib/storage/`

### From Comp (`/Users/mac/Code/comp`)
- `astro.config.mjs` pattern
- `theme.ts` design tokens
- `formatters.ts` number formatting

### From Whoop (`/Users/mac/Code/Whoop`)
- `src/constants.py` → cessation phases
- JSON schema from results files

## Spec-Kit Workflow

```bash
/speckit.constitution  # Project principles (done)
/speckit.specify       # Feature requirements
/speckit.plan          # Technical approach
/speckit.tasks         # Task breakdown
/speckit.implement     # Execute
```

## Database (Neon + Drizzle)

### Configuration
- **Provider**: Neon Postgres (via Netlify extension)
- **ORM**: Drizzle ORM
- **Site**: zoetrop (Netlify ID: `0abb12f6-d11b-4f81-8a8d-86b44e99088f`)
- **Repo**: github.com/negentropico/tracker

### Schema Location
```
db/
├── schema.ts        # Drizzle table definitions
drizzle.config.ts    # Drizzle configuration
migrations/          # Generated SQL migrations
```

### Database Commands
```bash
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations to Neon
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

### Environment
- `NETLIFY_DATABASE_URL` - Auto-injected in Netlify functions
- For local dev: `netlify dev` provides the connection

### Storage Strategy
| Phase | Primary | Secondary |
|-------|---------|-----------|
| 1-4 | LocalStorage | - |
| 5+ | Neon Postgres | LocalStorage (offline cache) |

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview build
npm run check        # Type check only
npm run ci           # Full CI (types + build)
npm run db:generate  # Generate DB migrations
npm run db:migrate   # Run DB migrations
npm run db:studio    # Drizzle Studio UI
```

## Mobile Workflow (Claude Code)

### Quick Commands
```bash
npm run check              # Type check only (~30s)
npm run ci                 # Full CI check (types + build)
git push origin dev        # Deploy to preview
git checkout main && git merge dev && git push  # Deploy to production
```

### Workflow
1. Test app at preview URL on phone
2. Note issues/improvements in conversation
3. Implement changes with Claude Code
4. Push to `dev` branch → auto preview deploy
5. When ready: merge `dev` → `main` → production

### URLs
| Environment | URL |
|-------------|-----|
| Production | https://zoetrop.netlify.app |
| Dev preview | https://dev--zoetrop.netlify.app |
| Branch previews | https://{branch}--zoetrop.netlify.app |

### CI/CD
- **GitHub Actions**: Type check + build on push to `dev`/`main`
- **Netlify**: Auto-deploys all branches with unique preview URLs
- **Checks**: ~1-2 min (quick mode: types + build only)

---

*Last Updated: January 3, 2026*

## Active Technologies
- TypeScript 5.x (strict mode enabled) + React 19, Astro 5, date-fns
- Drizzle ORM + Neon Postgres (via Netlify extension)
- LocalStorage (primary phases 1-4), Neon Postgres (phase 5+)
- TypeScript 5.x (strict mode) + Astro 5, React 19, Tailwind CSS 4.x, Recharts (002-mvp-dashboard)
- LocalStorage (Phase 1 adapter) + optional Neon Postgres sync (002-mvp-dashboard)

## Recent Changes
- 001-core-data-layer: Configured Neon Postgres database via Netlify, Drizzle ORM setup
- 001-core-data-layer: Added TypeScript 5.x (strict mode enabled) + React 19, Astro 5, date-fns
