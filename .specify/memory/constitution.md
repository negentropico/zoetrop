# Wellness Tracker Constitution

## Project Overview

A comprehensive wellness tracking dashboard consolidating WHOOP biometrics, blood work, body composition, and protocol progress into a unified view.

## Core Principles

### I. Component-First Architecture
All UI elements must be standalone, reusable React components. Components render UI only - state management lives in hooks, business logic in utilities. No component should exceed 300 lines.

### II. Local-First Storage
LocalStorage serves as primary persistence layer. Cloud sync (Neon Postgres) is optional and additive. Application must work fully offline. Sync uses last-write-wins with version tracking.

### III. Type Safety (NON-NEGOTIABLE)
Full TypeScript with strict mode enabled. No `any` types allowed. All API responses and data models must have explicit interfaces. Runtime validation at system boundaries.

### IV. Test-First Development
Unit tests required for all hooks and utilities. Integration tests required for data flows. E2E tests for critical user paths. Minimum 80% code coverage target.

### V. Accessibility Requirements
WCAG 2.1 AA compliance mandatory. Keyboard navigation for all interactive elements. Screen reader compatibility with proper ARIA labels. Status indicators must not rely solely on color.

## Technology Stack (Non-Negotiable)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Astro 5 + React 19 | SSG with React islands |
| Styling | Tailwind CSS 4.x | Utility-first consistency |
| Charts | Recharts | React ecosystem, composable |
| Storage | LocalStorage + Neon | Offline-first + optional sync |
| Deployment | Netlify | Serverless functions, CDN |

## Data Model Standards

- **Metric IDs**: UUID v4 format
- **Timestamps**: ISO 8601 (UTC)
- **Reference Ranges**: Required for all metrics
- **Status Classification**: optimal | borderline | deficient | excess
- **Sync Versioning**: Integer incrementing on each change

## 9 Metric Categories

1. **Vitamins**: B-vitamins, fat-soluble (D, E, K, A)
2. **Minerals**: Essential (Zn, Mg, Fe), trace elements
3. **Inflammatory**: hs-CRP, homocysteine, cytokines
4. **Metabolic**: Glucose, kidney, electrolytes
5. **Hormones**: Sex, thyroid, cortisol, growth
6. **Autonomic**: HRV, RHR, recovery, sleep (WHOOP)
7. **Body Composition**: DEXA, lean mass, body fat
8. **Lipids**: Cholesterol, triglycerides
9. **Hematology**: CBC, hemoglobin, WBC

## Integration Constraints

- WHOOP: Manual JSON import only (from Whoop Analyzer)
- Blood Work: Manual entry or CSV upload
- DEXA: Manual entry
- No direct external API connections

## Performance Standards

- Lighthouse score > 90 on all metrics
- No blocking renders on initial load
- Lazy load non-critical views
- Bundle chunks < 200KB each

## Governance

This constitution supersedes all other development practices. Amendments require:
1. Written justification
2. Impact assessment
3. Migration plan for existing code

**Version**: 1.0.0 | **Ratified**: 2026-01-03 | **Last Amended**: 2026-01-03
