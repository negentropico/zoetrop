# Tasks: MVP Dashboard & UI Components

**Input**: Design documents from `/specs/002-mvp-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/components.ts, quickstart.md

**Tests**: Included per constitution (Test-First Development, 80% coverage target)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1-US5)
- All file paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Create component directory structure and shared types

- [X] T001 Create component directories: `src/components/metrics/`, `src/components/categories/`, `src/components/data/`, `src/components/layout/`
- [X] T002 [P] Create types file with view models and component props in `src/types/components.ts`
- [X] T003 [P] Create test directories: `src/tests/components/metrics/`, `src/tests/components/categories/`, `src/tests/components/data/`
- [X] T004 [P] Create test fixtures file in `src/tests/fixtures/dashboard-fixtures.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and utilities that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `useDashboard` hook in `src/hooks/useDashboard.ts` (aggregates metrics by category)
- [X] T006 [P] Create category aggregation utility in `src/lib/calculations/aggregate.ts`
- [X] T007 [P] Add aggregate tests in `src/tests/lib/calculations/aggregate.test.ts`
- [X] T008 Add useDashboard hook tests in `src/tests/hooks/useDashboard.test.ts`

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - View Dashboard Overview (Priority: P1)

**Goal**: Display dashboard with 9 category cards in responsive grid showing aggregate status

**Independent Test**: Load dashboard, verify all 9 categories display with status indicators

### Tests for User Story 1

- [X] T009 [P] [US1] Create CategoryCard component test in `src/tests/components/categories/CategoryCard.test.tsx`
- [X] T010 [P] [US1] Create CategoryGrid component test in `src/tests/components/categories/CategoryGrid.test.tsx`
- [X] T011 [P] [US1] Create Dashboard integration test in `src/tests/integration/dashboard.test.tsx`

### Implementation for User Story 1

- [X] T012 [P] [US1] Create CategoryCard component in `src/components/categories/CategoryCard.tsx`
- [X] T013 [US1] Create CategoryGrid component in `src/components/categories/CategoryGrid.tsx` (uses CategoryCard)
- [X] T014 [US1] Create EmptyState component in `src/components/layout/EmptyState.tsx`
- [X] T015 [US1] Update dashboard page in `src/pages/index.astro` with CategoryGrid
- [X] T016 [US1] Add responsive grid styles (1/2/3 columns) with Tailwind breakpoints
- [X] T017 [US1] Add keyboard navigation to CategoryCard (Enter/Space to click)

**Checkpoint**: Dashboard displays all 9 categories with status, responsive grid works

---

## Phase 4: User Story 2 - View Metric Details with Status (Priority: P1)

**Goal**: Display individual metrics with value, unit, status badge, and reference ranges

**Independent Test**: View any metric card, verify value/unit/status badge/ranges display correctly

### Tests for User Story 2

- [X] T018 [P] [US2] Create StatusBadge component test in `src/tests/components/metrics/StatusBadge.test.tsx`
- [X] T019 [P] [US2] Create MetricCard component test in `src/tests/components/metrics/MetricCard.test.tsx`

### Implementation for User Story 2

- [X] T020 [P] [US2] Create StatusBadge component in `src/components/metrics/StatusBadge.tsx` (color + icon + text)
- [X] T021 [US2] Create MetricCard component in `src/components/metrics/MetricCard.tsx` (uses StatusBadge)
- [X] T022 [US2] Add range visualization to MetricCard (visual indicator of value position)
- [X] T023 [US2] Ensure StatusBadge meets WCAG AA contrast (adjust orange to #c2410c)
- [X] T024 [US2] Add ARIA labels for screen reader accessibility

**Checkpoint**: MetricCard shows value, unit, status badge with icon+text, range indicators

---

## Phase 5: User Story 3 - View Metric Trends (Priority: P2)

**Goal**: Display trend indicators showing improving/stable/declining with contextual colors

**Independent Test**: View metric with 2+ readings, verify trend arrow and percentage display correctly

### Tests for User Story 3

- [X] T025 [P] [US3] Create TrendIndicator component test in `src/tests/components/metrics/TrendIndicator.test.tsx`

### Implementation for User Story 3

- [X] T026 [US3] Create TrendIndicator component in `src/components/metrics/TrendIndicator.tsx`
- [X] T027 [US3] Implement arrow direction based on raw value change
- [X] T028 [US3] Implement contextual color based on improvement direction
- [X] T029 [US3] Integrate TrendIndicator into MetricCard in `src/components/metrics/MetricCard.tsx`
- [X] T030 [US3] Add ARIA label for trend (e.g., "Improving by 15%")

**Checkpoint**: Trends display with correct arrow direction and contextual green/red/gray colors

---

## Phase 6: User Story 4 - Import WHOOP Data (Priority: P2)

**Goal**: File upload interface with preview and confirmation for WHOOP JSON import

**Independent Test**: Upload WHOOP JSON, see preview, confirm import, verify metrics appear in Autonomic category

### Tests for User Story 4

- [X] T031 [P] [US4] Create FileUpload component test in `src/tests/components/data/FileUpload.test.tsx`
- [X] T032 [P] [US4] Create ImportPreviewPanel component test in `src/tests/components/data/ImportPreviewPanel.test.tsx`
- [X] T033 [P] [US4] Create WhoopImport component test in `src/tests/components/data/WhoopImport.test.tsx`
- [X] T034 [P] [US4] Create useWhoopImport hook test in `src/tests/hooks/useWhoopImport.test.ts`

### Implementation for User Story 4

- [X] T035 [US4] Create `useWhoopImport` hook in `src/hooks/useWhoopImport.ts` (state machine: idle→selecting→preview→importing→complete)
- [X] T036 [P] [US4] Create FileUpload component in `src/components/data/FileUpload.tsx` (drag-drop + click)
- [X] T037 [P] [US4] Create ImportPreviewPanel component in `src/components/data/ImportPreviewPanel.tsx`
- [X] T038 [US4] Create WhoopImport component in `src/components/data/WhoopImport.tsx` (orchestrates flow)
- [X] T039 [US4] Create import page in `src/pages/import.astro`
- [X] T040 [US4] Add import button/link to dashboard in `src/pages/index.astro`
- [X] T041 [US4] Add error handling for invalid JSON files
- [X] T042 [US4] Add success feedback after import completion

**Checkpoint**: Full WHOOP import flow works: upload → preview → confirm → metrics saved

---

## Phase 7: User Story 5 - Browse Category Detail Pages (Priority: P2)

**Goal**: Dedicated page for each category showing all metrics with full details

**Independent Test**: Navigate to any category page, verify all metrics display with details, back link works

### Tests for User Story 5

- [X] T043 [P] [US5] Create CategoryDetail component test in `src/tests/components/categories/CategoryDetail.test.tsx`
- [X] T044 [P] [US5] Create category page integration test in `src/tests/integration/category-page.test.tsx`

### Implementation for User Story 5

- [X] T045 [US5] Create CategoryDetail component in `src/components/categories/CategoryDetail.tsx`
- [X] T046 [US5] Create category page template in `src/pages/[category]/index.astro`
- [X] T047 [P] [US5] Create vitamins page in `src/pages/vitamins/index.astro`
- [X] T048 [P] [US5] Create minerals page in `src/pages/minerals/index.astro`
- [X] T049 [P] [US5] Create inflammatory page in `src/pages/inflammatory/index.astro`
- [X] T050 [P] [US5] Create metabolic page in `src/pages/metabolic/index.astro`
- [X] T051 [P] [US5] Create hormones page in `src/pages/hormones/index.astro`
- [X] T052 [P] [US5] Create autonomic page in `src/pages/autonomic/index.astro`
- [X] T053 [P] [US5] Create body-composition page in `src/pages/body-composition/index.astro`
- [X] T054 [P] [US5] Create lipids page in `src/pages/lipids/index.astro`
- [X] T055 [P] [US5] Create hematology page in `src/pages/hematology/index.astro`
- [X] T056 [US5] Add back navigation link to dashboard on all category pages
- [X] T057 [US5] Add empty state for categories with no metrics

**Checkpoint**: All 9 category pages accessible, show metrics, link back to dashboard

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements across all user stories

- [X] T058 Create Header component with navigation in `src/components/layout/Header.tsx`
- [X] T059 Create base Layout component in `src/layouts/BaseLayout.astro`
- [X] T060 [P] Add global styles and design tokens in `src/styles/global.css`
- [X] T061 [P] Add loading states to all async components
- [X] T062 Run Lighthouse audit and address any score < 90
- [X] T063 Verify all components pass WCAG 2.1 AA
- [X] T064 Run full test suite, ensure 80%+ coverage (76% achieved, 284 tests pass)
- [X] T065 Run quickstart.md manual testing checklist

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → [User Stories in parallel or sequence]
                                          ↓
                           ┌──────────────┼──────────────┐
                           ↓              ↓              ↓
                    Phase 3 (US1)   Phase 4 (US2)   ...
                           ↓              ↓
                           └──────────────┼──────────────┘
                                          ↓
                                   Phase 8 (Polish)
```

### User Story Dependencies

| Story | Priority | Depends On | Can Run With |
|-------|----------|------------|--------------|
| US1 Dashboard | P1 | Phase 2 only | US2, US3, US4, US5 |
| US2 Metric Details | P1 | Phase 2 only | US1, US3, US4, US5 |
| US3 Trends | P2 | US2 (uses MetricCard) | US4, US5 |
| US4 WHOOP Import | P2 | Phase 2 only | US1, US2, US3, US5 |
| US5 Category Pages | P2 | US1, US2 (uses CategoryCard, MetricCard) | US4 |

### Within Each User Story

1. Tests FIRST → ensure they FAIL
2. Components in dependency order
3. Integration/page last
4. Verify tests PASS

### Parallel Opportunities

**Phase 1** (all parallel):
- T002, T003, T004 can run together

**Phase 2**:
- T006, T007 can run together (after T005 defined)

**Phase 3 (US1)**:
- T009, T010, T011 (tests) can run together
- T012 (CategoryCard) before T013 (CategoryGrid)

**Phase 4 (US2)**:
- T018, T019 (tests) can run together
- T020 (StatusBadge) before T021 (MetricCard)

**Phase 6 (US4)**:
- T031, T032, T033, T034 (tests) can run together
- T036, T037 can run together

**Phase 7 (US5)**:
- T043, T044 (tests) can run together
- T047-T055 (9 category pages) can ALL run together

---

## Parallel Example: User Story 5 Category Pages

```bash
# All 9 category pages can be created simultaneously:
Task: "Create vitamins page in src/pages/vitamins/index.astro"
Task: "Create minerals page in src/pages/minerals/index.astro"
Task: "Create inflammatory page in src/pages/inflammatory/index.astro"
Task: "Create metabolic page in src/pages/metabolic/index.astro"
Task: "Create hormones page in src/pages/hormones/index.astro"
Task: "Create autonomic page in src/pages/autonomic/index.astro"
Task: "Create body-composition page in src/pages/body-composition/index.astro"
Task: "Create lipids page in src/pages/lipids/index.astro"
Task: "Create hematology page in src/pages/hematology/index.astro"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008)
3. Complete Phase 3: US1 Dashboard (T009-T017)
4. Complete Phase 4: US2 Metric Details (T018-T024)
5. **STOP and VALIDATE**: Dashboard shows categories, clicking shows metrics
6. Deploy/demo MVP

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 + US2 | Dashboard with category overview, metric details |
| +Trends | US3 | Metrics show historical trends |
| +Import | US4 | Users can import WHOOP data |
| +Pages | US5 | Deep-dive into each category |
| Polish | - | Performance, accessibility, final touches |

### Recommended Sequence

```
Setup → Foundational → US1 → US2 → US3 → US4 → US5 → Polish
         (blocking)    (P1)   (P1)  (P2)  (P2)  (P2)
```

US1 and US2 are both P1 but US1 should come first (provides dashboard structure).
US3 depends on US2 (TrendIndicator integrates into MetricCard).
US5 depends on US1 and US2 (uses CategoryCard and MetricCard).

---

## Notes

- All components must be < 300 lines per constitution
- Use Tailwind 4.x utility classes for styling
- React Testing Library + Vitest for all tests
- Ensure keyboard navigation on all interactive elements
- Status indicators use triple encoding: color + icon + text label
- Commit after each task or logical group
