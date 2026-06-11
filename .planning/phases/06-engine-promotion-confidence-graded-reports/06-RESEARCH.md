# Phase 6: Engine Promotion + Confidence-Graded Reports — Research

**Researched:** 2026-06-11
**Domain:** TypeScript pure-function extraction, Drizzle schema design, evidence-tiered knowledge corpus, report generation pipeline
**Confidence:** HIGH (all findings grounded in direct codebase reads + official source patterns established in prior phases)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `app/lib/engine.server.ts` — pure, dependency-free (zero Drizzle/Remix imports); hosts `classifyMetricStatus`, `getCessationPhase`, `computePearson`, `mapVariantToProtocol`. `.server.ts` suffix is bundle-hygiene only. Existing call sites re-point; behavior must be identical.
- **D-02:** `vitest run` covers all engine functions against DB-seeded data and synthetic inputs.
- **D-03:** `geneticVariants` + `variantProtocolMap` become first-class Neon tables. Rules fire on actual subject genotype (COMT Val/Met ≠ Met/Met). `variantProtocolMap` edges encode genotype pattern.
- **D-04:** Add a metric→protocol rule layer (lab analog of `variantProtocolMap`). Planner decides table-vs-map shape. Both carry evidence-tier K.
- **D-05:** New K-confidence enum (`k1|k2|k3|k4`), non-nullable, distinct name from existing `confidenceLevelEnum` (`'high'|'low'`). Migration discipline: `db:generate` → reviewed → `db:migrate`.
- **D-06:** PHI stays in `subject_genotypes`/`metrics`. Promoted tables hold non-PHI population-level knowledge. `genetics-knowledge.server.ts` (16-entry interim) is retired by corpus.
- **D-07:** Visible K = evidence tier of finding→action link (external/published evidence strength), NOT measurement certainty or clinical judgment. Grounded in recognized framework. Current detection-oriented `CONFIDENCE_LEVELS` labels redefined as evidence tiers.
- **D-08:** Both metric→protocol rules and variant→protocol mappings carry their own evidence-tier K.
- **D-09:** Two confidence axes. Visible K = evidence tier. Genotype detection-confidence (verified vs inferred) = secondary annotation (badge/flag), not headline.
- **D-10:** Corpus authored from scratch, owner-complete (covers owner's real reports), not exhaustive population reference.
- **D-11:** Corpus LLM-assisted-extracted from owner's PDFs at authoring/build time. Non-PHI knowledge → repo corpus/DB tables; PHI → DB. PDFs in vault, never committed.
- **D-12:** Corpus/engine source-agnostic — a "finding" can originate from any diagnostic source.
- **D-13:** Deterministic runtime language. Report body assembled from pre-written corpus text + locked `"K{N} ({label}): {text}"` template. No LLM in runtime path.
- **D-14:** Grouped by body system / category using existing `CATEGORY_INFO` + `VARIANT_CATEGORIES`.
- **D-15:** Flagged-in-body, full-data-available. Actionable items in body; complete panel in appendix.
- **D-16:** Report inputs = all already-committed metric categories + genetics.
- **D-17:** `reports` row = frozen versioned snapshot (inputs + engine output + corpus version). `/reports/:id` renders unchanged. Re-generate = new row.
- **D-18:** `assertSubjectAccess` MUST be called on report generate AND read paths. Report generation is role-gated (practitioner/owner).
- **D-19:** TS strict / no `any`. LLM = extraction/drafting + human review. K1–K4 first-class, visible in schema and UI.

### Claude's Discretion

- Exact module/file layout for the engine and corpus
- Whether genetic + metric rules share one `protocolMap` table or use two
- Corpus storage shape (DB table vs typed module)
- `reports` snapshot JSON shape and corpus-version stamp mechanism
- Report appendix/expandable UX against Phase 4.1 `UI-SPEC.md`
- The K-tier rubric's precise boundaries

### Deferred Ideas (OUT OF SCOPE)

- Subject self-onboarding / self-import of reports
- Additional genetic vendors beyond owner's reports
- DUTCH hormone panel ingest
- HTMA mineral analysis ingest
- Structured Function Health lab ingest
- WHOOP full-data integration + DEXA report auto-ingest
- Report PDF/print export & sharing
- Exhaustive population-level corpus
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENG-01 | Pure, dependency-free engine module callable outside route loaders | Engine extraction analysis (§Engine Extraction) + import-purity test recommendation |
| ENG-02 | Genetic variants + mappings as first-class tables with non-nullable K1–K4 confidence + evidence/citation | Schema design (§Schema Design) + K1–K4 rubric (§Evidence-Tier Rubric) |
| ENG-03 | Engine derives confidence-graded protocol from subject metrics + variants | `mapVariantToProtocol` + metric rule eval design (§Engine Design) |
| RPT-01 | Practitioner can generate confidence-graded lab→protocol report for a subject | Report pipeline design (§Report Pipeline) |
| RPT-02 | Every recommendation shows K1–K4 in visible body, not tooltip | UI contract from 06-UI-SPEC.md + `RecommendationBlock` pattern |
| RPT-03 | Hedged language; K4 carries explicit disclaimer; lint test asserts no imperatives | Guardrail lint design (§Guardrail Lint) |
</phase_requirements>

---

## Summary

Phase 6 delivers the M1 proof slice: a pure engine module, first-class genetics schema with non-nullable K1–K4 evidence-tier confidence, and a deterministic report that surfaces graded recommendations in-body. The research is grounded entirely in the actual codebase — no assumptions about stack or patterns are needed because the prior five phases established all the patterns this phase follows.

The three functions to extract (`getMetricStatus`, `getCessationDay`/`getCurrentCessationPhase`, `calculatePearsonCorrelation`) currently live in `app/lib/metrics.ts`, `app/lib/protocol-data.ts`, and `app/lib/correlations.ts`. They are already effectively pure — `metrics.ts` and `correlations.ts` have zero non-stdlib imports; `protocol-data.ts` imports only `date-fns` (a pure computation library, not Drizzle or Remix). The engine extraction is primarily a re-export/rename exercise with one meaningful decision: whether `date-fns` is acceptable in an "engine" module or should be replaced with native `Date` arithmetic.

The schema design for `geneticVariants`, `variantProtocolMap`, and a new `metricProtocolMap` (metric rule layer) follows the Drizzle table conventions already established in `db/schema.ts` (lines 1–364). The only new enum to introduce is `evidenceTierEnum` with values `k1|k2|k3|k4` — distinct from the existing `confidenceLevelEnum` (`'high'|'low'`) which is lab-extraction grounding confidence from Phase 5.

The report pipeline is: read committed metrics + genotypes (via `data.server.ts`) → engine evaluates each against corpus rules → assembles graded recommendation set → freezes JSON snapshot → writes `reports` row → `/reports/:id` renders deterministically. No LLM touches this path.

**Primary recommendation:** Two-table corpus design (genetic and metric rules are separate tables — `variantProtocolMap` and `metricProtocolMap`). The engine module is named `engine.ts` (not `engine.server.ts`) to maximize import purity — the `.server.ts` suffix is reserved for modules that legitimately depend on server-only code; the engine has none. Corpus versioning uses a simple string constant stamped into the snapshot JSON.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Engine logic (classify, cessation, Pearson, variant map) | API / Backend (pure TS module) | — | Pure functions; no browser, no Remix context |
| Corpus (knowledge rules + evidence text) | API / Backend (DB tables + seed) | — | Non-PHI population knowledge, not per-subject PHI |
| Report generation trigger | API / Backend (route action) | Browser (form submit) | Action writes to DB; browser submits form |
| Report snapshot storage | Database / Storage (Neon `reports` table) | — | Frozen JSON + tenant/subject scope |
| Report render | Frontend Server (SSR loader) | Browser (React hydration) | Loader reads snapshot row; renders deterministically |
| Subject PHI (genotypes, metrics) | Database / Storage | — | Existing `subject_genotypes` + `metrics` tables — unchanged |
| Auth / access gate | API / Backend (authz.server.ts) | — | `requireUser` + `requireRole` + `assertSubjectAccess` |
| Corpus authoring / LLM extraction | Build-time tooling (script) | — | Run once at authoring time; NOT in the runtime report path |
| Nav extension (Reports entry) | Frontend Server (shell component) | — | `nav-tree.ts` + `AppShell` update |
| K-grade badge + recommendation block | Browser (React components) | — | `KGradeBadge`, `RecommendationBlock`, `DisclaimerCallout` |

---

## Standard Stack

No new packages are required for this phase. All needed libraries are already installed.

### Confirmed Existing Dependencies

| Library | Version (installed) | Purpose in Phase 6 | Source |
|---------|---------------------|---------------------|--------|
| `date-fns` | 4.4.0 | `getCessationPhase` — `differenceInDays`, `parseISO` | `package.json` |
| `drizzle-orm` | 0.45.1 | New schema tables + query layer | `package.json` |
| `drizzle-kit` | 0.31.8 | `db:generate` / `db:migrate` migration discipline | `package.json` |
| `vitest` | 4.1.8 | Engine unit tests (existing harness) | `package.json` devDeps |
| `crypto.randomUUID()` | Node built-in (v25.6.0) | `reports` row ID generation | codebase pattern: `upload.tsx:122`, `invites.server.ts:108` |

### No New Packages

The engine extraction is pure TypeScript with only `date-fns` as a non-stdlib dependency (already installed). Schema additions use the existing Drizzle setup. Report routes follow the established `_app/` layout pattern.

---

## Package Legitimacy Audit

> Phase 6 installs **zero new packages**. All libraries used are already in `package.json` and were verified in prior phases. No new packages are introduced.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| (none new) | — | — | No additions |

**Packages removed due to slopcheck:** None — no new packages introduced.

*slopcheck was unavailable at research time; however, since no new packages are installed, this section is not applicable.*

---

## Architecture Patterns

### System Architecture Diagram

```
                      BUILD TIME (corpus authoring)
┌─────────────────────────────────────────────────────────────────┐
│  Owner PDFs (vault, never committed)                            │
│    ↓ LLM extraction (Anthropic) + human review                  │
│  Corpus authoring output:                                        │
│    genetic_variants rows (gene, rsid, genotype_pattern, ...)     │
│    variant_protocol_map rows (finding → action, evidence, K)     │
│    metric_protocol_map rows (metric name + status → action, K)   │
│    ↓  db:seed-corpus script  ↓                                   │
│  Neon (corpus tables — non-PHI population knowledge)            │
└─────────────────────────────────────────────────────────────────┘

                      RUNTIME (report generation)
User (practitioner/owner) → POST /reports/generate
  ↓ requireUser + requireRole(['practitioner','owner'])
  ↓ assertSubjectAccess(user, subject, userTenantId)
  ↓
data.server.ts
  ├── getMetrics(tenantId, subjectId)          → Metric[]
  └── getSubjectGenotypes(tenantId, subjectId) → SubjectGenotype[]
  ↓
Corpus queries (non-PHI)
  ├── variantProtocolMap WHERE genotype_pattern matches subject genotype
  └── metricProtocolMap WHERE metric_name + condition_status matches
  ↓
engine.ts (pure functions — zero Drizzle/Remix imports)
  ├── classifyMetricStatus(metric)     → 'optimal'|'borderline'|'deficient'|'excess'
  ├── getCessationPhase(startIso, now) → CessationPhase
  ├── computePearson(x[], y[])         → number
  └── mapVariantToProtocol(genotypes, variantMaps) → GradedRecommendation[]
  ↓
Report assembler (deterministic, no LLM)
  Assembles: "K{N} ({label}): {corpus recommendation text}"
  Produces:  ReportSnapshot (typed JSON)
  ↓
DB write: reports table (tenantId, subjectId, snapshotJson, corpusVersion, ...)
  ↓
Redirect → /reports/:id
  ↓ loader reads reports row → renders frozen snapshot

/reports/:id render (SSR + React hydration)
  PageHeader → ReportSummaryCard → CategorySection[]
    → RecommendationBlock[] (KGradeBadge + DisclaimerCallout for K4)
    → AppendixDisclosure → AppendixPanel
```

### Recommended Project Structure — Phase 6 additions

```
remix-app/
├── app/
│   ├── lib/
│   │   ├── engine.ts                    # NEW: pure engine (no .server.ts suffix — see §Engine Purity)
│   │   ├── corpus.server.ts             # NEW: corpus read helpers (queries geneticVariants/variantProtocolMap/metricProtocolMap)
│   │   ├── report-generator.server.ts   # NEW: assembles ReportSnapshot from engine output + corpus text
│   │   ├── data.server.ts               # EXTENDED: add getVariantMaps, getMetricRules read fns
│   │   ├── metrics.ts                   # MODIFIED: re-export classifyMetricStatus from engine.ts
│   │   ├── cessation.ts                 # MODIFIED: re-export getCessationPhase from engine.ts
│   │   ├── correlations.ts              # MODIFIED: re-export computePearson from engine.ts
│   │   └── genetics-knowledge.server.ts # RETIRED: deleted once corpus is seeded
│   ├── types/
│   │   ├── genetics.ts                  # MODIFIED: CONFIDENCE_LEVELS relabeled (D-07); no new types
│   │   └── report.ts                    # NEW: ReportSnapshot, GradedRecommendation, CorpusVersion types
│   ├── components/
│   │   └── ui/
│   │       ├── KGradeBadge.tsx          # NEW (UI-SPEC Pattern 1)
│   │       ├── RecommendationBlock.tsx  # NEW (UI-SPEC Pattern 2)
│   │       └── DisclaimerCallout.tsx    # NEW (UI-SPEC Pattern 3)
│   └── routes/
│       └── _app/
│           └── reports/                 # NEW section
│               ├── index.tsx            # /reports — list
│               ├── generate.tsx         # /reports/generate — generation trigger
│               └── detail.tsx           # /reports/:id — frozen snapshot render
├── db/
│   └── schema.ts                        # EXTENDED: evidenceTierEnum + 4 new tables
├── scripts/
│   └── seed-corpus.ts                   # NEW: idempotent corpus seed script (mirrors seed-analyte-dictionary.ts)
└── tests/
    └── lib/
        └── engine.test.ts               # NEW: comprehensive engine + corpus unit tests
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Already the project pattern (upload.tsx:122, invites.server.ts:108); Node built-in; no dep |
| Date arithmetic | Manual ms arithmetic | `date-fns` `differenceInDays`/`parseISO` | Already in `protocol-data.ts`; tested; handles DST correctly |
| Drizzle migration | Hand-crafting SQL | `npm run db:generate` → review → `npm run db:migrate` | DATA-03 discipline; already enforced across 8 migrations |
| Engine type narrowing | `as any` | Discriminated union + allow-list pattern from `db-mappers.server.ts` | PRINCIPLES: strict/no-any; established pattern |
| Imperative lint | Regex in report render | Vitest test over corpus seed data | Lint-clean-by-construction — test the source, not every render |
| K4 disclaimer text | Editable in corpus | Hard-coded in `DisclaimerCallout.tsx` | ROADMAP SC5 locks the string; zero props on component |
| Snapshot diffing | Build a diff engine | New row per generation | D-17: new row IS the diff mechanism; compare via two `/reports/:id` |

---

## Focus Question Answers

### 1. Engine Purity (ENG-01/D-01)

**Suffix decision: Use `engine.ts`, not `engine.server.ts`.**

The `.server.ts` suffix is a React Router/Vite bundle-hygiene convention that prevents client bundle inclusion. The engine has zero browser-incompatible code — no `process.env`, no Drizzle imports, no `Request`/`Response`, no file system. Using `.server.ts` would be misleading AND creates a practical test problem: importing a `.server.ts` file from a Vitest test that runs in a Node environment works fine in the Vitest harness as configured (`environment: "node"`, `isTest` check drops the `reactRouter()` plugin — see `vite.config.ts:12-13`). However, naming it `engine.ts` is cleaner because:
1. It is genuinely portable (could run in a browser Web Worker if needed)
2. It signals "pure module" more accurately than the server-only suffix
3. The import-purity test can be written more simply against `engine.ts`

**Existing function inventory and what changes:**

| Current location | Current name | Engine name | Imports to drop |
|-----------------|-------------|-------------|-----------------|
| `app/lib/metrics.ts:72` | `getMetricStatus(metric: Metric): MetricStatus` | `classifyMetricStatus` | None — already pure (only imports from `~/types/metrics`) |
| `app/lib/protocol-data.ts:35` | `getCessationDay(startDateIso, now?)` | Keep as `getCessationDay` | `date-fns` stays — acceptable (pure computation) |
| `app/lib/protocol-data.ts:43` | `getCurrentCessationPhase(day)` | `getCessationPhase(day)` | `~/types/protocol` stays (pure constant) |
| `app/lib/correlations.ts:15` | `calculatePearsonCorrelation(x, y)` | `computePearson(x, y)` | None — already import-free |
| (new) | — | `mapVariantToProtocol(genotypes, maps)` | Pure — no DB access |

**`date-fns` is acceptable in the engine.** It is a pure computation library with no Drizzle/Remix/server dependencies. D-01 prohibits "Drizzle or Remix imports" specifically. `date-fns` v4.4.0 is already a project dependency, handles DST/timezone edge cases correctly, and is used in the existing cessation tests that must remain green.

**Import-purity test approach:** Write a Vitest test that:
1. Imports `engine.ts` and checks for absence of Drizzle and Remix module references
2. The most reliable method is a static import check — Node can import `engine.ts` via `tsx` without a server context. If the module loads without error in a plain Vitest node environment (which it will, since the test harness already strips `reactRouter()`), import purity is proven at runtime.
3. Additionally: add an ESLint rule mirroring the existing `no-restricted-imports` gate (which blocks `*-data.ts` in routes) — add engine.ts to the "allowed" side and add a rule that flags `drizzle-orm`, `react-router`, `@react-router/`, `@neondatabase/` if imported from `engine.ts`.

**Behavior preservation:** The existing test files (`app/lib/metrics.test.ts`, `app/lib/protocol-data.test.ts`, `app/lib/seed-data.test.ts`) test the current functions. After extraction, update those test imports to point at `engine.ts` — if they stay green, behavior is preserved by definition.

**Call site re-pointing pattern:**
```typescript
// app/lib/metrics.ts — after extraction
export { classifyMetricStatus as getMetricStatus } from "./engine";
// keeps existing import paths green for any remaining callers
```

### 2. Evidence-Tier Rubric (ENG-02/D-07)

**Recommendation: Use Oxford CEBM Levels of Evidence (2011), mapped to K1–K4.**

Rationale over GRADE: GRADE is designed for population-level clinical guideline development with complex committees. Oxford CEBM is a simpler, four-tier hierarchy that maps naturally to the four K levels and is designed to grade individual study findings — which is what a practitioner-focused tool like this needs. The locked K4 wording ("speculative") maps precisely to CEBM Level 5 (expert opinion). The UI-SPEC already defines the four labels (Established/Probable/Emerging/Speculative) — these map directly.

**K1–K4 Rubric Table:**

| K Level | Evidence Tier Label | Oxford CEBM Equivalent | Boundary Definition | Authoring Test |
|---------|---------------------|------------------------|---------------------|----------------|
| K1 | ESTABLISHED | Level 1–2 (SR/RCT or high-quality cohort) | Multiple peer-reviewed RCTs or a systematic review/meta-analysis directly supporting this specific finding→action link. The intervention is the stated action, not a related one. | "Can I cite ≥2 RCTs or a Cochrane/SR that specifically studied this supplement/action for this gene variant or metric deviation?" |
| K2 | PROBABLE | Level 2–3 (single RCT, cohort, or case-control) | At least one well-designed clinical trial OR multiple consistent observational studies OR strong mechanistic evidence in humans (not just animal data). | "Is there ≥1 RCT or ≥2 consistent observational human studies, OR compelling mechanistic evidence in human subjects?" |
| K3 | EMERGING | Level 3–4 (case series, mechanistic, animal) | Preliminary human studies, consistent animal/in-vitro mechanistic data, or expert consensus from functional medicine organizations (IFM, etc.) without RCT backing. | "Is the finding biologically plausible with some (but limited) human evidence, or supported by expert consensus only?" |
| K4 | SPECULATIVE | Level 5 (expert opinion, case reports, theory) | Expert opinion, single case reports, or purely theoretical mechanistic reasoning. The finding→action link is clinically unproven. Includes SelfDecode-specific "based on your score" recommendations with no cited study. | "Is this based solely on the vendor report's interpretation, a theoretical mechanism, or a single case report?" |

**Critical distinction (D-07):** The K grades the **finding→action evidence link**, NOT:
- The measurement certainty (whether a lab value is accurate)
- The genotype detection confidence (whether the genotype is correctly called — that's the secondary `detectionConfidence` annotation)
- The clinical judgment of the practitioner
- The quality of the PDF source

**Example authoring decisions:**
- MTHFR C677T heterozygous → methylfolate supplementation: **K1** (multiple RCTs demonstrate folate metabolism impairment and methylfolate supplementation efficacy)
- COMT Val/Met → limit methyl donors: **K2** (mechanistic studies + observational; the dosing specifics have limited RCT backing)
- FAAH variant → 120+ day cessation: **K3** (biologically plausible based on FAAH enzyme kinetics; limited human RCT data on exact duration)
- Specific SelfDecode "wellness score" → supplement X: **K4** (vendor-proprietary model, not independently reproduced)

**Reconciliation with locked K4 wording:** "This recommendation is speculative (limited evidence)" — the word "speculative" maps cleanly to Oxford CEBM Level 5 (expert opinion / theoretical). No conflict.

**Relabeling `CONFIDENCE_LEVELS` in `genetics.ts`** (D-07): The current labels (`Confirmed`, `Likely`, `Inferred`, `Requires Testing`) describe *genotype detection confidence*, not evidence strength. They must be replaced with the evidence-tier labels. The `color` field should be removed in favor of CSS variables defined in the UI-SPEC (KGradeBadge uses token-based colors, not Tailwind class strings). Migration: update `CONFIDENCE_LEVELS` record in `app/types/genetics.ts` — the key type `ConfidenceLevel` (`'K1'|'K2'|'K3'|'K4'`) stays unchanged.

### 3. Schema Design (ENG-02/D-03/D-04/D-05)

**Recommendation: Two separate corpus tables (`variantProtocolMap` and `metricProtocolMap`), linked through `geneticVariants`, all using `evidenceTierEnum`.**

**Why two tables, not one unified `protocolMap`:**
- Genetic rule edges have genotype-pattern specificity (COMT Val/Met ≠ Met/Met, D-03) — a field that is meaningless for metric rules
- Metric rules trigger on `(metricName, conditionStatus)` — a field meaningless for variant rules
- Separate tables keep queries simple and type-safe; no nullable discriminator columns
- The report grouping (D-14) is by category/body system — both tables carry a `category` field for grouping, so the report assembler can query each independently and merge by category

**New enum (D-05):** `evidenceTierEnum` — distinct from `confidenceLevelEnum` (`'high'|'low'`, Phase 5 lab extraction grounding confidence). Name chosen to be self-documenting and collision-free.

**Drizzle Schema Sketch:**

```typescript
// In db/schema.ts — append after existing tables

// New enum: evidence tier (K1-K4) — DISTINCT from confidenceLevelEnum ('high'|'low')
export const evidenceTierEnum = pgEnum('evidence_tier', ['k1', 'k2', 'k3', 'k4']);

// geneticVariants — corpus table for population-level gene/variant knowledge
// Non-PHI. PHI (subject's actual genotype/rsid) stays in subject_genotypes.
// join key: gene (case-sensitive, matches subject_genotypes.gene)
export const geneticVariants = pgTable('genetic_variants', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  gene: varchar('gene', { length: 100 }).notNull(),
  rsid: varchar('rsid', { length: 20 }),            // canonical rsid if known
  // Genotype pattern: the specific allele combo this entry applies to
  // e.g. 'Val/Met', 'Met/Met', 'C677T het', 'A/G'
  // Matching logic: engine compares subject_genotypes.genotype against this field
  genotypePattern: varchar('genotype_pattern', { length: 50 }),
  category: varchar('category', { length: 50 }).notNull(), // matches VariantCategory
  impact: varchar('impact', { length: 50 }).notNull(),     // 'high'|'moderate'|'low'|'informational'
  clinicalImplication: text('clinical_implication').notNull(),
  // Non-PHI knowledge source (e.g. 'PureInsights 2024', 'SelfDecode brain report')
  // NOT the subject's genotype assay source — that is in subject_genotypes.assaySource
  knowledgeSource: varchar('knowledge_source', { length: 255 }),
  corpusVersion: varchar('corpus_version', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_genetic_variants_gene').on(t.gene),
]);

// variantProtocolMap — evidence-tiered finding→action edges for genetic variants
// One row per (variant, genotype pattern, action). Non-PHI.
export const variantProtocolMap = pgTable('variant_protocol_map', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  variantId: integer('variant_id').notNull().references(() => geneticVariants.id),
  // Evidence tier — non-nullable (ROADMAP SC1, D-05)
  evidenceTier: evidenceTierEnum('evidence_tier').notNull(),
  // Pre-hedged, non-imperative recommendation text (authored once in corpus)
  // Assembled at render time as: "K{N} ({label}): {recommendationText}"
  recommendationText: text('recommendation_text').notNull(),
  // Evidence citation (DOI, SR title, or "Expert consensus: IFM 2023")
  evidenceCitation: text('evidence_citation'),
  // Optional: supplementary action details (dose, timing) stored separately
  // from the recommendation text so the text stays hedged
  actionDetail: text('action_detail'),
  corpusVersion: varchar('corpus_version', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_variant_protocol_map_variant').on(t.variantId),
  index('idx_variant_protocol_map_tier').on(t.evidenceTier),
]);

// metricProtocolMap — evidence-tiered finding→action edges for lab/metric findings
// Non-PHI. Triggered when a subject's metric is in a non-optimal condition.
export const metricProtocolMap = pgTable('metric_protocol_map', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  // Trigger condition: metric name + status combination
  // metricName matches metrics.name (the canonical name used in the DB)
  metricName: varchar('metric_name', { length: 255 }).notNull(),
  // conditionStatus: which status values trigger this rule
  // 'deficient'|'excess'|'borderline'|'any_non_optimal'
  conditionStatus: varchar('condition_status', { length: 50 }).notNull(),
  category: metricCategoryEnum('category').notNull(), // for report grouping by body system
  evidenceTier: evidenceTierEnum('evidence_tier').notNull(), // non-nullable
  recommendationText: text('recommendation_text').notNull(),
  evidenceCitation: text('evidence_citation'),
  actionDetail: text('action_detail'),
  corpusVersion: varchar('corpus_version', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_metric_protocol_map_name').on(t.metricName),
  index('idx_metric_protocol_map_category').on(t.category),
]);

// reports — frozen versioned snapshot per subject report generation
// tenantId/subjectId scoped (PHI-adjacent: links to a subject). Snapshot is JSON.
export const reports = pgTable('reports', {
  id: text('id').primaryKey(),                     // crypto.randomUUID()
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  generatedBy: text('generated_by').notNull().references(() => user.id),
  corpusVersion: varchar('corpus_version', { length: 50 }).notNull(),
  // The frozen snapshot — typed as ReportSnapshot (see app/types/report.ts)
  // Contains: inputs summary + graded recommendations + metadata. No raw PHI values.
  snapshot: jsonb('snapshot').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_reports_tenant_subject').on(t.tenantId, t.subjectId),
  index('idx_reports_created_at').on(t.createdAt),
]);
```

**PHI boundary enforcement (D-06):**
- `geneticVariants`, `variantProtocolMap`, `metricProtocolMap` have NO `tenantId`/`subjectId` — they are non-PHI population knowledge shared across all subjects
- `reports` has `tenantId`/`subjectId` because it links a snapshot to a subject (PHI-adjacent)
- The snapshot JSON stores recommendation texts and K levels, but NOT raw metric values or rsid/genotype strings — those are re-read from source tables at generate time and not persisted in the snapshot (see §Snapshot Shape)

**Genotype pattern matching (D-03):** The `variantProtocolMap` is linked via `geneticVariants.genotypePattern`. The engine function `mapVariantToProtocol` joins subject genotypes to corpus variants by `gene` + genotype matching. Matching strategy:
1. Exact match on `genotypePattern` (e.g., subject has `Val/Met`, corpus entry has `Val/Met`)
2. If no exact match, fall through to a wildcard entry where `genotypePattern IS NULL` (the gene-level fallback for entries that apply to any variant)
3. The engine returns all matching rules for a subject's genotype set

**Migration number:** This phase adds migration 0009 (after the Phase 5 `0008_reflective_celestials.sql` which added collection-date + dedup). The enum addition (`evidence_tier`) must use `ALTER TYPE ... ADD VALUE` outside a transaction (established Pitfall 3 pattern from Phase 5).

### 4. Corpus Build-Time Extraction (ENG-02/D-10/D-11/D-12)

**Recommended corpus workflow:**

```
Authoring session (owner + Claude):
1. Read owner's PDF reports (PureInsights + 8 SelfDecode topic + labs)
   - These live in vault: /Users/mac/vaults/#Bwell/... (never committed)
2. LLM extracts: gene/variant findings + clinical implications + actions
   Prompt structure mirrors Phase 5 extraction.server.ts tool-use pattern:
   - Tool: "extract_corpus_entry" with strict schema (additionalProperties:false)
   - Output fields: gene, genotypePattern, category, clinicalImplication,
     recommendationText, evidenceTier, evidenceCitation, knowledgeSource
3. Human review: owner + practitioner review each extracted entry
   - Apply the K1–K4 rubric (§Evidence-Tier Rubric) to each finding→action link
   - Rewrite any imperative language ("Take X" → "Consider supporting X with Y")
   - Verify evidenceCitation is real (DOI or named SR/guideline)
4. Output: a typed corpus JSON file or direct seed script
```

**Corpus storage shape:** Both approaches (typed TS module AND DB seed) are needed:
- **DB tables** (`geneticVariants`, `variantProtocolMap`, `metricProtocolMap`) are required by ROADMAP SC1 ("first-class tables")
- **Typed seed script** (`scripts/seed-corpus.ts`) is the vehicle that populates the DB, mirroring the existing `scripts/seed-analyte-dictionary.ts` pattern
- There is NO separate in-memory TS corpus module for runtime use — the engine reads from DB at report generation time (via `corpus.server.ts` read helpers)

**Corpus version stamp mechanism (D-17):** A simple string constant defined once:
```typescript
// app/lib/corpus.server.ts
export const CORPUS_VERSION = "v1.0-owner-2026-06" as const;
```
This constant is:
- Stored in `geneticVariants.corpusVersion`, `variantProtocolMap.corpusVersion`, `metricProtocolMap.corpusVersion` at seed time
- Written into `reports.corpusVersion` at report generation time
- Displayed in the report footer as "Corpus version: v1.0-owner-2026-06 · Generated {date}"
- Bumped manually (to `v1.1-...`, `v2.0-...`, etc.) whenever corpus entries are added/edited and re-seeded

**Source-agnostic design (D-12):** The `metricProtocolMap.category` uses `metricCategoryEnum` (the existing 9 categories). Future DUTCH/HTMA sources would add entries to the same tables with the appropriate category. The `geneticVariants.knowledgeSource` field is a free varchar (not a constrained enum) so future sources (Function Health, additional vendors) slot in as new seed entries — no schema change.

**Corpus authoring scope for Phase 6 (owner-complete, D-10):**
- 16 genes from `GENETIC_KNOWLEDGE` in `genetics-knowledge.server.ts` — each entry needs: genotype-pattern specificity, evidence-tier K, hedged recommendation text, citation
- Metric protocol rules covering: non-optimal findings from the owner's existing committed metrics (from `getMetrics` — the Phase 4 data layer already has these). Focus on metrics in `borderline`, `deficient`, or `excess` status for the owner's data.
- Estimated corpus size: ~30–50 variant→protocol edges + ~20–30 metric→protocol edges for the owner-complete scope.

### 5. Report Generation + Frozen Snapshot (RPT-01/D-13/D-17)

**Generate→Freeze→Store→Render path:**

```typescript
// Pseudocode for report-generator.server.ts

export async function generateReport(
  tenantId: string,
  subjectId: string,
  generatedBy: string // userId
): Promise<string> { // returns report ID
  
  // 1. Read subject data (PHI — scoped by tenant/subject)
  const metrics = await getMetrics(tenantId, subjectId);
  const genotypes = await getSubjectGenotypes(tenantId, subjectId);
  
  // 2. Read corpus rules (non-PHI)
  const variantMaps = await getVariantMaps(); // all variantProtocolMap rows with variant info
  const metricRules = await getMetricRules();  // all metricProtocolMap rows
  
  // 3. Engine evaluation (pure — no DB calls inside)
  const metricRecommendations: GradedRecommendation[] = [];
  for (const metric of metrics) {
    const status = classifyMetricStatus(metric); // from engine.ts
    if (status !== 'optimal') {
      const rules = metricRules.filter(r =>
        r.metricName === metric.name &&
        (r.conditionStatus === status || r.conditionStatus === 'any_non_optimal')
      );
      metricRecommendations.push(...rules.map(r => toGradedRec(r, metric, status)));
    }
  }
  
  const variantRecommendations: GradedRecommendation[] = mapVariantToProtocol(
    genotypes, variantMaps  // from engine.ts
  );
  
  // 4. Assemble snapshot (no PHI metric values in the snapshot body)
  const snapshot: ReportSnapshot = {
    schemaVersion: 1,
    corpusVersion: CORPUS_VERSION,
    generatedAt: new Date().toISOString(),
    subjectId,         // ID only, not name/PHI
    tenantId,          // ID only
    inputSummary: {
      metricCount: metrics.length,
      genotypeCount: genotypes.length,
      flaggedMetricCount: metricRecommendations.length,
    },
    recommendations: [...metricRecommendations, ...variantRecommendations],
    // Appendix: metric status summary (name + status, NOT raw values)
    appendix: {
      metricStatuses: metrics.map(m => ({
        name: m.name,
        category: m.category,
        status: classifyMetricStatus(m),
        unit: m.unit,
        value: m.value,          // value IS stored — needed for the appendix panel display
      })),
      genotypeList: genotypes.map(g => ({
        gene: g.gene,
        genotype: g.genotype,
        assaySource: g.assaySource,
      })),
    },
  };
  
  // 5. Write report row
  const reportId = crypto.randomUUID();
  await db.insert(reports).values({
    id: reportId,
    tenantId,
    subjectId,
    generatedBy,
    corpusVersion: CORPUS_VERSION,
    snapshot,
    createdAt: new Date(),
  });
  
  return reportId;
}
```

**Snapshot JSON shape (typed, `app/types/report.ts`):**

```typescript
export interface GradedRecommendation {
  id: string;                          // source row ID (variantProtocolMap.id or metricProtocolMap.id)
  source: 'variant' | 'metric';
  category: string;                    // for grouping by body system in the report
  evidenceTier: 'k1' | 'k2' | 'k3' | 'k4';
  recommendationText: string;          // corpus text (no template prefix — UI assembles)
  evidenceCitation?: string;
  // Source context (used in RecommendationBlock header)
  sourceContext: {
    // For variant-sourced:
    gene?: string;
    genotype?: string;
    detectionConfidence?: 'verified' | 'inferred'; // D-09 secondary annotation
    // For metric-sourced:
    metricName?: string;
    metricStatus?: 'optimal' | 'borderline' | 'deficient' | 'excess';
    metricValue?: number;
    metricUnit?: string;
  };
}

export interface ReportSnapshot {
  schemaVersion: 1;                    // bump when snapshot shape changes
  corpusVersion: string;               // e.g. "v1.0-owner-2026-06"
  generatedAt: string;                 // ISO 8601
  subjectId: string;                   // reference ID, not display name
  tenantId: string;
  inputSummary: {
    metricCount: number;
    genotypeCount: number;
    flaggedMetricCount: number;
  };
  recommendations: GradedRecommendation[];
  appendix: {
    metricStatuses: Array<{
      name: string;
      category: string;
      status: 'optimal' | 'borderline' | 'deficient' | 'excess';
      value: number;
      unit: string;
    }>;
    genotypeList: Array<{
      gene: string;
      genotype: string;
      assaySource: string | null;
    }>;
  };
}
```

**PHI note on snapshot:** The snapshot stores metric values and genotypes in the `appendix` section. These are PHI-adjacent data. The `reports` table is scoped by `tenantId`/`subjectId` (same pattern as `metrics`, `subject_genotypes`) and the read path is gated by `assertSubjectAccess`. This is equivalent to the existing metrics read pattern — no additional concern vs. what Phase 4 already delivers.

**Routes (routes.ts additions):**
```typescript
// Inside the layout("routes/_app/layout.tsx", [...]) block:
route("reports", "routes/_app/reports/index.tsx"),
route("reports/generate", "routes/_app/reports/generate.tsx"),
route("reports/:reportId", "routes/_app/reports/detail.tsx"),
```
Note: `reports/:reportId` (not `:id`) to be explicit and avoid collision with other `:id` params in nested contexts.

**Detection-confidence derivation (D-09):** The `detectionConfidence` field in `GradedRecommendation.sourceContext` is derived from `subject_genotypes.assaySource`:
- `assaySource` contains "23andMe" → `'verified'`
- `assaySource` contains "SelfDecode" or "inferred" → `'inferred'`
- `assaySource` is null → omit the field (no SubBadge rendered)

### 6. Guardrail Lint (RPT-02/03/D-13)

**Recommendation: Test the corpus at seed time, not at render time.**

Since the report body is assembled deterministically from corpus text (D-13), and corpus text is authored once and stored in DB tables, the lint test strategy is:

**Strategy: Test the corpus seed data, not the rendered report.**

```typescript
// tests/lib/corpus-lint.test.ts

import { describe, it, expect } from "vitest";
import { corpusSeedData } from "../../scripts/seed-corpus"; // export the seed data array

const IMPERATIVE_PATTERNS = [
  /\byou should\b/i,
  /\byou must\b/i,
  /\byou need to\b/i,
  /\byou have to\b/i,
  /\bdo not\b/i,           // directive prohibition
  /\bdo this\b/i,
];

const K4_DISCLAIMER = "This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting.";

describe("Corpus lint — non-imperative language (RPT-03)", () => {
  for (const entry of corpusSeedData.variantRules) {
    it(`variantProtocolMap[${entry.id}] has no imperative patterns`, () => {
      for (const pattern of IMPERATIVE_PATTERNS) {
        expect(entry.recommendationText).not.toMatch(pattern);
      }
    });
  }
  for (const entry of corpusSeedData.metricRules) {
    it(`metricProtocolMap[${entry.id}] has no imperative patterns`, () => {
      for (const pattern of IMPERATIVE_PATTERNS) {
        expect(entry.recommendationText).not.toMatch(pattern);
      }
    });
  }
});

// Note: K4 disclaimer is hard-coded in DisclaimerCallout.tsx (no props)
// The UI test below asserts it renders for K4 blocks.
describe("K4 disclaimer presence — by construction", () => {
  it("DisclaimerCallout hard-codes the locked disclaimer string", async () => {
    // Import the component source and verify the string is present
    const src = await import("fs").then(fs =>
      fs.readFileSync("app/components/ui/DisclaimerCallout.tsx", "utf-8")
    );
    expect(src).toContain(K4_DISCLAIMER);
  });
});
```

**Why this approach works:**
- Corpus text is authored once → lint tests on seed data catch imperative language at authoring time
- K4 disclaimer is hard-coded in the component (no props) → a static source-file assertion proves presence
- Generated report bodies are assembled by string concatenation of `"K{N} ({label}): " + rec.recommendationText` — the lint applies to `recommendationText`, not the template prefix
- If the corpus passes lint, every generated report passes lint — lint-clean-by-construction

**Supplementary: lint test over a generated snapshot (belt-and-suspenders):**
Write a Vitest test that calls `generateReport` with mock corpus data containing a K4 entry and asserts the assembled body text (a) contains no imperative patterns and (b) the K4 entry would trigger the `DisclaimerCallout` component (asserted via the `evidenceTier === 'k4'` check in `RecommendationBlock`). This is a unit test over the assembler, not a render test.

---

## Common Pitfalls

### Pitfall 1: Confusing `confidenceLevelEnum` with the new evidence-tier enum
**What goes wrong:** A developer adds `confidence: confidenceLevelEnum('confidence')` to a new table, colliding with the Phase 5 enum which only has `'high'|'low'` values. The DB migration silently uses the wrong enum type.
**Why it happens:** Both enums appear related (both are "confidence" concepts).
**How to avoid:** Name the new enum `evidenceTierEnum` and the Postgres type `evidence_tier`. Add a comment in `schema.ts` explicitly documenting the distinction: `// evidence_tier ('k1'|'k2'|'k3'|'k4') — DISTINCT from confidence_level ('high'|'low')`
**Warning signs:** A migration that references `confidence_level` on a new table; a `k1|k2|k3|k4` value being passed to a column typed as `confidenceLevelEnum`.

### Pitfall 2: The `evidence_tier` enum ADD VALUE must be outside a transaction
**What goes wrong:** Drizzle generates `BEGIN; ALTER TYPE evidence_tier ADD VALUE 'k1'; ...` — Postgres errors: "ALTER TYPE ... ADD VALUE cannot run inside a transaction block."
**Why it happens:** This is Pitfall 3 from Phase 5 (same root cause, same enum-add pattern). Drizzle-kit's `generate` wraps DDL in transactions.
**How to avoid:** After `db:generate`, review the migration file. If it contains `ALTER TYPE ... ADD VALUE`, split the SQL: run the `ADD VALUE` statements first in a separate migration (without `BEGIN/COMMIT` wrapping), then apply the rest. The Phase 5 `0007_silly_sabretooth.sql` or `0008_reflective_celestials.sql` migrations demonstrate this pattern.
**Warning signs:** `db:migrate` fails with "ALTER TYPE ... ADD VALUE cannot run inside a transaction block."

### Pitfall 3: Importing engine.ts from a route as `~/lib/engine.server.ts`
**What goes wrong:** A route imports `~/lib/engine` by the wrong path or the file is accidentally named `engine.server.ts`, and the Remix Vite plugin handles it differently than expected.
**Why it happens:** Developer reflexively adds `.server.ts` suffix.
**How to avoid:** Name the file `engine.ts`. In route files, import as `import { classifyMetricStatus } from "~/lib/engine"`. Add the engine module to the ESLint import correctness rule.

### Pitfall 4: Storing PHI values in the corpus tables
**What goes wrong:** A corpus seed entry embeds the owner's actual genotype rsid or a specific lab value (e.g. "for subjects with Vitamin D = 28 ng/mL") in `recommendationText`.
**Why it happens:** The LLM extraction is done against the owner's actual PDFs; the LLM may reproduce specific values.
**How to avoid:** Human review step must check all `recommendationText` fields for: specific numeric values from the owner's data, rsid strings, owner name. The rule: corpus text must read naturally for ANY subject with this finding, not only the owner.
**Warning signs:** A recommendation text that contains numeric values that match the owner's actual lab results.

### Pitfall 5: Report snapshot mutability confusion
**What goes wrong:** A developer adds an UPDATE action to a report row (e.g., to add a note), breaking the frozen-snapshot guarantee.
**Why it happens:** Natural impulse to update a record rather than create a new one.
**How to avoid:** The `reports` table has no UPDATE route. If a practitioner needs to add notes, that is a separate `reportAnnotations` table (deferred to future). Phase 6 has no edit/update action on reports.

### Pitfall 6: The `date-fns` import in engine.ts making it "impure"
**What goes wrong:** A reviewer flags `date-fns` as a non-pure dependency, requests replacing it with native Date arithmetic, causing a behavioral regression (native arithmetic doesn't handle DST correctly).
**Why it happens:** D-01 says "zero imports from Drizzle or Remix" — `date-fns` is not Drizzle or Remix. The existing tests prove correctness.
**How to avoid:** Document in `engine.ts` header: "`date-fns` is a pure computation library with no server or framework dependencies. Its presence is consistent with D-01 which prohibits Drizzle/Remix imports specifically."

### Pitfall 7: Genotype pattern matching edge cases
**What goes wrong:** A subject has genotype `"A/G"` but the corpus has `"G/A"` — the flip of the same heterozygous genotype. No match found; the recommendation is silently dropped.
**Why it happens:** Genotype notation is not standardized across vendors.
**How to avoid:** The engine's `mapVariantToProtocol` function should normalize genotype representation before matching: sort alleles alphabetically within the slash notation. Document the normalization rule in both the engine and the corpus authoring guide.

---

## Code Examples

### Engine module structure [CITED: existing codebase pattern]

```typescript
// app/lib/engine.ts
// Source: extracted from app/lib/metrics.ts, app/lib/protocol-data.ts, app/lib/correlations.ts
// Zero Drizzle or Remix imports. date-fns is acceptable (pure computation, D-01).

import { differenceInDays, parseISO } from "date-fns";
import type { Metric, MetricStatus } from "~/types/metrics";
import { CESSATION_PHASES } from "~/types/protocol";
import type { SubjectGenotype, VariantMap, GradedRecommendation } from "~/types/report";

export function classifyMetricStatus(metric: Metric): MetricStatus {
  // Identical behavior to getMetricStatus in metrics.ts:72
  const { value, optimalRange, referenceRange } = metric;
  if (optimalRange && value >= optimalRange.min && value <= optimalRange.max) return "optimal";
  if (referenceRange) {
    if (value < referenceRange.min) return "deficient";
    if (value > referenceRange.max) return "excess";
    return "borderline";
  }
  return "optimal";
}

export function getCessationDay(startDateIso: string, now: Date = new Date()): number {
  return differenceInDays(now, parseISO(startDateIso));
}

export function getCessationPhase(day: number): typeof CESSATION_PHASES[0] {
  const phase = CESSATION_PHASES.find(p => day >= p.dayRange.start && day <= p.dayRange.end);
  if (phase) return phase;
  return day < CESSATION_PHASES[0].dayRange.start
    ? CESSATION_PHASES[0]
    : CESSATION_PHASES[CESSATION_PHASES.length - 1];
}

export function computePearson(x: number[], y: number[]): number {
  // Identical to calculatePearsonCorrelation in correlations.ts:15
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Normalize genotype notation: sort alleles alphabetically within slash (D-03 Pitfall 7)
function normalizeGenotype(g: string): string {
  const parts = g.split('/');
  if (parts.length === 2) return parts.sort().join('/');
  return g;
}

export function mapVariantToProtocol(
  genotypes: SubjectGenotype[],
  variantMaps: VariantMap[]
): GradedRecommendation[] {
  const recommendations: GradedRecommendation[] = [];
  for (const genotype of genotypes) {
    const normalizedSubjectGt = normalizeGenotype(genotype.genotype);
    const matches = variantMaps.filter(vm =>
      vm.gene === genotype.gene &&
      (vm.genotypePattern === null ||
       normalizeGenotype(vm.genotypePattern) === normalizedSubjectGt)
    );
    for (const match of matches) {
      const detectionConfidence = inferDetectionConfidence(genotype.assaySource);
      recommendations.push({
        id: String(match.id),
        source: 'variant',
        category: match.category,
        evidenceTier: match.evidenceTier,
        recommendationText: match.recommendationText,
        evidenceCitation: match.evidenceCitation ?? undefined,
        sourceContext: {
          gene: genotype.gene,
          genotype: genotype.genotype,
          detectionConfidence,
        },
      });
    }
  }
  return recommendations;
}

function inferDetectionConfidence(
  assaySource: string | null
): 'verified' | 'inferred' | undefined {
  if (!assaySource) return undefined;
  if (assaySource.toLowerCase().includes('23andme')) return 'verified';
  if (assaySource.toLowerCase().includes('selfdecode') ||
      assaySource.toLowerCase().includes('inferred')) return 'inferred';
  return 'verified'; // default to verified for known assay sources
}
```

### Data flow re-point in metrics.ts [ASSUMED — pattern; exact form planner decides]

```typescript
// app/lib/metrics.ts — after engine extraction
// Maintain backward compat by re-exporting under old name
export { classifyMetricStatus as getMetricStatus } from "./engine";
// ... METRIC_TARGETS, getMetricTargets, getProjections remain here (not in engine)
```

### authz pattern for report routes [CITED: authz.server.ts, existing pattern]

```typescript
// app/routes/_app/reports/generate.tsx (action)
export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ['owner', 'practitioner']); // D-18: client cannot generate
  const formData = await request.formData();
  const subjectId = String(formData.get('subjectId'));
  const subject = await getOwnerSubject(user.tenantId); // or by subjectId
  assertSubjectAccess(user, subject, user.tenantId);    // D-18 assertSubjectAccess
  const reportId = await generateReport(user.tenantId, subjectId, user.id);
  return redirect(`/reports/${reportId}`);
}
```

---

## State of the Art

| Old Approach | Current Approach | Phase 6 Change | Impact |
|--------------|------------------|----------------|--------|
| `getMetricStatus` in `metrics.ts` | Same location, tested | Renamed `classifyMetricStatus`, re-exported | No behavior change; clearer engine boundary |
| `GENETIC_KNOWLEDGE` keyed by gene only | `genetics-knowledge.server.ts` 16 entries | Superseded by `geneticVariants`/`variantProtocolMap` with genotype specificity | Rules fire on actual genotype, not just gene |
| Detection-oriented K labels (`Confirmed`, `Likely`, `Inferred`) | `CONFIDENCE_LEVELS` in `genetics.ts` | Redefined as evidence tiers (`Established`, `Probable`, `Emerging`, `Speculative`) | K is now an honesty mechanism about evidence, not detection |
| No metric→protocol rule layer | (gap) | `metricProtocolMap` table | Lab findings generate graded recommendations |
| No frozen report artifact | (gap) | `reports` table + snapshot JSON | Reports are point-in-time artifacts, diffable by generating a new row |
| LLM in the report render path (risk) | (avoided by design) | Deterministic assembly from pre-authored corpus text | No LLM at runtime, fully reproducible, no PHI leaves the box |

**Deprecated/outdated:**
- `GENETIC_KNOWLEDGE` in `genetics-knowledge.server.ts`: retired and deleted once corpus seed is applied and verified green
- Detection-confidence K labels in `CONFIDENCE_LEVELS`: redefined in place (D-07); old `source: 'survey.md'` field removed or repurposed

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `remix-app/vite.config.ts` §test |
| Quick run command | `cd remix-app && npm test` (`vitest run`) |
| Full suite command | `cd remix-app && npm test` (same — no separate slow suite) |
| DB-gated tests | `tests/db/` — skip-guarded on `DATABASE_URL_UNPOOLED` being real (not stubbed) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Wave 0? |
|--------|----------|-----------|-------------------|---------|
| ENG-01 | `engine.ts` has zero Drizzle/Remix imports; loads in Node without server context | unit / import-purity | `npm test` | Yes — create `tests/lib/engine.test.ts` |
| ENG-01 | `classifyMetricStatus` behaves identically to `getMetricStatus` (all boundary cases) | unit | `npm test` | Re-point existing `app/lib/metrics.test.ts` |
| ENG-01 | `getCessationPhase` / `getCessationDay` behavior preserved | unit | `npm test` | Re-point existing `app/lib/protocol-data.test.ts` |
| ENG-01 | `computePearson` behavior preserved | unit | `npm test` | Re-point existing `app/lib/seed-data.test.ts` |
| ENG-02 | `SELECT COUNT(*) FROM genetic_variants WHERE confidence IS NULL = 0` | db / SQL assertion | `npm test` (DB-gated) | Yes — create in `tests/db/` |
| ENG-02 | `SELECT COUNT(*) FROM variant_protocol_map WHERE evidence_tier IS NULL = 0` | db / SQL assertion | `npm test` (DB-gated) | Yes |
| ENG-02 | `SELECT COUNT(*) FROM metric_protocol_map WHERE evidence_tier IS NULL = 0` | db / SQL assertion | `npm test` (DB-gated) | Yes |
| ENG-03 | `mapVariantToProtocol` produces expected recommendations from synthetic genotypes + corpus | unit | `npm test` | Yes — in `tests/lib/engine.test.ts` |
| ENG-03 | Metric rule evaluation: deficient metric → correct recommendation from `metricProtocolMap` | unit | `npm test` | Yes |
| RPT-01 | `generateReport` returns a reportId; `reports` row exists with correct tenant/subject scope | unit (mock DB) or integration | `npm test` | Yes |
| RPT-02 | `GradedRecommendation.evidenceTier` is present in every snapshot recommendation | unit | `npm test` | Yes |
| RPT-03 | No imperative patterns in corpus `recommendationText` fields | unit (corpus lint) | `npm test` | Yes — `tests/lib/corpus-lint.test.ts` |
| RPT-03 | `DisclaimerCallout.tsx` hard-codes the exact K4 disclaimer string | static/source assertion | `npm test` | Yes |
| RPT-03 | K4 recommendations in a generated snapshot would render DisclaimerCallout (`evidenceTier === 'k4'` check) | unit | `npm test` | Yes |

### Sampling Rate

- **Per task commit:** `cd remix-app && npm test` (full suite, < 30s without DB-gated tests)
- **Per wave merge:** `cd remix-app && npm test` (same)
- **Phase gate:** Full suite green (including DB-gated non-null assertions after `db:migrate`) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/lib/engine.test.ts` — import-purity + `mapVariantToProtocol` unit tests + re-pointed existing function tests
- [ ] `tests/lib/corpus-lint.test.ts` — imperative-pattern lint + K4 disclaimer source assertion
- [ ] `tests/db/corpus-schema.test.ts` — non-null K assertions (`COUNT(*) WHERE evidence_tier IS NULL = 0`) + DB-skip-guard
- [ ] `app/types/report.ts` — `ReportSnapshot`, `GradedRecommendation` type definitions (required by engine.ts and report-generator.server.ts)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `requireUser` (authz.server.ts) — existing pattern |
| V3 Session Management | No new additions | Inherited from `_app/layout.tsx` session gate |
| V4 Access Control | Yes — report generate/read | `requireRole(['practitioner','owner'])` + `assertSubjectAccess` (D-18) |
| V5 Input Validation | Yes — `subjectId` from form | Validate UUID format before DB query in generate action |
| V6 Cryptography | No new crypto | `crypto.randomUUID()` for report ID — Node built-in |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client role triggering report generation | Elevation of Privilege | `requireRole(['owner','practitioner'])` in generate action |
| Cross-tenant report read (IDOR) | Information Disclosure | `assertSubjectAccess` in `/reports/:id` loader — same pattern as ingest review |
| PHI in corpus tables (authoring mistake) | Information Disclosure | Human review step + corpus-lint test scanning for numeric patterns; corpus tables have no tenantId/subjectId FK |
| Snapshot JSON containing unintended PHI | Information Disclosure | `reports` table is tenantId/subjectId scoped; `assertSubjectAccess` gates read |
| Imperative recommendation → regulatory risk | Regulatory | Corpus lint test + K4 disclaimer hard-coded; no LLM in render path |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Engine tests, scripts | Yes | v25.6.0 | — |
| Neon (DATABASE_URL) | DB migrations, corpus seed | Yes (confirmed live in Phase 4) | Postgres 16 | — |
| Anthropic API (ANTHROPIC_API_KEY) | Corpus authoring (build-time only) | Yes (set in Vercel, used in Phase 5) | claude-sonnet-4-6 | Manual authoring without LLM |
| Vitest | Engine tests | Yes | 4.1.8 | — |
| date-fns | engine.ts getCessationDay | Yes | 4.4.0 | — |

**Missing dependencies with no fallback:** None.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `date-fns` is acceptable in `engine.ts` (D-01 prohibits Drizzle/Remix specifically) | Engine Extraction | If ruled impure: replace with native `Date` arithmetic — requires cessation test updates |
| A2 | Oxford CEBM framework maps cleanly to K1–K4 boundaries | Evidence-Tier Rubric | If GRADE is preferred: rubric boundaries would shift but K1–K4 label/tier structure remains |
| A3 | `corpusSeedData` can be exported from `scripts/seed-corpus.ts` for import by the lint test | Guardrail Lint | If seed script is not importable: lint test reads the data differently (JSON file or separate corpus-data module) |
| A4 | The `reports/:reportId` route parameter name (`:reportId` vs `:id`) does not conflict with existing routes | Routes | Minimal risk — all other `:id` params are in nested sections with distinct prefixes |

**All other claims are [CITED] from direct codebase reads or [VERIFIED] from the existing project (package.json, schema.ts, authz.server.ts, etc.).**

---

## Open Questions

1. **Corpus authoring coordination**
   - What we know: PDFs live in `/Users/mac/vaults/#Bwell/...`; LLM extraction pattern established in `extraction.server.ts`
   - What's unclear: Whether the corpus authoring session (LLM extraction + human review) runs before or during Phase 6 planning. The planner needs to know if corpus content is available at plan time or if Wave 0 must include a corpus authoring task.
   - Recommendation: Treat corpus authoring as Wave 0 (parallel with schema migration) — the seed script and tables can be created before corpus content is finalized; seed runs after authoring is complete.

2. **`genetics-knowledge.server.ts` retirement timing**
   - What we know: The 16-entry interim module is superseded by corpus; callers are in `app/routes/_app/insights/genetics.tsx` (via `data.server.ts` loader)
   - What's unclear: Whether the genetics route should be updated to read from `geneticVariants` table (via corpus) or continue using the interim module until a separate phase
   - Recommendation: Retire it within Phase 6 (it's already flagged "retired by Phase 6 engine" in the file header comment line 6) — the genetics route loader updates to use `getVariantMaps()` from `corpus.server.ts`.

3. **Nav extension — BottomTab overflow**
   - What we know: UI-SPEC §Nav Extension flags this: 6 items may require dropping "Import" from bottom tab or adding "More" overflow. Planner decides.
   - What's unclear: Owner's preference between the two options.
   - Recommendation: Drop "Import" from BottomTab (keep in sidebar rail); the ingest flow is a practitioner-only workflow rarely triggered on mobile. This is the simpler implementation.

---

## Sources

### Primary (HIGH confidence — direct codebase reads)

- `remix-app/app/lib/metrics.ts` — `getMetricStatus` function (lines 72–81)
- `remix-app/app/lib/correlations.ts` — `calculatePearsonCorrelation` (lines 15–32)
- `remix-app/app/lib/protocol-data.ts` — `getCessationDay`/`getCurrentCessationPhase` (lines 35–51)
- `remix-app/app/lib/genetics-knowledge.server.ts` — 16-entry GENETIC_KNOWLEDGE corpus (retired)
- `remix-app/app/types/genetics.ts` — `ConfidenceLevel`, `CONFIDENCE_LEVELS`, `VARIANT_CATEGORIES`
- `remix-app/db/schema.ts` — all existing tables and enums (lines 1–497)
- `remix-app/app/lib/data.server.ts` — tenant-scoped read pattern
- `remix-app/app/lib/authz.server.ts` — `requireUser`, `requireRole`, `assertSubjectAccess`
- `remix-app/app/routes.ts` — RouteConfig table, `_app/` layout pattern
- `remix-app/vite.config.ts` — Vitest configuration
- `remix-app/package.json` — installed dependencies and scripts
- `.planning/phases/06-engine-promotion-confidence-graded-reports/06-CONTEXT.md` — D-01 through D-19
- `.planning/phases/06-engine-promotion-confidence-graded-reports/06-UI-SPEC.md` — component specs, K-grade system
- `.planning/REQUIREMENTS.md` — ENG-01/02/03, RPT-01/02/03
- `.planning/ROADMAP.md` §Phase 6 — 5 locked success criteria

### Secondary (MEDIUM confidence)

- Oxford CEBM Levels of Evidence (2011) framework — K1–K4 mapping [ASSUMED mapping; framework itself is authoritative]
- `remix-app/app/lib/ingest/extraction.server.ts` — corpus authoring pattern mirror

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all dependencies confirmed in `package.json`
- Engine extraction: HIGH — functions read directly from source files; imports confirmed
- Schema design: HIGH — follows established Drizzle patterns from prior phases; enum naming confirmed against line 62 (`confidenceLevelEnum`)
- Rubric: MEDIUM — Oxford CEBM selected; mapping to K1–K4 is [ASSUMED] per D-07 (researcher proposes)
- Report pipeline: HIGH — read/write/auth patterns are direct copies of established Phase 4/5 patterns
- Guardrail lint: HIGH — corpus lint approach confirmed against Vitest harness setup

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (stable stack; revisit if Drizzle or React Router minor versions change)

---

## RESEARCH COMPLETE

**Phase:** 6 — Engine Promotion + Confidence-Graded Reports
**Confidence:** HIGH

### Key Findings

- **No new packages needed.** All Phase 6 work uses installed dependencies. `date-fns` is acceptable in `engine.ts` (D-01 prohibits Drizzle/Remix; `date-fns` is a pure computation library).
- **Engine extraction is a re-export exercise, not a rewrite.** The three source functions (`getMetricStatus`, `getCessationDay`/`getCurrentCessationPhase`, `calculatePearsonCorrelation`) are already effectively pure. The main work is creating `engine.ts`, updating imports, and adding `mapVariantToProtocol`.
- **Two separate corpus tables are recommended** (`variantProtocolMap` + `metricProtocolMap`) rather than a unified table — genotype-pattern specificity (D-03) is meaningful only for variant rules; metric rules trigger on `(metricName, conditionStatus)`. Both tables use `evidenceTierEnum` (`k1|k2|k3|k4`), distinct from `confidenceLevelEnum` (`'high'|'low'`).
- **Oxford CEBM Levels of Evidence (2011) maps cleanly to K1–K4.** K1 = SR/RCT; K2 = observational/mechanistic; K3 = preliminary/animal; K4 = expert opinion/theory. Locks the K4 "speculative" wording per ROADMAP SC5.
- **Report generation is fully deterministic** — no LLM in the runtime path. Corpus text is authored once, stored in DB, assembled at generation time by string concatenation. Lint tests target the corpus source data, making the report lint-clean-by-construction.
- **Snapshot JSON shape** uses `schemaVersion: 1` + `corpusVersion` string + typed `GradedRecommendation[]` array. `reports` table is scoped by `tenantId/subjectId` with the same auth gate pattern as all other PHI-adjacent tables.

### File Created

`.planning/phases/06-engine-promotion-confidence-graded-reports/06-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Direct `package.json` read — zero new packages |
| Engine Extraction | HIGH | Direct source file reads; imports confirmed |
| Schema Design | HIGH | Follows established Drizzle patterns; enum collision verified against `schema.ts:62` |
| K1–K4 Rubric | MEDIUM | Oxford CEBM selected [ASSUMED mapping]; labels already confirmed in UI-SPEC |
| Report Pipeline | HIGH | Mirrors Phase 4/5 patterns; auth helpers read directly |
| Validation | HIGH | Existing Vitest harness read; test strategy mirrors established `tests/lib/` patterns |

### Open Questions

1. Corpus authoring timing — needs to be sequenced as Wave 0 task or pre-phase activity
2. `genetics-knowledge.server.ts` retirement — recommend within Phase 6 (file header confirms this)
3. BottomTab 6-item overflow — recommend dropping Import from BottomTab (planner decision)

### Ready for Planning

Research complete. Planner can now create PLAN.md files for Phase 6.
