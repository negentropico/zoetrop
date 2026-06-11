# Round 3 Brief — whole-app polish + data-viz language

> TODO(owner): Overall round goal statement — in your words, what does "done"
> look like for round 3? One or two sentences the design side can test
> every decision against.

## Part A — whole-app polish pass

Every UI route, reviewed against the brand **under the new left-nav chrome**:

- **Chrome (fixed):** 264px expanded / 64px collapsed icon rail; single-open
  accordion; flyout on the collapsed rail; mobile (≤760px) off-canvas drawer +
  56px top bar.
- **Headers (fixed pattern):** unified `PageHeader` — meta row with eyebrow
  left / breadcrumb right, then the title row.

**Goals:** density, hierarchy, and spacing refinement; consistent application
of frame cards, pills, and mono micro-labels across all screens.

### Routes in scope (all current UI routes)

| Section | Route | Screen |
|---------|-------|--------|
| — | `/dashboard` | Dashboard (incl. cessation tracker) |
| Metrics | `/metrics` | Overview (all categories) |
| Metrics | `/metrics/:category` | Category detail (9 categories) |
| Metrics | `/metrics/:category/:metricId` | Metric detail (trend chart, ranges, history) |
| Protocol | `/protocol` | Overview |
| Protocol | `/protocol/versions` | Version history |
| Protocol | `/protocol/versions/:version` | Version detail |
| Protocol | `/protocol/supplements` | Supplement tiers |
| Protocol | `/protocol/cessation` | Cessation timeline (signature screen) |
| Protocol | `/protocol/compare` | Version comparison |
| Insights | `/insights` | Overview |
| Insights | `/insights/correlations` | Correlations (data table + filters) |
| Insights | `/insights/genetics` | Genetic variants |
| Import | `/import` | Overview |
| Import | `/import/whoop` | WHOOP JSON import |
| Import | `/import/vault` | Obsidian vault import |
| Ingest | `/ingest` | Overview (redirects to upload) |
| Ingest | `/ingest/upload` | Lab PDF upload |
| Ingest | `/ingest/review` | Extraction review (PDF viewer + per-field approve/edit/reject) |
| Ingest | `/ingest/consent` | Consent gate |
| Ingest | `/ingest/documents/:id` | Document (PDF) viewer |
| Settings | `/settings` | Settings (account, invites) |
| Public | `/` | Landing |
| Public | `/login` | Login |

Non-UI resource/action routes (`/logout`, `/api/auth/*`,
`/settings/invites/:inviteId/revoke`) are out of scope — see
`current-state/routes.md`.

> TODO(owner): Screens to prioritize — which of the above matter most this
> round? (E.g. dashboard + metric detail + ingest review first?)

## Part B — data-viz / charts focus

The metric visualizations grew screen by screen and need one **coherent chart
language**. Inventory (all under `remix-app/app/components/ui/`, props in
`current-state/components.md`):

| Component | File | What it draws |
|-----------|------|---------------|
| TrendChart (+ TrendSparkline export) | `TrendChart.tsx` | Time-series trend with optimal/reference range bands, projections, milestones (Recharts) |
| Sparkline | `Sparkline.tsx` | Tiny inline value sparkline (46×16 default) |
| MetricRing | `MetricRing.tsx` | Radial progress ring with center label/sublabel |
| RangeBar | `RangeBar.tsx` | Value marker on a reference/optimal range track |
| PhaseBar | `PhaseBar.tsx` | Phase timeline segments (completed/current/upcoming) |
| ProgressBar | `ProgressBar.tsx` | Linear progress with optional % readout |
| StatusDot | `StatusDot.tsx` | Status indicator dot |
| StatusBadge | `StatusBadge.tsx` | Status pill (optimal/borderline/deficient/excess) |
| DataTable | `DataTable.tsx` | Sortable/typed data table (correlations screen) |

Plus the heaviest consumer screen: **correlations**
(`remix-app/app/routes/_app/insights/correlations.tsx` — data table + filters
+ stat row).

**The ask — define one chart language covering:**

- **Axis / grid / label treatment** — weights, tick density, mono micro-labels,
  unit placement.
- **Status-color usage** — how `optimal` / `borderline` / `deficient` /
  `excess` map onto chart elements (bands, markers, dots, fills) consistently.
- **Hover / tooltip language** — one tooltip pattern for every chart type.
- **Empty / loading states** — what a chart shows with no data or while data
  arrives.
- **Ring-sweep motion rules** — when/how MetricRing (and progress elements)
  animate; duration/easing as tokens-compatible values.

> TODO(owner): Anything explicitly out of scope for Part B? (E.g. no new chart
> types, or conversely: propose a correlation heatmap?)

## What NOT to change

- **Nav interaction model** — baked in round 2: rail widths, accordion,
  flyout, drawer, cookie-persisted collapse. Polish visuals inside it only.
- **Routing / IA** — routes and the nav tree (`current-state/nav-tree.ts`) are
  fixed this round.
- **Theme plumbing** — `html[data-theme="dark"]` var remap + existing
  `ThemeToggle`. Never reimplement theming (RETURN-SPEC §4, §6).
- **Brand foundations** — tokens, type, iconography from the zoetrope-design
  skill bundle are the constants, not variables.
