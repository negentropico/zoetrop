# Phase 6: Engine Promotion + Confidence-Graded Reports - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Three deliverables that together form the M1 proof slice — the engine and report that validate the whole stack end-to-end:

1. **Pure engine module (ENG-01)** — extract the decision logic into `app/lib/engine.server.ts`: `classifyMetricStatus`, `getCessationPhase`, `computePearson`, and the new `mapVariantToProtocol` — zero imports from Drizzle or Remix, callable from a plain Node.js script.
2. **Genetics promoted to first-class schema (ENG-02)** — `geneticVariants` + `variantProtocolMap` tables (non-nullable K1–K4 confidence), **plus a metric→protocol rule layer** (the lab analog of `variantProtocolMap`). Backed by an **owner-complete, evidence-tiered knowledge corpus authored from scratch**, LLM-assisted-extracted from the owner's SelfDecode + PureInsights + labs PDFs.
3. **Confidence-graded report (RPT-01/02/03)** — a practitioner generates a per-subject report at `/reports/generate`; it is written as a **frozen, versioned snapshot** into a tenant/subject-scoped `reports` row and rendered at `/reports/:id`; every recommendation shows its K-level inline (`"K{N} ({label}): {text}"`), K4 carries the disclaimer, language is deterministic and non-imperative.

**In scope:** the engine extraction; the genetics + metric-rule schema; the from-scratch evidence-tiered corpus built from the owner's existing reports; the report generation/storage/render path over the owner's **already-committed** metrics + genetics.

**Out of scope (deferred to future phases):** *ingestion* of any new source type — subject self-import, additional genetic vendors, DUTCH (hormones), HTMA (minerals), structured Function Health lab ingest, WHOOP/DEXA auto-ingest; report PDF/print export; RLS enforcement + BAAs + pgAudit (Phase 7). The report **reads** already-committed WHOOP/DEXA metrics (they're in the DB from M0) — it does not ingest them.
</domain>

<decisions>
## Implementation Decisions

### Engine extraction (ENG-01)
- **D-01:** Create `app/lib/engine.server.ts` as a **pure, dependency-free module** — zero Drizzle/Remix imports, callable from a Node script with no server context (ROADMAP SC2). It hosts `classifyMetricStatus` (today's `getMetricStatus` in `metrics.ts`), `getCessationPhase` (today's `getCurrentCessationPhase` via `cessation.ts`/`protocol-data.ts`), `computePearson` (today's Pearson in `correlations.ts`/`seed-data`), and the new `mapVariantToProtocol`. The `.server.ts` suffix is bundle-hygiene only; the module must remain import-pure regardless. Existing call sites re-point to the engine module; behavior must stay identical (assert via the existing Vitest suite before/after).
- **D-02:** `vitest run` covers all engine functions against **both** DB-seeded data and synthetic inputs (ROADMAP SC2).

### Genetics + rule schema promotion (ENG-02)
- **D-03:** `geneticVariants` + `variantProtocolMap` become first-class Neon tables (ROADMAP SC1). Findings are **genotype/finding-specific** — a rule fires on the subject's *actual genotype* (COMT Val/Met ≠ Met/Met), not merely on the gene. `variantProtocolMap` edges encode which genotype pattern they apply to; the engine joins `subject_genotypes` (PHI, unchanged) → matching corpus findings.
- **D-04:** Add a **metric→protocol rule layer** — the bloodwork/metric analog of `variantProtocolMap` — so lab findings generate graded recommendations too (see D-08). **This extends the roadmap's two named tables (`geneticVariants`/`variantProtocolMap`) with a third source.** Planner decides table-vs-map shape and whether genetic + metric rules share one `protocolMap` structure or stay separate. Both carry an evidence-tier K.
- **D-05:** **New K-confidence enum** (`k1|k2|k3|k4`), non-nullable on the rule/mapping tables. It is **separate from** the existing `confidenceLevelEnum=['high','low']` (which is lab-extraction *grounding* confidence from Phase 5 — a different concept). Name it distinctly (e.g. `k_confidence` / `evidence_tier`) to avoid collision. Migration discipline per DATA-03 (`db:generate` → reviewed migration → `db:migrate`); new tables carry `tenantId`/`subjectId` where they hold per-subject data.
- **D-06:** PHI stays where it is — genotypes/rsids in `subject_genotypes`, measured values in `metrics`. The promoted tables + corpus hold **non-PHI population-level knowledge** (finding → implication → action → evidence tier). The interim `app/lib/genetics-knowledge.server.ts` (16 gene entries) is **retired/superseded** by the corpus, not extended.

### Confidence model (the K-grade)
- **D-07:** **A recommendation's visible K reflects the evidence tier of the finding→action link — external/published evidence strength, NOT the owner's clinical judgment.** This aligns with the roadmap's locked K4 disclaimer wording ("speculative (limited evidence)"). The exact K1–K4 rubric should be grounded in a recognized evidence framework (researcher proposes — e.g. GRADE / Oxford CEBM levels) and documented; the current detection-oriented `CONFIDENCE_LEVELS` labels (`K1 'Confirmed in 23andMe'…`) are **redefined as evidence tiers**.
- **D-08:** **Both** the metric→protocol rules **and** the variant→protocol mappings generate recommendations, **each carrying its own evidence-tier K**. A measured lab value being certain does NOT make its recommendation high-K — the K grades the *action's* evidence, not the measurement.
- **D-09:** **Two confidence axes, one headline.** The visible K is the **evidence tier** (D-07). Genotype **detection-confidence** (verified vs inferred — e.g. SelfDecode "inferred from SelfDecode") is carried as a **secondary annotation** (badge/flag), not the headline number.

### Knowledge corpus (the engine's content)
- **D-10:** The corpus is **authored from scratch** — a full set of findings + metric rules + evidence tiering — **not** seeded from the app's current protocol/supplement tables. It is **owner-complete**: it covers everything that actually appears in the owner's real reports + data (comprehensive relative to the owner), **not** an exhaustive population reference (that's a deferred, ballooning effort).
- **D-11:** Corpus content is **LLM-assisted-extracted** from the owner's existing PDF reports (SelfDecode + PureInsights + labs — see canonical refs) at **authoring/build time**. This is distinct from runtime (D-13). **Non-PHI knowledge → the repo corpus; PHI (the owner's specific genotypes/values) → the DB.** The source PDFs live in the vault, outside the repo, and are never committed.
- **D-12:** The corpus/engine is designed **source-agnostic** — a "finding" can originate from any diagnostic (bloodwork, hormones, minerals, autonomic, body-comp, genetics) — so the deferred source types (DUTCH/HTMA/WHOOP/DEXA/Function Health) slot in later as *corpus + ingest* additions, not a rebuild.

### Report content model (RPT-01)
- **D-13:** **Deterministic runtime language.** At generation time the report body is assembled from the corpus's pre-written, already-hedged, evidence-tiered recommendation text + the locked `"K{N} ({label}): {text}"` template. **No LLM in the runtime report path** — lint-clean by construction (ROADMAP SC5 no-imperative lint test), fully reproducible, no PHI leaves the box. Non-imperative/hedged phrasing is authored + reviewed *once*, in the corpus.
- **D-14:** **Grouped by body system / category** — recommendations render under the existing domains (the 9 metric categories + the variant categories: methylation, detox, neurotransmitter, cardiovascular, lipids, …). Reuses existing taxonomy (`CATEGORY_INFO`, `VARIANT_CATEGORIES`).
- **D-15:** **Flagged-in-body, full-data-available** — the body surfaces actionable items (non-optimal metrics + impactful variant findings); the complete panel + full variant set are available in an appendix/expandable. Actionable focus without hiding the record.
- **D-16:** **Report inputs = all already-committed metric categories + genetics.** The report grades every metric category present in the DB — bloodwork labs, autonomic (WHOOP), body-composition (DEXA), etc. — plus genetic findings. No new ingestion (the data is already there from M0). *This supersedes an earlier in-discussion lean toward "bloodwork labs + genetics only."*

### Report persistence (RPT-01)
- **D-17:** A `reports` row is a **frozen, versioned snapshot**: generation freezes a point-in-time JSON snapshot (inputs + engine output + **corpus version**) into a tenant/subject-scoped row; `/reports/:id` renders that snapshot **unchanged**. Re-generating creates a **NEW row** → report history + reproducibility + diffability. "Re-derive as the data changes" = generate a new report and compare, never mutate an existing one.

### Report language guardrails (RPT-02/03) — locked by ROADMAP, not re-decided
- The `"K{N} ({label}): {text}"` inline template; the K4 disclaimer string ("This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting."); the lint test asserting no imperative patterns (`"you should"/"you must"/"you need to"`) and that every K4 block contains the disclaimer; `/reports/generate` + `/reports/:id` routes; tenant/subject scoping of the `reports` row.

### Cross-cutting constraints (carried forward — not re-asked)
- **D-18:** `assertSubjectAccess` MUST be called before any subject-scoped write and on the report read/generate path (D-15 carry-forward from Phase 5; CR-01). Report generation is role-gated (practitioner/owner). Full RLS remains Phase 7.
- **D-19:** TS strict / no `any` (PRINCIPLES). LLM (where used — corpus authoring only) = extraction/drafting with human review in the loop; never final clinical judgment. K1–K4 stays a first-class, visible concept in schema and UI (engine integrity).

### Claude's Discretion
- Exact module/file layout for the engine and corpus; whether genetic + metric rules share one `protocolMap` table or use two; corpus storage shape for the rule layer (DB table vs typed module — `geneticVariants`/`variantProtocolMap` are DB tables per ROADMAP SC1).
- `reports` snapshot JSON shape and the corpus-version stamp mechanism.
- Report appendix/expandable UX against the Phase 4.1 `UI-SPEC.md`.
- The K-tier rubric's precise boundaries (researcher proposes; D-07).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §"Phase 6: Engine Promotion + Confidence-Graded Reports" — the 5 locked success criteria (schema + non-null K, pure engine, generate/store/read, inline K-display, K4 disclaimer + lint)
- `.planning/REQUIREMENTS.md` — ENG-01, ENG-02, ENG-03, RPT-01, RPT-02, RPT-03

### Knowledge corpus source documents (PHI — in the vault, OUTSIDE the repo; never commit)
- `/Users/mac/vaults/#Bwell/pureinsight-report-mb.pdf` — **PureInsights** canonical report (owner)
- `/Users/mac/vaults/#Bwell/_archive/Well/Plan4/401/Reports/{allergy,brain,fattyliver,fitfunc,ketones,mito,nutrient_factors,nutrition}.pdf` — **SelfDecode** topic reports (8) (owner)
- `/Users/mac/vaults/#Bwell/_archive/Well/Tests/labs.pdf` — existing bloodwork labs (owner)
- `/Users/mac/vaults/#Bwell/_archive/Well/Tests/Tests.pdf` — **Function Health** test reference (incoming lab source; forward-looking)
- *(also available)* `/Users/mac/vaults/#Bwell/_archive/Well/Plan3/301/Reports Summary - 23andMe.pdf`

### Design contract (report UI builds against this)
- `remix-app/` — the Phase 4.1 `UI-SPEC.md` binding design contract; brand tokens + signature components in `app/components/ui/`

### Compliance / pilot-first boundary
- `.planning/PROJECT.md` §"Key Decisions" + §"Constraints" — pilot-first: standard-tier infra + subscription API now; PHI hardening + BAAs at Phase 7
- `docs/PRINCIPLES.md` — TS strict / no `any`; LLM = extraction + drafting + human review; engine integrity (K1–K4 first-class/visible)
- `docs/PLATFORM.md` — engine-first inversion; the report is the M1 proof slice

### Known carry-forward concern
- `.planning/phases/04-static-to-db-data-layer-migration/04-REVIEW.md` — CR-01: `assertSubjectAccess` has callers only on the Phase-5 write path; extend to the report generate/read path (D-18). Full read-path/RLS fix is Phase 7.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `remix-app/app/lib/metrics.ts` — `getMetricStatus` (→ engine `classifyMetricStatus`) + `METRIC_TARGETS`.
- `remix-app/app/lib/cessation.ts` + `protocol-data.ts` — `getCurrentCessationPhase`/`getCessationDay` (→ engine `getCessationPhase`); `now` already injectable from Phase 1.
- `remix-app/app/lib/correlations.ts` / `seed-data` — Pearson (→ engine `computePearson`).
- `remix-app/app/lib/genetics-knowledge.server.ts` — the interim 16-entry gene→action knowledge map; the **source shape** the corpus supersedes (do not extend; promote into the corpus, evidence-tiered + genotype-specific).
- `remix-app/app/types/genetics.ts` — `ConfidenceLevel` (K1–K4), `CONFIDENCE_LEVELS` (relabel to evidence tiers, D-07), `VARIANT_CATEGORIES` (report grouping, D-14).
- `remix-app/app/lib/data.server.ts` / `db-mappers.server.ts` — tenant-scoped read/mapper layer (Phase 4); report generation reads committed metrics + `subject_genotypes` through this pattern.
- `remix-app/app/lib/authz.server.ts` — `requireUser`/`requireRole`/`assertSubjectAccess` (D-18).
- `remix-app/app/lib/ingest/` — Phase 5 LLM extraction pipeline; the **pattern** to mirror for corpus authoring-time extraction (NOT a runtime dependency of reports, D-13).

### Established Patterns
- Explicit route table in `remix-app/app/routes.ts` (RouteConfig) — add `reports/generate` + `reports/:id` (likely a `reports/` layout) here; new routes live under `_app/` and authenticate via `requireUser`.
- Drizzle migrations discipline (DATA-03) for the new enum + tables.
- Skip-guarded live-Neon tests (`tests/db/*`, `tests/parity/*`) gated on `DATABASE_URL`; export connection vars rather than `source .env` (the strings contain `&`).
- `metrics` table (schema.ts:113) and `subjectGenotypes` (schema.ts:251) are the read inputs; `confidenceLevelEnum` (schema.ts:62) is the **name to avoid colliding with** (D-05).

### Integration Points
- New `geneticVariants` / `variantProtocolMap` / metric-rule + `reports` tables join the existing tables in `remix-app/db/schema.ts`.
- Engine module is consumed by the report generator and by existing loaders that re-point off `metrics.ts`/`cessation.ts`/`correlations.ts`.
- Report generation: read committed metrics + genotypes → engine (`classifyMetricStatus` + `mapVariantToProtocol` + metric-rule eval) → graded recommendation set → freeze snapshot → `reports` row (D-17) → `/reports/:id` render.
</code_context>

<specifics>
## Specific Ideas

- The corpus is the heart of this phase: build it **owner-first** so the owner's real SelfDecode/PureInsights/labs data round-trips into a real, complete report — proving the slice before any external client.
- K is an **honesty mechanism**: the visible grade is the *evidence* behind the action (external, not gut); a separate "inferred genotype" flag keeps the detection caveat honest too (D-09).
- The report is a **point-in-time artifact you can hand someone** (frozen, versioned) — "re-derive as the data changes" means a *new* graded report you can diff, not a mutating page (D-17).
- Long-term vision (owner's words): subjects onboard by importing their own reports — PureInsights, Function Health, possibly SelfDecode, outside labs, **DUTCH**, **HTMA** — plus integrated WHOOP + DEXA data. Phase 6 builds the engine/corpus/report that all of that eventually feeds; the corpus is designed source-agnostic so it grows without a rebuild.
</specifics>

<deferred>
## Deferred Ideas

All recorded so they're not lost — none are Phase 6 scope:

- **Subject self-onboarding / self-import of reports** — client-facing import UX (M2 client-app territory).
- **Additional genetic vendors** beyond the owner's reports — multi-vendor genetic import.
- **DUTCH hormone panel ingest** → `hormones` category — future ingest phase.
- **HTMA (hair tissue mineral analysis) ingest** → `minerals` category — future ingest phase.
- **Structured Function Health lab ingest** → labs — future ingest phase (`Tests.pdf` kept as the forward reference).
- **WHOOP full-data integration + DEXA report auto-ingest** — the report *reads* already-committed WHOOP/DEXA metrics now; *automated ingest* of those source formats is deferred.
- **Report PDF/print export & sharing** — `/reports/:id` in-app render is the locked Phase 6 scope; export is a later add.
- **Exhaustive population-level corpus** — Phase 6 corpus is owner-complete, not a comprehensive thousands-of-findings reference (deferred curation burden).

None of the above are scope creep into Phase 6 — they are explicit boundaries recorded so the source-agnostic corpus/engine design accommodates them later.
</deferred>

---

*Phase: 6-engine-promotion-confidence-graded-reports*
*Context gathered: 2026-06-11*
