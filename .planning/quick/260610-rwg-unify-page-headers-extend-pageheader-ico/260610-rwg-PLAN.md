---
phase: quick-260610-rwg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - remix-app/app/components/ui/PageHeader.tsx
  - remix-app/app/routes/_app/metrics/category.tsx
  - remix-app/app/routes/_app/metrics/detail.tsx
autonomous: true
requirements: [QUICK-HEADER-UNIFY]
must_haves:
  truths:
    - "/metrics/:category renders its header via PageHeader: meta row with '{N} TRACKED' eyebrow left and Metrics > Category crumb right, then CatChip + title + description"
    - "/metrics/:category/:metricId renders its header via PageHeader: 'LAST UPDATED ...' eyebrow left, 3-level crumb right, title with StatusBadge beside it, big readout value + unit on the right"
    - "Metric unit string (e.g. µmol/L) renders without text-transform — micro sign µ is never uppercased"
    - "No route file renders a standalone <Crumb> row anymore; crumbs only appear inside PageHeader's meta row"
  artifacts:
    - path: "remix-app/app/components/ui/PageHeader.tsx"
      provides: "PageHeader with new optional icon and titleAccessory props"
      contains: "titleAccessory"
    - path: "remix-app/app/routes/_app/metrics/category.tsx"
      provides: "Category header migrated to PageHeader"
      contains: "<PageHeader"
    - path: "remix-app/app/routes/_app/metrics/detail.tsx"
      provides: "Detail header migrated to PageHeader"
      contains: "<PageHeader"
  key_links:
    - from: "remix-app/app/routes/_app/metrics/category.tsx"
      to: "remix-app/app/components/ui/PageHeader.tsx"
      via: "PageHeader import + icon/eyebrow/crumbs props"
      pattern: "icon=\\{icon \\? <CatChip"
    - from: "remix-app/app/routes/_app/metrics/detail.tsx"
      to: "remix-app/app/components/ui/PageHeader.tsx"
      via: "PageHeader import + titleAccessory/right props"
      pattern: "titleAccessory=\\{<StatusBadge"
---

<objective>
Unify page headers across the app: extend `PageHeader` with `icon` and `titleAccessory` props, then migrate the two hand-rolled headers (metrics category + metric detail) onto it. Result: every page shares the same geometry — meta row (eyebrow left, crumb right), then title block — with no orphan crumb rows or floating meta labels.

Purpose: /metrics/:category and /metrics/:category/:metricId currently render standalone crumb rows with empty left sides, titles at a different y than PageHeader pages, and meta labels ("10 TRACKED", "Last updated…") at arbitrary positions. Screenshots confirmed the inconsistency; the design is locked.

Output: 3 files changed, 1 commit.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@remix-app/app/components/ui/PageHeader.tsx
@remix-app/app/routes/_app/metrics/category.tsx
@remix-app/app/routes/_app/metrics/detail.tsx

<interfaces>
Current PageHeader contract (remix-app/app/components/ui/PageHeader.tsx):

```typescript
export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  crumbs?: CrumbItem[] | null; // undefined = auto-derive via crumbsForPath
}
```

Layout (keep unchanged except where the new props apply):
- Outer `div.mb-8`
- Meta row (rendered when eyebrow or crumbs): `flex items-baseline justify-between gap-4 flex-wrap mb-2.5` — eyebrow in `div.zt-eyebrow` left (or `<span />` placeholder), `<Crumb items={...}>` right
- Title row: `flex items-end justify-between gap-4 flex-wrap` — left: h1 (`var(--text-2xl)`, 600, `-0.02em`) + optional sub p (`8px 0 0`, `var(--text-secondary)`, `var(--text-md)`, maxWidth 620); right: `{right && <div>{right}</div>}`

Verified source anchors:
- category.tsx: standalone crumb row at lines 215-218; custom header div at lines 220-240 (CatChip 52 + h1 + p, then marginLeft-auto span "{totalCount} tracked" in mono/uppercase). `Crumb` imported at line 33. `icon` derived at line 206 via `LUCIDE_MAP[categoryInfo.icon]`. `CatChip` already imported (line 28). PageHeader NOT yet imported.
- detail.tsx: standalone crumb row at lines 116-125; custom header flex at lines 127-178 (left column: h1 nowrap/lineHeight-1.1 + StatusBadge in a `flex items-center gap-12 flex-wrap` row, then "Last updated…" mono p; right column: `zt-readout` value span + unit div). `Crumb` imported at line 20. PageHeader NOT yet imported.
- Unit div in detail.tsx (lines 163-176) carries a load-bearing comment: NO text-transform because uppercasing µ (U+00B5) → Greek capital mu Μ (U+039C) would render "µmol/L" as "MMOL/L". Preserve verbatim.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend PageHeader (icon, titleAccessory) and migrate category + detail headers</name>
  <files>remix-app/app/components/ui/PageHeader.tsx, remix-app/app/routes/_app/metrics/category.tsx, remix-app/app/routes/_app/metrics/detail.tsx</files>
  <action>
**1. PageHeader.tsx — add two optional props (locked design, do not redesign):**

- `icon?: ReactNode` — when present, the title-row left block becomes a flex row: the icon element, then a column containing (h1-row + sub), with `gap: 16` and `items-center`. This reproduces the old category layout (CatChip 52px beside title+sub). When absent, render exactly as today.
- `titleAccessory?: ReactNode` — when present, wrap the h1 in a flex row (`items-center`, `gap: 12`, `flex-wrap`) with the accessory rendered after the h1 (for StatusBadge beside the metric name). When absent, h1 renders bare as today.
- Everything else unchanged: meta row (eyebrow left / crumb right, items-baseline, mb-2.5), title row justify-between items-end with the existing `right` slot, outer mb-8, sub maxWidth 620, crumbs auto-derive semantics. Update the header comment to mention the new props.

**2. category.tsx — migrate onto PageHeader:**

- Delete the standalone crumb row (lines 215-218) and the entire custom header div (lines 220-240). Replace with:

  ```tsx
  <PageHeader
    icon={icon ? <CatChip icon={icon} family={categoryInfo.family} size={52} /> : undefined}
    eyebrow={`${totalCount} tracked`}
    title={categoryInfo.label}
    sub={categoryInfo.description}
    crumbs={[{ label: "Metrics", to: "/metrics" }, { label: categoryInfo.label }]}
  />
  ```

- The "{totalCount} tracked" mono span moves into the eyebrow slot (`zt-eyebrow` already renders mono uppercase) — the floating right-side label is gone. PageHeader's mb-8 replaces the old `marginBottom: var(--gap-xl)` — accepted.
- Add `import { PageHeader } from "~/components/ui/PageHeader";` and remove the now-unused `Crumb` import (line 33). FilterControls and everything below unchanged.

**3. detail.tsx — migrate onto PageHeader:**

- Delete the standalone crumb row (lines 116-125) and the custom header flex (lines 127-178). Replace with:

  ```tsx
  <PageHeader
    eyebrow={`Last updated ${format(parseISO(metric.timestamp), "MMM d, yyyy")}${metric.source ? ` · ${metric.source}` : ""}`}
    title={metric.name}
    titleAccessory={<StatusBadge status={status} />}
    crumbs={[
      { label: "Metrics", to: "/metrics" },
      { label: categoryInfo.label, to: `/metrics/${category}` },
      { label: metric.name },
    ]}
    right={/* existing readout column EXACTLY as-is, lines 159-177 */}
  />
  ```

- The right slot receives the existing readout column markup verbatim: the outer `flex flex-col items-end gap-4` div with the `zt-readout` value span (`fontSize: var(--text-3xl)`, `metric.value.toFixed(2)`) and the unit div. **CRITICAL:** the unit div's comment block ("No text-transform: clinical units are case-sensitive… µ U+00B5 → Μ U+039C…") and its lack of text-transform must be preserved verbatim. The unit stays in the `right` slot, NOT the eyebrow — only the date/source string goes into the eyebrow, which is safe to uppercase.
- No `sub` prop (the old header had none below the title — the "Last updated" line moves to the eyebrow).
- Add the PageHeader import and remove the now-unused `Crumb` import (line 20).

**Sanity (accepted by design):** PageHeader's title row is items-end, so the readout column bottom-aligns with the title block — intended. The old detail h1 had `whiteSpace: nowrap` + `lineHeight: 1.1` inside its flex; the titleAccessory wrapper reproduces flex+wrap so long names still behave (keep nowrap/lineHeight only if PageHeader's h1 styling needs no per-page override — do not add per-page style props; PageHeader's standard h1 styling applies).
  </action>
  <verify>
    <automated>cd remix-app && npm run typecheck && npm run lint && npm run test && npm run build</automated>
  </verify>
  <done>
- PageHeader accepts `icon` and `titleAccessory`; existing call sites unaffected (props optional, default render path byte-identical behavior).
- category.tsx and detail.tsx render headers exclusively via PageHeader; no standalone crumb rows remain.
- `grep -rn "<Crumb" remix-app/app --include="*.tsx" | grep -v "components/ui"` returns nothing (Crumb used only inside components/ui/Crumb.tsx and PageHeader.tsx).
- Unit span in detail retains its no-text-transform comment and styling verbatim.
- typecheck, lint, test, and build all pass.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none new | Pure presentational refactor; no new input crosses any trust boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-q260610-01 | Tampering | rendered metric.name / unit via PageHeader | accept | Values render as React children (auto-escaped); no dangerouslySetInnerHTML introduced |
| T-q260610-SC | Tampering | package installs | accept | No new dependencies installed in this plan |
</threat_model>

<verification>
1. `cd remix-app && npm run typecheck && npm run lint && npm run test && npm run build` — all pass.
2. `grep -rn "<Crumb" remix-app/app --include="*.tsx" | grep -v "components/ui"` — empty output.
3. `grep -c "text-transform" remix-app/app/routes/_app/metrics/detail.tsx` — unit div still carries the no-text-transform comment; unit is not inside any zt-eyebrow element.
</verification>

<success_criteria>
- Both metrics headers share PageHeader geometry: meta row (eyebrow left, crumb right, mb-2.5) then title row — same y-position as /insights/correlations and other PageHeader pages.
- No floating meta labels; "{N} tracked" and "Last updated…" live in the eyebrow slot.
- Clinical unit casing preserved (µmol/L never becomes MMOL/L).
- Single commit touching exactly the 3 listed files.
</success_criteria>

<output>
Create `.planning/quick/260610-rwg-unify-page-headers-extend-pageheader-ico/260610-rwg-SUMMARY.md` when done.
</output>
