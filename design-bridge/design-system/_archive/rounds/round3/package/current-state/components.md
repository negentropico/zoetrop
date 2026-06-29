# Component inventory — current state

Generated from `remix-app/app/components/` at package prep time. One row per
component; key props only (full interfaces live in the source files).

Shared types: `Status = "optimal" | "borderline" | "deficient" | "excess"`;
tone families `"energy" | "vital" | "focus"`.

## `app/components/ui/` (27 components)

| Component | Purpose | Key props |
|-----------|---------|-----------|
| Avatar | Image avatar with initials fallback, metric ring, presence dot | `src?`, `name?`, `size?=40`, `ring?` (family), `status?` (online/away/off) |
| Badge | Tone pill | `tone?=neutral` (family/neutral/success/danger), `variant?=soft` (soft/solid/outline) |
| Button | Primary action button | `variant?=primary` (primary/secondary/ghost/ink/danger), `size?=md`, `fullWidth?`, `iconLeft?/iconRight?` |
| Card | Surface container | `elevation?=sm` (flat–lg), `accent?` (family/ink/css color top hairline), `tone?` (family/mist wash), `padding?=lg`, `interactive?` |
| CatChip | Metric-category icon chip | `icon` (LucideIcon), `family?`, `active?`, `size?` |
| Crumb | Breadcrumb trail | `items: CrumbItem[]` (`{label, to?}` — `to` renders a link) |
| DataTable | Typed sortable table (correlations) | `columns: Column<T>[]`, `rows: T[]`, `rowKey?` |
| Dropzone | File drop/select area | `accept?=".json,application/json"`, `onFile(file)`, `label?` |
| IconButton | Icon-only button | `variant?=ghost` (ghost/soft/outline/ink), `size?=md`, `round?`, `label` (required aria-label) |
| Input | Text input with label/hint/error | `label?`, `hint?`, `error?` (danger border), `iconLeft?`, `size?=md` |
| MetricRing | Radial progress ring with center content | `value?`, `max?`, `tone?` (family), `size?`, `thickness?`, `label?`, `sublabel?` |
| PageHeader | Unified page header (meta row: eyebrow left / crumb right; then title row) | `eyebrow?`, `title`, `sub?`, `right?`, `icon?`, `titleAccessory?`, `crumbs?` (null suppresses, undefined auto-derives) |
| PdfPageViewer | SSR-safe lazy wrapper around react-pdf page renderer | `pdfUrl`, `pageNumber`, `highlightSnippet?`, `width?=600` |
| PdfPageViewerInner | Client-only react-pdf implementation (never imported directly) | (same props — loaded via PdfPageViewer) |
| PhaseBar | Phase timeline segments | `phases: {name, days, state: completed/current/upcoming}[]`, `height?=14`, `showLabels?=true`, `compact?` |
| ProgressBar | Linear progress track | `value?`, `max?=1`, `tone?=focus`, `height?=8`, `showValue?`, `label?` |
| RangeBar | Value marker on reference/optimal range track | `m: MetricWithRange`, `height?=8`, `showEndpoints?` |
| SegmentedControl | Option toggle group | `options: (string \| {value,label})[]`, `value`, `onChange?`, `size?=md` |
| Sparkline | Tiny inline sparkline | `data: number[]`, `width?=46`, `height?=16`, `color?="var(--ink)"` |
| SpiralMark | Brand spiral glyph | `size?=26`, `color?="var(--ink)"` |
| Stat | Labeled stat value with trend chip | `label`, `value`, `unit?`, `tone?=neutral`, `trend?` ({dir, value}), `align?=left`, `size?=md` |
| StatusBadge | Status pill | `status: Status` |
| StatusDot | Status dot | `status: Status`, `size?` |
| Switch | Toggle switch | `checked?`, `onChange?`, `tone?=focus`, `size?=md`, `label?` |
| ThemeToggle | Light/dark toggle — writes `zt-theme` localStorage + `data-theme` on `<html>` | (none) |
| TrendChart | Recharts time-series with range bands, projections, milestones; also exports **TrendSparkline** | `data: DataPoint[]`, `projections?`, `unit`, `optimalRange?`, `referenceRange?`, `height?`, `showMilestones?`; TrendSparkline: `data`, `improvement?` (higher/lower/target) |
| Wordmark | SpiralMark + "zoetrop." wordmark, links to `/dashboard` | (none) |

## `app/components/shell/` (4 components + nav data)

| Component | Purpose | Key props |
|-----------|---------|-----------|
| AppShell | App frame: sidebar + content offset + crumb gating + drawer/cookie state | `children`, `user` ({name,email,role}), `navCollapsed` (from `zt-nav` cookie) |
| Sidebar | The consolidated left nav: accordion, collapsed rail + flyout, mobile drawer | `user`, `collapsed`, `onToggleCollapsed`, `mobileOpen`, `onMobileClose` |
| SidebarAccount | Footer account popover (role badge, settings, ThemeToggle, sign-out) | `user`, `collapsed` (rail mode opens right) |
| MobileTopBar | ≤760px sticky 56px bar: hamburger + Wordmark | `onMenu` |
| nav-tree.ts | Nav data + logic: `NAV_TREE`, `groupOfPath`, `isChildActive`, `crumbsForPath` | (module — see `current-state/nav-tree.ts`) |
