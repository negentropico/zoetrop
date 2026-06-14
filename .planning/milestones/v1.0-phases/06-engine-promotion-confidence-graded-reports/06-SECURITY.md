---
phase: 06
slug: engine-promotion-confidence-graded-reports
status: verified
threats_open: 0
threats_found: 9
threats_closed: 9
asvs_level: 2
created: 2026-06-12
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| corpus seed → DB | Build-time author writes non-PHI population knowledge rows | Non-PHI gene/variant/rule text; no subject identifiers |
| schema enum reuse | evidence_tier must not collide with confidence_level | Postgres enum type namespace |
| client → /reports/generate | Untrusted role + form input crosses into a DB write | Role claim; subjectId resolution |
| client → /reports/:reportId | Cross-tenant report read attempt (IDOR) | Frozen report snapshot (PHI-adjacent) |
| corpus text → report body | Pre-hedged corpus content assembled deterministically | No LLM, no PHI egress |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-06-PHI-CORPUS | Information Disclosure | geneticVariants / variantProtocolMap / metricProtocolMap | mitigate | Corpus tables declared with no tenantId/subjectId columns; schema comment documents D-06; corpus-schema.test.ts asserts absence of tenant_id/subject_id on all three tables | closed |
| T-06-ENUM | Tampering | evidence_tier vs confidence_level | mitigate | evidenceTierEnum('evidence_tier', ['k1','k2','k3','k4']) is a distinct pgEnum; schema comment documents distinction from confidenceLevelEnum; evidenceTier is .notNull() on variantProtocolMap and metricProtocolMap; corpus-schema.test.ts asserts is_nullable='NO' | closed |
| T-06-EOP | Elevation of Privilege | /reports/generate action | mitigate | requireRole(user, ['owner','practitioner']) called immediately after requireUser in the action; client role throws 403 Response before any data access | closed |
| T-06-IDOR | Information Disclosure | /reports/:reportId loader | mitigate | Two-layer defense: (1) getReport(reportId, user.tenantId!) tenant-scopes the DB query so cross-tenant id returns null → 404 before any row loads into memory (CR-01 fix); (2) assertSubjectAccess(user, { tenantId: report.tenantId }, user.tenantId!) as belt-and-suspenders second layer | closed |
| T-06-INPUT | Tampering | subjectId form field | mitigate | No raw form subjectId value is read in the action; subject is resolved entirely via getOwnerSubject(user.tenantId!) — the form renders a static display-only div with no input element | closed |
| T-06-PHI-SNAP | Information Disclosure | reports.snapshot jsonb | mitigate | reports row has tenantId + subjectId NOT NULL FKs; row is read-gated by assertSubjectAccess; snapshot stores recommendation text + evidenceTier + metric name/status/value/unit and gene/genotype/assaySource — no rsid strings (rsid is in non-PHI corpus geneticVariants, not in subject_genotypes or snapshot) | closed |
| T-06-REG | Regulatory | report body language | mitigate | No LLM in render path (report-generator.server.ts comment D-13; no @anthropic-ai import in file); body assembled from pre-hedged corpus text; corpus-lint.test.ts asserts IMPERATIVE_PATTERNS absent from all corpusSeedData recommendationText; DisclaimerCallout.tsx hard-codes locked K4 disclaimer string; RecommendationBlock renders DisclaimerCallout when kLevel === 'K4' | closed |
| T-06-MUT | Tampering | reports row mutability | mitigate | No db.update(reports) call exists in report-generator.server.ts; reports row written via db.insert with crypto.randomUUID() per invocation (D-17); no edit/update/delete route for reports in routes.ts | closed |
| T-06-SC | Tampering | npm installs | accept | Zero new runtime dependencies added in Phase 6 — only package.json change in Phase 6 commits was adding the db:seed-corpus npm script (commit a0454a8); @anthropic-ai/sdk was added in Phase 5 (commit e35899a) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-SC | Phase 6 adds zero new runtime npm packages. The only package.json change was a new npm script entry (db:seed-corpus). Pre-existing @anthropic-ai/sdk was added in Phase 5 per its own security gate. No new supply-chain surface introduced in Phase 6. | orchestrator (plan-time) | 2026-06-12 |

---

## Evidence Detail

### T-06-PHI-CORPUS
- `remix-app/db/schema.ts:501-521` — geneticVariants table: no tenantId/subjectId columns; comment "NO tenantId/subjectId — D-06"
- `remix-app/db/schema.ts:526-543` — variantProtocolMap: no tenantId/subjectId
- `remix-app/db/schema.ts:549-565` — metricProtocolMap: no tenantId/subjectId
- `remix-app/tests/db/corpus-schema.test.ts:76-111` — asserts tenant_id/subject_id absent on all three corpus tables (information_schema query returns 0 rows)

### T-06-ENUM
- `remix-app/db/schema.ts:499` — `export const evidenceTierEnum = pgEnum('evidence_tier', ['k1', 'k2', 'k3', 'k4']);`
- `remix-app/db/schema.ts:497-498` — comment: "evidence_tier ('k1'|'k2'|'k3'|'k4') — DISTINCT from confidence_level ('high'|'low')"
- `remix-app/db/schema.ts:530` — variantProtocolMap.evidenceTier: `evidenceTierEnum('evidence_tier').notNull()`
- `remix-app/db/schema.ts:556` — metricProtocolMap.evidenceTier: `evidenceTierEnum('evidence_tier').notNull()`
- `remix-app/db/schema.ts:62` — confidenceLevelEnum is a separate pgEnum('confidence_level') — no collision
- `remix-app/tests/db/corpus-schema.test.ts:56-75` — asserts is_nullable='NO' on evidence_tier column for both tables

### T-06-EOP
- `remix-app/app/routes/_app/reports/generate.tsx:40-41` — `requireUser(request)` then `requireRole(user, ["owner", "practitioner"])`
- `remix-app/app/lib/authz.server.ts:43-52` — requireRole throws `new Response("Forbidden", { status: 403 })` for unauthorized roles

### T-06-IDOR
- **DB layer (CR-01 fix):** `remix-app/app/lib/data.server.ts:197-204` — `getReport(id: string, tenantId: string)` uses `and(eq(reports.id, id), eq(reports.tenantId, tenantId))`; cross-tenant id returns null
- **Application layer:** `remix-app/app/routes/_app/reports/detail.tsx:53` — `getReport(reportId, user.tenantId!)`
- **Application layer:** `remix-app/app/routes/_app/reports/detail.tsx:57` — `assertSubjectAccess(user, { tenantId: report.tenantId }, user.tenantId!)`
- `remix-app/app/lib/authz.server.ts:61-74` — assertSubjectAccess throws 403 for tenantId mismatch or subject mismatch

### T-06-INPUT
- `remix-app/app/routes/_app/reports/generate.tsx:44` — `getOwnerSubject(user.tenantId!)` resolves subject from tenant
- `remix-app/app/routes/_app/reports/generate.tsx:74-104` — form contains no `<input name="subjectId">` element; the subject display is a read-only `<div>` with no name attribute; action reads no form field for subjectId

### T-06-PHI-SNAP
- `remix-app/db/schema.ts:570-581` — reports table: tenantId + subjectId NOT NULL FKs; `snapshot: jsonb('snapshot').notNull()`
- `remix-app/app/lib/report-generator.server.ts:205-209` — genotypeList stores only gene/genotype/assaySource (no rsid)
- `remix-app/app/routes/_app/reports/detail.tsx:53,57` — read-gated by getReport(tenantId-scoped) + assertSubjectAccess

### T-06-REG
- `remix-app/app/lib/report-generator.server.ts:9` — comment "D-13: NO LLM in this path"
- No `@anthropic-ai`, `anthropic`, `extractionWorker`, or `claude` import in report-generator.server.ts (grep confirmed zero matches)
- `remix-app/tests/lib/corpus-lint.test.ts:35-57` — IMPERATIVE_PATTERNS (you should/must/need to/have to) asserted absent from all corpusSeedData.variantRules and metricRules
- `remix-app/app/components/ui/DisclaimerCallout.tsx:9-10` — K4_DISCLAIMER string hard-coded; comment "DO NOT add a prop to override the string"
- `remix-app/app/components/ui/RecommendationBlock.tsx:132-133` — `{kLevel === "K4" && <DisclaimerCallout />}`

### T-06-MUT
- `remix-app/app/lib/report-generator.server.ts:214-224` — `db.insert(reports).values({...})` with `crypto.randomUUID()`; no db.update call
- Grep for `db.update(reports)` in report-generator.server.ts returns zero matches
- `remix-app/app/routes.ts:43-45` — three reports routes: index, generate, detail; no edit/update/delete route registered

### T-06-SC
- `git log --oneline remix-app/package.json` confirms last Phase-6 touch was commit `a0454a8` (feat(06-02))
- `git show a0454a8 -- remix-app/package.json` shows only `+"db:seed-corpus": "tsx ..."` added (a script, not a dependency)
- `@anthropic-ai/sdk` present in dependencies since commit `e35899a` (chore(05-01): install 4 lab-ingest packages) — pre-Phase-6

---

## Unregistered Threat Flags

The following threat flags were declared in SUMMARY.md `## Threat Flags` sections:

| Flag | Source | Maps To | Classification |
|------|--------|---------|----------------|
| threat_flag: auth-gated-write (generate.tsx) | 06-05-SUMMARY.md | T-06-EOP, T-06-INPUT, T-06-IDOR | Informational — maps to registered threats, all CLOSED |
| threat_flag: auth-gated-read (detail.tsx) | 06-05-SUMMARY.md | T-06-IDOR | Informational — maps to registered threat, CLOSED |

06-02-SUMMARY.md `## Threat Flags`: "None" (no new flags).

No unregistered flags without a threat mapping.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-12 | 9 | 9 | 0 | gsd-security-auditor (Claude Sonnet 4.6) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-12
