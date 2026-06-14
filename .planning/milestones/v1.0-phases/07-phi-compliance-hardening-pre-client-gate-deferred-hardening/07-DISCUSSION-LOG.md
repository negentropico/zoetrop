# Phase 7: PHI Compliance Hardening — Pre-Client Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
**Areas discussed:** Auth seam, Phase shape + HIPAA cost, AUTH-03/04 scope, Migration mechanics (dissolved), DB host (emerged mid-discussion)

---

## DB host (emerged — superseded the planned "Auth seam" opener)

Context: the first auth-seam question was interrupted. The user expressed uncertainty about the Supabase decision itself, reframed the project as a proof-of-concept / case-study testbed (likely 1–2 pilot tenants, not a full multi-tenant platform), raised the ~$500–1000/mo HIPAA cost concern, and floated self-hosted droplets. A parallel session's cost analysis was pasted in (3-legged BAA chain: DB + Vercel + Anthropic; self-hosting is a false economy; the real lever is timing — defer, don't self-host). Claude added the portability lever: GUC-based RLS policies (`current_setting('app.tenant_id')`) make the RLS engineering host-portable, so the host choice can be deferred to the compliance gate entirely.

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on Neon, portable RLS (Recommended) | No migration now. RLS against GUCs per the Phase 1 spike pattern. Zero migration risk, $0 new spend, host decision deferred to the gate with a fresh cost/BAA comparison. Supersedes the 2026-06-12 Supabase-confirmed decision. | ✓ |
| Migrate to Supabase Pro now | ~$25/mo. Honors the confirmed decision; driver swap + cutover while stakes are low; HIPAA add-on deferred. | |
| Decide after a cost comparison | Run the 2026 pricing/BAA comparison first, then pick with numbers in hand. | |

**User's choice:** Stay on Neon, portable RLS
**Notes:** Self-hosted droplet explicitly rejected (recorded as D-03 so it isn't relitigated). The 07-RESEARCH.md Supabase migration mechanics are preserved as Phase 8 inputs.

---

## Auth seam

Settled by collapse: with no Supabase in Phase 7 there is no GoTrue alternative — Better-Auth stays untouched (research Option B outcome reached without a separate selection). The original 3-option question (Keep Better-Auth / Replace with Supabase Auth / Hybrid) was presented but interrupted by the host reframing above.

**User's choice:** Keep Better-Auth (by collapse)

---

## Phase shape + HIPAA cost

The split (engineering now / compliance at gate) and cost timing (pay when a client funds it) were settled by the user's host discussion. Remaining structural question:

| Option | Description | Selected |
|--------|-------------|----------|
| Split into two phases (Recommended) | Phase 7 = RLS engineering now; new Phase 8 = Compliance Envelope & Host Gate, planned when HIGHER's first client is imminent. | ✓ |
| One phase, two waves | Single Phase 7 with an indefinitely-open Wave 2. | |
| Phase 7 = engineering only, gate as checklist | BAA envelope lives in COMPLIANCE-RUNBOOK.md only; COMP-02/03 lose a phase home. | |

**User's choice:** Split into two phases
**Notes:** COMP-02/03 re-map to Phase 8; TEN-02/03 + AUTH-03/04 close in Phase 7. Roadmap edit + REQUIREMENTS.md traceability update recorded as follow-up actions.

---

## AUTH-03 — practitioner→subject assignment

| Option | Description | Selected |
|--------|-------------|----------|
| Tenant isolation only (Recommended) | Per-assignment moot for single-practitioner pilot; defer table to M2. | |
| Add assignment table now | practitioner_subject_assignments + RLS policy + minimal management UI; satisfies AUTH-03 literally while policies are being authored anyway. | ✓ |
| Schema now, enforcement later | Table + backfill now, per-assignment checks at M2. | |

**User's choice:** Add assignment table now
**Notes:** Consistent with the user's "built correctly and scalable" framing — defer spend, not correctness. Claude's tenant-only recommendation was declined.

---

## AUTH-04 — immutable audit log

| Option | Description | Selected |
|--------|-------------|----------|
| RLS no-delete/no-update policy (Recommended) | INSERT+SELECT policies only; DB-layer enforcement, zero new infrastructure. | ✓ |
| No-delete policy + REVOKE + trigger | Belt-and-suspenders; more DDL to maintain. | |
| Defer hardening to Phase 8 | AUTH-04 couldn't close in Phase 7. | |

**User's choice:** RLS no-delete/no-update policy

---

## Migration mechanics (dissolved)

Selected for discussion but dissolved by the Neon decision — cutover window, pg_dump fixups, driver swap, and the SUPABASE_SERVICE_ROLE_KEY project-state question all moved to Phase 8. (Scout finding preserved: root `.env` has `SUPABASE_SERVICE_ROLE_KEY` but no `SUPABASE_URL`/`SUPABASE_JWT_SECRET` — project state unconfirmed; resolve at Phase 8 if Supabase wins the comparison.)

## Claude's Discretion

- Connection-role topology (NOBYPASSRLS app role vs FORCE RLS), GUC names, service-role bypass path
- `withTenantDb` signature/layout + ctx derivation from session
- Isolation + pool-leak test mechanics (live-DB CI gating)
- Assignment-management UI placement (likely `/settings`) per UI-SPEC
- Auth-event list + Better-Auth hook mechanism for audit logging
- `consent_log` policy shape (subject-only vs tenant+subject)

## Deferred Ideas

- **Phase 8 — Compliance Envelope & Host Gate** (new phase, roadmap edit required): host cost/BAA comparison, possible migration, Vercel + Anthropic BAAs, pgAudit/SELECT-logging verification, runbook completion. Trigger: first external client imminent.
- Memory update: `supabase-migration-upcoming-phases` superseded — migration no longer confirmed-for-Phase-7.
- Per-assignment client-facing visibility — M2.
