# Wellness Tracker - CLAUDE.md

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
│   │   ├── TrendChart.tsx     # Shared chart (TrendChart + TrendSparkline)
│   │   ├── Header.tsx         # Navigation
│   │   └── ...                # Metric cards, protocol components
│   ├── lib/
│   │   ├── real-data.ts       # Real blood work, body comp, WHOOP data
│   │   ├── protocol-data.ts   # Protocol versions, supplements, cessation
│   │   └── seed-data.ts       # Seed data for correlations, genetics
│   ├── routes/                # File-based routing (React Router 7)
│   └── types/
│       ├── metrics.ts         # 9 categories with CATEGORY_INFO
│       └── protocol.ts        # Protocol types, CESSATION_PHASES, SUPPLEMENT_TIERS
├── db/
│   └── schema.ts              # Drizzle table definitions (201 lines)
├── drizzle.config.ts          # Drizzle ORM configuration
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Route Structure

| Route | File | Description |
|-------|------|-------------|
| `/` | `home.tsx` | Dashboard with cessation tracker |
| `/metrics` | `metrics.tsx` | Metrics overview |
| `/metrics/:category` | `metrics.$category.tsx` | Category detail |
| `/metrics/:category/:metricId` | `metrics.$category.$metricId.tsx` | Metric detail |
| `/protocol` | `protocol.tsx` | Protocol overview |
| `/protocol/versions` | `protocol.versions.tsx` | Version history |
| `/protocol/versions/:version` | `protocol.versions.$version.tsx` | Version detail |
| `/protocol/supplements` | `protocol.supplements.tsx` | Supplement tiers |
| `/protocol/cessation` | `protocol.cessation.tsx` | Cessation timeline |
| `/protocol/compare` | `protocol.compare.tsx` | Version comparison |
| `/insights` | `insights.tsx` | Insights overview |
| `/insights/correlations` | `insights.correlations.tsx` | Metric correlations |
| `/insights/genetics` | `insights.genetics.tsx` | Genetic variants |
| `/import` | `import.tsx` | Import overview |
| `/import/whoop` | `import.whoop.tsx` | WHOOP data import |
| `/import/vault` | `import.vault.tsx` | Obsidian vault import |

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
- **Repo**: github.com/negentropico/tracker

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

---

*Last Updated: February 5, 2026*
