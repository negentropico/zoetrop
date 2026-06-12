# Phase 7: PHI Compliance Hardening — Pre-Client Gate - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

**Phase 7 is the RLS + isolation engineering slice, executed now, on Neon.** The compliance envelope (BAAs, HIPAA tiers, pgAudit verification, host cost comparison + possible migration) is split out to a **new Phase 8 — Compliance Envelope & Host Gate**, planned only when the first external client (HIGHER) is imminent.

Phase 7 delivers, on the **existing Neon project** (`orange-paper-97068012`):

1. **Atomic RLS enable + policies** on all tenant/subject-scoped tables (the 8 original data tables + Phase 5–6 additions: `subject_genotypes`, `lab_documents`, `lab_extractions`, `audit_log`, `consent_log`, `reports`, plus tenant-scoped `subjects`/`invites` per the research table) — written **host-portably** against `current_setting('app.tenant_id')` / `current_setting('app.subject_id')` GUCs, NOT Supabase's `auth.jwt()`.
2. **`withTenantDb(ctx, fn)` transaction wrapper** issuing `SET LOCAL` (transaction-scoped `set_config(..., TRUE)`) — retrofitted at the `getDb()` boundary already marked with "Phase 7" comments in `data.server.ts`, `consent.server.ts`, `audit.server.ts`. A pool-reuse leak test proves no context bleed (TEN-03).
3. **Cross-tenant isolation proof** committed to CI: Tenant A writes, Tenant B reads zero; WITH CHECK rejects mismatched-tenant inserts (TEN-02).
4. **AUTH-03 full scope:** new `practitioner_subject_assignments` table + RLS policy + minimal assignment-management UI; `assertSubjectAccess` extended to per-assignment checks for practitioners.
5. **AUTH-04:** `audit_log` made immutable via RLS (INSERT+SELECT policies only — no UPDATE/DELETE policy for the app role); Better-Auth auth events (sign-in/out, etc.) wired into the audit log.

**Requirements:** TEN-02, TEN-03, AUTH-03, AUTH-04 close in Phase 7. **COMP-02, COMP-03 move to Phase 8.**

**Out of scope (→ Phase 8):** Neon→Supabase (or any host) migration; driver swap; all BAAs (DB host, Vercel, Anthropic); HIPAA plan tiers; pgAudit / PHI SELECT-logging verification; PITR/SSL/network-restriction hardening. **Out of scope entirely:** Supabase Auth / GoTrue — Better-Auth stays.
</domain>

<decisions>
## Implementation Decisions

### DB host + portability (supersedes the 2026-06-12 "Supabase confirmed" decision)
- **D-01:** **Stay on Neon for Phase 7. No migration now.** The project is reframed as a proof-of-concept / case-study testbed (likely 1–2 pilot tenants, not a full multi-tenant platform); the migration buys nothing the engineering needs. The 2026-06-12 Neon→Supabase decision is **superseded**: the host choice becomes a pure pricing/BAA decision deferred to Phase 8, decided with a fresh cost comparison (Supabase Team+HIPAA vs Neon HIPAA vs AWS RDS vs DO managed).
- **D-02:** **RLS policies are written host-portably** against plain Postgres GUCs — `current_setting('app.tenant_id')` / `current_setting('app.subject_id')` — exactly the pattern the Phase 1 spike validated on Neon (`01-SPIKE-FINDINGS.md`: SET LOCAL under a NOBYPASSRLS role). No JWT signing, no `SUPABASE_JWT_SECRET`, no `request.jwt.claims`. Same SQL must run unmodified on Neon, Supabase, or RDS so the Phase 8 host decision never re-opens the RLS layer.
- **D-03:** **Self-hosted droplet rejected** — a raw droplet still requires a DO BAA while shifting every HIPAA Security Rule control (encryption, audit, backup/DR, patching, breach response) onto a solo operator with no attestation to show clients. False economy; recorded so it isn't relitigated.

### Auth seam
- **D-04:** **Better-Auth stays, untouched** (research Option B, made moot-by-collapse: with no Supabase in Phase 7 there is no GoTrue alternative). Sessions, the Phase 3.1 invite model, `drizzleAdapter`, and all loader wiring are unchanged. Better-Auth tables (`user`, `session`, `account`, `verification`, `invites`) do **NOT** get tenant-scoped RLS (research Pitfall 4 — adapter queries run pre-JWT/pre-context). Corpus tables (`genetic_variants`, `variant_protocol_map`, `metric_protocol_map`) stay RLS-free non-PHI population knowledge via `corpus.server.ts` `getDb()` (existing code comment honored).

### Phase shape + cost timing
- **D-05:** **Split into two phases.** Phase 7 = RLS + isolation engineering (this phase, now). **New Phase 8 = "Compliance Envelope & Host Gate"** — added to ROADMAP via a roadmap edit (follow-up action): all BAAs, HIPAA tier purchase, pgAudit verification, PHI SELECT-logging, host cost comparison + possible migration. Phase 8 is the hard release gate for multi-client launch; it is planned when HIGHER's first client is imminent.
- **D-06:** **Pay for compliance the month a client funds it, not before.** n=1 owner data carries no BAA obligation, so the compliant-envelope cost today is $0; the ~$950/mo-class spend (whoever wins the comparison) starts at the Phase 8 gate. The 07-RESEARCH.md Supabase migration mechanics (pg_dump fixups, postgres-js driver swap, Supavisor `prepare:false`, env-var changes) are preserved as **Phase 8 inputs**, not Phase 7 work.

### AUTH-03 — practitioner→subject assignment
- **D-07:** **Full scope now:** create `practitioner_subject_assignments` (tenant-scoped) + RLS policy + a **minimal** assignment-management UI; extend `assertSubjectAccess` so practitioners pass only for subjects assigned to them (owner retains tenant-wide access). Chosen over pilot-sufficient tenant-only isolation because the user wants it built correctly and scalable while the RLS policies are being authored anyway. UI stays minimal — an owner-facing assign/unassign surface, not a management console.

### AUTH-04 — immutable audit log
- **D-08:** Immutability via **RLS policy shape**: `audit_log` gets INSERT+SELECT policies only; with RLS enabled and no UPDATE/DELETE policy, the app role cannot modify or delete rows. No trigger, no external service for M1.
- **D-09:** AUTH-04 also requires **auth events** (not just the Phase 5 ingest lifecycle events) in the audit log — wire Better-Auth sign-in/sign-out (and sensible related events, e.g. failed sign-in, invite redemption, role change) into `audit_log` writes. Exact event list + hook mechanism = Claude's discretion.

### Cross-cutting constraints (carried forward — not re-asked)
- **D-10:** The RLS retrofit on 8 live tables is the highest-risk migration of the milestone (STATE.md concern): **rehearse on a Neon branch first; RLS enable + policies land in one atomic migration**; rollback path verified before applying to the live project. Migration discipline per DATA-03 (`db:generate` → reviewed migration → `db:migrate`).
- **D-11:** App-layer authz (`requireRole`/`can`/`assertSubjectAccess`) remains the first line; RLS is the DB-layer backstop — the two must agree (Phase 3.1 design intent). TS strict / no `any`.

### Claude's Discretion
- Connection-role topology on Neon (dedicated NOBYPASSRLS app role vs current role + FORCE RLS), GUC names, and how the service-role/admin path (Better-Auth + corpus + migrations) bypasses RLS — follow the Phase 1 spike findings.
- `withTenantDb` signature/file layout; how `ctx` is derived from the session; whether `audit.server.ts` writes go through `withTenantDb` or an admin path (insert-only).
- Cross-tenant isolation + pool-leak test mechanics (live-DB gated by env var in CI, test-tenant setup/teardown), consistent with the existing `DATABASE_URL_UNPOOLED||DATABASE_URL` skip-guard pattern.
- Assignment-management UI placement (likely under `/settings`) and its exact shape, against the Phase 4.1 UI-SPEC.
- Auth-event list + Better-Auth hook mechanism for D-09.
- Whether `consent_log` (subject-only scoping) gets a subject-scoped policy or tenant+subject like the rest — follow the research's table-by-table RLS map.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/phases/07-phi-compliance-hardening-pre-client-gate-deferred-hardening/07-RESEARCH.md` — Decision areas D1–D7 (now resolved here), the table-by-table RLS map (§Decision Area 2), pitfalls 2–4 (WITH CHECK, SET LOCAL transaction scoping, Better-Auth/RLS conflict), and the Supabase migration mechanics **preserved as Phase 8 inputs**. NOTE: its Supabase-era recommendation (JWT signing, `auth.jwt()`, postgres-js driver swap) is superseded by D-01/D-02 — Phase 7 stays on Neon with plain GUCs.
- `.planning/ROADMAP.md` §"Phase 7: PHI Compliance Hardening" — success criteria; SC1–SC4 and SC6 (BAAs, HIPAA tiers, pgAudit, SELECT logging) move to the new Phase 8; SC5 + SC7 (RLS/withTenantDb/isolation, AUTH-03/04) are this phase. Roadmap edit required (see Deferred/Follow-ups).
- `.planning/REQUIREMENTS.md` — TEN-02, TEN-03, AUTH-03, AUTH-04 (Phase 7); COMP-02, COMP-03 (re-map to Phase 8).

### Proven mechanism + compliance trail
- `.planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md` — the validated SET LOCAL + NOBYPASSRLS pattern this phase implements.
- `docs/COMPLIANCE-RUNBOOK.md` — per-vendor BAA registers + pgAudit status + carry-forwards; Phase 7 records the engineering-done/envelope-deferred state here; Phase 8 completes it.
- `docs/PLATFORM.md` §5.7 — PHI posture and the pre-client gate framing.

### Tenancy + authz code seams (the retrofit boundary)
- `remix-app/app/lib/db.server.ts` — `getDb()`; `withTenantDb` lands beside it.
- `remix-app/app/lib/data.server.ts`, `remix-app/app/lib/consent.server.ts`, `remix-app/app/lib/audit.server.ts` — carry explicit "Phase 7 withTenantDb retrofit boundary" comments; these are the exact call sites to convert.
- `remix-app/app/lib/authz.server.ts` — `requireRole`/`can`/`assertSubjectAccess`; AUTH-03 per-assignment extension point; its header comments describe the intended Phase 7 mirror.
- `remix-app/app/lib/corpus.server.ts`, `remix-app/app/lib/auth.server.ts`, `remix-app/app/lib/invites.server.ts` — explicitly NOT retrofitted (non-PHI corpus / Better-Auth managed).
- `remix-app/db/schema.ts` — all table definitions incl. `tenantId`/`subjectId` columns (Phase 3) and the Phase 5–6 tables.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 1 spike findings**: SET LOCAL under NOBYPASSRLS proven on a disposable Neon branch — the implementation recipe for D-02.
- **`getDb()` isolation boundary**: tenant-scoped DB access already funnels through 3 files with "Phase 7" markers; the retrofit is surgical, not a sweep.
- **`assertSubjectAccess` / `can` / `requireRole`** (Phase 3.1): the app-layer authz model the RLS backstop must agree with; AUTH-03 extends `assertSubjectAccess`.
- **`audit_log` table + PHI-free entry shape** (Phase 5 D-13): reuse for auth events; immutability is additive policy DDL.
- **Live-DB test skip-guard pattern** (`DATABASE_URL_UNPOOLED||DATABASE_URL`, Phase 3 contract tests): reuse for the isolation + pool-leak tests in CI.

### Established Patterns
- Expand-contract migration discipline with journal-split execution (Phase 3-04) — the model for the atomic RLS migration; rehearse on a Neon branch first (D-10).
- Build gate: `npm run build` must run post-wave — typecheck+vitest pass while `.server` leaks only fail at build (memory: build-gate-server-bundle).
- Concurrent sessions commit to `.planning/` mid-task — verify git state, stage files explicitly, never `git add -A`.

### Integration Points
- `_app/layout.tsx` session loader → `withTenantDb` ctx derivation (userId/tenantId/subjectId from Better-Auth session).
- `/settings` hub (Phase 3.1) → natural home for the minimal assignment-management UI.
- `docs/COMPLIANCE-RUNBOOK.md` → record the Phase 7/Phase 8 boundary state.

</code_context>

<specifics>
## Specific Ideas

- "I do want it built correctly and scalable" — the pilot framing (POC / case-study testbed, 1–2 pilot tenants) justifies deferring *spend*, never *correctness*: full RLS isolation, per-assignment authz, and immutable audit land now; only the paid compliance envelope waits for a funding client.
- The other-session cost analysis (2026-06-12) is adopted as the D-06 rationale: HIPAA cost is a 3-legged BAA chain (DB + Vercel + Anthropic); self-hosting only touches leg 1 and forfeits attestation. Defer, don't self-host.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 8 — Compliance Envelope & Host Gate (NEW PHASE — roadmap edit required):** host cost/BAA comparison (Supabase Team+HIPAA vs Neon HIPAA vs AWS RDS vs GCP Cloud SQL vs DO managed — current 2026 pricing + BAA terms), possible host migration (07-RESEARCH.md §Decision Area 3 mechanics), Vercel HIPAA add-on + BAA, Anthropic HIPAA-Ready BAA (unblocks external-client lab extraction per Phase 5 D-14), pgAudit + PHI SELECT-logging verification, PITR/SSL/network restrictions, COMPLIANCE-RUNBOOK.md completion. Closes COMP-02/COMP-03. Trigger: first external client imminent. Legal trigger ("when does it become PHI") remains a counsel question.
- **Follow-up actions out of this discussion:** (1) `/gsd:phase` edit — re-scope Phase 7's roadmap entry + add Phase 8; (2) re-map COMP-02/03 → Phase 8 in REQUIREMENTS.md traceability; (3) update the `supabase-migration-upcoming-phases` memory — migration no longer confirmed-for-Phase-7, superseded by the Phase 8 host gate.
- Per-assignment client-facing visibility (clients seeing their own assignment state) — M2 client-app era.

</deferred>

---

*Phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening*
*Context gathered: 2026-06-12*
