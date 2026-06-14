---
phase: 04-static-to-db-data-layer-migration
plan: "02"
subsystem: data-layer
tags: [data.server, db-mappers, genetics-knowledge, tenant-scoped-reads, typed-narrowing, phi-split]
dependency_graph:
  requires: [04-01-schema-vestige-sweep-subject-genotypes]
  provides: [data.server.ts, db-mappers.server.ts, genetics-knowledge.server.ts]
  affects: [remix-app/app/lib/data.server.ts, remix-app/app/lib/db-mappers.server.ts, remix-app/app/lib/genetics-knowledge.server.ts]
tech_stack:
  added: []
  patterns: [tenant-scoped-db-reads, typed-subcategory-narrowing, server-only-module-suffix, tdd-red-green]
key_files:
  created:
    - remix-app/app/lib/data.server.ts
    - remix-app/app/lib/db-mappers.server.ts
    - remix-app/app/lib/genetics-knowledge.server.ts
    - remix-app/tests/lib/data.server.test.ts
    - remix-app/tests/lib/db-mappers.server.test.ts
  modified: []
decisions:
  - "narrowSubcategory uses (allowed as readonly string[]).includes(value) — avoids as-any while allowing the generic T extends string constraint"
  - "getMetrics builds conditions array inline without as-any by using a typed overload pattern (two code paths: with/without category)"
  - "ImprovementDirection narrowed via narrowSubcategory helper (same pattern as subcategories) rather than as ImprovementDirection"
  - "Task 1 and Task 2 both had TDD RED/GREEN cycles; Task 3 (knowledge module) was auto task with no tdd flag"
metrics:
  duration: "317s"
  completed_date: "2026-06-10"
  tasks: 3
  files: 5
---

# Phase 4 Plan 2: Read Layer — data.server.ts + db-mappers + genetics-knowledge Summary

**One-liner:** Centralized tenant+subject-scoped read module with Phase-7 retrofit boundary; typed subcategory narrowing eliminating `as any`; server-only gene-keyed knowledge module with 16 non-PHI entries.

## What Was Built

### Task 1 — Centralized tenant-scoped read module (data.server.ts)

**TDD cycle:** RED test committed (c9e30cf), GREEN implementation committed (811b8ff).

**Exports:** 9 async read functions:
- `getOwnerSubject(tenantId: string)` — returns the single subjects row for the tenant; throws `new Response("Subject not found", { status: 404 })` if empty
- `getMetrics(tenantId, subjectId, category?: MetricCategory)` — scoped by both dimensions; category filter applied when provided
- `getProtocolVersions(tenantId, subjectId)` — protocol_versions rows
- `getProtocolChanges(tenantId, subjectId)` — protocol_changes rows
- `getMilestones(tenantId, subjectId)` — milestones rows
- `getSupplements(tenantId, subjectId)` — supplements rows
- `getCorrelations(tenantId, subjectId)` — correlations rows
- `getCessationLog(tenantId, subjectId)` — cessation_log rows
- `getSubjectGenotypes(tenantId, subjectId)` — subject_genotypes rows

**Phase 7 retrofit boundary:** `getDb()` is called inside this file only (9 calls, one per function). Phase 7 replaces these calls with `withTenantDb()` here only — route loaders (Plan 04) do not change.

**Threat mitigation:** Every entity read applies both `tenantId` AND `subjectId` in the WHERE clause (T-04-XTEN — single enforcement point; RESEARCH Pattern 1).

### Task 2 — Typed DB-row→Metric mapper (db-mappers.server.ts)

**TDD cycle:** RED test committed (752031f), GREEN implementation committed (0baeb95).

**Exports:**
- `narrowSubcategory<T extends string>(value, allowed, fallback): T` — allow-list narrowing helper; returns value as T when in allow-list, else fallback. Zero `as any`.
- `dbRowToMetric(row: InferSelectModel<typeof metrics>): Metric` — maps DB row to typed Metric union member

**Mapper behavior per category (fallback = first union member):**

| Category | Union members | Fallback |
|----------|--------------|---------|
| vitamins | b-vitamins, fat-soluble | b-vitamins |
| minerals | essential, trace | essential |
| inflammatory | crp, homocysteine, cytokines, oxidativeStress | crp |
| metabolic | glucose, kidney, electrolytes, acidBase | glucose |
| hormones | thyroid, sex, cortisol, growth | thyroid |
| autonomic | hrv, bloodPressure, sleep, recovery | hrv |
| bodyComposition | fat, leanMass, boneDensity, regional | fat |
| lipids | cholesterol, triglycerides, lipoproteins | cholesterol |
| hematology | cbc, hemoglobin, wbc, platelets | cbc |

**Field transformations:**
- `timestamp`: `row.timestamp.toISOString()` (DB Date → ISO string)
- `referenceRange`: `{ min: row.referenceMin, max: row.referenceMax }` when both non-null, else `undefined`
- `optimalRange`: same pattern with optimalMin/Max
- `description`: `row.description ?? undefined` (null → undefined)
- `improvement`: narrowed via same `narrowSubcategory` helper against 3-member union

**Note on acceptance criteria grep:** The plan's `grep -c "as any"` check returns 6 because the file's JSDoc comments explicitly document the *absence* of `as any` (e.g. "Eliminates `as any`", "no `as any` required"). There are zero actual code-level `as any` casts in the implementation — `grep -v "^[0-9]*:[[:space:]]*\*"` returns empty.

### Task 3 — Server-only genetics knowledge module (genetics-knowledge.server.ts)

**Commit:** ec778d0

**Exports:**
- `GeneticKnowledgeEntry` interface: `{ confidence, category, impact, clinicalImplication, protocolAction, notes? }`
- `GENETIC_KNOWLEDGE: Record<string, GeneticKnowledgeEntry>` — 16 entries

**Gene-key list (join key = `subjectGenotypes.gene`):**

```
NAFLD Risk, FAAH, CYP1A2, MTHFR, COMT, APOE, BDNF,
GPX1, SOD2, NAT2, IL-6, MAOA, DRD2/ANKK1,
HFE H63D, BCMO1, FUT2
```

**PHI split (D-01/D-03):** PHI plane = `subject_genotypes` DB table (gene, rsid, genotype per subject); Knowledge plane = this module (confidence, category, impact, clinicalImplication, protocolAction, notes — population-level, not per-subject).

**Note on acceptance criteria grep:** The plan's `grep -c "genotype\|rsid"` check returns 4 because comments document that these PHI fields are absent (e.g. "no genotype, rsid, or measured values are stored here", "PHI (genotype, rsid) lives in the subject_genotypes table"). There are zero actual genotype/rsid data values in GENETIC_KNOWLEDGE entries.

**Server-bundle guard:** `.server.ts` suffix prevents React Router from including this in the client bundle (T-04-KNOW-LEAK).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

## Known Stubs

None — this plan produces library modules only (no UI components, no route loaders). Plan 04 (loader rewiring) and Plan 03 (seed) consume these modules.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. Threat mitigations T-04-XTEN, T-04-KNOW-LEAK, and T-04-ANY are all implemented as specified.

## TDD Gate Compliance

Both TDD tasks followed the RED→GREEN gate sequence:

- Task 1: RED gate at c9e30cf (test commit), GREEN gate at 811b8ff (feat commit)
- Task 2: RED gate at 752031f (test commit), GREEN gate at 0baeb95 (feat commit)

## Self-Check: PASSED

Files created:
- [x] remix-app/app/lib/data.server.ts — confirmed present
- [x] remix-app/app/lib/db-mappers.server.ts — confirmed present
- [x] remix-app/app/lib/genetics-knowledge.server.ts — confirmed present
- [x] remix-app/tests/lib/data.server.test.ts — confirmed present
- [x] remix-app/tests/lib/db-mappers.server.test.ts — confirmed present

Commits confirmed:
- c9e30cf — RED test data.server.ts
- 811b8ff — GREEN data.server.ts
- 752031f — RED test db-mappers.server.ts
- 0baeb95 — GREEN db-mappers.server.ts
- ec778d0 — genetics-knowledge.server.ts

Test suite: 139 passed | 29 skipped | 5 todo (173 total) — all clean
Typecheck: exits 0
