# reference/ — current Reports building blocks (snapshot, point-in-time)

Plain-text reference bundled so this round's folder is self-sufficient for an upload to
claude.ai/design. These are the existing pieces the Reports redesign must honour:

- `report.ts` — the report data shape (EvidenceTier k1–k4, SubjectGenotype, VariantMap, GradedRecommendation, ReportSnapshot). Design accurate content against this.
- `KGradeBadge.tsx` — the evidence-tier K1–K4 pill (the exact current colours: K1 ink/n-100 · K2 focus-500/focus-50 · K3 n-600/sunken · K4 n-500/n-100). Distinct from status — keep it that way.
- `StatusBadge.tsx` — the health-status atom (optimal/borderline/deficient/excess — the four canonical status tokens).
- `RecommendationBlock.tsx` — how a single graded recommendation renders today (the unit the report groups by body system).

Token VALUES are all in `../app.css`. Brand visual specimens (rendered swatch cards) live in the
repo at `docs/design-system/guidelines/` (color-families/color-status/type-data) — optional, not bundled
because they need the DS stylesheet to render; `app.css` already carries every value.
