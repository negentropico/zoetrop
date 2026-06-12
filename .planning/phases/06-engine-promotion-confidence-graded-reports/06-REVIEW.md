---
phase: 06-engine-promotion-confidence-graded-reports
reviewed: 2026-06-11T22:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - remix-app/app/lib/report-generator.server.ts
  - remix-app/app/lib/corpus.server.ts
  - remix-app/app/lib/engine.ts
  - remix-app/app/lib/data.server.ts
  - remix-app/app/lib/authz.server.ts
  - remix-app/app/routes/_app/reports/generate.tsx
  - remix-app/app/routes/_app/reports/detail.tsx
  - remix-app/app/routes/_app/reports/index.tsx
  - remix-app/app/routes/_app/insights/genetics.tsx
  - remix-app/app/routes/_app/insights/index.tsx
  - remix-app/app/routes/_app/dashboard.tsx
  - remix-app/app/components/ui/KGradeBadge.tsx
  - remix-app/app/components/ui/DisclaimerCallout.tsx
  - remix-app/app/components/ui/RecommendationBlock.tsx
  - remix-app/app/components/shell/nav-tree.ts
  - remix-app/app/components/shell/Sidebar.tsx
  - remix-app/app/types/report.ts
  - remix-app/app/types/genetics.ts
  - remix-app/db/schema.ts
  - remix-app/scripts/seed-corpus.ts
  - remix-app/app/routes.ts
  - remix-app/tests/lib/report-generator.test.ts
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
status: resolved
disposition:
  fixed: [CR-01, CR-02]
  deferred_preexisting: [CR-03]
  accepted_known: [WR-01, WR-02, WR-03, WR-04, IN-01, IN-02, IN-03]
  fix_commit: pending
---

# Phase 06: Code Review Report

**Reviewed:** 2026-06-11T22:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** resolved (Criticals on new code fixed; see Disposition)

## Disposition (orchestrator, post-review)

- **CR-01 (getReport no tenant filter) — FIXED.** `getReport(id, tenantId)` now filters `AND tenant_id = ?`; `detail.tsx` passes `user.tenantId` so a cross-tenant id returns null → 404 before any row loads. `assertSubjectAccess` kept as second layer.
- **CR-02 (getReports missing ORDER BY) — FIXED.** Added `.orderBy(desc(reports.createdAt))`, matching the doc contract.
- **CR-03 (classifyMetricStatus "optimal" fallback) — DEFERRED (pre-existing).** This branch was extracted verbatim from the pre-Phase-6 `metrics.ts:72-81`; 06-01's mandate was to preserve behavior identically (39 behavior-lock tests). Changing it is an app-wide semantic decision (affects every metric page), not a Phase-6 cleanup — route via a dedicated decision/plan. The "optimal fallback" is documented in the engine source.
- **WR-01..04 / IN-01..03 — ACCEPTED/KNOWN.** Noted for a future cleanup pass (naming clarity, generate.tsx GET loader role-gate, label/div a11y, seed TOCTOU → unique index, double classify call, fragment key, first-row-wins multi-pattern gene). None block the phase goal; the auth path is mitigated (action requireRole + assertSubjectAccess present).

Verification after fixes: typecheck clean, `npm run build` ✓ (client+ssr), report-generator + corpus-schema DB tests green.

## Summary

Phase 06 delivers the deterministic confidence-graded report engine (engine.ts, corpus.server.ts, report-generator.server.ts), three reports routes, four UI components, schema changes, and corpus seed. The overall architecture is sound: D-13 no-LLM, D-17 INSERT-only, D-06 corpus non-PHI separation, and the three-layer auth chain (requireUser → requireRole → assertSubjectAccess) are all structurally present and correct.

Three critical defects were found: (1) `getReport` in `data.server.ts` fetches by ID alone with no tenant filter, meaning the IDOR check in `detail.tsx` is a post-fetch comparison rather than a DB-layer gate — a cross-tenant enumeration attack is blocked by the comparison but the raw report row is loaded into memory first; (2) `getReports` lacks an ORDER BY clause despite its doc comment claiming "ordered by createdAt desc", causing unpredictable list order; and (3) `classifyMetricStatus` silently returns `"optimal"` for any metric that has an `optimalRange` defined but the value falls outside it AND no `referenceRange` is present — this causes the report generator to silently skip corpus rules for those metrics. Two warnings cover the `flaggedMetricCount` semantics mismatch and an accessibility violation. Three info items are minor quality notes.

---

## Critical Issues

### CR-01: `getReport` fetches by ID alone — no tenant filter at DB layer

**File:** `remix-app/app/lib/data.server.ts:196-199`
**Issue:** `getReport(id)` issues `SELECT * FROM reports WHERE id = ?` with no `tenant_id` condition. The IDOR protection in `detail.tsx:55` (`assertSubjectAccess`) fires *after* the row is loaded into memory. Any valid session user can enumerate UUID report IDs and load raw snapshot data into the server's working memory before the tenant comparison rejects the request. This is defence-in-depth failure: the DB-layer gate that every other read helper in this file applies (`eq(reports.tenantId, tenantId)`) is missing here. The data.server.ts module comment at line 3 explicitly states "single enforcement point for WHERE tenant_id = ?"; this function violates that contract.

**Fix:** Add `tenantId` as a required parameter matching every other read helper in this file:
```typescript
export async function getReport(id: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.tenantId, tenantId)));
  return row ?? null;
}
```
In `detail.tsx`, change the call:
```typescript
// Before assertSubjectAccess, pass user.tenantId! so the DB does the scoping
const report = await getReport(reportId, user.tenantId!);
if (!report) throw new Response("Not found", { status: 404 });
// assertSubjectAccess becomes a redundant belt-and-suspenders check — keep it
assertSubjectAccess(user, { tenantId: report.tenantId }, user.tenantId!);
```
This eliminates the load-then-check window and keeps the module's own invariant.

---

### CR-02: `getReports` doc comment claims `ORDER BY createdAt DESC` — no ORDER BY exists

**File:** `remix-app/app/lib/data.server.ts:186-193`
**Issue:** The JSDoc at line 186 states "ordered by createdAt desc" but the query has no `ORDER BY` clause:
```typescript
return db
  .select()
  .from(reports)
  .where(and(eq(reports.tenantId, tenantId), eq(reports.subjectId, subjectId)));
```
Postgres returns rows in undefined heap order without an ORDER BY. The reports list page (`index.tsx`) will show reports in random order after the first few inserts, with no ability to sort most-recent-first. This is a correctness failure: the feature as described (list of reports, implied reverse-chronological) will not work reliably.

**Fix:** Add `desc` to the import and apply it:
```typescript
import { eq, and, desc } from "drizzle-orm";

export async function getReports(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(reports)
    .where(and(eq(reports.tenantId, tenantId), eq(reports.subjectId, subjectId)))
    .orderBy(desc(reports.createdAt));
}
```

---

### CR-03: `classifyMetricStatus` silent `"optimal"` fallback masks non-optimal metrics in report engine

**File:** `remix-app/app/lib/engine.ts:31-40`
**Issue:** The function returns `"optimal"` in two distinct cases: (a) value is inside `optimalRange`, and (b) no `referenceRange` is defined (the fallback at line 39, even if the value is outside `optimalRange`). The comment at line 28 acknowledges this as a "defensive quirk" but does not flag it as a report-generation risk.

In `report-generator.server.ts:125-132`, the generator only emits corpus rules when `status !== "optimal"`. Any metric row that has an `optimalMin`/`optimalMax` set but has NULL `referenceMin`/`referenceMax` will silently return `"optimal"` even when the value is outside the optimal range. The generator will skip all corpus rules for that metric, producing no recommendations and reporting a lower `flaggedMetricCount` than the actual clinical picture warrants.

This is a correctness defect in the report's completeness. A metric that is clearly above the optimal upper bound but has no reference range stored will be omitted from the report entirely. The appendix `metricStatuses` section will also record it as `"optimal"`, which is misleading.

**Fix:** When a value is outside `optimalRange` but no `referenceRange` is defined, return `"borderline"` rather than `"optimal"`, so corpus rules can still fire:
```typescript
export function classifyMetricStatus(metric: Metric): MetricStatus {
  const { value, optimalRange, referenceRange } = metric;
  if (optimalRange && value >= optimalRange.min && value <= optimalRange.max) return "optimal";
  if (referenceRange) {
    if (value < referenceRange.min) return "deficient";
    if (value > referenceRange.max) return "excess";
    return "borderline";
  }
  // No referenceRange: if outside optimalRange return "borderline"; 
  // if no optimalRange at all, return "optimal" (truly unranged metric).
  if (optimalRange) return "borderline";
  return "optimal";
}
```
Update the `engine.test.ts` fixture that exercises this path and the doc comment accordingly.

---

## Warnings

### WR-01: `flaggedMetricCount` counts metrics-with-matching-rules, not all non-optimal metrics

**File:** `remix-app/app/lib/report-generator.server.ts:109-136`
**Issue:** `flaggedMetricCount` is incremented only when `matchingRules.length > 0` (line 135). The `inputSummary.flaggedMetricCount` field in the snapshot is therefore the count of metrics that had at least one corpus rule fire — not the count of non-optimal metrics. A metric with status `"deficient"` for which no corpus rule exists will not be counted, even though it is clinically non-optimal.

The field name and its position inside `inputSummary` implies "how many metrics were flagged as non-optimal". The current meaning is "how many non-optimal metrics had corpus coverage". If a future report consumer uses this field to audit coverage gaps, the semantic mismatch is a latent bug. More immediately, the ReportSummaryCard on the detail page (`detail.tsx:148`) displays `recommendations.length` (which is correct for the body), but `inputSummary.flaggedMetricCount` is also stored in the snapshot and its meaning may be misread by future callers.

**Fix:** Either (a) rename to `flaggedMetricWithRuleCount` and add a separate `nonOptimalMetricCount`, or (b) count all non-optimal metrics regardless of corpus coverage:
```typescript
let nonOptimalMetricCount = 0;
// in the loop, before the matchingRules check:
if (status !== "optimal") {
  nonOptimalMetricCount++;
  // existing matchingRules logic ...
}
// in inputSummary:
inputSummary: {
  metricCount: allMetrics.length,
  genotypeCount: genotypes.length,
  flaggedMetricCount: nonOptimalMetricCount,   // all non-optimal, with or without rules
}
```

---

### WR-02: `generate.tsx` action has no loader — action-only route renders no error on GET

**File:** `remix-app/app/routes/_app/reports/generate.tsx:38-53`
**Issue:** The route exports only an `action` for POST (correct) and a default component. It has no `loader`. In React Router 7 with the `_app/layout.tsx` gate, an unauthenticated GET to `/reports/generate` will render the component without calling `requireUser` or `requireRole` — the layout loader handles authentication for the shell, but the generate page component renders inline with no server data. More critically, if the layout loader is ever bypassed (e.g., by a direct server-side fetch, a misconfigured middleware, or future refactoring), the page renders and the form POSTs without any pre-render auth check.

Adding a `loader` with the same `requireRole` guard as the action is a standard defensive pattern in Remix/React Router:

**Fix:**
```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);
  return {}; // no data needed; just gate the GET
}
```

---

### WR-03: `generate.tsx` label `htmlFor` references a `div` (non-labelable element)

**File:** `remix-app/app/routes/_app/reports/generate.tsx:77,91`
**Issue:** The `<label htmlFor="subject-label">` at line 77 references `id="subject-label"` at line 91, but that element is a `<div>`, not a form control. An HTML `<label>` element's `for`/`htmlFor` must reference a labelable element (`input`, `select`, `textarea`, `button`, etc.). A `<div>` is not labelable. This means clicking the label has no effect, and assistive technologies cannot associate the label with the (non-existent) input. While the subject field is display-only (intentionally), the `<label>` element should not be used for a decorative static text display.

**Fix:** Replace the `<label>` with a `<div>` or `<p>` since there is no interactive control to associate it with:
```tsx
<div
  style={{
    display: "block",
    fontFamily: "var(--font-text)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    color: "var(--text)",
    marginBottom: 6,
  }}
>
  Subject
</div>
```
Remove the `htmlFor` attribute entirely.

---

### WR-04: `seed-corpus.ts` idempotency check uses `COALESCE` but the variant insert path has a TOCTOU window

**File:** `remix-app/scripts/seed-corpus.ts:800-845`
**Issue:** The check-before-insert pattern for variant rules (lines 801-812) uses a raw SQL `SELECT` followed by a Drizzle `INSERT`. This is a TOCTOU (time-of-check-time-of-use) window: two concurrent seed runs (e.g., two parallel CI jobs seeding the same Neon DB) can both pass the SELECT check and then both execute the INSERT, creating duplicates. The `metricRules` path (lines 852-875) has the same window.

The fix acknowledged in the 06-03 SUMMARY for the original `ON CONFLICT DO NOTHING` replaced it with check-before-insert, but the root cause (missing unique constraint) is still present. The seed script is documented as safe to re-run, but "safe with a serialization caveat" is weaker than "safe always".

This is a warning rather than critical because: (a) the seed script is run manually or in serialized CI, not from concurrent web requests; (b) duplicate corpus rows cause over-reporting in the engine (extra recommendations) rather than data loss; (c) this is a known design trade-off from 06-03 per the deviations log.

**Fix (preferred):** Add a unique index on `genetic_variants(gene, genotype_pattern, corpus_version)` in a follow-up migration, then switch back to `INSERT ... ON CONFLICT DO NOTHING`. This eliminates the window and removes the N+1 SELECT overhead in the seed loop.

**Fix (interim — no migration):** Wrap each check+insert pair in a Postgres transaction with `SERIALIZABLE` isolation to prevent concurrent inserts past the check:
```typescript
await db.transaction(async (tx) => {
  const existing = await tx.execute(sql`SELECT id FROM genetic_variants WHERE ...`);
  if ((existing as { rows: unknown[] }).rows.length > 0) { continue; }
  // insert...
});
```

---

## Info

### IN-01: `classifyMetricStatus` called twice per metric in `generateReport`

**File:** `remix-app/app/lib/report-generator.server.ts:112-200`
**Issue:** `classifyMetricStatus` is called once in the metric-rule evaluation loop (line 125) and again in the appendix-building loop (line 200) for every metric. Since `getMetrics` may return hundreds of rows, each metric has its status computed twice. The function is pure and cheap, so this is not a correctness issue, but the double computation is unnecessary.

**Fix:** Cache the status in the first loop and reuse it in the appendix builder, or do the appendix build in the same loop:
```typescript
// Store [metric, status] pairs in the first loop
const metricWithStatus = allMetrics.map((m) => {
  const engineMetric = { /* ... */ };
  return { metric: m, status: classifyMetricStatus(engineMetric) };
});
// Use metricWithStatus for both recommendation logic and appendix
```

---

### IN-02: `KGradeBadge` chip variant emits two sibling elements with no wrapper — React key warning risk

**File:** `remix-app/app/components/ui/KGradeBadge.tsx:68-95`
**Issue:** The `chip` variant renders a React fragment (`<>...</>`) containing two sibling `<span>` elements. When `KGradeBadge` is used inside a `map()` call (as in `detail.tsx:200` and `index.tsx:172`), the key prop is placed on the wrapping `<div key={k}>` by the callers, not on the fragment. This is correct — the key is on the outer element. However, if `KGradeBadge` chip is ever used directly in a list map without a wrapper `div`, a React key warning will surface. The current callers are all wrapped, so this is not a current bug but a fragile pattern.

**Fix:** No immediate action needed if callers remain wrapped. Document in a JSDoc that the chip variant emits a fragment (two spans) and the key must be on the caller's container.

---

### IN-03: `getGeneticKnowledgeByGene` "first row wins" for multi-pattern genes silently drops rows

**File:** `remix-app/app/lib/corpus.server.ts:97-98`
**Issue:** When a gene has multiple corpus rows with different `genotypePattern` values (e.g., MTHFR has both C677T-het and A1298C-het entries), `getGeneticKnowledgeByGene` keeps only the first row encountered (line 97-98: `if (map[gene]) continue`). The comment acknowledges this: "First row wins (handles multi-pattern genes; engine uses all rows via getVariantMaps)."

This is correct for the engine path (which uses `getVariantMaps`), but the `insights/genetics.tsx` and `dashboard.tsx` loaders use `getGeneticKnowledgeByGene` to drive the display. A subject with MTHFR A1298C-het (but not C677T-het) will see the C677T-het recommendation text for MTHFR in the genetics table because the seed order happens to insert C677T-het first. The display text is therefore potentially mismatched to the subject's actual genotype.

**Fix (complete):** Join `getGeneticKnowledgeByGene` to the subject's actual genotype to select the matching pattern row rather than the first row for the gene. This requires passing `tenantId` and `subjectId` to the function, which would break the current zero-args signature used by three loaders.

**Fix (minimal, no signature change):** Return all rows keyed by `gene/genotypePattern` and let the loaders join on both fields. This is a correctness improvement for multi-pattern genes. The current behavior is an acceptable approximation for a single-subject M1 system where the owner's actual genotype row drives the join, but it will misfire for any subject whose stored genotype doesn't match the first-inserted corpus pattern for a gene.

---

_Reviewed: 2026-06-11T22:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
