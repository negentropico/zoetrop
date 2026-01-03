# Implementation Plan: MVP Dashboard & UI Components

**Branch**: `002-mvp-dashboard` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-mvp-dashboard/spec.md`

## Summary

Build the core UI layer for the Wellness Tracker: reusable React components (MetricCard, StatusBadge, TrendIndicator, CategoryCard), a main dashboard page with 9-category grid, WHOOP JSON import with file upload and preview, and category detail pages. All components integrate with the Phase 1 data layer (useMetrics hook, storage adapter, calculations).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Astro 5, React 19, Tailwind CSS 4.x, Recharts
**Storage**: LocalStorage (Phase 1 adapter) + optional Neon Postgres sync
**Testing**: Vitest + React Testing Library
**Target Platform**: Web (modern browsers - Chrome, Firefox, Safari, Edge last 2 versions)
**Project Type**: Web application (Astro SSG with React islands)
**Performance Goals**: Lighthouse > 90, dashboard load < 2s, bundle chunks < 200KB
**Constraints**: Offline-capable, WCAG 2.1 AA, mobile-responsive (320px min)
**Scale/Scope**: Single user, 9 metric categories, ~50 metrics typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | PASS | All UI as standalone React components, max 300 lines |
| II. Local-First Storage | PASS | Uses Phase 1 LocalStorage adapter, offline works |
| III. Type Safety | PASS | Strict TypeScript, existing interfaces from Phase 1 |
| IV. Test-First Development | PASS | Unit tests for components, integration for data flows |
| V. Accessibility Requirements | PASS | WCAG 2.1 AA, keyboard nav, ARIA labels, not color-only |
| Tech Stack | PASS | Astro 5 + React 19 + Tailwind 4 + Recharts |

**Gate Result**: PASS - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/002-mvp-dashboard/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (component interfaces)
├── checklists/          # Quality validation
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── metrics/         # MetricCard, StatusBadge, TrendIndicator
│   ├── categories/      # CategoryCard, CategoryGrid
│   ├── data/            # WhoopImport, ImportPreview, FileUpload
│   └── layout/          # Header, Navigation, PageContainer
├── pages/
│   ├── index.astro      # Dashboard with category grid
│   ├── import.astro     # WHOOP import page
│   ├── vitamins/        # Category detail pages
│   ├── minerals/
│   ├── inflammatory/
│   ├── metabolic/
│   ├── hormones/
│   ├── autonomic/
│   ├── body-composition/
│   ├── lipids/
│   └── hematology/
├── hooks/               # useMetrics (Phase 1), new: useDashboard, useImport
├── lib/
│   ├── calculations/    # status.ts, trend.ts (Phase 1)
│   ├── storage/         # adapter.ts, local.ts (Phase 1)
│   └── whoop/           # parser.ts, mapper.ts (Phase 1)
├── styles/              # global.css, component styles
└── types/               # metrics.ts, whoop.ts (Phase 1), new: components.ts

src/tests/
├── components/          # Component unit tests
│   ├── metrics/
│   ├── categories/
│   └── data/
└── integration/         # Dashboard flow tests
```

**Structure Decision**: Single web application using Astro pages with React component islands. Extends existing Phase 1 structure with new component directories.

## Complexity Tracking

> No constitution violations - table not required.
