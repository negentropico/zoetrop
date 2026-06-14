# Phase 5: Lab Ingest Pipeline - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A practitioner uploads a lab PDF for a subject → the system asynchronously extracts structured candidate metrics with LLM assistance → every value is grounded to verbatim source text and physiological-range-checked before review → the practitioner reviews each field side-by-side with the source document and approves/edits/rejects individually → only approved metrics are written to the `metrics` table (tenant/subject-scoped) with audit logging → consent is captured at intake before any PHI write.

**Locked by ROADMAP success criteria (do NOT re-decide):** the upload→processing→pending_review→approved state machine; the 2-second non-blocking upload return; per-value `sourceTextSnippet` grounding with ungrounded→`confidence=low`; physiological-range `rangeFlag`; field-level review with no bulk-approve bypass; the `auditLog` entry shape on metric insert (`{userId, role, table, operation, tenantId, subjectId, timestamp}`, no PHI values); and the `consentLog` record (`{subjectId, consentedAt, consentVersion}`) gating writes.

**Out of scope (other phases):** report generation (Phase 6); RLS enforcement + Neon/Vercel/LLM BAAs + pgAudit verification + cross-tenant isolation (Phase 7); scanned/photo (image-only) lab ingest via vision/OCR (deferred — see Deferred Ideas).
</domain>

<decisions>
## Implementation Decisions

### Metric Reconciliation (LAB-03 → metrics)
- **D-01:** Extracted analytes map into the canonical 9-category taxonomy via a **curated lab-analyte → metric dictionary**. The dictionary is the authoritative source of `name`, `category`, `subcategory`, `unit`, and `referenceMin/Max` + `optimalMin/Max` for each known analyte. The LLM's job is to **map an extracted line to a dictionary key + read its value/unit**, NOT to invent category or clinical reference ranges.
- **D-02:** Analytes **not** in the dictionary are **never silently dropped**. They surface in the review UI as unrecognized values for the practitioner to either assign to a metric (or skip). This is the explicit fallback path.
- **D-03:** v1 dictionary scope = **owner's existing M0 analytes + standard common panels**. Seed it from the analytes already present in the owner's `metrics` rows (so the owner's real labs round-trip cleanly) PLUS the standard common panels: CBC, CMP/metabolic, lipids, thyroid, vitamins/minerals, hs-CRP/homocysteine. Not a comprehensive hundreds-of-analytes reference set (deferred burden).
- **D-04:** Unit handling lives in the dictionary — each dictionary entry pins the canonical `unit`; the physiological-range check (criterion 3) runs against the dictionary's bounds for that metric+unit. (Researcher: determine whether unit conversion/normalization is needed when a lab reports an alternate unit, or whether mismatched-unit values route to the unrecognized/review path.)

### Document Scope + Source View (LAB-01 / LAB-04)
- **D-05:** Pilot accepts **text-extractable PDFs only** (the common lab-portal export). This guarantees a verbatim `sourceTextSnippet` is available for grounding (criterion 2).
- **D-06:** The review UI (`/ingest/review`) **renders the actual PDF page** beside the extracted fields, with the grounded `sourceTextSnippet` highlighted/located on the page. This is the side-by-side verification surface (criterion 4).
- **D-07:** Scanned/photo (image-only) labs requiring vision/OCR are **out of scope for this phase** — deferred to a later slice.

### Consent Model (LAB-06)
- **D-08:** Consent is captured via a **self-consent gate at first upload** for the single-user pilot (the owner IS the subject). Author a `consentVersion` string now (e.g. `v1-pilot-self`); the first time the owner-subject's data is uploaded, present the consent gate; persist `consentLog{subjectId, consentedAt, consentVersion}`; **block any data write for that subject until a consentLog row exists**. This exercises the real gate end-to-end before any external client touches it.
- **D-09:** The consent UI/flow is built generically enough to serve future client intake (the eventual client flow captures consent at subject creation), but the pilot exercises it at upload.

### Async Mechanism + Processing UX (LAB-02)
- **D-10:** Upload action commits a `labDocuments` row with `status='uploaded'` and returns within 2s (criterion 1), then kicks LLM extraction via a **Vercel background function** (`waitUntil` / fluid compute) — **no managed queue, no separate vendor** for the pilot.
- **D-11:** The review/list view **polls document status**, surfacing status badges across the lifecycle (`uploaded → processing → pending_review`). Extraction completion is observed by status change, not push.
- **D-12:** (Researcher: confirm the Vercel background-function execution model on the current plan — `waitUntil` duration limits / fluid compute — and whether extraction of a multi-page PDF fits within the function timeout, or needs chunking. If background execution proves unreliable, the fallback is a Vercel Cron worker draining a job table — but DB-status + background is the chosen default.)

### Audit Logging (LAB-05)
- **D-13:** The `auditLog` table (greenfield) records **key lifecycle events**, not just the mandated metric insert: `upload`, `extraction-complete`, `approve`, `reject`, and `metric-insert`. Each entry is `{userId, role, action, table, operation, tenantId, subjectId, timestamp}` with **no PHI field values** in the log (criterion 5 constraint applies to all entries).

### Cross-cutting constraints (locked from project context — not re-asked)
- **D-14:** **LLM = Anthropic Claude via the standard subscription API, no-training default.** Per the pilot-first re-scope (PROJECT.md Key Decisions, 2026-06-08): single-user/owner extraction may run on the standard subscription API. **Extraction of any external client's PHI stays blocked until the Phase 7 LLM BAA** is signed and recorded. Model selection (vision-capable vs text, PDF support, structured tool-use output) → researcher.
- **D-15:** **Write-side `assertSubjectAccess` enforcement.** The approve→insert path MUST call `assertSubjectAccess` before writing a metric (and before any subject-scoped write). This closes the write-path slice of CR-01 (`assertSubjectAccess` currently has no callers — see 04-REVIEW.md). The read-path CR-01 fix and full RLS remain Phase 7.
- **D-16:** New schema tables (`labDocuments`, `labExtractions`, `auditLog`, `consentLog`) carry `tenantId`/`subjectId` in line with the Phase 3 tenancy model and go through a Drizzle migration (DATA-03 discipline). A `lab` value likely needs adding to `dataSourceEnum` (currently `manual|whoop|dexa|bloodwork|csv|vault`) for metrics written from ingest — researcher/planner to confirm vs reusing `bloodwork`.

### Claude's Discretion
- Exact dictionary data structure / storage (TS module vs DB table) — planner's call, consistent with the "no PHI in client bundle" rule (the dictionary is non-PHI reference data).
- Duplicate-upload / re-extraction / already-exists-for-date handling — sensible default (allow; no dedupe for pilot) unless research surfaces a reason.
- PDF page rendering approach in the browser (pdf.js / embed / page-image) — planner, against the Phase 4.1 `UI-SPEC.md`.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §"Phase 5: Lab Ingest Pipeline" — the 6 locked success criteria (state machine, grounding, range-check, review, audit, consent)
- `.planning/REQUIREMENTS.md` — LAB-01 … LAB-06 (and the Phase-7-deferred COMP-02/03, TEN-02/03, AUTH-03/04 that gate external-client PHI)

### Design contract (UI is built against this)
- `remix-app/` — Phase 4.1 `UI-SPEC.md` is the binding design contract for the upload + review surfaces (locate the committed UI-SPEC.md from Phase 4.1; the `Dropzone` component and brand tokens are already in `app/components/ui/`)

### Compliance / pilot-first boundary
- `.planning/PROJECT.md` §"Key Decisions" + §"Constraints" — pilot-first re-scope: standard-tier infra + subscription API now; PHI hardening + LLM BAA at Phase 7 (the external-client gate)
- `docs/COMPLIANCE-RUNBOOK.md` — Phase-7 hardening checklist incl. LLM-provider BAA register (DECISION-02)
- `docs/PLATFORM.md` §5.7 — PHI posture / why the gate is deferred
- `docs/PRINCIPLES.md` — engineering constraints (TS strict / no `any`; LLM = extraction + drafting only, human review always in the loop; engine integrity)

### Known carry-forward concern
- `.planning/phases/04-static-to-db-data-layer-migration/04-REVIEW.md` — CR-01: `assertSubjectAccess` has no callers (client-role can read owner PHI). Phase 5 must wire it on the write path (D-15); full read-path/RLS fix is Phase 7.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `remix-app/app/components/ui/Dropzone.tsx` — existing upload dropzone component; reuse for `/ingest/upload`.
- `remix-app/app/routes/_app/import/whoop.tsx` + `import/vault.tsx` — the parse-but-don't-persist precedent (and the `import/` layout). Lab ingest is the "now it persists, with review" evolution; mirror the route-folder + layout pattern.
- `remix-app/app/lib/authz.server.ts` — `requireUser`, `requireRole`, `assertSubjectAccess`, `CAPABILITIES`, `can`. `assertSubjectAccess` (line 61) is the helper D-15 wires onto the write path.
- `remix-app/app/lib/data.server.ts` / `db-mappers.server.ts` — the tenant-scoped read/mapper layer from Phase 4; the metric-write path should follow the same `getOwnerSubject` → tenant/subject-scoped pattern.

### Established Patterns
- All `_app` routes authenticate via `requireUser` → tenant/subject-scoped DB reads (Phase 4). New ingest routes live under `_app/` and follow this.
- Explicit route table in `remix-app/app/routes.ts` (RouteConfig — `index`/`route`/`layout`), NOT file-name convention. Add `ingest/upload` + `ingest/review` (likely a new `ingest/` layout) here.
- Drizzle migrations discipline (DATA-03): all schema changes via `npm run db:generate` → reviewed migration → `npm run db:migrate`. The 4 new tables + likely `dataSourceEnum` extension go through this.
- Skip-guarded live-Neon tests (`tests/db/*`, `tests/parity/*`) gated on `DATABASE_URL` — extend this pattern for ingest DB tests. (Note: `.env` connection strings contain `&`; export vars rather than `source .env`.)
- `metrics` table shape (schema.ts:92) is the write target: `name, value, unit, category(enum), subcategory, timestamp, referenceMin/Max, optimalMin/Max, improvement, source, tenantId, subjectId` — the dictionary must supply everything the LLM doesn't read off the document.

### Integration Points
- New tables `labDocuments` / `labExtractions` / `auditLog` / `consentLog` join the existing 8+ tenant-scoped tables in `remix-app/db/schema.ts`.
- Approved extraction → `metrics` insert is the terminal write; it reuses the Phase-4 tenant/subject scoping and adds `assertSubjectAccess` (D-15) + `auditLog` write (D-13) + `consentLog` precondition (D-08).
- LLM extraction is a new outbound integration (Anthropic) — first one in the app; no prior LLM/job infra exists (`INTEGRATIONS.md`).
</code_context>

<specifics>
## Specific Ideas

- The dictionary is the linchpin: it lets the LLM stay a *mapper/reader* (low clinical risk) while the app owns category + reference ranges. Seed it so the **owner's own labs round-trip first**, then common panels.
- Review fidelity matters: the user wants the **real PDF page** on screen during review, with the grounded snippet located — not a text-only abstraction.
- Exercise the consent gate **on yourself** in the pilot rather than seeding past it — the point is to prove the gate works before a client hits it.
</specifics>

<deferred>
## Deferred Ideas

- **Scanned/photo (image-only) lab ingest via vision/OCR** — out of scope for Phase 5 (text-extractable PDFs only). Revisit as a follow-on slice once the text-PDF pipeline is proven.
- **Managed durable queue (Inngest/QStash) for extraction** — not for the n=1 pilot; the DB-status + Vercel-background default is sufficient. Reconsider at multi-client scale (Phase 7+ / M2).
- **Comprehensive hundreds-of-analyte reference dictionary** — deferred curation burden; v1 is owner panels + common panels.
- **External-client PHI extraction** — blocked until the Phase 7 LLM BAA (not a deferral of Phase 5 build, a hard compliance gate on *using* it for non-owner PHI).

None of the above are scope creep into Phase 5 — they are explicit boundaries recorded so they're not lost.
</deferred>

---

*Phase: 5-lab-ingest-pipeline*
*Context gathered: 2026-06-10*
