# 04 · Metric detail

- **Route:** `/metrics/:category/:metricId` (`app/routes/metrics/detail.tsx`)
- **Archetype:** Detail view + **trend chart** (Recharts) + ranges + tables
- **Screenshots:** `desktop.png` · `mobile.png` (captured at HRV / RMSSD)
- **Informs:** Phase 4 (live data) **and Phase 6 (reports reuse this chart +
  readout language)**

## Purpose
The deep view of a single metric: current value vs its ranges, history over
time with 2026 targets, and the raw measurement log.

## Data shown
- Left category nav (shared with screen 03) + breadcrumb (Metrics / Autonomic /
  HRV (RMSSD)).
- Title + **status badge** (e.g. "borderline") + big readout (33.70 ms) +
  "Last updated …".
- **Range Status** bar: reference band + optimal band + value marker, with
  min/max endpoints.
- **Trend Over Time** (Recharts `TrendChart`): actual line, target dashed line,
  optimal/reference shaded bands, "With 2026 Targets" badge.
- **2026 Targets** card: Q1 target, Q2 stretch, direction.
- **Measurements** table (date → value).
- **Details:** Source · Improvement Direction · **Sync Status** · **Version**.

## Screen-specific violations
- Chart palette is blue (actual) / purple (target) / green / yellow (bands) —
  **none are brand**. This chart's restyle defines the **chart language for the
  whole product, including Phase 6 reports** — treat it as foundational.
- "2026 Targets" card is **purple** (`purple-50/200`) — off-palette → V5/V8.
- Status badge uses raw status colors → V8.
- **`Sync Status` + `Version` rows are vestigial** — Phase 4 of the roadmap
  removes `syncStatus`/`syncVersion`. Don't design UI that depends on them;
  treat the Details block as Source + Improvement Direction only.

## Redesign goals
- **Chart in brand tokens:** actual line in Ink or Focus periwinkle; target as a
  dashed Energy amber; optimal band `--vital-50`; reference band `--mist`/
  `--surface-sunken`; axis/grid hairlines warm. Keep tabular-num axis labels in
  Space Mono. **No gradients.**
- Big readout → Space Grotesk, tabular, with the unit in Space Mono.
- Consider a **MetricRing** showing value-within-optimal as a compact glance.
- Status badge → brand Badge in the resolved status token.
- 2026 Targets card → a metric-family **tone** (`--focus-50`), not purple.
- Measurements table → the brand data-table pattern (see screen 07).
- The TrendChart is a shared component (`app/components/TrendChart.tsx`) used
  elsewhere — restyle once, centrally.
