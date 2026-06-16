# round4 Brief — LINE-reports (apply the calm-instrument language to the Reports surface)

> **Round goal:** the three Reports views read as one calm instrument — a frozen, confidence-graded
> protocol report where **evidence tier (K1–K4)** and **health status (optimal/borderline/deficient/
> excess)** stay two visually-distinct axes, never colliding, all on the frozen token + chart-frame
> language. "Done" = a report you'd trust and could read at a glance: neutral structure, ink data,
> status only in the four status colours, K-tier in neutral+focus, mono fact register, compact density.

This is a **refinement LINE** off the FROZEN ZOETROP-R1 foundation (`lineType: refinement`). The Reports
surface is already **functional** (real data, real components) but never got the calm-instrument *design*
pass that dashboard/metrics/protocol received — it was deferred through rounds 3–5. Nothing about the
foundation reopens (see `../CHARTER.md` / `../ROUNDTRIP.md`).

## Surfaces in scope (the three Reports views only)

| Surface | View file | What it is today |
|---------|-----------|------------------|
| reports | `remix-app/app/routes/_app/reports/index.tsx` | Reports list for the subject; empty → /reports/generate |
| reports-generate | `remix-app/app/routes/_app/reports/generate.tsx` | Role-gated generate flow → inserts a frozen snapshot (no LLM) |
| report-detail | `remix-app/app/routes/_app/reports/:reportId` (`detail.tsx`) | Frozen-snapshot render; recommendations grouped by body system; K-tier inline; flagged actionable items + appendix disclosure |

## The real design problem (the design heart of zoetrop — confidence under uncertainty)

A report carries **two distinct judgment axes** that must never read as one:

1. **Evidence tier — `KGradeBadge` K1–K4** (how strong the published evidence is for a finding→action
   link): K1 Established · K2 Probable · K3 Emerging · K4 Speculative. Today rendered in **neutral +
   focus periwinkle** (mono pill), deliberately NOT the status colours.
2. **Health status — `StatusBadge`** optimal / borderline / deficient / excess (the reading of a marker),
   the four canonical status tokens.

The line must present both clearly and calmly — K-tier as a quiet evidence signal, status as the colour
language — without the two colour systems competing. Recommendations are grouped by **body system**
(`CATEGORY_INFO` / `VARIANT_CATEGORIES`). A report is a **frozen snapshot** — render it as a calm,
trustworthy document, not a live dashboard.

## Out of scope (frozen — do not touch)

The foundation: tokens, the brand language, the left-nav chrome, the four status tokens, the frames chart
idiom, the K1–K4 evidence-tier semantics (the *meaning* is fixed; only its visual expression is in
scope). No new colour / radius / duration / family / size (any structurally-unavoidable new token extends
an existing family and is logged in `CHANGES.md`). Reuse the existing primitives (`Card`, `PageHeader`,
`KGradeBadge`, `StatusBadge`, `RecommendationBlock`, `TrendChart`/`Sparkline`); new structure gets new
`zt-report-*` namespaced classes.

## Reuse (the frozen language to apply)

Frame cards (`zt-card`), stat-strips (`zt-stat-strip`), the frames chart idiom + frame-card tooltip, mono
fact register (figures/IDs/dates), compact density (`--gap-card/--gap-section/--gap-row`). See
`current-state/app.css` for the full token + class vocabulary.
