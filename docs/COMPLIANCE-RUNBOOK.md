# Compliance Runbook — Zoetrop

> **NO SECRETS** — This file contains NO connection strings, API keys, passwords, or credentials (D-11).
> Those live exclusively in Vercel project environment variables.
> This document records only metadata: BAA status, execution dates, plan/tier, signing contacts, and configuration settings.

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
> **Phase 5 gate:** Phase 5 (lab ingest / LLM extraction) is BLOCKED until this BAA is signed and recorded here.

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

## Phase 3 Carry-Forward

- **PHI read-access (SELECT) audit logging:** Deferred to Phase 3 (D-13)
- **Rationale:** No client PHI tables exist until Phase 3 introduces the `tenantId`/`subjectId` schema and RLS retrofit. Configuring object-level SELECT logging before those tables exist adds noise without auditing anything meaningful. Baseline WRITE/DDL logging (configured by Neon HIPAA auto-setup above) is sufficient for Phase 2.
- **Required action in Phase 3:** Configure object-level pgAudit for SELECT on PHI tables after the RLS retrofit (`tenantId`/`subjectId` columns added to `metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`). This requires a Neon Support request to enable object-level audit logging on specific tables.
- **Phase 3 gate:** The Phase 3 RLS/tenancy sprint should include a task: "Enable SELECT audit logging on PHI tables via Neon Support (carry-forward from Phase 2 D-13)."

> **This carry-forward is recorded here to prevent it from being silently dropped (D-13, T-02-06 mitigation).**

---

*Last updated: 2026-06-08 (scaffold created by Phase 2 plan 02 executor)*
*Maintained by: Mac Baker / Negentropico*
*Sources: Neon HIPAA docs (neon.com/docs/security/hipaa), Vercel changelog (vercel.com/changelog/hipaa-baas-are-now-available-to-pro-teams), Anthropic API docs (platform.claude.com/docs/en/manage-claude/api-and-data-retention)*
