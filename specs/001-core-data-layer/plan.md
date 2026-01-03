# Implementation Plan: Core Data Layer

**Branch**: `001-core-data-layer` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-data-layer/spec.md`

## Summary

Build the foundational data layer for the Wellness Tracker dashboard, enabling metric persistence, status calculation, trend analysis, and WHOOP data import. This layer provides LocalStorage-based CRUD operations with sync status tracking, calculation utilities for status classification (optimal/borderline/deficient/excess) and trend analysis (improving/stable/declining), plus a parser and mapper for WHOOP JSON imports.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode enabled)
**Primary Dependencies**: React 19, Astro 5, date-fns
**Storage**: LocalStorage (primary phases 1-4), Neon Postgres via Drizzle ORM (phase 5+)
**Testing**: Vitest + React Testing Library
**Target Platform**: Web (modern browsers 2020+)
**Project Type**: Web application (Astro SSG with React islands)
**Performance Goals**: CRUD < 100ms, initial load < 500ms, handle 1000+ metrics
**Constraints**: Offline-capable, no external API calls, bundle chunks < 200KB
**Scale/Scope**: Single user, 9 metric categories, ~50-200 metrics typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Component-First | Logic in hooks/utilities, not components | PASS | useMetrics hook handles state, calculations in lib/ |
| II. Local-First Storage | LocalStorage primary, cloud optional | PASS | LocalStorage adapter, sync status for future cloud |
| III. Type Safety | Strict mode, no `any`, explicit interfaces | PASS | Types defined in Phase 0, runtime validation at boundaries |
| IV. Test-First | Unit tests for hooks/utilities | PASS | Vitest tests planned for all utilities |
| V. Accessibility | Not UI-focused in this phase | N/A | Data layer only, no UI components |

**Technology Stack Compliance**:
- Framework: Astro 5 + React 19 - COMPLIANT
- Styling: N/A (data layer)
- Charts: N/A (data layer)
- Storage: LocalStorage - COMPLIANT
- Deployment: Netlify - COMPLIANT

**Data Model Standards Compliance**:
- Metric IDs: UUID v4 - COMPLIANT (types defined)
- Timestamps: ISO 8601 - COMPLIANT (types defined)
- Reference Ranges: Required - COMPLIANT (optional in base, required for status calc)
- Status Classification: optimal/borderline/deficient/excess - COMPLIANT
- Sync Versioning: Integer incrementing - COMPLIANT

**Gate Result**: PASS - All applicable principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-data-layer/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal APIs)
│   └── storage.ts       # Storage adapter interface
├── checklists/
│   └── requirements.md  # Spec validation checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
db/
├── schema.ts            # [EXISTS] Drizzle table definitions (Phase 5+)
drizzle.config.ts        # [EXISTS] Drizzle ORM configuration
migrations/              # [GENERATED] SQL migrations

src/
├── types/
│   ├── metrics.ts       # [EXISTS] Metric interfaces, categories
│   └── whoop.ts         # [EXISTS] WHOOP import types
├── hooks/
│   └── useMetrics.ts    # [CREATE] React hook for metric state
├── lib/
│   ├── storage/
│   │   ├── local.ts     # [CREATE] LocalStorage adapter
│   │   ├── postgres.ts  # [CREATE] Neon Postgres adapter (Phase 5+)
│   │   └── adapter.ts   # [CREATE] Storage interface abstraction
│   ├── calculations/
│   │   ├── status.ts    # [CREATE] Status classification
│   │   ├── trend.ts     # [CREATE] Trend analysis
│   │   └── statistics.ts # [CREATE] Significance, outliers
│   └── whoop/
│       ├── parser.ts    # [CREATE] JSON validation & parsing
│       └── mapper.ts    # [CREATE] WHOOP to Metric conversion
└── tests/
    ├── hooks/
    │   └── useMetrics.test.ts
    └── lib/
        ├── storage/
        ├── calculations/
        └── whoop/
```

**Structure Decision**: Single web application using Astro's `src/` convention. Data layer code organized into `hooks/` (React state), `lib/` (pure utilities), and `types/` (interfaces). Test files mirror source structure under `src/tests/`.

## Complexity Tracking

No violations - design follows constitution principles without exceptions.

## Port Sources

| Source Project | Source File | Target | Adaptation |
|---------------|-------------|--------|------------|
| Dash | `src/hooks/useMetrics.ts` | `src/hooks/useMetrics.ts` | Update imports, add sync status |
| Dash | `src/utils/storage/metrics.ts` | `src/lib/storage/local.ts` | Add sync version, validation |
| Dash | `src/utils/metrics/calculations.ts` | `src/lib/calculations/` | Split into status, trend, statistics |
| Dash | `src/types/metrics/types.ts` | `src/types/metrics.ts` | Already ported in Phase 0 |
| Whoop | `results/whoop_analysis_report.json` | Reference | JSON schema for parser |

## Dependencies

### External (npm)
- `date-fns` - Date manipulation for trend analysis
- `uuid` - UUID v4 generation for metric IDs
- `drizzle-orm` - TypeScript ORM for Neon Postgres (Phase 5+)
- `drizzle-kit` - Schema migrations and Drizzle Studio

### Internal
- `src/types/metrics.ts` - Metric interfaces (Phase 0)
- `src/types/whoop.ts` - WHOOP types (Phase 0)
- `db/schema.ts` - Drizzle table definitions (Phase 5+)

### Infrastructure
- **Netlify Site**: zoetrop (`0abb12f6-d11b-4f81-8a8d-86b44e99088f`)
- **GitHub Repo**: negentropico/tracker
- **Database**: Neon Postgres (via Netlify extension)
- **Environment**: `NETLIFY_DATABASE_URL` auto-injected
