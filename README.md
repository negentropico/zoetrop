# Wellness Tracker

Comprehensive wellness tracking dashboard consolidating WHOOP biometrics, blood work, body composition, and protocol progress.

## Tech Stack

- **Framework**: Astro 5 + React 19
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Storage**: LocalStorage + Neon Postgres (optional sync)
- **Deployment**: Netlify

## Quick Start

```bash
npm install
npm run dev     # Start dev server at localhost:4321
npm run build   # Production build
```

## Project Structure

```
src/
├── components/     # React components
│   ├── charts/     # Recharts visualizations
│   ├── data/       # Import/export
│   ├── layout/     # Header, nav
│   ├── metrics/    # MetricCard, StatusBadge
│   └── protocol/   # Timeline, cessation
├── hooks/          # React hooks (useMetrics, useStorage)
├── layouts/        # Astro layouts
├── lib/            # Utilities
│   ├── calculations/
│   ├── storage/
│   └── whoop/
├── pages/          # Routes (9 categories)
├── styles/         # Global CSS
└── types/          # TypeScript interfaces
```

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

## Development with Spec-Kit

This project uses [spec-kit](https://github.com/github/spec-kit) for spec-driven development.

```bash
/speckit.specify    # Create feature spec
/speckit.plan       # Technical plan
/speckit.tasks      # Task breakdown
/speckit.implement  # Execute
```

## Documentation

- `CLAUDE.md` - AI assistant guidance
- `HANDOFF.md` - Session handoff notes
- `.specify/memory/constitution.md` - Project principles

## License

MIT
