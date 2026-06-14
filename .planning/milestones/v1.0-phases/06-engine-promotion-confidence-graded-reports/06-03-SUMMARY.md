---
phase: 06-engine-promotion-confidence-graded-reports
plan: "03"
subsystem: database
tags: [drizzle, neon, postgres, corpus, seed, genetics, vitest]

# Dependency graph
requires:
  - phase: 06-engine-promotion-confidence-graded-reports
    plan: "02"
    provides: "corpus schema (genetic_variants, variant_protocol_map, metric_protocol_map), migration 0009, corpus.server.ts read layer"
provides:
  - "30 variant rules + 22 metric rules seeded to live Neon (CORPUS_VERSION v1.0-owner-2026-06)"
  - "Idempotent seed with check-before-insert for both variant and metric rules"
  - "ROADMAP SC1 content assertions: COUNT(*) WHERE evidence_tier IS NULL = 0 on both mapping tables"
  - "getGeneticKnowledgeByGene() corpus read helper replacing static GENETIC_KNOWLEDGE module"
  - "genetics-knowledge.server.ts retired — 3 loaders re-pointed to corpus"
affects:
  - 06-engine-promotion-confidence-graded-reports (plans 04, 05)
  - any future plan reading corpus tables
  - insights/genetics, insights/index, dashboard routes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "check-before-insert idempotency: SELECT before INSERT when no unique constraint exists on the target table"
    - "corpus read helper returns Record<gene, entry> keyed by gene for O(1) loader join"
    - "protocolAction derived from actionDetail ?? first-sentence of recommendationText (<=140 chars)"

key-files:
  created:
    - remix-app/.planning/phases/06-engine-promotion-confidence-graded-reports/06-03-SUMMARY.md
  modified:
    - remix-app/scripts/seed-corpus.ts
    - remix-app/tests/db/corpus-schema.test.ts
    - remix-app/app/lib/corpus.server.ts
    - remix-app/app/routes/_app/dashboard.tsx
    - remix-app/app/routes/_app/insights/genetics.tsx
    - remix-app/app/routes/_app/insights/index.tsx
  deleted:
    - remix-app/app/lib/genetics-knowledge.server.ts

key-decisions:
  - "check-before-insert for variant rules: genetic_variants has no unique constraint on (gene, genotypePattern) so ON CONFLICT DO NOTHING silently created duplicates — fixed to SELECT before INSERT matching metricRules pattern"
  - "protocolAction derivation: actionDetail when present, else first sentence of recommendationText capped at 140 chars — preserves compact UI display in DataTable and dashboard cards"
  - "confidence cast: corpus returns lowercase k1-k4, loaders cast to ConfidenceLevel (K1-K4) at the flatMap boundary — avoids TypeScript inference requiring a widened corpus interface"

patterns-established:
  - "Corpus read helpers belong in corpus.server.ts, not in route loaders — loaders call getGeneticKnowledgeByGene() the same way they call getSubjectGenotypes()"
  - "Corpus join pattern: Promise.all([...existingQueries, getGeneticKnowledgeByGene()]) then flatMap genotypeRows against the result map"

requirements-completed: []

# Metrics
duration: 35min
completed: 2026-06-11
---

# Phase 06 Plan 03: Corpus Seeded + genetics-knowledge.server.ts Retired

**30 variant rules + 22 metric rules seeded to live Neon with idempotent check-before-insert; ROADMAP SC1 non-null-K assertions green; genetics-knowledge.server.ts deleted and 3 loaders re-pointed to corpus.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-06-11T20:20:00Z
- **Completed:** 2026-06-11T20:55:00Z
- **Tasks:** 3 (Task 1 corpus authoring completed prior; Tasks 2 + 3 executed here)
- **Files modified:** 6 modified, 1 deleted, 1 created

## Accomplishments

- Corpus seeded to live Neon: 30 variant rules across 16 genes (K1×16, K2×31, K3×5) + 22 metric rules covering metabolic, hematology, inflammatory, and autonomic categories
- Fixed idempotency bug in seed script (ON CONFLICT DO NOTHING was silently creating duplicate rows due to missing unique constraint on genetic_variants); second seed run now inserts 0 new rows
- ROADMAP SC1 content assertions added and green: COUNT(*) WHERE evidence_tier IS NULL = 0 on both variant_protocol_map and metric_protocol_map; genetic_variants COUNT > 0
- Retired genetics-knowledge.server.ts (16-gene static module) — 3 loaders now read from corpus via getGeneticKnowledgeByGene(); rendered output shape preserved (confidence/category/impact/clinicalImplication/protocolAction/notes)
- PHI-scrubbed attestation: corpus entries contain no owner-specific lab values, rsid strings, or personally identifying information — all recommendation text is population-level

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft + expand owner-complete corpus** - `4de42fb` / `8ac770b` (feat, prior session)
2. **Task 2: Seed corpus to Neon + non-null-K content assertions** - `e02b966` (feat)
3. **Task 3: Retire genetics-knowledge.server.ts, re-point loaders to corpus** - `37447b8` (refactor)

**Plan metadata:** (this commit — docs)

## Files Created/Modified

- `remix-app/scripts/seed-corpus.ts` - Fixed idempotency: variant rules now use check-before-insert (SELECT before INSERT) matching the metricRules pattern; ON CONFLICT DO NOTHING was insufficient without a unique constraint
- `remix-app/tests/db/corpus-schema.test.ts` - Added 3 content assertions (ROADMAP SC1): evidence_tier IS NOT NULL COUNT = 0 on both mapping tables; genetic_variants row count > 0; all 14 tests pass
- `remix-app/app/lib/corpus.server.ts` - Added CorpusGeneticKnowledgeEntry interface and getGeneticKnowledgeByGene() helper; maps evidenceTier k1→K1, derives protocolAction from actionDetail or first sentence of recommendationText
- `remix-app/app/routes/_app/dashboard.tsx` - Replaced GENETIC_KNOWLEDGE import with getGeneticKnowledgeByGene() in Promise.all
- `remix-app/app/routes/_app/insights/genetics.tsx` - Replaced GENETIC_KNOWLEDGE import with getGeneticKnowledgeByGene(); confidence cast to ConfidenceLevel
- `remix-app/app/routes/_app/insights/index.tsx` - Replaced GENETIC_KNOWLEDGE import with getGeneticKnowledgeByGene(); added ConfidenceLevel type import; confidence cast applied
- `remix-app/app/lib/genetics-knowledge.server.ts` - DELETED (no remaining GENETIC_KNOWLEDGE imports after migration)

## Decisions Made

- **check-before-insert for variant rules**: The genetic_variants table has no unique constraint on (gene, genotypePattern) because the schema uses a generated identity PK. ON CONFLICT DO NOTHING never fires on a PK conflict (different gene rows always get new IDs). Fixed by adopting the same check-before-insert pattern already used for metricRules.

- **protocolAction derivation**: The GENETIC_KNOWLEDGE module had brief action phrases (e.g., "Methylfolate 800mcg"). The corpus stores full evidence paragraphs in recommendationText. Derive: use actionDetail when present (actionDetail is already the short action note), else extract first sentence of recommendationText capped at 140 chars. This preserves the compact display needed by dashboard/insights tables.

- **confidence cast at loader boundary**: The corpus interface returns `string` for confidence (k1-k4 lowercase) and the loaders need `ConfidenceLevel` (K1-K4 uppercase). Rather than widening the corpus type with a union literal, loaders do `knowledge.confidence as ConfidenceLevel` at the flatMap boundary — a minimal cast that doesn't complicate the corpus interface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed idempotency bug in variant rules seed**
- **Found during:** Task 2 (seed corpus to Neon)
- **Issue:** First seed run succeeded (30 variant rules). Second seed run also inserted 30 more variant rules instead of 0, creating 60 rows total. Root cause: genetic_variants has no unique constraint on (gene, genotypePattern), only a PK with generatedAlwaysAsIdentity. The Drizzle `returning()` clause after `insert().values()` does return the inserted row (not a conflict), so `if (!variant)` never fired. ON CONFLICT DO NOTHING had no applicable conflict to trigger.
- **Fix:** Replaced the insert-and-check pattern with SELECT-before-INSERT (same check-before-insert approach already used for metricRules). Cleaned up 30 duplicate rows created in the first two seed runs.
- **Files modified:** remix-app/scripts/seed-corpus.ts
- **Verification:** Third seed run inserted 0 variant rules, 0 metric rules.
- **Committed in:** e02b966 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix. No scope creep. Seed idempotency is a hard requirement (CI re-runs the seed on every deploy).

## Issues Encountered

None beyond the idempotency bug documented above.

## User Setup Required

None - no external service configuration required. Corpus is now live in Neon.

## Next Phase Readiness

- Corpus tables are seeded and verified non-null-K (ROADMAP SC1 green)
- corpus.server.ts read layer is complete: getVariantMaps(), getMetricRules(), getGeneticKnowledgeByGene()
- genetics-knowledge.server.ts is retired — no legacy static knowledge module remains
- Ready for Plan 06-04 (engine.server.ts implementation) which reads corpus via getVariantMaps() + getMetricRules()
- Plan 06-05 (confidence-graded report generation) can proceed once 06-04 engine is in place

---
*Phase: 06-engine-promotion-confidence-graded-reports*
*Completed: 2026-06-11*
