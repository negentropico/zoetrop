# Wellness Tracker

Comprehensive wellness tracking dashboard consolidating WHOOP biometrics, blood work, body composition, and protocol progress.

## Tech Stack

- **Framework**: React Router 7 (Remix)
- **Language**: TypeScript 5.x (strict mode)
- **UI**: React 19 + Tailwind CSS 4 + Recharts
- **Database**: Neon Postgres + Drizzle ORM
- **Deployment**: Netlify

## Quick Start

```bash
cd remix-app
npm install
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # Type generation + type check
```

## Project Structure

```
remix-app/
├── app/
│   ├── components/    # React components (TrendChart, nav, metrics)
│   ├── lib/           # Real data modules (blood work, WHOOP, protocols)
│   ├── routes/        # File-based routing
│   └── types/         # TypeScript interfaces (metrics, protocol)
├── db/
│   └── schema.ts      # Drizzle table definitions (201 lines)
├── drizzle.config.ts  # Drizzle ORM configuration
└── package.json
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard with cessation tracker, metric stats |
| `/metrics/:category` | Category detail views |
| `/metrics/:category/:metricId` | Individual metric detail |
| `/protocol/versions` | Protocol version history |
| `/protocol/supplements` | Supplement tiers |
| `/protocol/cessation` | Cessation timeline |
| `/protocol/compare` | Version comparison |
| `/insights/correlations` | Metric correlations |
| `/insights/genetics` | Genetic variants |
| `/import/whoop` | WHOOP data import |
| `/import/vault` | Obsidian vault import |

## 9 Metric Categories

1. **Vitamins** - B-vitamins, fat-soluble
2. **Minerals** - Zn, Mg, Fe, trace
3. **Inflammatory** - hs-CRP, homocysteine
4. **Metabolic** - Glucose, kidney
5. **Hormones** - Sex, thyroid, cortisol
6. **Autonomic** - HRV, RHR, sleep (WHOOP)
7. **Body Composition** - DEXA, lean mass
8. **Lipids** - Cholesterol, triglycerides
9. **Hematology** - CBC, WBC

## Deployment

| Environment | URL |
|-------------|-----|
| Production | https://zoetrop.netlify.app |
| Dev preview | https://dev--zoetrop.netlify.app |

## License

MIT
