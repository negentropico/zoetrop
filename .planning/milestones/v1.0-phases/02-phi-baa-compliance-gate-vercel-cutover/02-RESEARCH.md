# Phase 2: PHI / BAA Compliance Gate + Vercel Cutover — Research

**Researched:** 2026-06-08
**Domain:** Infra cutover (Netlify → Vercel) + HIPAA compliance ops (Neon / Vercel / LLM-provider BAAs + pgAudit)
**Confidence:** HIGH (Vercel preset, Neon HIPAA, pgAudit, Anthropic API path all verified from official docs; Vercel Pro BAA confirmed from official changelog)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Defer the final LLM provider pick to the phase researcher. Gate criterion is locked: chosen provider MUST have a signed BAA covering the PHI-extraction tier, recorded in the runbook, before Phase 5 begins.
- **D-02:** Tiebreaker = default to Claude. Switch to OpenAI only if Claude's compliance path is blocked or materially harder.
- **D-03:** Hard requirements: zero-data-retention (no PHI persisted by the provider) AND a contractual no-training-on-our-data guarantee. Researcher confirms tier + cost implication.
- **D-04:** Production domain = `zoetrop.vercel.app`. No custom domain.
- **D-05:** Remove Netlify cleanly up front (delete `netlify.toml`; no `@netlify/*` packages to uninstall). Executor MUST confirm green Vercel production deploy + DB connectivity before cutover is considered done.
- **D-06:** Vercel BAA tier is unconfirmed. Researcher confirms which Vercel plan supports a HIPAA BAA and surfaces any upgrade/cost implication before the BAA is executed.
- **D-07:** Add the React Router 7 Vercel preset to `react-router.config.ts`. Researcher confirms exact current RR7-on-Vercel preset/package + version.
- **D-08:** Set in Vercel project env: `DATABASE_URL` (pooled — runtime) + unpooled/direct Neon URL (for `drizzle-kit` migrations) + auth secrets. `db.server.ts` already falls back `NETLIFY_DATABASE_URL || DATABASE_URL`.
- **D-09:** KEEP the existing Neon project. Do NOT provision a fresh DB via Vercel's Neon integration in any way that creates a new empty database (data-loss risk). Upgrade that project to Scale plan, enable HIPAA mode on it.
- **D-10:** Runbook lives at `docs/COMPLIANCE-RUNBOOK.md`.
- **D-11:** Runbook contents = full register per vendor (Neon, Vercel, LLM provider): BAA status, execution date, plan/tier, signing contact, and HIPAA-mode / pgAudit settings. No secrets.
- **D-12:** pgAudit baseline with logging class `write, ddl`. `log_parameter=off` is fixed by SC #4.
- **D-13:** PHI read-access logging carried forward to Phase 3. Phase 2 does NOT configure SELECT/read logging.
- **D-14:** Plan splits into (a) Claude-automatable work and (b) user-action items (inherently manual).

### Claude's Discretion
- Exact RR7-Vercel preset/package name + version, `react-router.config.ts` / `vite.config.ts` specifics, precise `pgaudit.log` parameter string, runbook section layout, env-var naming beyond the required `DATABASE_URL`(+unpooled)+auth secrets.

### Deferred Ideas (OUT OF SCOPE)
- Custom domain / public brand
- PHI read-access (SELECT) audit logging (Phase 3)
- `NETLIFY_DATABASE_URL` fallback cleanup, `as any` casts, `syncStatus`/`syncVersion` vestiges (Phase 4 / DATA-05)
- File-storage BAA coverage (Netlify Blobs → Vercel Blob) (Phase 5)
- LLM model selection + extraction code (`generateObject` wiring) (Phase 5)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-02 | PHI infrastructure is BAA-covered (Neon, Vercel, LLM provider) before any client PHI is written — a release gate | Verified BAA paths for all three vendors; exact steps documented in Sections A–D below |
| COMP-03 | PHI access is audit-logged with pgAudit configured (parameters off) | Neon auto-configures `pgaudit.log_parameter=off` on HIPAA-enabled projects; exact verification procedure documented in Section D |
</phase_requirements>

---

## Summary

Phase 2 is a release gate with two strands of work. The research resolves all five open questions (A–E) from the CONTEXT.md with current, citeable findings.

**Strand 1 — Vercel cutover (Claude-automatable):** Install `@vercel/react-router@1.3.1`, add `vercelPreset()` to `react-router.config.ts`, remove `netlify.toml`, set `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, for drizzle-kit) in Vercel env, deploy. The existing `drizzle-orm/neon-serverless Pool` driver works on Vercel Node.js functions but requires a critical singleton-reset pattern — the lazy-init singleton in `db.server.ts` must NOT hold a pool across requests in Vercel's function model. This is a concrete pitfall that must be addressed.

**Strand 2 — PHI compliance (mostly manual user actions):** Neon HIPAA is self-serve on the Scale plan with a click-to-accept BAA — no sales cycle. Vercel HIPAA BAA is now available on the Pro plan as a self-serve paid add-on (as of September 2025) — no Enterprise upgrade required; this is the key new finding resolving D-06. Anthropic offers a HIPAA-ready API path covering the Messages API (including `generateObject` / structured outputs) under a signed BAA with the sales team; the API path contractually guarantees no model training on customer data and provides ZDR for the Messages API. The tiebreaker in D-02 applies — Claude is the recommended provider.

**pgAudit:** Neon auto-configures pgAudit with `pgaudit.log_parameter=off` and `pgaudit.log='all,-misc'` when HIPAA mode is enabled. Audit log access is via Neon Support ticket (not self-serve). The verification procedure (test query + log inspection via support) is documented below.

**Primary recommendation:** Follow the two-track plan: (1) Claude automates the Vercel preset/adapter swap + env setup guidance + pgAudit config documentation + runbook scaffold + doc updates; (2) user executes the three BAA sign-offs (Neon, Vercel, Anthropic) and enables HIPAA on the Neon project, in parallel with coding work to use vendor lead time.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SSR / server rendering | Frontend Server (Vercel Functions) | — | RR7 framework mode; routes deployed as Vercel Functions via `vercelPreset()` |
| Static asset serving | CDN / Static (Vercel Edge Network) | — | `build/client` → Vercel CDN automatically |
| Database connection | API / Backend (Node.js Vercel Functions) | — | `@neondatabase/serverless Pool` over WebSocket; runs in Node.js function runtime, not Edge |
| Database migrations (drizzle-kit) | Local dev / CI | — | drizzle-kit uses unpooled/direct URL; runs outside request lifecycle |
| Compliance BAA records | Ops runbook (`docs/COMPLIANCE-RUNBOOK.md`) | — | Non-technical artifacts; in-repo markdown |
| pgAudit configuration | Database / Storage (Neon control plane) | — | Auto-configured by Neon when HIPAA mode enabled; cannot be self-modified |
| Audit log access | Database / Storage (Neon Support) | — | Logs not self-serve; accessed via support ticket |
| LLM extraction BAA | External vendor (Anthropic API org) | — | Provisioned at org level by Anthropic sales; not a code concern in Phase 2 |

---

## Standard Stack

### A. React Router 7 → Vercel Preset (Question A — RESOLVED)

**Package:** `@vercel/react-router` [VERIFIED: npm registry + official Vercel docs]
**Version:** `1.3.1` (published 2026-05-27) [VERIFIED: npm registry]
**Import path for preset:** `@vercel/react-router/vite` [VERIFIED: vercel.com/docs/frameworks/react-router]

**Installation:**
```bash
cd remix-app
npm install @vercel/react-router@^1.3.1
```

**`react-router.config.ts` change (the only required config change):**
```typescript
// Source: https://vercel.com/docs/frameworks/react-router (last_updated: 2026-02-26)
import { vercelPreset } from '@vercel/react-router/vite';
import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
```

**`vite.config.ts` changes:** None required for the standard preset path. The existing config (`tailwindcss()`, `reactRouter()`, `tsconfigPaths()`, Vitest block) is compatible as-is. [VERIFIED: official Vercel docs show no vite.config changes needed for the preset path]

**`vercel.json`:** Not required. The `vercelPreset()` generates Vercel's Output API artifacts during build — no manual `vercel.json` routing config needed for standard SSR routes. [VERIFIED: Vercel docs — "zero configuration" claim for the preset path]

**Node/runtime target:** The preset deploys SSR routes as **Vercel Functions (Node.js runtime)**. The app runs on Node 20 (current `netlify.toml` pin); this carries over. Edge runtime is NOT used — and must NOT be used because `@neondatabase/serverless Pool` (WebSocket driver) requires Node.js APIs not available in the Edge runtime. [VERIFIED: Neon serverless driver docs]

**`@react-router/serve` removal:** The `start` script currently runs `react-router-serve ./build/server/index.js`. On Vercel, the `npm run start` script is not invoked — Vercel runs its own function serving layer. The `@react-router/serve` package and the `start` script can remain in `package.json` without breaking Vercel (Vercel ignores it), but the planner may remove it as cleanup. [ASSUMED — Vercel does not document whether it ignores `start` scripts]

**Peer dependency check:** `@vercel/react-router@1.3.1` requires `@react-router/dev: '7'` — the project is on `@react-router/dev: 7.12.0`. [VERIFIED: npm registry]

**Neon Pool on Vercel Node.js — critical gotcha:**

The existing `db.server.ts` uses a lazy-init module-level singleton `Pool`. This pattern works on Netlify (where functions can share module state across invocations). On Vercel, **module state is NOT guaranteed to persist across cold starts**, and more importantly, the Neon docs explicitly warn: "WebSocket connections can't outlive a single request." [VERIFIED: Neon serverless driver docs]

The current `_pool` / `_db` singleton may work for some requests but will silently fail or leak connections on cold starts. The safest fix (within Phase 2 scope, since `db.server.ts` cleanup is formally Phase 4) is to confirm the Pool constructor is called once per request by resetting `_pool = null` and `_db = null` at module reload boundaries — or switch to the HTTP driver for Phase 2 correctness. However, since the DB is currently not called by loaders (all routes use static data), this is low-risk in Phase 2 (where only `drizzle-kit` operations use the DB). The planner should include a note to verify DB connectivity with a health-check query after deploy. A formal refactor is Phase 4 / DATA-01.

### B. Packages to Remove

- `netlify.toml` (repo root) — delete the file
- No `@netlify/*` packages exist in `package.json` (confirmed) — nothing to uninstall

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vercel/react-router` preset | No preset (bare `ssr: true`) | Without preset: no per-route function config, no bundle splitting awareness, no Deployment Summary — highly discouraged by Vercel docs |
| Vercel Node.js functions | Vercel Edge functions | Edge does not support `@neondatabase/serverless Pool` (WebSocket) — would require switching to neon HTTP driver; not worth doing in Phase 2 |

**Installation:**
```bash
cd remix-app
npm install @vercel/react-router@^1.3.1
```

---

## B. Vercel HIPAA BAA Tier (Question B — RESOLVED)

**Finding:** Vercel HIPAA BAA is available on **Pro plan** as a **self-serve paid add-on** as of **September 9, 2025**. Enterprise is NOT required. [VERIFIED: vercel.com/changelog/hipaa-baas-are-now-available-to-pro-teams]

**Process for Pro customers:**
1. Go to Vercel dashboard → Settings → Billing
2. Purchase the HIPAA add-on
3. The BAA is self-serve; no sales contact needed for standard terms
4. Enterprise is required only if you want to negotiate custom BAA redlines

**Cost:** Listed as a "paid add-on" — exact price not published in docs (check the Billing dashboard for current pricing). [UNVERIFIED — confirm before executing; not in public docs as of research date]

**Limitations vs. Enterprise:** Pro BAA does not include Vercel Secure Compute (isolated cloud environment, dedicated IP addresses, VPC peering). For Zoetrop M1 (single-practitioner, no-client-PHI-yet phase), Secure Compute is not required — the standard BAA without Secure Compute is sufficient to satisfy COMP-02.

**Contact for BAA:** https://vercel.com/contact/sales/security (or self-serve via billing dashboard for Pro)

**Source:** [CITED: vercel.com/changelog/hipaa-baas-are-now-available-to-pro-teams]

---

## C. LLM Provider BAA: Anthropic vs OpenAI (Question C — RECOMMENDATION: Claude)

### Recommendation: Anthropic Claude API (HIPAA-Ready API)

Per D-02, the tiebreaker is Claude if both providers have a usable BAA. Both do. Claude's path is not materially harder. **Recommendation: Anthropic Claude API under the HIPAA-Ready API org path.**

### Anthropic Claude — HIPAA-Ready API

**Available:** Yes, for the Claude API (Messages API endpoint `api.anthropic.com`). [VERIFIED: platform.claude.com/docs/en/manage-claude/api-and-data-retention]

**What's covered:**
- Messages API (`/v1/messages`) — includes structured outputs / `generateObject` — HIPAA eligible [VERIFIED: Anthropic feature eligibility table]
- PDF support via inline Messages API — HIPAA eligible [VERIFIED]
- Token counting — HIPAA eligible [VERIFIED]
- **Batch API, Files API, Code Execution — NOT HIPAA eligible** (important: do not use these for PHI in Phase 5)

**Plan/tier:** No specific "Enterprise" plan required for the API path. You need a **HIPAA-enabled org** provisioned by Anthropic after signing a BAA. This is a dedicated API org, not the same as the Claude Enterprise chat product. [VERIFIED: Anthropic docs]

**Zero-data-retention / no-training guarantee:** [VERIFIED: Anthropic official docs]
- Retained data is **never used for model training** without express permission (contractual guarantee)
- The Messages API is **ZDR-eligible** — customer prompts and Claude's outputs are NOT stored at rest after the API response is returned (under a ZDR arrangement)
- HIPAA readiness is an **alternative** to ZDR: with HIPAA readiness, PHI is retained with proper safeguards (encryption, access controls, audit logging) rather than requiring immediate deletion. ZDR is NOT required if you have HIPAA readiness in place.

**Process to get the BAA:**
1. Contact Anthropic sales: https://claude.com/contact-sales
2. Sign BAA (covers API usage; a separate BAA from the Enterprise chat product)
3. Anthropic provisions a dedicated HIPAA-enabled API org
4. Use that org's API keys for all PHI-bearing requests
5. Note: HIPAA org must be separate from non-PHI workloads — use two orgs if needed

**Lead time:** Sales-assisted — allow 1–2 weeks. Start early.

**D-03 compliance check:**
- Zero-data-retention: YES (Messages API is ZDR-eligible; or use HIPAA readiness as equivalent protection)
- No model training on data: YES (contractual)
- Signed BAA required: YES (via sales)
- Tier/cost implication: API access with HIPAA org — pricing is standard API pay-as-you-go on top of BAA. No Enterprise plan required.

**Sources:** [CITED: platform.claude.com/docs/en/manage-claude/api-and-data-retention], [CITED: privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers]

### OpenAI — For Reference Only (not recommended per D-02)

**Available:** Yes, API BAA available via `baa@openai.com` (1–2 business day response). Zero data retention available for eligible endpoints with prior approval. No model training on data with ZDR. [CITED: help.openai.com/en/articles/8660679-how-can-i-get-a-business-associate-agreement-baa-with-openai]

**Why not chosen:** D-02 tiebreaker applies — Claude aligns with the project's Claude lean and STACK.md extraction-quality rating. OpenAI is a viable fallback if the Anthropic sales process is blocked.

---

## D. Neon Scale + HIPAA Mode + pgAudit (Question D — RESOLVED)

### D1. Upgrade to Scale and Enable HIPAA

**Required plan:** Scale [VERIFIED: neon.com/docs/security/hipaa]
**HIPAA feature is:** Self-serve — no Neon sales contact needed [VERIFIED: Neon docs]
**Cost of HIPAA mode:** Currently no additional cost beyond Scale plan subscription [VERIFIED: Neon docs — "no additional cost, pricing may change in the future with advance notice"]

**Exact steps (user actions — inherently manual):**

Step 1 — Upgrade to Scale plan (if not already on it):
- Neon Console → Organization → Billing → Upgrade to Scale

Step 2 — Enable HIPAA at org level:
- Neon Console → Organization Settings → HIPAA support section → Enable HIPAA compliance → Accept the BAA (click-to-accept, no separate legal document to sign and return)

Step 3 — Enable HIPAA on the existing project:
- Neon Console → [your project] → Settings → HIPAA support section → Click Enable

Or via API:
```bash
# Source: Neon HIPAA docs (neon.com/docs/security/hipaa)
curl --request PATCH \
     --url https://console.neon.tech/api/v2/projects/YOUR_PROJECT_ID \
     --header 'authorization: Bearer $NEON_API_KEY' \
     --data '{"project": {"settings": {"hipaa": true}}}'
```

**Irreversibility warning:** "Once HIPAA compliance is enabled on a project, it cannot be disabled." [VERIFIED: Neon docs] If you want to disable, you must delete the entire project. This is a permanent commitment — do not enable on a test/dev project you plan to reuse.

**Downtime:** Enabling HIPAA "will also restart all computes, temporarily interrupting database connections." [VERIFIED: Neon docs] Plan the enablement during a maintenance window (the app is not yet serving client PHI, so impact is low, but the dev DB connection will drop briefly).

**Data safety:** Enabling HIPAA on an existing project does NOT destroy or migrate data. It changes the security posture and restarts computes — the data remains intact. [VERIFIED: Neon docs description of the process]

**Plan commitment:** The Scale plan is a standard subscription; upgrading from Free/Launch is required but there is no long-term lock-in beyond the plan's billing cycle. HIPAA itself adds no plan-level commitment. [VERIFIED: Neon docs]

### D2. pgAudit Configuration on Neon

**Critical finding:** pgAudit is **automatically configured by Neon** when HIPAA mode is enabled on a project. No manual SQL commands are required. [VERIFIED: neon.com/guides/hipaa-compliant-applications]

**Automatically applied settings:**

| Setting | Value | Meaning |
|---------|-------|---------|
| `pgaudit.log` | `'all, -misc'` | Logs READ, WRITE, DDL, ROLE — excludes low-risk miscellaneous commands |
| `pgaudit.log_parameter` | `'off'` | Bind parameter values NOT logged — PHI values in queries are not captured |
| `pgaudit.log_catalog` | `'off'` | System catalog queries excluded (reduces noise) |
| `pgaudit.log_statement` | `'on'` | Full SQL statement text included |

**Note on D-12:** The CONTEXT.md specifies logging class `'write, ddl'` for Phase 2 baseline. Neon's auto-configuration applies `'all, -misc'` (which is a superset: includes READ + WRITE + DDL + ROLE). This is more comprehensive than the Phase 2 baseline specification and is acceptable — it satisfies D-12's intent and COMP-03. The planner should note this: Phase 2 does not need to configure pgAudit manually; enabling HIPAA mode is sufficient.

**Application code requirement:** Always use parameterized queries (never interpolate PHI directly into SQL strings). `log_parameter=off` prevents bind parameter values from being logged, but hardcoded PHI in SQL strings will still be captured in `pgaudit.log_statement`. The current `drizzle-orm` usage is parameterized by default — this is already correct. [VERIFIED: Neon guides]

### D3. Test Query + Verification Procedure for SC #4

**Problem:** Neon's audit log access is NOT self-serve. Logs are NOT available in the Neon Console UI. You must raise a Support request to access logs. [VERIFIED: Neon docs — "Self-serve access to HIPAA audit logs is currently not supported"]

**Verification procedure for SC #4 (`{user, table, operation, timestamp}` confirmed; parameters NOT logged):**

1. After enabling HIPAA + pgAudit on the project, execute a known test write:
```sql
-- Run via Drizzle Studio or psql against the Neon project
-- Source: standard pgAudit verification pattern
INSERT INTO metrics (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
```

2. Open a Neon Support ticket: "Request pgAudit log sample for HIPAA verification — show a recent INSERT on the metrics table. Confirm the log entry contains: user, table name, operation type, timestamp. Confirm bind parameter values are NOT present (log_parameter=off)."

3. Expected log entry format (from official pgAudit documentation):
```
2026-XX-XX HH:MM:SS.mmm UTC [pid] LOG: AUDIT: SESSION,<stmt_id>,<substmt_id>,WRITE,INSERT,TABLE,public.metrics,INSERT INTO metrics ...,<not logged>
```
Fields: `AUDIT_TYPE, STATEMENT_ID, SUBSTATEMENT_ID, CLASS, COMMAND, OBJECT_TYPE, OBJECT_NAME, STATEMENT, PARAMETER`
- `CLASS=WRITE` — operation type
- `OBJECT_NAME=public.metrics` — table
- The user context is in the PostgreSQL log prefix (timestamp, pid, user)
- `PARAMETER=<not logged>` — confirms `log_parameter=off`

4. Record the log sample in `docs/COMPLIANCE-RUNBOOK.md` as evidence for SC #4.

**Note:** This verification requires a support ticket response (lead time: 1–3 business days). The planner should schedule this as an async task during the phase.

**Sources:** [CITED: neon.com/docs/security/hipaa], [CITED: neon.com/guides/hipaa-compliant-applications], [CITED: raw.githubusercontent.com/pgaudit/pgaudit/master/README.md]

---

## E. Neon Connection on Vercel (Question E — RESOLVED)

### Recommended Pattern: Neon-Managed Integration (existing project path)

**The data-loss trap:** Vercel's "Add Neon" native integration in the Vercel dashboard provisions a NEW empty Neon database by default. This creates a separate Neon project disconnected from the existing one. Do NOT use the Vercel-Native "create new" flow. [VERIFIED: Neon integration docs distinguish three paths]

**Safe path — Option A (recommended): Neon-Managed Integration with existing project**
1. In Vercel project → Integrations → browse marketplace → install "Neon Postgres" (Neon-managed)
2. At setup: select "Link Existing Neon Account" / connect to the EXISTING Neon project
3. The integration injects two env vars into Vercel project env:
   - `DATABASE_URL` — pooled connection string (for runtime queries)
   - `DATABASE_URL_UNPOOLED` — direct/unpooled connection string (for drizzle-kit migrations)
4. This preserves the existing database and billing relationship with Neon [VERIFIED: Neon docs for Neon-Managed integration]

**Safe path — Option B: Pure manual env vars**
1. Copy connection strings from Neon Console → Project Dashboard → Connect
2. Get the pooled URL (for `DATABASE_URL`) and the direct URL (for `DATABASE_URL_UNPOOLED` / drizzle-kit)
3. Set them in Vercel project → Settings → Environment Variables
4. No Marketplace integration needed

**Recommendation:** Option B (manual env vars) for Phase 2. It is simpler, avoids integration complexity, and the connection strings are already known from the Netlify setup. The Neon-Managed integration adds value primarily for preview-branch DB branching (useful in Phase 3+).

**Env vars to set in Vercel:**
| Var | Connection type | Used by |
|-----|-----------------|---------|
| `DATABASE_URL` | Pooled (PgBouncer) | `db.server.ts` runtime queries |
| `DATABASE_URL_UNPOOLED` | Direct (no pooler) | `drizzle.config.ts` migrations |
| `BETTER_AUTH_SECRET` | — | Better Auth (Phase 3; set now for completeness) |
| `BETTER_AUTH_URL` | — | Better Auth (Phase 3; set now as `https://zoetrop.vercel.app`) |

**`drizzle.config.ts` update needed:**
The current config reads `process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL`. For migrations on Vercel, drizzle-kit needs the **unpooled** URL (PgBouncer pooled connections do not support all DDL operations). Update the `dbCredentials.url` fallback order to:
```typescript
// Source: Neon drizzle docs recommendation for migrations
url: process.env.DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL!
```

**`db.server.ts` env var handling:**
The existing fallback `NETLIFY_DATABASE_URL || DATABASE_URL` continues to work. Setting `DATABASE_URL` in Vercel is sufficient for runtime. The `NETLIFY_DATABASE_URL` fallback silently becomes unreachable but causes no harm — cleanup is Phase 4 / DATA-05 (per CONTEXT.md deferred list).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vercel preset for RR7 | Custom `vercel.json` routing table | `@vercel/react-router` `vercelPreset()` | Hand-rolled vercel.json is complex, breaks bundle splitting and Deployment Summary |
| pgAudit configuration | Manual `ALTER SYSTEM SET pgaudit.*` commands | Neon auto-configuration (enable HIPAA mode) | Neon manages the extension and parameters; manual overrides may conflict |
| BAA document management | In-repo credential storage | Vendor self-serve flows (Neon click-to-accept, Vercel billing dashboard, Anthropic sales) | Legal agreements must go through vendor legal processes, not code |
| Audit log format parsing | Custom log schema | Standard pgAudit `AUDIT: SESSION,...` format | pgAudit format is standardized; document the format, don't reparse it |

---

## Common Pitfalls

### Pitfall 1: Vercel Native Integration Creates a New Empty Database

**What goes wrong:** Using Vercel dashboard → Storage → "Create New Neon Database" provisions a fresh, empty Neon project. The existing data, schema, and migrations are not present. The app starts erroring on DB queries.

**How to avoid:** Use the Neon-Managed integration with "Link Existing" or set `DATABASE_URL` / `DATABASE_URL_UNPOOLED` manually from the Neon Console. Never click "Create New Neon Database" in Vercel's UI.

**Warning signs:** If `DATABASE_URL` in Vercel env points to a different project ID than the one you've been using, you've created a new DB. Check by comparing the hostname in the connection string — Neon project IDs are part of the hostname (`[project-id].us-east-2.aws.neon.tech`).

### Pitfall 2: drizzle-kit Migrations Fail Against Pooled Connection

**What goes wrong:** `drizzle-kit migrate` run with the pooled `DATABASE_URL` (PgBouncer) fails with `prepared statement already exists` or hangs, because PgBouncer transaction mode does not support all DDL operations.

**How to avoid:** Always set `DATABASE_URL_UNPOOLED` in `drizzle.config.ts` for migrations. The pooled URL is for runtime queries only.

### Pitfall 3: Neon Pool Singleton Breaks on Vercel Cold Start

**What goes wrong:** The `_pool` / `_db` lazy-init singleton in `db.server.ts` persists module-level state. On Vercel, a cold start may reload the module with `_pool = null`, then a concurrent request reuses a stale pool handle. Result: database connection errors.

**How to avoid:** For Phase 2, this is low-risk because no route loaders call the DB (all routes use static data). The production risk materializes in Phase 4 (DATA-01). However, the Phase 2 deploy verification should include a health-check query to confirm DB connectivity works — do not assume the singleton pattern works on Vercel without testing.

**Long-term fix (Phase 4):** Switch `db.server.ts` to the Neon HTTP driver (`neon()`) for single-query loaders, or refactor Pool to create/destroy per request.

### Pitfall 4: Enabling HIPAA on Neon While Tests Are Running

**What goes wrong:** HIPAA enablement restarts all Neon computes. If CI is running during the restart, migrations or test queries fail.

**How to avoid:** Enable HIPAA during a quiet period. No current CI runs DB queries (CI does type-check + build only — no DB integration tests in Phase 2), so this is a non-issue for this project currently.

### Pitfall 5: pgAudit Log Access Is Not Self-Serve

**What goes wrong:** After enabling HIPAA, the developer opens the Neon Console logs panel and finds no pgAudit entries. They conclude pgAudit is not configured.

**How to avoid:** pgAudit logs are NOT in the Neon Console UI for HIPAA projects. Access requires a Neon Support ticket. This is by design — the audit logs are isolated for compliance. The verification in SC #4 requires a support request, not a SQL query.

### Pitfall 6: Anthropic HIPAA Org Confusion — BAA Signs on a Different Org

**What goes wrong:** The developer signs a BAA for a Claude Enterprise chat plan (not the API), then uses the standard API org key for PHI extraction. The API key is from a non-HIPAA org and is not covered.

**How to avoid:** The Anthropic HIPAA API path provisions a **separate dedicated org** after the BAA is signed. You must use API keys from that HIPAA-enabled org for all PHI-bearing requests. Keep HIPAA-org keys and non-HIPAA keys in separate env var namespaces (e.g., `ANTHROPIC_API_KEY_HIPAA` vs `ANTHROPIC_API_KEY`).

### Pitfall 7: Vercel Pro BAA Not Signed Before First Production Deploy with PHI

**What goes wrong:** The app is deployed to Vercel and "PHI will be added in Phase 5" — but Phase 3 RLS retrofit begins writing tenantId/subjectId/auth data that is PHI-adjacent. The BAA should be signed before Phase 3 writes any identifying health-context data.

**How to avoid:** Per COMP-02, sign the Vercel BAA in Phase 2 (this phase), before Phase 3 begins. The BAA is now a self-serve Pro add-on — there is no excuse for deferring it.

---

## Code Examples

### Vercel Preset: react-router.config.ts

```typescript
// Source: https://vercel.com/docs/frameworks/react-router (verified 2026-06-08)
import { vercelPreset } from '@vercel/react-router/vite';
import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
```

### drizzle.config.ts: Prefer Unpooled URL for Migrations

```typescript
// Source: Neon drizzle migrations guidance
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED
      || process.env.NETLIFY_DATABASE_URL
      || process.env.DATABASE_URL!,
  },
});
```

### pgAudit Log Entry Format (for documentation in runbook)

```
-- Source: pgaudit/pgaudit README.md (pgaudit.org)
-- Format: AUDIT: SESSION,<stmt_id>,<substmt_id>,<class>,<command>,<object_type>,<object_name>,<statement>,<parameter>
-- Example INSERT audit entry with log_parameter=off:
2026-06-08 14:30:00.000 UTC [12345] LOG:  AUDIT: SESSION,1,1,WRITE,INSERT,TABLE,public.metrics,INSERT INTO metrics VALUES ($1,$2,...),<not logged>
--                                                                          ^^^^^ CLASS=WRITE confirms operation type
--                                                                                                             ^^^^^^^^^^^ table name
--                                                                                                                                                    ^^^^^^^^^^^^ <not logged> confirms log_parameter=off
```

### Vercel Environment Variables (required)

```
# Set in Vercel project → Settings → Environment Variables
# Both Production and Preview environments

DATABASE_URL=postgresql://[role]:[password]@[host]/[dbname]?sslmode=require
# ^ Pooled (PgBouncer) — for runtime queries in db.server.ts

DATABASE_URL_UNPOOLED=postgresql://[role]:[password]@[host]/[dbname]?sslmode=require
# ^ Direct (no pooler) — for drizzle-kit migrations in drizzle.config.ts
# Neon connection strings: pooled uses .pooler.neon.tech; unpooled uses [project-id].[region].neon.tech

# Phase 3 prereq (set now):
BETTER_AUTH_SECRET=[32+ random bytes]
BETTER_AUTH_URL=https://zoetrop.vercel.app
```

---

## Compliance Runbook Template (`docs/COMPLIANCE-RUNBOOK.md`)

The runbook structure for D-10/D-11 should contain the following sections (no secrets, only metadata):

```markdown
# Compliance Runbook — Zoetrop

## Neon BAA
- Plan: Scale
- HIPAA mode enabled: [date]
- BAA accepted (click-to-accept): [date]
- Organization: [neon org name, not credentials]
- HIPAA projects: [project name]

## Vercel BAA
- Plan: Pro + HIPAA add-on
- HIPAA add-on enabled: [date]
- BAA accepted: [date]

## LLM Provider BAA (Anthropic)
- Provider: Anthropic
- Tier: HIPAA-Ready API org
- BAA signed: [date]
- Org ID (non-secret): [anthropic org id]
- Contact: [Anthropic account contact name]

## pgAudit Status
- Enabled: auto-configured by Neon on HIPAA project enablement
- log_parameter: off (verified [date] via Neon Support ticket #[number])
- log class: all, -misc
- Verification log sample: [paste the AUDIT: SESSION line from support ticket]

## Phase 3 Carry-Forward
- PHI read-access (SELECT) audit logging: deferred to Phase 3
  - Rationale: No client PHI tables exist until Phase 3 (tenantId/subjectId schema)
  - Action required in Phase 3: Configure object-level pgAudit for SELECT on PHI tables
```

---

## Package Legitimacy Audit

slopcheck was not installable in this environment. All packages are marked [ASSUMED] per graceful-degradation protocol. The planner must gate each install behind a `checkpoint:human-verify` step.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@vercel/react-router` | npm | ~1 yr (v1.0 Apr 2025) | [ASSUMED] | github.com/vercel/vercel | N/A — slopcheck unavailable | [ASSUMED] — confirmed exists on npm, published by `vercel-release-bot` |

**Manual legitimacy check performed:**
```
npm view @vercel/react-router@1.3.1
```
- Published: 2026-05-27 by `GitHub Actions <npm-oidc-no-reply@github.com>`
- Maintainers: `vercel-release-bot`, `matt.straka`, `matheuss` (all Vercel employees)
- Repository: `github.com/vercel/vercel`
- Peer deps: `@react-router/dev: 7`, `@react-router/node: 7`, `isbot: 5`
- No `postinstall` script

**Assessment:** This package is the official Vercel adapter, published by Vercel's automated release bot from the official `vercel/vercel` monorepo. Risk is LOW despite slopcheck unavailability.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (manual check passed)

---

## Runtime State Inventory

This phase involves moving the deployment platform and changing external service configurations, but the database and application data are preserved (D-09). Checking all five categories:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Neon Postgres project: existing 8 tables with owner data (metrics, protocolVersions, etc.) | None — preserving existing project; no migration |
| Live service config | Netlify: `netlify.toml` at repo root; Netlify site ID `0abb12f6-d11b-4f81-8a8d-86b44e99088f`; `NETLIFY_DATABASE_URL` auto-set by Netlify extension | Remove `netlify.toml`; disconnect Netlify extension (optional); `NETLIFY_DATABASE_URL` fallback becomes dead but harmless |
| OS-registered state | GitHub Actions CI: no Netlify-specific secrets or deploy keys in CI (CI only does typecheck + build, not deploy) | Update CI to remove any Netlify references if present; CI currently has no Netlify deploy step |
| Secrets/env vars | `NETLIFY_DATABASE_URL` (set by Netlify extension, not manually); `DATABASE_URL` (fallback) | Set `DATABASE_URL` + `DATABASE_URL_UNPOOLED` in Vercel env; `NETLIFY_DATABASE_URL` fallback becomes inert |
| Build artifacts | `remix-app/.netlify/` (if present) — Netlify function build artifacts | Delete `.netlify/` directory (add to `.gitignore` if not already) |

**Neon project:** Existing project continues unchanged. The connection strings change format (pooler endpoint vs direct) but point to the same project. No data migration.

**`CLAUDE.md` + `docs/PLATFORM.md` updates required (D-05 SC#5):**
- `CLAUDE.md` Deployment section: replace Netlify URLs + site id with Vercel URLs (`zoetrop.vercel.app`); remove Netlify CI/CD note; update deploy commands
- `docs/PLATFORM.md` §5.7: update PHI/security posture section to reference Vercel BAA + Neon BAA; update deploy references

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | React Router build + Vercel functions | ✓ | v25.6.0 (dev); Node 20 on CI/Vercel | — |
| npm | Package install | ✓ | 11.8.0 | — |
| Vercel CLI | Optional deploy CLI | ✓ | 53.4.0 | Use Vercel dashboard |
| Neon CLI | Optional DB mgmt | ✗ | — | Use Neon Console / API |
| Neon Scale plan | HIPAA mode enablement | [UNVERIFIED — requires user to check current plan] | — | Upgrade required |
| Vercel Pro HIPAA add-on | Vercel BAA | [UNVERIFIED — requires user to check billing] | — | Purchase in billing dashboard |
| Anthropic sales contact | API BAA | [UNVERIFIED — requires initiating sales contact] | — | Email sales@anthropic.com |

**Missing dependencies with no fallback:** none (all unverified items have a clear path)

**Missing dependencies with a user action:** Neon Scale plan, Vercel HIPAA add-on, Anthropic BAA sales contact — all are user-action items per D-14. No code work is blocked by these.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `remix-app/vite.config.ts` (test block present) |
| Setup file | `remix-app/app/test-setup.ts` (exists) |
| Quick run command | `cd remix-app && npm test` |
| Full suite command | `cd remix-app && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-02 | PHI infra BAA-covered before any client PHI write | manual-only | N/A — legal/ops action | N/A |
| COMP-02 | Vercel deployment succeeds + DB connectivity | smoke | `curl https://zoetrop.vercel.app` + health check query | ❌ Wave 0 (runbook procedure, not Vitest) |
| COMP-03 | pgAudit enabled with `log_parameter=off` confirmed | manual-only | N/A — requires Neon Support ticket | N/A |
| COMP-03 | pgAudit log entry includes {user, table, operation, timestamp} and NOT parameter values | manual-only | N/A — support ticket verification | N/A |
| SC#5 | RR7 Vercel preset configured, build passes | build | `cd remix-app && npm run build` | ✅ (existing CI) |
| SC#5 | `netlify.toml` absent from repo root | smoke | `test ! -f netlify.toml` | ❌ Wave 0 (shell assertion in runbook) |
| SC#5 | CLAUDE.md + docs/PLATFORM.md updated to Vercel | manual review | N/A | N/A |

**Existing tests (Phase 1 — passing, not affected by Phase 2):**
- `remix-app/app/lib/metrics.test.ts` — engine unit tests (COMP-01)
- `remix-app/app/lib/protocol-data.test.ts` — protocol tests
- `remix-app/app/lib/seed-data.test.ts` — seed data tests

### Sampling Rate

- **Per task commit:** `cd remix-app && npm test` (verify existing engine tests still pass)
- **Per wave merge:** `cd remix-app && npm run build` (verify Vercel preset build succeeds)
- **Phase gate:** Full suite green + manual SC checklist complete before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Shell assertion `test ! -f netlify.toml` — verifies Netlify cleanup (can run in CI as a `check` step)
- [ ] Build smoke test with Vercel preset — `npm run build` should succeed with the new preset installed
- [ ] Post-deploy DB connectivity check — a health-check loader or manual `curl` to confirm `DATABASE_URL` is wired

*(No new Vitest test files needed for Phase 2 — the compliance verifications are manual/ops procedures, not unit tests. The existing Phase 1 test suite must remain green throughout.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not in Phase 2 (Phase 3) |
| V3 Session Management | no | Not in Phase 2 (Phase 3) |
| V4 Access Control | no | Not in Phase 2 (Phase 3) |
| V5 Input Validation | no | No new user inputs in this phase |
| V6 Cryptography | yes | TLS for Neon + Vercel (handled by platform); BAA is the contract layer |
| V10 Malicious Code | yes | `@vercel/react-router` package legitimacy verified above |
| HIPAA §164.308 Administrative Safeguards | yes | BAAs cover the organizational requirement |
| HIPAA §164.312 Technical Safeguards | yes | pgAudit + Neon encryption at rest (AES-256) + in-transit TLS |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Connection string in Vercel env leaked via client bundle | Information Disclosure | Never import `db.server.ts` from client-side components; `.server.ts` suffix enforces server-only; env vars not exposed by Vercel at build time |
| Enabling HIPAA on wrong Neon project (new/empty project) | Tampering | Verify project ID in Neon Console before enabling; compare with existing connection string project ID |
| Vercel `DATABASE_URL` pointing to pooler when drizzle-kit needs direct | Denial of Service | Use `DATABASE_URL_UNPOOLED` for drizzle-kit via `drizzle.config.ts`; never use pooler URL for migrations |
| PHI in application logs (console.log, error boundaries) | Information Disclosure | No PHI in codebase until Phase 4; establish no-PHI-in-logs discipline now via code review |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Netlify SSR (React Router Netlify adapter) | Vercel Functions (React Router Vercel preset) | Phase 2 (this phase) | Remove `netlify.toml`; add `@vercel/react-router` preset; same SSR model |
| Neon via Netlify extension (auto-injects `NETLIFY_DATABASE_URL`) | Neon via manual env vars in Vercel | Phase 2 (this phase) | Use `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` (direct) |
| HIPAA BAA Enterprise-only on Vercel | HIPAA BAA available on Vercel Pro (self-serve add-on) | September 9, 2025 | No Enterprise upgrade required; significant cost saving |
| Anthropic BAA required ZDR (pre-Dec 2025) | HIPAA-ready API org is independent of ZDR | December 2, 2025 | Simpler path to HIPAA API coverage; ZDR not required |

**Deprecated/outdated:**
- `@vercel/remix` (v2.16.7): The old Remix-era Vercel adapter. Do NOT use for React Router 7. Use `@vercel/react-router` instead. The two are separate packages for separate frameworks.
- Netlify Neon extension: Replaced by manual env vars or Neon-Managed Vercel integration.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@react-router/serve` on Vercel: Vercel ignores the `start` script and runs its own function serving | Standard Stack A | Low — worst case: `start` script fails on Vercel, but Vercel does not run it |
| A2 | Vercel Pro HIPAA add-on pricing: exact cost not published in docs | Section B | Low — cost must be confirmed in billing dashboard before purchasing |
| A3 | Neon Scale plan: user's current plan tier (may already be on Scale) | Section D1 | Low — if already on Scale, no upgrade needed |
| A4 | Neon HIPAA irreversibility applies only to the project, not the org | Section D1 | Medium — if enabling HIPAA at org level is also irreversible, more care needed; Neon docs imply only project is permanent |
| A5 | The Neon Support ticket response time for pgAudit log sample is 1–3 business days | Section D3 | Low — may take longer; start the ticket early |

---

## Open Questions

1. **Neon project current plan tier**
   - What we know: The Neon project was provisioned via the Netlify extension. Netlify's Neon extension may have provisioned on a Free or Launch plan.
   - What's unclear: The current plan tier. If already on Scale, no upgrade is needed. If on Free/Launch, an upgrade is required before enabling HIPAA.
   - Recommendation: User checks Neon Console → Billing before starting Phase 2 work.

2. **Vercel Pro HIPAA add-on cost**
   - What we know: It is a "paid add-on" accessible from Settings → Billing; exact price not published publicly.
   - What's unclear: The monthly/annual cost.
   - Recommendation: User checks the Vercel billing dashboard for current pricing before committing.

3. **Anthropic sales lead time**
   - What we know: Anthropic HIPAA API requires a sales conversation (not self-serve). No documented SLA.
   - What's unclear: How long from initial contact to HIPAA org provisioning.
   - Recommendation: Start the sales conversation immediately (email claude.com/contact-sales) in parallel with Vercel + Neon work. Note in the runbook that Phase 5 is blocked until the BAA is signed.

---

## Sources

### Primary (HIGH confidence)

- [CITED: vercel.com/docs/frameworks/react-router] — `@vercel/react-router`, `vercelPreset()` API, `react-router.config.ts` wiring, Node runtime target; last_updated 2026-02-26
- [CITED: vercel.com/changelog/hipaa-baas-are-now-available-to-pro-teams] — Vercel Pro BAA availability (self-serve add-on); September 9, 2025
- [CITED: vercel.com/docs/security/compliance] — Vercel HIPAA compliance overview; last_updated 2026-05-12
- [CITED: neon.com/docs/security/hipaa] — Neon HIPAA setup, irreversibility, Scale plan requirement; verified 2026-06-08
- [CITED: neon.com/guides/hipaa-compliant-applications] — pgAudit auto-configuration details, parameter settings, log_parameter=off, audit log access via Support
- [CITED: platform.claude.com/docs/en/manage-claude/api-and-data-retention] — Anthropic API data retention, HIPAA-ready API path, ZDR, no-training guarantee, feature eligibility table
- [CITED: privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers] — BAA coverage scope, API vs Enterprise distinction
- [CITED: raw.githubusercontent.com/pgaudit/pgaudit/master/README.md] — pgAudit log entry format, PARAMETER field `<not logged>` behavior
- [VERIFIED: npm registry] — `@vercel/react-router@1.3.1` published 2026-05-27 by `vercel-release-bot`; peer deps confirmed
- [CITED: neon.com/docs/serverless/serverless-driver] — Neon Pool WebSocket driver on Vercel Node functions; per-request lifecycle requirement
- [CITED: neon.com/docs/guides/neon-managed-vercel-integration] — Neon-Managed integration with existing project; env vars injected (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`)

### Secondary (MEDIUM confidence)

- [CITED: neon.com/docs/guides/vercel-overview] — Three Neon-Vercel connection paths; when to use Neon-Managed vs manual
- [CITED: support.claude.com/en/articles/13296973-hipaa-ready-enterprise-plans] — Anthropic Enterprise HIPAA vs API HIPAA distinction; ZDR not required for HIPAA API
- [CITED: help.openai.com/en/articles/8660679] — OpenAI BAA process via `baa@openai.com`; for reference only
- [CITED: vercel.com/kb/guide/hipaa-compliance-guide-vercel] — Pro HIPAA add-on in Settings → Billing; Secure Compute is optional, not required

### Tertiary (LOW confidence — marked [ASSUMED] in Assumptions Log)

- `@react-router/serve` and Vercel's `start` script handling — training knowledge, not verified in Vercel docs

---

## Metadata

**Confidence breakdown:**
- Standard Stack (Vercel preset): HIGH — official Vercel docs, npm registry, peer dep check
- Vercel BAA tier: HIGH — official Vercel changelog (September 9, 2025), compliance docs
- Anthropic BAA path: HIGH — official Anthropic API docs (platform.claude.com), confirmed from authoritative source
- Neon HIPAA + pgAudit: HIGH — official Neon docs, hipaa-compliant-applications guide
- Neon-Vercel connection: HIGH — official Neon integration docs
- pgAudit log format: HIGH — pgaudit.org official README
- Env var naming: HIGH — confirmed from Neon-Managed integration docs

**Research date:** 2026-06-08
**Valid until:** 2026-09-08 (90 days — stable compliance/infra domain; Vercel/Anthropic compliance tiers may change with notice)
