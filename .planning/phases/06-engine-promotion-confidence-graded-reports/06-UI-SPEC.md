---
phase: 6
slug: engine-promotion-confidence-graded-reports
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-11
---

# Phase 6 — UI Design Contract: Engine Promotion + Confidence-Graded Reports

> Visual and interaction contract for `/reports/generate` and `/reports/:id`.
> Extends the binding Phase 4.1 design contract — all tokens, families, shadows,
> motion, typography, and spacing are inherited unless explicitly overridden here.
> Zero new design decisions that duplicate 04.1-UI-SPEC.md are made.
> Only Phase 6 net-new patterns (K-grade system, disclaimer callout, detection
> confidence secondary badge, flagged/appendix disclosure pattern, report
> generation trigger) are specified below.
>
> **Pre-populated from:** 06-CONTEXT.md decisions D-07/08/09/13/14/15/17,
> ROADMAP.md Phase 6 success criteria, 04.1-UI-SPEC.md (binding), codebase
> component survey, genetics.ts / metrics.ts type files.
> Zero user questions were needed.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Tailwind 4 `@theme` + hand-ported typed TSX — identical to Phase 4.1) |
| Preset | not applicable |
| Component library | none (custom, `remix-app/app/components/ui/` — existing library extended) |
| Icon library | lucide-react (same as Phase 4.1; new icons: `file-text`, `shield-check`, `alert-triangle`, `chevron-down`, `chevron-up`, `list`) |
| Font | Space Grotesk / Hanken Grotesk / Space Mono — no change from 04.1 |
| Registry Safety | not applicable |

Source: 04.1-UI-SPEC.md §Design System (inherited).

---

## Spacing Scale

Inherited in full from 04.1-UI-SPEC.md (Fibonacci-derived scale, everyday gap
aliases, 44px touch target exception). No new spacing tokens for Phase 6.

Refer to 04.1-UI-SPEC.md §Spacing Scale for the complete table.

Report-specific spacing applications:
- Recommendation block vertical rhythm: `gap-6` (24px) between blocks within a category section.
- Category section gap: `gap-8` (32px) between the metric-category sections.
- Disclaimer callout: `p-4` (16px) internal padding; `mt-3` (12px) gap below recommendation text that spawned it.
- Appendix expand/collapse toggle: `mt-6` (24px) above the "Show full panel" button row.
- Report header meta row: `mb-8` (32px) below PageHeader, consistent with all routes.

---

## Typography

Inherited in full from 04.1-UI-SPEC.md. No new type sizes or weights.

Report-specific type role mapping:

| UI element | Token | Size | Family | Weight | Notes |
|---|---|---|---|---|---|
| Report title (`/reports/:id`) | `--text-2xl` | 36px | Display (Space Grotesk) | 600 | Via PageHeader `title` prop |
| Report sub (subject name + generated date) | `--text-md` | 18px | Text (Hanken Grotesk) | 500 | Via PageHeader `sub` prop |
| Category section heading | `--text-lg` | 22px | Display | 500 | `<h2>` with `.zt-eyebrow` section label above |
| K-grade inline label | `--text-2xs` | 11px | Mono (Space Mono) | 400 | Inside KGradeBadge — ALL-CAPS tracking 0.06em |
| Recommendation body text | `--text-base` | 16px | Text | 400 | Line-height 1.5; the `"K{N} ({label}): {text}"` string |
| K4 disclaimer text | `--text-sm` | 14px | Text | 400 | Line-height 1.5; inside DisclaimerCallout |
| Detection-confidence secondary badge | `--text-2xs` | 11px | Mono | 400 | SubBadge — uppercase tracking 0.06em |
| Appendix section heading | `--text-sm` | 14px | Mono | 400 | ALL-CAPS eyebrow style via `.zt-eyebrow` |
| Appendix metric rows | `--text-sm` | 14px | Text | 400 | Normal body weight |
| Generate trigger form label | `--text-sm` | 14px | Text | 500 | Form field label convention |
| Corpus version footnote | `--text-xs` | 12px | Mono | 400 | Bottom of report, muted |

---

## Color

### Inherited from Phase 4.1

All palette foundations, 60/30/10 split, status palette, family ramps, neutral
ramp, dark theme token remap, and destructive color are inherited verbatim from
04.1-UI-SPEC.md §Color. No new color tokens.

### Phase 6 net-new: K-grade evidence-tier color system

CRITICAL CONSTRAINT: The K-grade palette MUST be visually distinct from the
status palette (optimal/borderline/deficient/excess). K is an evidence tier
(how strong is the science), NOT a metric status (how is the value vs. range).
Using the same color family for both would conflate two unrelated concepts and
violate engine integrity (D-19).

The K-grade palette uses the **neutral ramp + focus family** only. It draws no
color from vital (teal, reserved for optimal status) or energy (amber, reserved
for borderline status) or danger (red, reserved for deficient status).

| K level | Evidence tier label | Badge token | Badge bg | Badge text | Dark bg | Rationale |
|---|---|---|---|---|---|---|
| K1 | ESTABLISHED | `--n-900` (ink) | `--n-100` (sunken) | `--n-900` | `--n-800` bg / `--n-50` text | Strongest tier — solid, grounded, no color dramatism |
| K2 | PROBABLE | `--focus-500` | `--focus-50` | `--focus-500` | `--focus-50` dark override | Focus periwinkle: the action/accent family — maps intuitively to "act on this" |
| K3 | EMERGING | `--n-500` (muted) | `--surface-sunken` | `--n-600` | same remapped via dark tokens | Muted — the evidence is present but not established; subdued treatment |
| K4 | SPECULATIVE | `--warning` → NO. Use `--n-400` text + `--n-100` bg | `--n-100` | `--n-500` | dark variant | Deliberately de-saturated — K4 is cautionary without being alarming; the disclaimer carries the warning weight |

RATIONALE FOR K4 TREATMENT: K4 is NOT rendered in warning amber (`--energy`/`--warning`). Amber is owned by `borderline` status. Using amber for K4 would imply "this metric is borderline" when the K is commenting on evidence strength, not measurement status. K4 is instead rendered de-saturated (muted ink) with the DisclaimerCallout carrying visual weight.

K-grade is NEVER expressed via green/teal, red, or orange — those are permanently reserved for the status system.

The four K levels redefined as evidence tiers (D-07, superseding the detection-oriented CONFIDENCE_LEVELS labels in genetics.ts):

| Level | New label | New description | Old label (retired) |
|---|---|---|---|
| K1 | Established | Multiple RCTs or systematic reviews support this finding-to-action link | Confirmed (23andMe) |
| K2 | Probable | Observational studies or consistent mechanistic evidence | Likely |
| K3 | Emerging | Preliminary studies; consistent with mechanism but limited human data | Inferred |
| K4 | Speculative | Expert opinion, case reports, or theoretical mechanistic reasoning only | Requires Testing |

These new labels ship in `CONFIDENCE_LEVELS` in genetics.ts as the migration from detection → evidence-tier semantics (D-07).

### K4 disclaimer color treatment

The DisclaimerCallout component uses:
- Background: `--excess-bg` (`#f7edd8` light / `#362c14` dark) — warm amber wash, distinct from danger-red, signals caution without alarm
- Left border: `--energy` (`#ffc53d`) — 3px solid warm amber accent stripe
- Icon: `alert-triangle` from lucide at 16px, color `--energy-600`
- Text: `--text-secondary` body

RATIONALE: This is the one place K4 touches an amber signal. The callout is a
warning UI primitive — it is SEPARATE from the KGradeBadge. The badge itself
stays de-saturated. The callout is visually distinct (block-level, bordered,
inset) so a reader parsing the page quickly sees "this block has a warning."

---

## Copywriting Contract

Voice, sentence case rules, mono ALL-CAPS eyebrow rule, and "quiet coach" tone
are all inherited from 04.1-UI-SPEC.md §Copywriting Contract.

### Phase 6 net-new copy

| Element | Copy |
|---|---|
| Report generation CTA | Generate report |
| Report generation loading state | Generating report… |
| Report generation success | Report ready |
| `/reports/generate` page title | Generate report |
| `/reports/generate` sub | Select a subject and generate a confidence-graded protocol report. |
| Subject select label | Subject |
| Subject select empty option | Select a subject |
| `/reports/:id` page eyebrow | CONFIDENCE-GRADED REPORT |
| Report corpus version footnote | Corpus version: {version} · Generated {date} |
| Category section eyebrow (metric) | ALL-CAPS Lucide icon + category name, e.g. "VITAMINS" |
| Category section eyebrow (genetics) | ALL-CAPS category name, e.g. "METHYLATION" |
| Flagged section intro eyebrow | FINDINGS THAT NEED A LOOK |
| Appendix expand button | Show full panel |
| Appendix collapse button | Hide full panel |
| Appendix section eyebrow | ALL METRICS · [N] TOTAL |
| Empty appendix | All metrics are within optimal range. |
| Empty report body (no flagged findings) | All measured values are within optimal range. No recommendations at this time. |
| K4 disclaimer (LOCKED — from ROADMAP SC5) | This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting. |
| Detection confidence "verified" badge | VERIFIED |
| Detection confidence "inferred" badge | INFERRED |
| Report list page eyebrow | REPORTS |
| Report list empty state heading | No reports yet |
| Report list empty state body | Generate your first report to see a confidence-graded protocol recommendation. |
| Error state — generation failed | Report generation failed. Check that all required data is available and try again. |
| Destructive — no destructive actions in this phase | — |

### Copywriting rules for recommendation body text

- Recommendation text is authored in the corpus: hedged, non-imperative.
- The display template is LOCKED: `"K{N} ({label}): {recommendation text}"` — e.g. `"K2 (Probable): Consider supporting methylation with methylfolate, given MTHFR C677T heterozygosity and suboptimal folate."`
- The `K{N}` prefix and `({label})` are rendered by the UI component, not stored in the text field. The corpus stores recommendation text only; the engine assembles the display string.
- No "you should", "you must", "you need to" in corpus text (ROADMAP SC5 lint rule).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none — shadcn not used | not applicable |
| Third-party | none | not applicable |

---

## Phase 6 Design Patterns (net-new)

This section defines the visual and interaction patterns that are unique to Phase 6. All Phase 4.1 patterns remain in force.

---

### Pattern 1: KGradeBadge

A new component. Renders the evidence-tier K label inline within recommendation text and as a standalone chip in the RecommendationBlock header.

**Component:** `app/components/ui/KGradeBadge.tsx`

**Props:**
```ts
interface KGradeBadgeProps {
  level: 'K1' | 'K2' | 'K3' | 'K4';
  /** "chip" = standalone pill; "inline" = tighter, inline-flow. Default: "chip" */
  variant?: 'chip' | 'inline';
}
```

**Visual spec:**

| Prop | Value |
|---|---|
| Font family | Space Mono (`--font-mono`) |
| Font size | 11px (`--text-2xs`) |
| Font weight | 400 |
| Letter spacing | 0.06em |
| Text transform | uppercase |
| Padding (chip) | 4px 8px |
| Padding (inline) | 2px 4px |
| Border radius | `--radius-pill` |
| Line height | 1 |

**Color table (all via CSS vars, dark remap automatic):**

| Level | Color | Background | Border |
|---|---|---|---|
| K1 | `var(--ink)` | `var(--n-100)` | none |
| K2 | `var(--focus-500)` | `var(--focus-50)` | none |
| K3 | `var(--n-600)` | `var(--surface-sunken)` | none |
| K4 | `var(--n-500)` | `var(--n-100)` | none |

**Rendering:**
- Content: `K{N}` — e.g. `K1`, `K2`, `K3`, `K4`
- For the chip variant, render a second muted label in parentheses immediately after the badge (not inside it): `(Established)` in Space Mono 11px text-muted. The level label renders in the same color as the badge text.
- For the inline variant, render `K{N}` only (no parenthetical label — space is tight).

**Accessibility:** `aria-label="Evidence tier: K{N} — {label}"` on the chip span.

**IMPORTANT:** KGradeBadge is an EVIDENCE tier. It MUST NOT be visually confused with StatusBadge (which uses teal/amber/red/bronze). Reviewers of the codebase must be able to distinguish them at a glance.

---

### Pattern 2: RecommendationBlock

The primary content unit of the report. One block per finding (metric or variant). Stacked vertically within a category section, separated by `gap-6`.

**Component:** `app/components/ui/RecommendationBlock.tsx`

**Props:**
```ts
interface RecommendationBlockProps {
  kLevel: 'K1' | 'K2' | 'K3' | 'K4';
  recommendationText: string; // the corpus text (no template prefix — UI assembles)
  source: 'metric' | 'variant';
  // For metric-sourced recommendations:
  metricName?: string;
  metricStatus?: 'optimal' | 'borderline' | 'deficient' | 'excess';
  // For variant-sourced recommendations:
  geneName?: string;
  genotype?: string;
  // Secondary detection-confidence annotation (D-09):
  detectionConfidence?: 'verified' | 'inferred';
}
```

**Visual layout:**

```
┌─────────────────────────────────────────────────────┐
│  [KGradeBadge chip]  [source name]  [StatusBadge?]  │  ← header row, flex, gap-2
│  [SubBadge: VERIFIED | INFERRED]  (if variant)      │  ← secondary annotation row (only if variant)
│                                                      │
│  K{N} (Label): recommendation text here, may        │  ← body text, --text-base, leading-1.5
│  wrap to multiple lines.                             │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │  ← DisclaimerCallout (K4 only)
│  │ ⚠ This recommendation is speculative…       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Header row:** `display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;`

- Left: KGradeBadge chip
- Middle: source name — if metric, render metric name in `--text-sm` weight 500; if variant, render `{gene} ({genotype})` in `--text-sm` weight 500
- Right of source name (metric only): StatusBadge for the metric's current status — rendered in the existing StatusBadge component. This gives the reader immediate context for why this recommendation was surfaced.
- Second row (variant only): SubBadge for detection confidence (see Pattern 4).

**Body text assembly:**
```
"K{level} ({label}): {recommendationText}"
```
- `K{level}` — rendered as `KGradeBadge` variant="inline" (`K2`), Space Mono 11px, de-emphasised but visible
- ` ({label})` — Space Mono 11px `var(--text-muted)` immediately after the inline badge, no badge treatment
- `: ` — Text 16px `var(--text-muted)`
- `{recommendationText}` — Hanken Grotesk 16px `var(--ink)` weight 400, line-height 1.5

This assembly is inline flow — the badge, parenthetical, colon, and text all flow as text-level elements.

**Card wrapping:** RecommendationBlock renders inside a `Card` component with `elevation="xs"` `padding="md"`. K4 blocks use `tone="mist"` to subtly distinguish the card surface (the DisclaimerCallout itself provides the primary K4 warning signal — the toned card is supplemental).

---

### Pattern 3: DisclaimerCallout

Renders below the recommendation body text, inside the RecommendationBlock card, only when `kLevel === 'K4'`.

**Component:** `app/components/ui/DisclaimerCallout.tsx`

**Props:**
```ts
interface DisclaimerCalloutProps {
  // No props. The locked disclaimer string is hard-coded in the component.
  // ROADMAP SC5 locks the string. No override.
}
```

**Visual spec:**

```
┌─── 3px solid var(--energy) ──────────────────────────┐
│  [alert-triangle 16px var(--energy-600)]              │
│  This recommendation is speculative (limited          │
│  evidence). Discuss with a licensed practitioner      │
│  before acting.                                       │
└───────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Background | `var(--excess-bg)` (`#f7edd8` / dark `#362c14`) |
| Left border | `3px solid var(--energy)` |
| Border radius | `var(--radius-md)` (7px) on right side; `0` on left side (the accent stripe goes to the edge) |
| Padding | `12px 16px` |
| Margin top | `12px` (gap from recommendation text) |
| Icon | `alert-triangle` from lucide, 16px, `color: var(--energy-600)`, `flex-shrink: 0` |
| Icon + text layout | `display: flex; gap: 8px; align-items: flex-start` |
| Text | `--text-sm` 14px Hanken Grotesk weight 400 `--text-secondary` line-height 1.5 |
| Locked string | "This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting." |

**Accessibility:** `role="note"` on the callout div. `aria-label="K4 speculative recommendation notice"`.

**Why `--excess-bg` not `--danger-bg`:** The K4 disclaimer is a cautionary note, not an error. Danger red would misread as "deficient status" (the status palette's red). The warm amber-wash `--excess-bg` reads as "proceed carefully" without conveying metric failure.

---

### Pattern 4: SubBadge (detection confidence annotation)

Secondary badge for variant-sourced recommendations only. Carries the genotype detection confidence (verified vs. inferred) as specified in D-09. Visually subordinate to KGradeBadge.

**Rendered inline in the RecommendationBlock header row, below the main header.**

**Not a new component** — render using the existing `Badge` component:
- `tone="neutral"` `variant="outline"` for both states
- `variant="outline"` renders as a transparent background with a muted border — subordinate by design

| State | Badge content | Badge tone | Badge variant |
|---|---|---|---|
| verified | `shield-check` icon (12px) + "VERIFIED" | `"vital"` `variant="soft"` | soft vital wash — confirmation tone |
| inferred | `"INFERRED"` | `"neutral"` `variant="outline"` | outline neutral — de-emphasised |

The `shield-check` icon at 12px renders inline before the text inside the Badge children. Use `<span style="display:inline-flex;align-items:center;gap:4px">`.

**Rendering rule:** Only render SubBadge if `detectionConfidence` prop is defined. For metric-sourced recommendations, omit entirely — detection confidence is not applicable.

---

### Pattern 5: CategorySection

Groups RecommendationBlocks by body system / category. Renders one section per category that has flagged findings.

**Not a new standalone component** — assemble from existing primitives:

```
[SectionLabel eyebrow with CatChip + category name]  ← .zt-eyebrow + CatChip(icon, family)
[RecommendationBlock] [RecommendationBlock] …         ← flex-col gap-6
```

**SectionLabel row:** `display: flex; align-items: center; gap: 12px; margin-bottom: 16px`
- Left: CatChip at `size=32` using the category's Lucide icon and family from `CATEGORY_INFO` (or `VARIANT_CATEGORIES` for genetic categories).
- Right of chip: `<span class="zt-eyebrow">CATEGORY NAME</span>` in Space Mono 11px `--text-muted` ALL-CAPS.

For variant categories, use the icons from `VARIANT_CATEGORIES` (dna, filter, brain, apple, heart, flame, zap). These do not have a `family` property — render CatChip with `family=null` (neutral Ink chip).

**Section spacing:** `margin-bottom: 32px` between sections (`gap-8`).

---

### Pattern 6: FlaggedFindingsBody + AppendixDisclosure

Implements D-15: "Flagged-in-body, full-data-available." The report body surfaces only actionable findings; the complete panel lives in an expandable appendix.

**Layout:**

```
[PageHeader: report title, sub, generated date]
─────────────────────────────────────────────
[Report Summary Card — N findings, K breakdown]
─────────────────────────────────────────────
FINDINGS THAT NEED A LOOK   ← .zt-eyebrow
[CategorySection: Vitamins]
[CategorySection: Methylation]
…
─────────────────────────────────────────────
[AppendixDisclosure toggle]
  ↳ [AppendixPanel — full metric list + all variants]
```

**Flagged items rule:** A metric finding is surfaced if `metricStatus !== 'optimal'` (borderline, deficient, or excess). A variant finding is surfaced if the `variantProtocolMap` yields at least one recommendation (regardless of impact/category). Optimal-across-all metrics → empty state body copy: "All measured values are within optimal range. No recommendations at this time."

**AppendixDisclosure:** A full-width button row below the flagged body.

| Property | Value |
|---|---|
| Button | `Button` component variant `"ghost"` size `"md"` with icon: `chevron-down` when collapsed, `chevron-up` when expanded |
| Button label | "Show full panel" / "Hide full panel" |
| Button placement | `display: flex; justify-content: center; margin-top: 24px` |
| Panel open/close | CSS `height` transition, `--dur-slow` 320ms `--ease-in-out` |
| Panel content | AppendixPanel — see below |

**AppendixPanel:**
- Section eyebrow: "ALL METRICS · {N} TOTAL" in `.zt-eyebrow`
- Metric rows: use DataTable component with columns: Metric name, Category (CatChip size 24), Value + unit (Space Mono tabular), Status (StatusBadge), Source (Badge neutral)
- Variant rows (separate sub-section below metrics): "ALL VARIANTS · {N} TOTAL" eyebrow, DataTable with columns: Gene, Genotype, Category (CatChip), K grade (KGradeBadge chip), Detection confidence (SubBadge)
- The DataTable mobile card-per-row reflow (from 04.1-UI-SPEC.md) applies here.

---

### Pattern 7: ReportSummaryCard

A summary card rendered at the top of `/reports/:id`, below the PageHeader. Gives the reader an at-a-glance overview before diving into findings.

**Assemble from existing components:**

```
Card(elevation="sm", padding="md")
  ┌── Stat(label="FINDINGS", value=N, tone="neutral")
  ├── Stat(label="CATEGORIES", value=N, tone="neutral")
  ├── Stat(label="SUBJECT", value=subjectName, tone="neutral")
  └── KBreakdownRow (K1–K4 counts)
```

**KBreakdownRow:** `display: flex; gap: 12px; flex-wrap: wrap; align-items: center`
- For each K level with count > 0: render `KGradeBadge` chip + `<span class="font-mono text-xs text-muted">{count}</span>`
- Order: K1, K2, K3, K4

**Card layout:** `display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px` at desktop; single column on mobile. KBreakdownRow spans full width below the stat trio (using `grid-column: 1 / -1` or flex wrap).

---

### Pattern 8: Report Generation Trigger (`/reports/generate`)

**Page structure:** Standard in-app route under `_app/` — authenticated, uses AppShell.

```
[PageHeader: title="Generate report", sub="Select a subject and generate..."]
─────────────────────────────────────────────
Card(elevation="sm", padding="lg")
  [Subject select: label="Subject", Input or <select>]
  [Button: primary, "Generate report", fullWidth=false]
```

**Subject select:** Renders as a standard HTML `<select>` styled with the brand Input focus ring (`--shadow-ring`). Hanken Grotesk 16px. Border `--border`, radius `--radius-md`, padding consistent with Input component. Disabled state: `opacity: 0.5`.

**Loading state:** After submit, the Generate button renders loading text "Generating report…" and is `disabled`. The button uses an inline spinner — a `ProgressBar` or simple `animate-spin` Lucide `loader-2` icon at 16px in the button icon slot. Duration: up to ~30s for report generation. Do not navigate until the report row is confirmed written.

**Success transition:** On success, navigate directly to `/reports/:id`. No intermediate success screen.

**Error state:** If generation fails, render an inline error below the form: `<p class="text-danger text-sm mt-3">Report generation failed. Check that all required data is available and try again.</p>`. The button returns to enabled state.

**Route guard:** `requireRole('practitioner' | 'owner')` — client role cannot trigger generation (D-18, authz carry-forward).

---

### Pattern 9: Reports List (nav/landing for `/reports`)

Simple list page. Not specified in detail — Phase 6 scope is generation + detail render. The list renders as a standard DataTable or card list per the existing pattern. Define enough to not block planning:

- Route: `/reports` (layout + index)
- Empty state: heading "No reports yet" + body copy (see Copywriting above) + Button primary "Generate report" linking to `/reports/generate`
- Report rows: subject name, generated date (Space Mono), K-breakdown chips (KGradeBadge, compact row), View button (link) — DataTable or Card list (planner decides based on row density)
- PageHeader: eyebrow "REPORTS", title "Reports"

---

## Nav Extension

The existing `TopNav` and `BottomTab` add a Reports entry:

| Label | Lucide icon | Route | Match rule |
|---|---|---|---|
| Reports | `file-text` | `/reports` | `path.startsWith('/reports')` |

This becomes nav item 6. The BottomTab currently has 5 items (Dashboard, Metrics, Protocol, Insights, Import). With 6 items it may require either dropping "Import" from the bottom tab (accessible via the side nav/menu instead) or using a "More" overflow. Planner decision — the executor must update `app/components/shell/nav-tree.ts` and the shell components. The Reports icon and route registration are locked here.

---

## Accessibility

Inherited requirements from 04.1-UI-SPEC.md apply. Phase 6 additions:

- KGradeBadge: `aria-label="Evidence tier: K{N} — {label}"` on every chip.
- DisclaimerCallout: `role="note"` + `aria-label="K4 speculative recommendation notice"`.
- AppendixDisclosure toggle button: `aria-expanded="true|false"` + `aria-controls="{panelId}"`. Panel has `id="{panelId}"`.
- ReportSummaryCard stats: each Stat has a visible label — no accessibility additions needed beyond what Stat provides.
- Color-only differentiation: KGradeBadge uses distinct text labels (K1/K2/K3/K4) in addition to color — colorblind-safe.
- Report body recommendation text: the inline `K{N} (label):` prefix is always present as visible text — no tooltip-only disclosure (ROADMAP SC4 requirement, RPT-02).

---

## Dark Theme

All new components must use semantic token CSS vars only (`var(--ink)`, `var(--surface)`, `var(--focus-50)`, etc.) — never hardcoded hex. The existing dark token remap in 04.1-UI-SPEC.md flips these automatically.

DisclaimerCallout dark override: `--excess-bg` dark override is already declared in 04.1-UI-SPEC.md as `#362c14`. No additional dark tokens needed.

---

## Component Inventory — Phase 6 delta

### New components (Phase 6 only)

| Component | File | Responsibility |
|---|---|---|
| `KGradeBadge` | `app/components/ui/KGradeBadge.tsx` | Evidence-tier K1–K4 pill badge, chip and inline variants |
| `RecommendationBlock` | `app/components/ui/RecommendationBlock.tsx` | Single recommendation card: K badge + source + status + inline body text + optional DisclaimerCallout |
| `DisclaimerCallout` | `app/components/ui/DisclaimerCallout.tsx` | K4 locked warning callout; hard-coded disclaimer string |

### Existing components reused without change

All existing `app/components/ui/` components are used as-is. Key reuse points:

| Component | Reuse in Phase 6 |
|---|---|
| `Badge` | SubBadge (detection confidence): `tone="vital" variant="soft"` for verified; `tone="neutral" variant="outline"` for inferred |
| `Card` | Wraps every RecommendationBlock (`elevation="xs" padding="md"`); ReportSummaryCard (`elevation="sm" padding="md"`); generate form (`elevation="sm" padding="lg"`) |
| `CatChip` | CategorySection header icon chip |
| `StatusBadge` | RecommendationBlock header: metric status alongside the KGradeBadge |
| `PageHeader` | All three report routes (generate, detail, list) |
| `Stat` | ReportSummaryCard stats (FINDINGS, CATEGORIES, SUBJECT) |
| `DataTable` | AppendixPanel metric rows + variant rows; report list page |
| `Button` | AppendixDisclosure toggle; generate form submit; report list empty-state CTA |

### Components extended by Phase 6

None — no existing component needs a prop addition. New patterns compose from existing primitives.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
