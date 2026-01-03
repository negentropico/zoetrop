# Feature Specification: Core Data Layer

**Feature Branch**: `001-core-data-layer`
**Created**: 2026-01-03
**Status**: Draft
**Input**: Phase 1: Core Data Layer - Port metric types and useMetrics hook from Dash, create LocalStorage adapter with sync status tracking, port calculation utilities (status, trend, significance), create WHOOP JSON parser and mapper

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Store and Retrieve Metrics Locally (Priority: P1)

A user manually enters a blood work metric (e.g., Vitamin D level of 45 ng/mL) and expects the data to persist across browser sessions. When they return to the dashboard, their previously entered metrics appear automatically without re-entry.

**Why this priority**: Core persistence is foundational - without reliable storage, no other features function. This enables MVP functionality where users can track metrics over time.

**Independent Test**: Can be fully tested by entering a metric, closing the browser, reopening, and verifying the metric appears with correct values.

**Acceptance Scenarios**:

1. **Given** no prior data exists, **When** user adds a metric with all required fields (name, value, unit, category, timestamp), **Then** the metric is persisted to LocalStorage and immediately available for display.
2. **Given** metrics exist in storage, **When** user refreshes the page or reopens the browser, **Then** all previously stored metrics load automatically within 500ms.
3. **Given** a stored metric, **When** user updates the value, **Then** the change persists and the sync version increments.
4. **Given** a stored metric, **When** user deletes it, **Then** it is removed from storage and no longer appears in queries.

---

### User Story 2 - Calculate Metric Status Classification (Priority: P1)

A user views a metric and sees its status (optimal, borderline, deficient, excess) automatically calculated based on its value relative to reference and optimal ranges. This helps them quickly identify metrics that need attention.

**Why this priority**: Status classification is the core value proposition - turning raw numbers into actionable health insights. Required for dashboard views.

**Independent Test**: Can be tested by entering metrics with known values and verifying correct status labels appear.

**Acceptance Scenarios**:

1. **Given** a metric with value within optimal range, **When** status is calculated, **Then** status is "optimal" (green indicator).
2. **Given** a metric with value outside optimal but within reference range, **When** status is calculated, **Then** status is "borderline" (yellow indicator).
3. **Given** a metric with value below reference minimum, **When** status is calculated, **Then** status is "deficient" (red indicator).
4. **Given** a metric with value above reference maximum, **When** status is calculated, **Then** status is "excess" (orange indicator).
5. **Given** a metric without reference ranges, **When** status is calculated, **Then** status defaults to "borderline" with appropriate messaging.

---

### User Story 3 - Analyze Metric Trends Over Time (Priority: P2)

A user with multiple readings of the same metric over time sees whether the metric is improving, stable, or declining. This helps them understand if their interventions are working.

**Why this priority**: Trend analysis provides longitudinal insight but requires at least 2 data points, making it secondary to basic storage and status.

**Independent Test**: Can be tested by entering 3+ readings for a metric over different dates and verifying trend is correctly calculated.

**Acceptance Scenarios**:

1. **Given** a metric with only one reading, **When** trend is calculated, **Then** trend shows "stable" (insufficient data).
2. **Given** a metric with 3+ readings showing consistent increase, **When** improvement direction is "higher is better", **Then** trend shows "improving".
3. **Given** a metric with 3+ readings showing consistent increase, **When** improvement direction is "lower is better", **Then** trend shows "declining".
4. **Given** a metric with readings that fluctuate within 5% variance, **When** trend is calculated, **Then** trend shows "stable".

---

### User Story 4 - Import WHOOP Data (Priority: P2)

A user exports their WHOOP data as JSON from the Whoop Analyzer tool and imports it into the dashboard. The system parses the JSON, extracts relevant autonomic metrics (HRV, recovery, sleep), and stores them with appropriate categorization.

**Why this priority**: WHOOP integration automates data entry for autonomic metrics, reducing manual effort. Depends on storage layer being complete.

**Independent Test**: Can be tested by uploading a valid WHOOP JSON file and verifying metrics appear in the Autonomic category.

**Acceptance Scenarios**:

1. **Given** a valid WHOOP analysis JSON file, **When** user imports it, **Then** key metrics (HRV, recovery score, RHR, sleep duration) are extracted and stored as autonomic metrics.
2. **Given** a WHOOP file with missing optional fields, **When** user imports it, **Then** available data is imported and missing fields are handled gracefully without errors.
3. **Given** an invalid or corrupted JSON file, **When** user attempts import, **Then** a clear error message is displayed and no partial data is stored.
4. **Given** a WHOOP import, **When** metrics are stored, **Then** source field is set to "whoop" and sync status is set to "local".

---

### User Story 5 - Track Sync Status (Priority: P3)

A user sees visual indicators showing whether their metrics are stored locally only, synced to the cloud, or pending sync. This provides confidence that data is properly persisted.

**Why this priority**: Sync status tracking prepares for Phase 5 cloud sync but provides immediate value as visual feedback. Lower priority as offline-first still works without it.

**Independent Test**: Can be tested by observing sync status badges after CRUD operations on metrics.

**Acceptance Scenarios**:

1. **Given** a newly created metric, **When** displayed, **Then** sync status shows "local" indicator.
2. **Given** a metric marked as synced, **When** user updates it, **Then** sync status changes to "pending".
3. **Given** sync status query, **When** executed, **Then** returns counts of local, synced, and pending metrics.

---

### Edge Cases

- What happens when LocalStorage quota is exceeded? Display error message, prevent save, suggest export/cleanup.
- How does system handle corrupted storage data? Attempt recovery, fall back to empty state, log error.
- What happens when WHOOP JSON schema changes? Validate required fields only, ignore unknown fields, version parser.
- How does system handle metrics with missing timestamps? Default to current timestamp, warn user.
- What happens when calculating trend with NaN or Infinity values? Filter invalid values, use only valid readings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist metrics to LocalStorage with automatic loading on application start.
- **FR-002**: System MUST support CRUD operations (create, read, update, delete) for all metric types.
- **FR-003**: System MUST calculate metric status (optimal/borderline/deficient/excess) based on value relative to reference and optimal ranges.
- **FR-004**: System MUST analyze metric trends (improving/stable/declining) when 2+ readings exist for a metric.
- **FR-005**: System MUST calculate statistical significance of metric changes using deviation analysis.
- **FR-006**: System MUST track sync status (local/synced/pending) for each metric with version numbering.
- **FR-007**: System MUST parse WHOOP analysis JSON files and extract autonomic metrics.
- **FR-008**: System MUST map WHOOP data fields to the unified metric schema with proper categorization.
- **FR-009**: System MUST validate all data at storage boundaries before persisting.
- **FR-010**: System MUST provide query capabilities by category, time range, and metric name.
- **FR-011**: System MUST support bulk export of all metrics as JSON.
- **FR-012**: System MUST support bulk import of metrics from JSON with validation.
- **FR-013**: System MUST normalize metric values to 0-1 scale for comparison views.
- **FR-014**: System MUST detect statistical outliers in metric series.

### Key Entities

- **Metric**: Individual health measurement with value, unit, category, subcategory, reference/optimal ranges, timestamp, source, and sync metadata.
- **MetricCalculationResult**: Computed analysis containing status classification, trend direction, percent change, and statistical significance.
- **StoredMetrics**: Wrapper for persisted data including metrics array, last update timestamp, and sync version.
- **WhoopAnalysisReport**: Parsed WHOOP export containing key metrics, recovery analysis, workout analysis, and recommendations.

## Assumptions

- LocalStorage is available in all target browsers (modern browsers from 2020+).
- WHOOP Analyzer JSON schema follows the documented format from `/Users/mac/Code/Whoop/results/`.
- Metric types defined in Phase 0 (`src/types/metrics.ts`, `src/types/whoop.ts`) are finalized and stable.
- Reference and optimal ranges are provided at metric entry time; system does not maintain a database of standard ranges.
- Statistical significance threshold is 0.5 on the 0-1 sigmoid scale.
- Trend analysis requires minimum 2 readings with different timestamps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add, view, update, and delete metrics with changes persisting across browser sessions.
- **SC-002**: All metric CRUD operations complete in under 100ms perceived latency.
- **SC-003**: Status classification correctly categorizes 100% of metrics with defined reference ranges.
- **SC-004**: Trend analysis produces consistent results for identical data sets.
- **SC-005**: WHOOP JSON import successfully extracts all key metrics (HRV, recovery, RHR, sleep duration, strain) from valid files.
- **SC-006**: System gracefully handles 1000+ stored metrics without degraded performance.
- **SC-007**: Storage operations fail gracefully with user-friendly error messages when quota exceeded.
- **SC-008**: All imported data maintains type safety with no runtime type errors.
