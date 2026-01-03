# Tasks: Core Data Layer

**Input**: Design documents from `/specs/001-core-data-layer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution requires Test-First Development with 80% coverage. Test tasks included.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [x] T001 Install dependencies: `npm install date-fns uuid`
- [x] T002 Install dev dependencies: `npm install -D vitest @testing-library/react jsdom`
- [x] T003 [P] Create Vitest config in vitest.config.ts
- [x] T004 [P] Create test setup file in src/tests/setup.ts
- [x] T005 [P] Create directory structure: src/lib/storage/, src/lib/calculations/, src/lib/whoop/, src/tests/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational

- [x] T006 [P] Unit test for storage adapter interface in src/tests/lib/storage/adapter.test.ts
- [x] T007 [P] Unit test for LocalStorage adapter in src/tests/lib/storage/local.test.ts

### Implementation

- [x] T008 Create StorageAdapter interface in src/lib/storage/adapter.ts (port from contracts/storage.ts)
- [x] T009 Implement LocalStorageAdapter in src/lib/storage/local.ts (port from Dash, add sync tracking)
- [x] T010 Create metric validation utility in src/lib/storage/validation.ts
- [x] T011 Add re-export index in src/lib/storage/index.ts

**Checkpoint**: Storage layer ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Store and Retrieve Metrics Locally (Priority: P1) 🎯 MVP

**Goal**: Users can add, update, delete metrics with persistence across browser sessions

**Independent Test**: Add a metric, close browser, reopen, verify metric appears with correct values

### Tests for User Story 1

- [x] T012 [P] [US1] Unit test for useMetrics hook in src/tests/hooks/useMetrics.test.ts

### Implementation for User Story 1

- [x] T013 [US1] Implement useMetrics hook in src/hooks/useMetrics.ts (port from Dash, integrate storage adapter)
- [x] T014 [US1] Add getMetricsByCategory method to useMetrics hook in src/hooks/useMetrics.ts
- [x] T015 [US1] Add getMetricsByTimeRange method to useMetrics hook in src/hooks/useMetrics.ts
- [x] T016 [US1] Add getMetricHistory method to useMetrics hook in src/hooks/useMetrics.ts
- [x] T017 [US1] Add exportMetrics and importMetrics methods to useMetrics hook in src/hooks/useMetrics.ts
- [x] T018 [US1] Add re-export index in src/hooks/index.ts

**Checkpoint**: User Story 1 complete - metrics can be stored and retrieved locally

---

## Phase 4: User Story 2 - Calculate Metric Status Classification (Priority: P1)

**Goal**: Metrics display status (optimal/borderline/deficient/excess) based on value vs ranges

**Independent Test**: Create metric with known value and ranges, verify correct status is calculated

### Tests for User Story 2

- [x] T019 [P] [US2] Unit test for calculateStatus in src/tests/lib/calculations/status.test.ts

### Implementation for User Story 2

- [x] T020 [US2] Implement calculateStatus function in src/lib/calculations/status.ts
- [x] T021 [US2] Add calculateMetricResult wrapper in src/lib/calculations/status.ts
- [x] T022 [US2] Add re-export index in src/lib/calculations/index.ts
- [x] T023 [US2] Integrate status calculation into useMetrics hook in src/hooks/useMetrics.ts

**Checkpoint**: User Story 2 complete - metrics display calculated status

---

## Phase 5: User Story 3 - Analyze Metric Trends Over Time (Priority: P2)

**Goal**: Multiple readings show trend (improving/stable/declining) with significance

**Independent Test**: Add 3+ readings for a metric, verify trend calculation is correct

### Tests for User Story 3

- [x] T024 [P] [US3] Unit test for analyzeTrend in src/tests/lib/calculations/trend.test.ts
- [x] T025 [P] [US3] Unit test for statistics functions in src/tests/lib/calculations/statistics.test.ts

### Implementation for User Story 3

- [x] T026 [P] [US3] Implement analyzeTrend function in src/lib/calculations/trend.ts
- [x] T027 [P] [US3] Implement calculatePercentChange function in src/lib/calculations/trend.ts
- [x] T028 [US3] Implement calculateSignificance function in src/lib/calculations/statistics.ts
- [x] T029 [US3] Implement normalizeValue function in src/lib/calculations/statistics.ts
- [x] T030 [US3] Implement detectOutliers function in src/lib/calculations/statistics.ts
- [x] T031 [US3] Implement calculateRateOfChange function in src/lib/calculations/statistics.ts
- [x] T032 [US3] Update calculations index to export all functions in src/lib/calculations/index.ts

**Checkpoint**: User Story 3 complete - metrics show trend analysis

---

## Phase 6: User Story 4 - Import WHOOP Data (Priority: P2)

**Goal**: Users can import WHOOP JSON files and see autonomic metrics appear

**Independent Test**: Upload valid WHOOP JSON, verify HRV, recovery, sleep metrics appear in Autonomic category

### Tests for User Story 4

- [x] T033 [P] [US4] Unit test for WHOOP parser in src/tests/lib/whoop/parser.test.ts
- [x] T034 [P] [US4] Unit test for WHOOP mapper in src/tests/lib/whoop/mapper.test.ts

### Implementation for User Story 4

- [x] T035 [US4] Implement validateWhoopJson function in src/lib/whoop/parser.ts
- [x] T036 [US4] Implement parseWhoopJson function in src/lib/whoop/parser.ts
- [x] T037 [US4] Implement mapWhoopToMetrics function in src/lib/whoop/mapper.ts (with reference ranges from contracts)
- [x] T038 [US4] Add re-export index in src/lib/whoop/index.ts
- [x] T039 [US4] Add importWhoopData method to useMetrics hook in src/hooks/useMetrics.ts

**Checkpoint**: User Story 4 complete - WHOOP data can be imported

---

## Phase 7: User Story 5 - Track Sync Status (Priority: P3)

**Goal**: Metrics show sync status (local/synced/pending) with summary counts

**Independent Test**: Create metrics, verify they show "local" status; query sync status summary

### Tests for User Story 5

- [x] T040 [P] [US5] Unit test for sync status tracking in src/tests/lib/storage/sync.test.ts

### Implementation for User Story 5

- [x] T041 [US5] Add getSyncStatus method to LocalStorageAdapter in src/lib/storage/local.ts
- [x] T042 [US5] Add markAsSynced method to LocalStorageAdapter in src/lib/storage/local.ts
- [x] T043 [US5] Expose sync status in useMetrics hook in src/hooks/useMetrics.ts

**Checkpoint**: User Story 5 complete - sync status is tracked and queryable

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T044 [P] Run all tests and verify 80% coverage: `npm run test:coverage`
- [x] T045 [P] Add JSDoc comments to all exported functions in src/lib/
- [x] T046 Verify quickstart.md examples work in src/tests/integration/quickstart.test.ts
- [x] T047 Run TypeScript strict mode check: `npx tsc --noEmit`
- [x] T048 Verify build passes: `npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1, can run in parallel after Foundational
  - US3 and US4 are both P2, can run in parallel after Foundational
  - US5 is P3, can start after Foundational
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (P1) | Foundational only | US2, US3, US4, US5 |
| US2 (P1) | Foundational only | US1, US3, US4, US5 |
| US3 (P2) | Foundational only | US1, US2, US4, US5 |
| US4 (P2) | Foundational only | US1, US2, US3, US5 |
| US5 (P3) | Foundational only | US1, US2, US3, US4 |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Core functions before integration
3. Update index exports after implementation
4. Story complete before moving to next priority (if sequential)

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T003, T004, T005 can run in parallel
```

**Phase 2 (Foundational)**:
```
T006, T007 can run in parallel (tests)
```

**Phase 3-7 (User Stories)**:
```
All user stories can run in parallel after Foundational completes
Within US3: T024, T025 can run in parallel (tests)
Within US3: T026, T027 can run in parallel (implementations)
Within US4: T033, T034 can run in parallel (tests)
```

---

## Parallel Example: Foundational + US1

```bash
# After Setup, run Foundational tests in parallel:
Task: "Unit test for storage adapter interface in src/tests/lib/storage/adapter.test.ts"
Task: "Unit test for LocalStorage adapter in src/tests/lib/storage/local.test.ts"

# After Foundational implementation, start US1:
Task: "Unit test for useMetrics hook in src/tests/hooks/useMetrics.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test metric CRUD operations
5. Deploy/demo basic metric storage

### Incremental Delivery

1. Setup + Foundational → Storage layer ready
2. Add US1 → Test CRUD → Deploy (MVP!)
3. Add US2 → Test status calculation → Deploy
4. Add US3 → Test trend analysis → Deploy
5. Add US4 → Test WHOOP import → Deploy
6. Add US5 → Test sync status → Deploy
7. Polish phase → Final release

### Sequential Priority Order

If implementing one story at a time:
1. **US1 + US2** (both P1) - Core value: storage + status
2. **US3 + US4** (both P2) - Enhanced: trends + WHOOP
3. **US5** (P3) - Preparatory: sync tracking

---

## Task Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| Setup | - | 5 | 3 |
| Foundational | - | 6 | 2 |
| US1 | P1 | 7 | 1 |
| US2 | P1 | 5 | 1 |
| US3 | P2 | 9 | 4 |
| US4 | P2 | 7 | 2 |
| US5 | P3 | 4 | 1 |
| Polish | - | 5 | 2 |
| **Total** | | **48** | **16** |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution requires: TypeScript strict, no `any`, 80% test coverage
- Port from Dash: useMetrics hook, storage utilities, calculations
- Reference Whoop: JSON schema for parser validation
