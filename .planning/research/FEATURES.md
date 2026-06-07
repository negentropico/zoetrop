# Feature Research

**Domain:** Practitioner-facing functional-health coaching platform (single coach, multi-client)
**Researched:** 2026-06-07
**Confidence:** HIGH (table stakes derived from 4 incumbent platforms + practitioner pain-point literature); MEDIUM (differentiators — confidence-grading engine is novel, no direct comparator confirmed); HIGH (anti-features — derived from explicit PROJECT.md out-of-scope decisions + market evidence)

---

## Context: M1 Scope Frame

M0 (shipped): personal n=1 instrument — 9 metric categories, versioned protocols, cessation tracker, correlations, genetics, WHOOP/vault imports — **all of this is already built and is NOT re-researched here**.

M1 target: one functional-health practitioner (HIGHER / Tara Garrison) running multiple real clients on that same engine — intake → customized protocol → tracking → 4-week iteration → practitioner-side monitoring → confidence-graded lab→protocol reports.

The decision engine (K1–K4 confidence grading, genetics→protocol maps, multi-source lab ingestion) is the **moat and the wedge**. Everything else either enables it or is table stakes for practitioner adoption.

---

## Incumbent Baseline (What Practitioners Already Have)

Before categorizing features, the comparison set matters:

| Platform | Core Strength | What It Lacks |
|----------|--------------|---------------|
| **Practice Better** | All-in-one practice ops: scheduling + charting + billing + telehealth + client portal + program delivery. Rupa Health lab integration. AI charting assistant. | Decision engine. No confidence grading. No genetics→protocol layer. Lab import goes into chart, not into a recommendation engine. Protocol "versioning" is template management, not per-client lineage. |
| **Healthie** | HIPAA EHR, customizable intake forms (60+ templates), smart tasks for lab review, Quest/LabCorp e-labs direct, multi-provider RBAC. | Same gap as Practice Better: data flows in, but no synthesis layer. No protocol derivation from heterogeneous diagnostics. |
| **Heads Up Health** | Multi-source biomarker aggregation (30,000+ lab orgs), customizable per-client dashboards, AI (Halo) natural-language queries, branded progress reports, wearable integration, threshold alerts. | Closest to Zoetrop's data layer but no protocol recommendation engine. Insight ≠ prescription. No confidence grading. No genetics integration at protocol level. |
| **Fullscript** | Supplement dispensing, evidence-based protocol library (85+ templates with citations), adherence tracking, share-across-practitioners. | Not a practice management platform. No lab ingest. No client health tracking beyond supplement adherence. |
| **Optimal DX** | Functional blood chemistry analysis — biomarker rules, scoring, weighting, probability, uncertainty inference → 16 report types. Closest to confidence scoring in incumbents. | Practitioner tool only (no client record system), no genetics integration, no wearables, no multi-source protocol synthesis. |
| **FunctionalMind** | AI-native: lab upload → auto-extraction → contextual connections → cited protocol suggestions (PubMed/MDPI/etc.). Closest to the LLM-assisted ingest pattern. | No explicit confidence grades (K1–K4). Human review is ad-hoc (citations provided, not a structured review gate). No per-client versioned protocol lineage. No genetics↔protocol mapping schema. |

**The gap all incumbents share:** aggregation and visualization exist everywhere; the **synthesis + confidence-graded protocol derivation + human-review gate + versioned-per-client-lineage loop** exists nowhere as an integrated system.

---

## Feature Landscape

### Table Stakes (Practitioners Will Not Adopt Without These)

Features practitioners assume any multi-client platform has. Absence = immediate rejection in evaluation.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Multi-client roster (client list view)** | Every incumbent has this. Practitioners cannot operate without knowing who their clients are, status, last activity. | LOW | Auth/identity layer, tenantId + subjectId scoping | Filterable list: active/inactive, alert flags, last-updated. No real-time sync needed at M1. |
| **Per-client record (health profile)** | Client's full data picture in one place: demographics, diagnostics, current protocol, wearables. Standard across all incumbents. | MEDIUM | Tenant/subject scoping on all 8 existing tables | This is the M0 instrument scoped per-subject. The data model migration is the complexity, not the UI. |
| **Identity + auth with roles** | HIPAA requires access control. Practitioners need to know only they (and the client, later) see a client's record. Any SaaS with health data needs login. | HIGH | Prerequisite for everything else in M1 | Three roles: `owner`, `practitioner`, `client`. Better Auth (open-source, TS-native, Drizzle-compatible, org/RBAC plugin) is the recommended choice. Clerk is an alternative with native Neon RLS integration but adds cost and external dependency. |
| **PHI isolation: tenant + subject scoping** | Legal necessity with PHI. Practitioners will not put client data in a system without data isolation. | HIGH | Auth layer, Drizzle schema migration | Neon Postgres RLS is the right pattern — Drizzle ORM has first-class `pgPolicy`/`crudPolicy` support and Neon has documented integration guides. Tenant_id + subject_id on every data table. |
| **Client intake capture** | Entry point for any engagement. Practitioners build their entire protocol from intake data: goals, history, genetics, medications, lifestyle. | MEDIUM | Identity layer, subject record | Structured form fields (not freeform). Minimum: demographics, health goals, current supplements/medications, known conditions, consent capture. Consent is also a PHI/legal requirement. |
| **Consent capture at intake** | Legal requirement for handling health data. Any HIPAA-adjacent workflow gates on signed consent. | LOW | Intake form | Checkbox + timestamp + version of consent language. Not a full e-signature system at M1. |
| **Lab document upload** | The entry point for the entire engine. Practitioners manually receive lab PDFs and need a way to get them into the system. | LOW | Subject record, storage | File upload (PDF/image) to Neon-adjacent storage (Netlify Blobs or S3). Raw upload only — parsing is a separate step. |
| **LLM-assisted lab parsing with human review gate** | Practitioners currently read labs by hand and enter data manually. This is their biggest time sink (60–120 min per client per lab panel). Any tool that reduces this earns adoption. | HIGH | Lab upload, LLM routing, structured metrics schema | Upload → LLM extraction (structured JSON) → practitioner review UI (confirm/edit each value before commit) → write to `metrics` table. The review gate is non-negotiable (LLM never writes directly; human confirms). This is the pattern from LGS/Trouvant lineage. |
| **Per-client protocol versioning (4-week cadence)** | Functional health operates on 4-week iteration cycles. Each cycle = new protocol version. Practitioners need to see what changed and why, per client. | MEDIUM | Tenant/subject scoping on `protocolVersions`/`protocolChanges` | The M0 engine already has versioning — this is re-scoping it per-subject. Each 4-week iteration creates a new protocol version. Change rationale field is required. |
| **Practitioner monitoring dashboard (client overview)** | Practitioners need to see which clients need attention, who has new labs, whose biomarkers are drifting. This is the operational heartbeat. | MEDIUM | Per-client records, status taxonomy, alert logic | Not real-time. Daily/on-demand. Key signals: labs uploaded (unreviewed), biomarker status changes (deficient/excess), last protocol version date. |
| **RBAC enforcement (practitioner can't see other practitioners' clients)** | At M1 single-practitioner, this is less critical, but the schema/policy must be correct from day one to avoid a painful migration at M3. | MEDIUM | Auth layer, RLS policies | Wire RLS policies correctly at M1. Cost of doing this wrong = full re-architecture at M3. |
| **Audit trail (who viewed/modified PHI and when)** | HIPAA Technical Safeguard requirement. Any real health platform must log PHI access. | MEDIUM | Auth layer, logging middleware | Log: user_id, subject_id, action (view/create/edit/delete), timestamp, record type. Postgres-based append-only log table is sufficient at M1. |
| **Encryption at rest and in transit** | HIPAA minimum. Neon encrypts at rest by default; TLS 1.2+ for transit. Verify vendor BAA-readiness. | LOW | Vendor configuration | Neon provides encryption at rest. Netlify provides TLS. Confirm Neon BAA covers PHI use case. |
| **Confidence-graded report generation** | The proof slice. Practitioners need a shareable, structured output that says "here is what the labs show, here is what the engine recommends, here is how confident we are." Without this, the engine has no output artifact — it's invisible. | HIGH | Lab ingest, engine (genetics + metrics → confidence), report template | The K1–K4 grades must appear in the report. Human review before generation. PDF or structured HTML export at M1. This is the core differentiator but also a table stake for the diagnostic-pilot entry pattern. |

### Differentiators (The Confidence-Graded Engine Wedge)

Features that set Zoetrop apart. These are not what incumbents provide — they are the reason a practitioner chooses Zoetrop over Practice Better or Heads Up Health.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **K1–K4 confidence grades as first-class schema fields** | Incumbents either fake certainty (Optimal DX gives a score but no epistemological grade) or surface raw citations without synthesis (FunctionalMind). Zoetrop shows the honest gap between what the data says and how sure we are — a clinical integrity signal practitioners can trust and explain to clients. | MEDIUM | `geneticVariants`, `variantProtocolMap` schema with `confidence` enum; evidence/citation field per mapping | The K1–K4 taxonomy must be queryable — not just display text. Engine decisions are filtered/weighted by confidence grade. |
| **Genetics → protocol mapping with per-variant evidence** | No incumbent integrates genetic variants as first-class protocol drivers. Zoetrop's `variantProtocolMap` maps specific SNPs/variants to protocol actions with confidence grades and citations. This turns genetic data from a curiosity display into an actionable protocol input. | HIGH | `geneticVariants` + `variantProtocolMap` first-class schema; must be seeded with the existing M0 variant→action mappings | The variant data already exists in M0 seed data. The work is promoting it to a proper schema with versioning and evidence fields. |
| **Multi-source synthesis (labs + wearables + genetics → unified protocol derivation)** | Every incumbent handles one or two sources. Heads Up aggregates many but does not synthesize. Zoetrop's engine takes heterogeneous inputs (blood panel + DEXA + WHOOP HRV + genetic variants) and derives a single confidence-weighted protocol recommendation. This is the moat. | HIGH | Lab ingest pipeline, engine wiring, M0 correlations/genetics — all must be subject-scoped and callable | The M0 engine logic (status classification, Pearson correlations, cessation phase math) becomes the callable engine service. Subject-scoped invocation is the key addition. |
| **4-week iteration as a first-class system concept** | In incumbents, protocol updates are informal — a practitioner edits a treatment plan. In Zoetrop, each 4-week cycle creates a new versioned protocol with a timestamp, change rationale, and a diff against the prior version. The practitioner has a full lineage. The system can compute what changed and why. | LOW-MEDIUM | Per-client `protocolVersions` scoping (already exists in M0, needs subject scope) | Low complexity because the M0 engine already does versioning — scoping it per-subject is the only addition. The value is high because no incumbent has this concept. |
| **LLM extraction with structured human review (not LLM-as-judge)** | FunctionalMind uses LLM to generate suggestions, and the practitioner reviews citations. Zoetrop uses LLM to extract structured values from a lab PDF, surfaces them in a review UI where the practitioner confirms or corrects each value, and only then writes to the database. The LLM is a parsing accelerator, not a clinical decision-maker. This distinction is the trust signal for practitioners. | HIGH | LLM routing, lab ingest pipeline, review UI, metrics write path | Human review gate is non-negotiable. It is also the defensible clinical-safety differentiator vs. AI-native competitors. |
| **Evidence citations per protocol action** | Fullscript has citations on supplement templates. Zoetrop surfaces evidence citations per variant→protocol mapping (K1 = strong clinical evidence with citation, K4 = speculative/single study). The practitioner can see not just what the engine recommends but why, at the evidence level. | MEDIUM | `variantProtocolMap.citation` field; report template includes citation rendering | Citations make the report defensible to the client and to other practitioners. No incumbent does this at the protocol-action level with confidence grades. |
| **Per-client cessation protocol tracker** | The FAAH-informed 120+ day cessation tracker already exists in M0 for the practitioner's own protocol. Scoped to a client, this becomes a tool for practitioners running cessation programs (a real and underserved practice pattern). | LOW | Subject-scoped cessation log (M0 schema already exists) | Lowest-complexity differentiator at M1 because the engine is already built. Just needs subject scoping. |

### Anti-Features (Deliberately NOT Built at M1)

Features that seem like natural scope but are explicitly out of scope for M1. Building these before M1 is proven destroys focus and is the documented "over-build trap" (PLATFORM.md §7).

| Feature | Why Requested | Why Problematic at M1 | What to Do Instead |
|---------|---------------|----------------------|-------------------|
| **Client-facing app / client portal** | Clients want to see their own data, protocol, progress. Incumbents all have client portals. | The practitioner-side engine must be proven first. Building the client app before M1 traction is the over-build trap (PLATFORM.md §7). Client experience is M2. | Practitioner can share a generated report PDF at M1. Full client app = M2. |
| **Scheduling / calendar** | Practitioners want appointment scheduling. Every incumbent includes it. | Pure scheduling is a commodity (Calendly, Acuity, Cal.com exist). Building it from scratch at M1 costs 4–6 weeks for zero moat. Zoetrop's value is not scheduling. | Integrate or link to Calendly/Cal.com at M1. Do not build. |
| **Billing / payments / invoicing** | Practitioners need to get paid. Practice Better and Healthie both handle billing. | Billing = full compliance surface (PCI, insurance, Stripe). Not the engine. Costs months of engineering. | Stripe billing link or external invoicing at M1. Do not build. |
| **Secure messaging / in-app chat** | Practitioners message clients about protocol updates. Incumbents all have HIPAA-compliant messaging. | HIPAA-compliant messaging is a compliance surface, not a decision surface. At M1 the client isn't even in the app yet. | Use existing secure channel (email, Signal, encrypted HIPAA-compliant email) at M1. M2 adds messaging. |
| **Supplement dispensing integration (Fullscript/Rupa)** | Practitioners want to recommend and dispense supplements from the protocol in-app. | Integration adds an external dependency (Fullscript API), supplier SKU management, and ordering workflow. Not zero work. | Protocol recommendations include supplement names + tiers. Practitioner handles dispensing externally at M1. Wire Fullscript integration at M2. |
| **Multi-coach / multi-practitioner within a tenant** | A practice may have multiple coaches. Practice Better and Healthie support team workflows. | M1 is single-practitioner by design. Multi-coach requires a more complex RBAC model and assignment logic. Get one practitioner working first. | The RLS schema supports it already (tenantId + practitioner assignment). Enable at M3. |
| **Full CRM (lead pipeline, email nurture, marketing automation)** | Practitioners want client acquisition tools. Content calendar, referral tracking. | CRM is a different product. The moat is the decision engine, not lead management. Building CRM risks diluting the engine. | Use HoneyBook, Notion, or a dedicated CRM at M1. PLATFORM.md §7 explicitly guards against this. |
| **Lab ordering (Rupa Health / Evexia / LabCorp integration)** | Practitioners order labs for clients. Deep integrations exist across incumbents. | Lab ordering requires vendor API integrations, ordering workflows, and potentially clinical oversight rules. The M1 need is ingest + parse, not ordering. | Labs are ordered externally, results uploaded to Zoetrop for parsing. Lab ordering = M2+. |
| **Training programs / workout builder** | PLATFORM.md §4 identifies Training as a delivery surface. HIGHER's service model includes neurotyping + training programs. | This is an entire sub-product. Building it before the diagnostic engine proves out is the documented over-build trap. Training programs = M2 delivery surface. | Not in M1. |
| **Nutrition plans / meal planning** | PLATFORM.md §4 identifies Nutrition as a delivery surface. | Same as training — a full sub-product. The engine informs nutrition recommendations; building the meal planner itself is M2+. | Not in M1. |
| **Native mobile app** | Clients and practitioners want mobile access. | React Router 7 produces a PWA that is mobile-accessible. Native app is an enormous additional surface. | PWA is sufficient at M1. No native app. |
| **Real-time push notifications** | Dashboard alerting when biomarkers drift. | Websocket / push infrastructure adds complexity. At M1 client base size, on-demand checks are sufficient. | Polling or manual refresh at M1. Push = M2 when client volume justifies it. |
| **Obsidian vault import (general vault as data source)** | M0 has an Obsidian vault importer. | At M1 the practitioner is importing client data, not personal vault data. The import surface must be lab-focused. | Vault import remains for the practitioner's own reference data. Not a client-data source at M1. |

---

## Feature Dependencies

```
Auth/Identity Layer (roles: owner / practitioner / client)
    └──required by──> Tenant + Subject Scoping (RLS)
                          └──required by──> Per-Client Record (health profile)
                                                └──required by──> Client Intake Capture
                                                └──required by──> Lab Document Upload
                                                └──required by──> Per-Client Protocol Versioning
                                                └──required by──> Practitioner Monitoring Dashboard

Lab Document Upload
    └──required by──> LLM-Assisted Lab Parsing
                          └──required by──> Human Review Gate (review UI → write to metrics)
                                                └──required by──> Multi-Source Synthesis (engine invocation)
                                                └──required by──> Confidence-Graded Report Generation

Genetics Schema (variantProtocolMap + confidence)
    └──required by──> Multi-Source Synthesis
    └──required by──> K1–K4 Confidence in Reports

Per-Client Protocol Versioning
    └──required by──> 4-Week Iteration as System Concept
    └──required by──> Confidence-Graded Report Generation (report attaches to a protocol version)

Audit Trail
    └──required by──> PHI Isolation compliance (HIPAA Technical Safeguard)
    └──requires──> Auth/Identity Layer (need user_id to log)

Consent Capture
    └──required by──> Intake (gate: no record creation without consent)
    └──required by──> PHI compliance baseline
```

### Dependency Notes

- **Auth must be first.** Every other M1 feature is blocked on having an identity layer that produces a `userId` and a `tenantId`. This is the single most blocking dependency in M1.
- **RLS must be wired before any client data is written.** Retrofitting RLS after data is in the database is painful (policies don't backfill isolation guarantees on existing rows). Get RLS right at the schema migration step.
- **Lab parsing requires the genetics + metrics schema to be first-class tables.** The LLM extraction writes to `metrics`; the report generation reads from `metrics` + `variantProtocolMap`. If those schemas are still seed-data, the report cannot be generated.
- **Report generation is a terminal node** — it depends on everything upstream being correct. It is the last feature to build but the first thing the practitioner (HIGHER) wants to see. Work backwards from the report when planning phases.
- **Consent captures depends on nothing** — it is the simplest feature and can be added to intake with minimal work. Do it early to de-risk PHI compliance.

---

## MVP Definition

### Launch With (M1 v1 — Proof Slice for HIGHER)

Minimum feature set for the HIGHER diagnostic pilot: one practitioner, real clients, real labs, a real report.

- [ ] **Auth + roles (owner/practitioner/client)** — gating condition for everything else
- [ ] **Tenant + subject scoping + RLS** — PHI isolation; must be correct from day one
- [ ] **Client roster (list view)** — practitioner can see and navigate to their clients
- [ ] **Per-client health profile** — M0 instrument scoped to a subject (the schema migration)
- [ ] **Client intake form with consent capture** — structured entry point; consent = legal baseline
- [ ] **Lab document upload** — PDF/image upload to storage; raw file stored against client record
- [ ] **LLM-assisted lab parsing + human review gate** — parse → review → confirm → write to `metrics`; this is the time-sink killer
- [ ] **Genetics schema first-class (`geneticVariants` + `variantProtocolMap` + confidence + citation)** — M0 seed data promoted to real tables; prerequisite for the report
- [ ] **Per-client protocol versioning (4-week cadence)** — M0 versioning scoped per-subject; new version per cycle
- [ ] **Confidence-graded lab→protocol report** — the proof slice; K1–K4 grades + evidence citations + human review before generation
- [ ] **Audit trail** — HIPAA Technical Safeguard; log all PHI access
- [ ] **Encryption at rest + in transit** — verify Neon BAA + Netlify TLS; confirm vendor coverage

### Add After Validation (M1 v1.x — Once First Client Is Running)

- [ ] **Practitioner monitoring dashboard (alert view)** — add when there are enough clients to need triage; premature with 1-2 clients
- [ ] **Correlation recompute trigger** — rerun Pearson correlations when new lab data is added; adds automation to what M0 already computes
- [ ] **Protocol version diff view** — visual comparison of what changed between protocol versions; useful once practitioners have 2+ cycles
- [ ] **Basic wearable data display per client** — show WHOOP/HRV per client (data already flows through M0 import); add subject scoping to display
- [ ] **Report versioning** — track which report was generated at which protocol version; needed once reports are being iterated

### Future Consideration (M2+)

- [ ] **Client-facing app / portal** — M2; deferred until M1 proves with a paying tenant
- [ ] **Scheduling integration** — M2; link to Calendly or build minimal wrapper
- [ ] **Fullscript supplement dispensing integration** — M2
- [ ] **Secure in-app messaging** — M2; HIPAA-compliant chat
- [ ] **Lab ordering integration (Rupa/Evexia)** — M2+
- [ ] **Training program builder** — M2 delivery surface
- [ ] **Nutrition plan module** — M2 delivery surface
- [ ] **Multi-coach within tenant** — M3

---

## Feature Prioritization Matrix

| Feature | Practitioner Value | Implementation Cost | Priority |
|---------|-------------------|---------------------|----------|
| Auth + roles | HIGH (blocking) | HIGH | P1 |
| Tenant + subject scoping + RLS | HIGH (PHI gate) | HIGH | P1 |
| Client roster | HIGH | LOW | P1 |
| Per-client health profile (schema migration) | HIGH | HIGH | P1 |
| Client intake + consent | HIGH | MEDIUM | P1 |
| Lab document upload | HIGH | LOW | P1 |
| LLM-assisted lab parsing + human review | HIGH (time-sink killer) | HIGH | P1 |
| Genetics schema first-class | HIGH (engine enabler) | MEDIUM | P1 |
| Per-client protocol versioning | HIGH | MEDIUM | P1 |
| Confidence-graded report | HIGH (proof slice) | HIGH | P1 |
| Audit trail | MEDIUM (legal) | MEDIUM | P1 |
| Encryption / BAA verification | MEDIUM (legal) | LOW | P1 |
| Practitioner monitoring dashboard | HIGH | MEDIUM | P2 |
| Correlation recompute trigger | MEDIUM | MEDIUM | P2 |
| Protocol version diff view | MEDIUM | LOW | P2 |
| Wearable display per client | MEDIUM | LOW | P2 |
| Report versioning | MEDIUM | LOW | P2 |
| Scheduling (external integration) | HIGH (expectation) | LOW (link out) | P2 |
| Fullscript integration | MEDIUM | MEDIUM | P3 (M2) |
| Client portal | HIGH | HIGH | P3 (M2) |
| Secure messaging | MEDIUM | HIGH | P3 (M2) |
| Lab ordering | MEDIUM | HIGH | P3 (M2+) |

**Priority key:**
- P1: Must have for M1 launch (HIGHER diagnostic pilot)
- P2: Add during M1 as client base grows past 1-2 clients
- P3: M2+ scope; do not build at M1

---

## Competitor Feature Analysis

| Feature | Practice Better | Heads Up Health | Optimal DX | FunctionalMind | Zoetrop M1 Approach |
|---------|----------------|-----------------|------------|----------------|---------------------|
| Multi-client roster | Yes — full client list | Yes — multi-client | No (practitioner tool) | Per-case (not roster) | Yes — client list with status flags |
| Lab result ingestion | Manual entry + Rupa/LabCorp integration | 30,000+ lab org import, auto-trend | Manual upload + analysis | PDF upload + LLM extraction | PDF upload + LLM parse + **human review gate** |
| Lab→protocol link | Weak — labs in chart, protocol separate | Visualization only | Rule-based analysis → report | LLM suggestion, practitioner confirms | Engine-derived, confidence-graded, versioned |
| Confidence grading | None | None | Proprietary scoring (not K-graded) | Citation-based (not explicit K grades) | K1–K4 as first-class schema fields + report UI |
| Genetics integration | None | None | None | None (lab panels only) | First-class `variantProtocolMap` with confidence + citation |
| Protocol versioning | Template management only | None | None | None | Per-client versioned lineage; 4-week cadence = new version |
| Human review in LLM flow | N/A | N/A | N/A | Soft (citations for practitioner to review) | Hard gate: LLM extracts, practitioner confirms each value before write |
| Audit trail | Basic (HIPAA-level) | Yes | N/A | Not documented | Append-only log table; all PHI access logged |
| Client intake | Customizable forms (60+ templates) | Limited | N/A | Case intake | Structured intake form + consent capture |
| Practitioner dashboard | Yes — client overview | Yes — customizable per-client | N/A | Case-by-case | Client list + alert flags + lab review queue |
| PHI/HIPAA posture | HIPAA-compliant, BAA available | HIPAA-compliant | N/A | Claims compliance | RLS isolation + encryption + audit trail + consent |

---

## Sources

- [Practice Better features and pricing](https://practicebetter.io/) — HIGH confidence; official product site
- [Practice Better pricing plan comparison](https://help.practicebetter.io/hc/en-us/articles/41860197371291-Practice-Better-Pricing-Plans-and-Features-Comparison) — HIGH confidence; official help docs
- [Heads Up Health functional medicine platform](https://headsuphealth.com/functional-medicine-platform/) — HIGH confidence; official product site
- [Heads Up Health product features](https://headsuphealth.com/product/) — HIGH confidence; official product site
- [Healthie platform overview](https://www.gethealthie.com/platform-overview) — HIGH confidence; official product site
- [Fullscript for providers — supplement protocols](https://fullscript.com/online-plans) — HIGH confidence; official product site
- [Optimal DX functional blood chemistry analysis](https://www.optimaldx.com/) — HIGH confidence; official product site
- [FunctionalMind AI platform](https://functionalmind.ai/) — MEDIUM confidence; official site + John Snow Labs writeup
- [FunctionalMind lab-to-action feature](https://hub.functionalmind.ai/revolutionize-your-practice-introducing-functionalmind-instant-lab-to-action-feature/) — MEDIUM confidence; product blog
- [Biggest challenges for functional medicine practitioners 2025](https://www.cer.bo/post/the-biggest-challenges-facing-functional-medicine-owners-and-practitioners/) — MEDIUM confidence; industry analysis
- [Best functional medicine EMR systems — Fullscript](https://fullscript.com/blog/emr-systems-for-functional-medicine) — MEDIUM confidence; vendor roundup, cross-checked against official product sites
- [Drizzle ORM Row-Level Security docs](https://orm.drizzle.team/docs/rls) — HIGH confidence; official Drizzle docs
- [Neon Postgres RLS introduction](https://neon.com/blog/introducing-neon-authorize) — HIGH confidence; official Neon blog
- [Neon RLS + Drizzle integration guide](https://neon.com/docs/guides/rls-drizzle) — HIGH confidence; official Neon docs
- [Better Auth React Router v7 integration](https://better-auth.com/docs/integrations/react-router) — HIGH confidence; official Better Auth docs
- [HIPAA compliance checklist for SaaS](https://blog.securelayer7.net/hipaa-compliance/) — MEDIUM confidence; security firm analysis cross-checked against HIPAA.gov summaries
- [LLM human-in-the-loop workflow for clinical extraction (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12932350/) — HIGH confidence; peer-reviewed clinical informatics
- [Healthie vs Practice Better comparison](https://www.findemr.com/resources/healthie-vs-practice-better/) — MEDIUM confidence; third-party comparison

---

*Feature research for: practitioner-facing functional-health coaching platform (M1 — single practitioner, multi-client)*
*Researched: 2026-06-07*
