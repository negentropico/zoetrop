# PROMPT — LINE-reports (apply the calm-instrument language to the Reports surface)

> A **refinement line** off the **frozen** ZOETROP-R1 foundation, run per `../round1/ROUNDTRIP.md`.
> `lineType: refinement`. Run via `zoetrop-design-line` → `zoetrop-design-roundtrip`.
> Read order: this → `../round1/CHARTER.md` → `../round1/DECISIONS.md` → `package/current-state/app.css`.

## Name & scope

`LINE-reports` — the Reports surface (`/reports`, `/reports/generate`, `/reports/:reportId`) is the one
major product surface with **no design treatment**: it post-dated the calm-instrument rounds and was
deferred three times (round3 INTEGRATION-PLAN finding 3; round3 + round4 + round5 "Reports group as-is,
no design"). This line applies the existing frozen language — chart "frames", canonical status tokens,
frame cards, stat-strips, compact density — to those three views. It may touch only: a new `zt-report-*`
class layer in `remix-app/app/app.css` (additive) and the three report route views. Its exit is the
Reports surface rendering in the foundation language, both themes, honesty render passing.

## Inputs (the foundation — loaded, not duplicated)

- `package/current-state/app.css` (the token + `zt-*`/`zn-*` snapshot) and live `remix-app/app/app.css`.
- The shipped chart language: `remix-app/app/components/ui/TrendChart.tsx` + `Sparkline.tsx` (the "frames"
  idiom) and the frame-card tooltip; the stat-strip (`zt-stat-strip`) and frame-card (`zt-card`) patterns.
- `design-bridge/design-system/` (components, guidelines) + the confidence-graded reports UI contract already in
  the repo (`.planning` Phase 6 — the report domain: generate flow, confidence grading).

## Record vs decide

- **Record (do not re-pick):** every foundation token + the four status tokens + the frames chart idiom +
  the frame-card tooltip + compact density + the left-nav chrome. All frozen.
- **Decide (scoped this line):** the Reports surface anatomy only — the report **index/list** (recency +
  status), the **generate** flow (range/scope pickers → confidence-graded preview), and the **report
  detail** layout (sections, embedded frames/stat-strips, confidence grading rendered through the status
  language). Reuse existing primitives; add `zt-report-*` only where genuinely new.

## Propagation

`physics` (screen-only). New surfaces get new namespaced classes (`zt-report-*`) — never reuse a claimed
word. No new colour / radius / duration / family / size (charter rule); any structurally-unavoidable new
token extends an existing family and is logged in `CHANGES.md`.

## Exit

The three Reports views rendering on the token layer in both themes, JS-off; confidence grading reads
through `--optimal/--borderline/--deficient`; the `COMPONENTS`/`zt-report-*` entry documented. Close in
writing (append the session block; `npm run design:round` regenerates the manifest + `DECISIONS.md`); if
the codebase needs it, ship the return bundle + fold `FEEDBACK-LINE-reports.md`.

---

### Other candidate lines (named, not seeded — pick per priority)

- `LINE-public-copy` — replace the PLACEHOLDER landing/login marketing copy with real copy (structure is
  already designed; **blocked on owner copy**) *(named, not seeded)*.
- `LINE-extraction-sample` — swap the synthesized LabCorp facsimile for a real extraction sample in the
  ingest-review demo seed (**blocked on a real sample**) *(named, not seeded)*.
- `LINE-correlation-heatmap` — revisit the dropped heatmap **only** if the correlation pair set gets much
  denser (charter note: the table reads better at sparse counts) *(named, not seeded)*.
