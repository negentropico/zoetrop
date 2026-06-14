# Phase 4: Static-to-DB Data Layer Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 4-static-to-db-data-layer-migration
**Areas discussed:** Genetics + correlations, M0 source-data fate, Schema-cleanup breadth, Cut-over verification

---

## Genetics + correlations

### Q1 — How should genetic variants reach the DB in Phase 4?

| Option | Description | Selected |
|--------|-------------|----------|
| Interim table now | Plain tenant-scoped genetic_variants table mirroring today's flat GeneticVariant type; Phase 6 reshapes it | |
| Explicit Phase 6 exception | Genetics stays in seed-data.ts (server-only) until Phase 6 designs the schema once | |
| Pull ENG-02 forward | Build the full first-class schema in Phase 4 | |
| *(Other — free text)* | "Think more deeply about the goals and presentation for this. Prior system has not been thoroughly methodically designed for use with practitioners and clients, multitenant. This is the core engine work, I want some deeper analysis and adversarial evals" | ✓ |

**User's choice:** Free-text redirect → deeper analysis surfaced the PHI-plane vs knowledge-plane conflation in M0's flat model. Follow-up (plain text): owner chose **"pull subject_genotypes forward into Phase 4, knowledge model waits for Phase 6."**
**Notes:** Produced the binding Phase 6 entry gate (spec-phase + adversarial review before planning the engine data model).

### Q2 — Where does genetics display data (K-grades, protocol actions) live in the interim?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-only knowledge join | subject_genotypes (DB) + server-only knowledge module joined by gene in the loader; module marked "retired by Phase 6" | ✓ |
| Carry display fields in the table | Denormalized columns on subject_genotypes; Phase 6 splits later | |
| Degrade the page | Genotype-only rendering until Phase 6 | |

**User's choice:** Server-only knowledge join (recommended).

### Q3 — Correlations handling?

| Option | Description | Selected |
|--------|-------------|----------|
| Seed into real table | Map 12 seedCorrelations into the existing correlations table (name→FK resolution; significance derived at render) | ✓ |
| Defer with genetics | Correlations stay server-only TS until the engine recomputes them | |

**User's choice:** Seed into real table (recommended).

---

## M0 source-data fate

### Q1 — What happens to the PHI data arrays after seeding?

| Option | Description | Selected |
|--------|-------------|----------|
| Seed, then delete | One-shot seed scripts; PHI arrays deleted after verified cut-over; Neon = single source of truth | ✓ |
| Move to gitignored JSON | Local seed-input files keep re-seed ability; PHI on disk untracked | |
| Keep server-only | Committed server-only module — fails the source half of DATA-04 | |

**User's choice:** Seed, then delete (recommended).

### Q2 — Git history (PHI remains in every commit since M0)?

| Option | Description | Selected |
|--------|-------------|----------|
| Accept history | Private repo, own data; record acceptance; Phase 7 revisits | ✓ (modified) |
| Scrub history in Phase 4 | filter-repo purge + force-push | |

**User's choice:** "1, plus before pilots, we'll shift to new squashed repo" — accept now AND add a pre-pilot gate item: cut over to a new squashed PHI-free repository before any external client.

---

## Schema-cleanup breadth

### Q1 — How broad should the vestige cleanup go?

| Option | Description | Selected |
|--------|-------------|----------|
| Full vestige sweep | DATA-05 + isActive int→boolean + 601/602/603 comment fix + drop NETLIFY_DATABASE_URL preference | ✓ |
| Strict DATA-05 only | Only syncStatus/syncVersion + as-any casts | |
| Sweep + naming/typing audit | Also varchar(36)→text, timestamp audit, etc. | |

**User's choice:** Full vestige sweep (recommended).

---

## Cut-over verification

### Q1 — How rigorously to prove DB-backed loaders match M0 before deleting static files?

| Option | Description | Selected |
|--------|-------------|----------|
| Parity snapshot harness | Pre-deletion loader-output fixtures (gitignored — contain PHI) + Vitest deep-equality suite against live Neon; deletion gated on green + visual check | ✓ |
| Counts + spot assertions | Row counts + known-value checks + visual | |
| Visual spot-check only | SC#2 taken literally | |

**User's choice:** Parity snapshot harness (recommended).

---

## Claude's Discretion

- Data-access layer shape (centralized tenant-scoped query module vs per-loader Drizzle) — must stay `withTenantDb`-wrappable for Phase 7.
- Seed-script structure, idempotency, tenant/subject ID resolution.
- `subject_genotypes` exact columns; CI lint mechanism for `*-data.ts` imports; parity fixture format.

## Deferred Ideas

- Phase 6 entry gate: engine data-model design pass + adversarial review (spec-phase 6 → cross-AI review → plan), `/gsd:ai-integration-phase` if LLM curation enters scope.
- Phase 7 gate addition: new squashed PHI-free repository before any external client.
- Phase 5: import-route persistence (WHOOP/vault → DB).
- Phase 6: correlation re-computation from live data.
