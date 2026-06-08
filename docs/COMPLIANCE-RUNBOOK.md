# Compliance Runbook — Zoetrop

> **NO SECRETS** — This file contains NO connection strings, API keys, passwords, or credentials (D-11).
> Those live exclusively in Vercel project environment variables.
> This document records only metadata: BAA status, execution dates, plan/tier, signing contacts, and configuration settings.

---

## ⏸ Deferral Decision (2026-06-08) — READ FIRST

**The PHI compliance hardening below is DEFERRED.** Per the pilot-first re-scope, initial work is a single-user pilot / prototyping on the **owner's own** data (n=1). HIPAA/BAA obligations attach when processing *other people's* identifiable health data — not yet the case.

- **Current posture (pilot):** standard-tier Neon + standard Vercel **Pro** (no HIPAA add-on) + the **standard subscription LLM API** (no-training default, limited retention). App-level hygiene: secrets in env, server-only DB access (`*.server.ts`), parameterized Drizzle queries, HTTPS + auth.
- **What is deferred:** Neon Scale + HIPAA-mode (irreversible) + Neon BAA · Vercel HIPAA add-on + Vercel BAA · LLM-provider HIPAA-Ready/BAA · pgAudit verification · RLS enable+policies + cross-tenant isolation · PHI read-access (SELECT) logging.
- **Gate (when it becomes required):** **before the first external client's PHI** is stored/processed (multi-client / HIGHER production launch) → tracked as **Phase 7 (PHI Compliance Hardening — Pre-Client Gate)** in `.planning/ROADMAP.md`.
- **How to use this file:** the per-vendor registers below are the **execution checklist for Phase 7** — fill them in *then*, not now. (Not legal advice — confirm the exact trigger with counsel before any multi-client launch.)

---

## Pilot Deploy Baseline (Phase 2 — active)

> Lightweight, standard-tier records for the single-user pilot. No HIPAA add-on, no BAAs (those are the Phase 7 registers below). NO SECRETS — record only that env vars are SET.

- **Vercel plan:** Pro (standard — no HIPAA add-on)
- **Neon plan:** standard (no HIPAA mode)
- **LLM API:** standard subscription / API (no-training default)
- **Env vars SET (Production + Preview):** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — set: [date]
- **Production deploy:** [date] — URL https://zoetrop.vercel.app — HTTP 200: [y/n]
- **DB connectivity (deployed app → existing Neon project):** [confirmed [date] / pending]

---

## Neon BAA

- **Plan:** Scale
- **HIPAA mode enabled:** [date — fill in after enabling in Neon Console → Project Settings → HIPAA]
- **BAA accepted (click-to-accept):** [date — fill in after accepting at Neon Console → Organization Settings → HIPAA]
- **Organization:** [neon org name — not credentials; e.g., "negentropico"]
- **HIPAA project name:** [project name as shown in Neon Console]
- **Verified Neon project ID:** [fill in the project ID from Neon Console — MUST match the project ID embedded in `DATABASE_URL` to confirm you are not accidentally pointing at a new empty project (data-loss trap — see RESEARCH.md Pitfall 1)]

### Neon BAA Steps (user actions)
1. Neon Console → Organization → Billing → Upgrade to Scale (if not already)
2. Neon Console → Organization Settings → HIPAA support section → Enable HIPAA compliance → Accept the BAA (click-to-accept)
3. Neon Console → [your project] → Settings → HIPAA support section → Click Enable
4. Confirm the project ID in Neon Console matches the project ID in your `DATABASE_URL` connection string hostname
5. Record enablement date and project ID above

> **Warning (irreversible):** Once HIPAA compliance is enabled on a project, it cannot be disabled. Enabling HIPAA restarts all computes briefly (expect a transient connection drop).

---

## Vercel BAA

- **Plan:** Pro + HIPAA add-on
- **HIPAA add-on enabled:** [date — fill in after purchasing add-on in Vercel Settings → Billing]
- **BAA accepted:** [date — self-serve flow in billing dashboard]
- **Vercel team/org:** [team name as shown in Vercel dashboard]

### Vercel BAA Steps (user actions)
1. Vercel dashboard → Settings → Billing
2. Purchase the HIPAA add-on (self-serve paid add-on; available on Pro plan as of September 9, 2025)
3. BAA is accepted as part of the add-on purchase flow — no sales contact needed for standard terms
4. Record purchase date above

> **Note:** Enterprise is NOT required. Pro plan with the HIPAA add-on is sufficient for M1 (no Secure Compute needed at this stage). Secure Compute (isolated cloud / dedicated IP / VPC peering) is Enterprise-only and not required before Phase 3.

---

## LLM Provider BAA (Anthropic)

- **Provider:** Anthropic
- **Tier:** HIPAA-Ready API org (separate from Claude Enterprise chat; covers the Messages API / `generateObject`)
- **BAA signed:** [date — fill in after BAA is executed with Anthropic sales]
- **Anthropic HIPAA API org ID (non-secret):** [org ID — not an API key; the org identifier shown in the Anthropic console]
- **Signing contact:** [name of Anthropic account contact]
- **Documented fallback:** OpenAI (BAA available via `baa@openai.com`; not chosen per D-02 tiebreaker — Claude is preferred)

### Anthropic BAA Steps (user actions)
1. Contact Anthropic sales: https://claude.com/contact-sales
2. Request a HIPAA-Ready API org (separate from Claude Enterprise chat product)
3. Sign the BAA (covers the Messages API including structured outputs / `generateObject`; NOT Batch API / Files API / Code Execution)
4. Anthropic provisions a dedicated HIPAA-enabled API org — use API keys from this org for all PHI-bearing requests
5. Set the HIPAA-org API key in Vercel env as `ANTHROPIC_API_KEY_HIPAA` (separate from any non-PHI key)
6. Record the BAA date and org ID above

> **Lead time:** Sales-assisted — allow 1–2 weeks. Start the conversation immediately (in parallel with Neon/Vercel work).
>
> **D-03 compliance:** The Messages API provides zero-data-retention (ZDR-eligible) and a contractual no-training-on-customer-data guarantee. HIPAA readiness is an alternative to ZDR; both satisfy D-03.
>
> **Gate:** This BAA is part of **Phase 7** (pre-client hardening). Single-user/owner lab extraction may use the standard subscription API; extraction of any *external client's* PHI is BLOCKED until this BAA is signed and recorded here.

---

## pgAudit Status

- **Enabled:** Auto-configured by Neon on HIPAA project enablement (no manual SQL commands required)
- **`pgaudit.log`:** `all, -misc` (logs READ, WRITE, DDL, ROLE; excludes low-risk miscellaneous commands — this is a superset of the D-12 baseline of `write, ddl` and is acceptable)
- **`pgaudit.log_parameter`:** `off` — bind parameter values are NOT logged; PHI values in parameterized queries are not captured in audit logs
- **`pgaudit.log_catalog`:** `off` (system catalog queries excluded — reduces noise)
- **`pgaudit.log_statement`:** `on` (full SQL statement text included)
- **Verified `log_parameter=off`:** [date — fill in after receiving Neon Support ticket confirmation]
- **Neon Support ticket number:** [ticket # — fill in after opening the verification request]

### pgAudit Verification Procedure (SC #4)
1. After enabling HIPAA on the Neon project, execute a known test write (via Drizzle Studio or psql):
   ```sql
   INSERT INTO metrics (id) VALUES ('00000000-0000-0000-0000-000000000001')
   ON CONFLICT DO NOTHING;
   ```
2. Open a Neon Support ticket: "Request pgAudit log sample for HIPAA verification — show a recent INSERT on the metrics table. Confirm the log entry contains: user, table name, operation type, timestamp. Confirm bind parameter values are NOT present (log_parameter=off)."
3. Expected log entry format (from pgaudit.org official README):
   ```
   AUDIT: SESSION,<stmt_id>,<substmt_id>,WRITE,INSERT,TABLE,public.metrics,INSERT INTO metrics ...,<not logged>
   ```
   Fields: `AUDIT_TYPE, STATEMENT_ID, SUBSTATEMENT_ID, CLASS, COMMAND, OBJECT_TYPE, OBJECT_NAME, STATEMENT, PARAMETER`
   - `CLASS=WRITE` confirms operation type
   - `OBJECT_NAME=public.metrics` confirms table
   - `PARAMETER=<not logged>` confirms `log_parameter=off`
4. Paste the actual log line received from support below.

> **Important:** pgAudit logs are NOT available in the Neon Console UI for HIPAA projects. Access requires a Neon Support ticket (by design — logs are isolated for compliance). Allow 1–3 business days for the support response.

### Verification Log Sample
```
[paste the AUDIT: SESSION line received from Neon Support here]
```

---

## Phase 3 Carry-Forward → now Phase 7

- **PHI read-access (SELECT) audit logging:** Deferred to **Phase 7** (was D-13 / Phase 3; moved with the RLS retrofit in the 2026-06-08 pilot-first re-scope)
- **Rationale:** Phase 3 adds the `tenantId`/`subjectId` *columns* but not RLS; no external-client PHI exists until the pre-client gate. Object-level SELECT logging belongs with the Phase 7 RLS enable, not before.
- **Required action (Phase 7):** Configure object-level pgAudit for SELECT on PHI tables alongside the RLS retrofit (`tenantId`/`subjectId` on `metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`) — a Neon Support request enables object-level audit logging on specific tables.

> **This carry-forward is recorded here to prevent it from being silently dropped (D-13, T-02-06 mitigation).**

---

*Last updated: 2026-06-08 (scaffold created by Phase 2 plan 02 executor)*
*Maintained by: Mac Baker / Negentropico*
*Sources: Neon HIPAA docs (neon.com/docs/security/hipaa), Vercel changelog (vercel.com/changelog/hipaa-baas-are-now-available-to-pro-teams), Anthropic API docs (platform.claude.com/docs/en/manage-claude/api-and-data-retention)*
