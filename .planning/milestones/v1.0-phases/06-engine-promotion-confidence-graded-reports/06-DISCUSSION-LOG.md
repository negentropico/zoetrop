# Phase 6: Engine Promotion + Confidence-Graded Reports - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 6-engine-promotion-confidence-graded-reports
**Areas discussed:** Report content model, Language (template vs LLM), Genetics model, Report persistence (+ corpus provenance / canonical inputs)

---

## Report content model — what produces a graded recommendation

| Option | Description | Selected |
|--------|-------------|----------|
| Variants drive recs; labs contextualize | variantProtocolMap edges generate recs (K = mapping grade); lab status woven into rationale | |
| Both labs AND variants generate recs | Metric-status rules AND variant mappings each produce recs, each with its own K | ✓ |
| Labs drive recs; genetics is a graded profile | v1 recs from metric status only; variants render as a profile section | |

**User's choice:** Both labs AND variants generate recs.
**Notes:** Forced the follow-up: a measured lab value is certain, but the recommendation it triggers has its own evidence strength → a metric→protocol rule layer (lab analog of variantProtocolMap) is needed, carrying its own evidence-tier K.

## Report content model — structure / grouping

| Option | Description | Selected |
|--------|-------------|----------|
| By body system / category | Group under methylation/detox/cardiovascular/lipids + the 9 metric categories | ✓ |
| Flat priority-ordered list | One ranked list, highest-impact first | |
| By source section | Genetics section then labs section | |

**User's choice:** By body system / category.

## Report content model — coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Flagged in body, full data available | Body = actionable items; full panel + all variants in appendix/expandable | ✓ |
| Only flagged / actionable | Body shows only non-optimal items, nothing else | |
| Everything | Every metric + all variants, optimal or not | |

**User's choice:** Flagged in body, full data available.

## Report content model — inputs

| Option | Description | Selected |
|--------|-------------|----------|
| Labs + genetics only | Strict "lab→protocol"; WHOOP/cessation stay on own surfaces | (initial) |
| Also cessation + autonomic/WHOOP | Fold cessation phase + WHOOP into the report | |
| **(superseded → see Persistence-round reconciliation)** | | ✓ all committed metrics + genetics |

**User's choice:** Initially "labs + genetics only," later **superseded** to **all committed metric categories + genetics** (incl. WHOOP-autonomic + DEXA-body-comp, which are already in the DB from M0) after the user asked for WHOOP + DEXA integration. New-source *ingestion* stays deferred.

## Lab-driven recommendation K-source

| Option | Description | Selected |
|--------|-------------|----------|
| A metric→protocol rules layer carries the K | K = evidence strength of the link, graded per rule (lab analog of variantProtocolMap) | ✓ |
| Lab-driven recs are uniformly high-K | Measured ⇒ K1/K2; only genetics introduces lower K | |
| K = measurement confidence × link evidence | Combine input certainty with action evidence | |

**User's choice:** A metric→protocol rules layer carries the K.
**Notes:** User then clarified the deeper principle (see Corpus provenance): **"Rules should reflect evidence tiers, not my clinical judgment."**

## Corpus provenance / rule-set source

| Option | Description | Selected |
|--------|-------------|----------|
| Seed from the owner's existing protocol | Derive rules from supplements/P0–P6/METRIC_TARGETS/gene-actions | |
| Author a fresh curated rule set | Build from scratch, independent of current protocol | ✓ (refined) |
| Minimal — only flagged items | Just enough for one report | |

**User's choice (free-text, replacing the AskUserQuestion):** "we should develop a full set of findings and metrics and confidence tiering from scratch, but informed by personal data and existing reports. have reports in pdf from selfdecode and from pureinsights." → **owner-complete corpus, authored from scratch, evidence-tiered, LLM-assisted-extracted from the owner's SelfDecode + PureInsights + labs PDFs.** Canonical input paths located + confirmed under `/Users/mac/vaults/#Bwell/`.

## Runtime report language

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic from the corpus | Body assembled from pre-written, hedged, evidence-tiered corpus text + locked template; no runtime LLM | ✓ |
| LLM-drafted narrative | LLM writes prose at generation time; needs lint gate + review each time | |
| Hybrid: deterministic recs + LLM summary | Deterministic rec lines + optional review-gated LLM summary | |

**User's choice:** Deterministic from the corpus.

## Genotype specificity

| Option | Description | Selected |
|--------|-------------|----------|
| Genotype-specific | Finding fires on actual genotype; variantProtocolMap encodes the pattern | ✓ (implied) |
| Gene-level only | Promote 16 gene→action entries as-is; genotype stored but unused | |

**User's choice (free-text):** Described the broader onboarding vision — subjects import their own reports (PureInsights, Function Health, possibly SelfDecode, outside labs, DUTCH, HTMA) + integrated WHOOP + DEXA. Resolved as: **finding-specific (genotype/analyte-specific)** model; multi-source ingestion captured as the deferred growth path; corpus designed source-agnostic.

## Confidence axes (detection vs evidence)

| Option | Description | Selected |
|--------|-------------|----------|
| Evidence tier = headline K; detection secondary | Visible K = evidence tier; genotype detection-confidence is a secondary annotation | ✓ |
| Single evidence-tier K only | Only evidence tier tracked/shown | |
| Headline K = worst of the two | min(detection, evidence) | |

**User's choice:** Evidence tier = headline K; detection secondary.

## Report persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Frozen snapshot, versioned | Point-in-time JSON snapshot (inputs + engine output + corpus version); new row per generation; history + reproducibility | ✓ |
| Live re-derivation | /reports/:id re-runs engine on read | |
| Snapshot, overwrite | Frozen but one current row per subject, no history | |

**User's choice:** Frozen snapshot, versioned.

## Report inputs reconciliation (after WHOOP/DEXA steer)

| Option | Description | Selected |
|--------|-------------|----------|
| All committed metrics + genetics | Report grades every metric category already in the DB + genetics; no new ingestion | ✓ |
| Bloodwork labs + genetics only | Hold the earlier strict lock | |
| Labs + genetics now, WHOOP/DEXA as stretch | Core slice first, extend if room | |

**User's choice:** All committed metrics + genetics.

## Deferred-ingestion confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — defer all new-source ingestion | Phase 6 builds against already-committed data; all new ingest = future phases | ✓ |
| Pull some ingestion into Phase 6 | Bring some new-source ingest into this phase (re-scope) | |

**User's choice:** Yes — defer all new-source ingestion.

---

## Claude's Discretion

- Engine/corpus module layout; whether genetic + metric rules share one `protocolMap` table or split; corpus rule-layer storage shape (DB table vs typed module — `geneticVariants`/`variantProtocolMap` are DB tables per ROADMAP SC1).
- `reports` snapshot JSON shape + corpus-version stamp mechanism.
- Report appendix/expandable UX against Phase 4.1 `UI-SPEC.md`.
- K-tier rubric boundaries (researcher proposes, grounded in an evidence framework e.g. GRADE / Oxford CEBM).

## Deferred Ideas

- Subject self-onboarding / self-import of reports (M2 client-app).
- Additional genetic vendors (multi-vendor import).
- DUTCH hormone ingest → hormones; HTMA ingest → minerals; structured Function Health lab ingest; WHOOP/DEXA auto-ingest.
- Report PDF/print export & sharing.
- Exhaustive population-level corpus (Phase 6 is owner-complete only).
