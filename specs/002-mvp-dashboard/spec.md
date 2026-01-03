# Feature Specification: MVP Dashboard & UI Components

**Feature Branch**: `002-mvp-dashboard`
**Created**: 2026-01-03
**Status**: Draft
**Input**: User description: "Phase 2: Full MVP - Build UI components (MetricCard, StatusBadge, TrendIndicator, CategoryCard), main dashboard page with category overview grid, WHOOP import component with file upload and preview, and category detail pages showing metrics with status and trends"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Dashboard Overview (Priority: P1)

As a user, I want to see a dashboard with all 9 metric categories at a glance so I can quickly understand my overall wellness status.

**Why this priority**: The dashboard is the primary entry point and provides immediate value by showing the user's complete health picture in one view.

**Independent Test**: Can be fully tested by loading the dashboard and verifying all 9 category cards display with their current status indicators.

**Acceptance Scenarios**:

1. **Given** I have metrics stored locally, **When** I load the dashboard, **Then** I see a grid of 9 category cards (Vitamins, Minerals, Inflammatory, Metabolic, Hormones, Autonomic, Body Composition, Lipids, Hematology)
2. **Given** a category has metrics, **When** I view its card, **Then** I see the category name, icon, metric count, and overall status color (green/yellow/red/orange)
3. **Given** a category has no metrics, **When** I view its card, **Then** I see the category with a neutral/gray indicator and "No data" message
4. **Given** I am on the dashboard, **When** I click a category card, **Then** I navigate to that category's detail page

---

### User Story 2 - View Metric Details with Status (Priority: P1)

As a user, I want to see individual metrics with their current value, status classification, and reference ranges so I can understand where each biomarker stands.

**Why this priority**: Core functionality - users need to see their actual metric values and understand if they're optimal, borderline, deficient, or excess.

**Independent Test**: Can be tested by viewing any metric card and verifying value, unit, status badge, and range indicators display correctly.

**Acceptance Scenarios**:

1. **Given** I have a metric with value and ranges, **When** I view the metric card, **Then** I see the metric name, current value, unit, and a colored status badge
2. **Given** a metric is within optimal range, **When** I view it, **Then** the status badge shows "Optimal" in green
3. **Given** a metric is outside reference range, **When** I view it, **Then** the status badge shows "Deficient" (red) or "Excess" (orange) appropriately
4. **Given** a metric has reference/optimal ranges, **When** I view it, **Then** I see a visual indicator showing where my value falls within the ranges

---

### User Story 3 - View Metric Trends (Priority: P2)

As a user, I want to see trend indicators for metrics with historical data so I can understand if my biomarkers are improving or declining.

**Why this priority**: Trends provide actionable insight beyond point-in-time values, helping users understand the direction of their health.

**Independent Test**: Can be tested by viewing a metric with 2+ historical readings and verifying the trend indicator displays correctly.

**Acceptance Scenarios**:

1. **Given** a metric has 2+ readings over time, **When** I view it, **Then** I see a trend indicator (up arrow, down arrow, or stable line)
2. **Given** a "higher is better" metric is increasing, **When** I view the trend, **Then** it shows as "Improving" with an upward green arrow
3. **Given** a "lower is better" metric is increasing, **When** I view the trend, **Then** it shows as "Declining" with a downward red arrow
4. **Given** a metric has only 1 reading, **When** I view it, **Then** no trend indicator is shown (or shows "Insufficient data")

---

### User Story 4 - Import WHOOP Data (Priority: P2)

As a user, I want to import my WHOOP data from a JSON file so I can see my autonomic metrics (HRV, recovery, sleep) in the dashboard.

**Why this priority**: WHOOP integration is a key data source for autonomic metrics, enabling the dashboard to show real biometric data.

**Independent Test**: Can be tested by uploading a WHOOP JSON file and verifying the autonomic category populates with HRV, recovery, RHR, sleep, and strain metrics.

**Acceptance Scenarios**:

1. **Given** I am on the dashboard or import page, **When** I click "Import WHOOP Data", **Then** I see a file upload interface
2. **Given** I select a valid WHOOP JSON file, **When** I upload it, **Then** I see a preview of the metrics that will be imported
3. **Given** I confirm the import preview, **When** I click "Import", **Then** the metrics are saved and appear in the Autonomic category
4. **Given** I upload an invalid file, **When** I try to import, **Then** I see a clear error message explaining what went wrong
5. **Given** metrics already exist, **When** I import new WHOOP data, **Then** new metrics are added (not replacing existing ones)

---

### User Story 5 - Browse Category Detail Pages (Priority: P2)

As a user, I want to view a dedicated page for each metric category so I can see all metrics in that category with full details.

**Why this priority**: Category pages provide the detailed view needed for in-depth analysis of specific health areas.

**Independent Test**: Can be tested by navigating to any category page and verifying all metrics in that category display with their full details.

**Acceptance Scenarios**:

1. **Given** I click a category from the dashboard, **When** the page loads, **Then** I see the category name, description, and all metrics in that category
2. **Given** a category has multiple metrics, **When** I view the page, **Then** metrics are displayed in an organized grid or list
3. **Given** I am on a category page, **When** I want to return to overview, **Then** I can navigate back to the dashboard
4. **Given** a category has no metrics, **When** I view its page, **Then** I see an empty state with guidance on how to add metrics

---

### Edge Cases

- What happens when localStorage is empty? Dashboard shows all categories with "No data" state
- What happens when WHOOP JSON has missing fields? Parser shows warnings but imports available data
- What happens when metric value equals the range boundary? Classify as within range (borderline)
- What happens on very small screens? UI adapts responsively to mobile viewport
- What happens when a metric has no ranges defined? Show value without status classification

## Requirements *(mandatory)*

### Functional Requirements

**Dashboard & Navigation**
- **FR-001**: System MUST display a dashboard with 9 category cards in a responsive grid layout
- **FR-002**: Each category card MUST show: category name, icon, metric count, and aggregate status indicator
- **FR-003**: System MUST allow navigation from dashboard to individual category pages
- **FR-004**: System MUST provide navigation back to dashboard from any category page

**Metric Display**
- **FR-005**: MetricCard component MUST display: metric name, current value, unit, and timestamp
- **FR-006**: StatusBadge component MUST show status (optimal/borderline/deficient/excess) with appropriate colors (green/yellow/red/orange)
- **FR-007**: TrendIndicator component MUST show trend direction (improving/stable/declining) with visual arrow indicators
- **FR-008**: Metric cards MUST show reference and optimal ranges when available

**WHOOP Import**
- **FR-009**: System MUST provide a file upload interface for WHOOP JSON files
- **FR-010**: System MUST validate uploaded files and show clear error messages for invalid files
- **FR-011**: System MUST show a preview of metrics before confirming import
- **FR-012**: System MUST import WHOOP metrics into the Autonomic category with appropriate subcategories

**Category Pages**
- **FR-013**: Each category page MUST display all metrics belonging to that category
- **FR-014**: Category pages MUST show category name, description, and metric count
- **FR-015**: Empty categories MUST display a helpful empty state message

**Responsiveness**
- **FR-016**: All components MUST be responsive and usable on mobile devices (320px minimum width)
- **FR-017**: Dashboard grid MUST adapt from 1 column (mobile) to 3 columns (desktop)

### Key Entities

- **CategoryCard**: Visual representation of a metric category showing aggregate status (name, icon, metricCount, overallStatus)
- **MetricCard**: Display component for individual metrics (name, value, unit, status, trend, timestamp)
- **StatusBadge**: Visual indicator of metric status (status, color)
- **TrendIndicator**: Visual indicator of metric trend (direction, percentChange)
- **ImportPreview**: Temporary view of metrics to be imported before confirmation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard loads and displays all 9 categories within 2 seconds on standard connection
- **SC-002**: Users can identify a metric's status (optimal/borderline/deficient/excess) within 1 second of viewing
- **SC-003**: WHOOP import process completes in under 5 seconds for typical file sizes
- **SC-004**: 100% of metrics with historical data show accurate trend indicators
- **SC-005**: Dashboard is fully functional on mobile devices (touch-friendly, readable text)
- **SC-006**: Users can navigate from dashboard to any category and back in under 3 clicks
- **SC-007**: Import errors display clear, actionable messages that help users resolve issues
- **SC-008**: All status colors meet WCAG AA contrast requirements for accessibility

## Assumptions

- Users access the dashboard via modern web browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- WHOOP JSON files follow the format from the Whoop Analyzer tool
- Metrics are persisted in localStorage (as implemented in Phase 1)
- Users have basic familiarity with health metrics and their meaning
- Color-coding follows established conventions (green = good, red = concerning)
