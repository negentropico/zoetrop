# Phase 2: PHI / BAA Compliance Gate + Vercel Cutover - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

A **release gate, not a feature.** Nothing user-facing ships. Two strands, both of which must be TRUE before any *client* PHI is written (this gate blocks Phase 3 RLS retrofit and Phase 5 lab ingest):

1. **Vercel cutover** (code/config): add the React Router 7 Vercel preset, remove the Netlify deploy config, set `DATABASE_URL`(+unpooled)/auth secrets in Vercel project env, ship a successful production deploy, and update `CLAUDE.md` + `docs/PLATFORM.md` to reflect Vercel (URLs, no Netlify site id).
2. **PHI compliance** (mostly ops): Neon on the Scale plan with HIPAA mode enabled + signed Neon BAA; Vercel BAA on a BAA-eligible plan; chosen LLM-provider BAA covering the PHI-extraction tier; pgAudit configured (`log_parameter=off`) with a verified test query — all recorded in an ops runbook.

**Explicitly NOT in this phase:** any `tenantId`/`subjectId` columns, RLS, or auth (Phase 3); wiring loaders to Neon at runtime (Phase 4); schema-drift cleanup (Phase 4 / DATA-05); the LLM extraction *code* / model wiring (Phase 5); PHI **read-access** audit logging (deferred to Phase 3 — see D-13). The gate runs on **owner-only data**; no client PHI exists yet.

**Key reality:** BAA execution is inherently manual (signing vendor agreements with days-to-weeks legal turnaround). Part of this phase is unavoidably a *user-action checklist*, not code (see D-14). Starting the paperwork early — in parallel with finishing Phase 04.1 — is advised due to lead times.
</domain>

<decisions>
## Implementation Decisions

### LLM provider for PHI extraction (DECISION-01)
- **D-01:** **Defer the final provider pick to the phase researcher.** The researcher confirms current BAA availability + terms (incl. ZDR + no-training) for Anthropic Claude vs OpenAI before commit. The **gate criterion is locked now**: the chosen provider MUST have a signed BAA covering the PHI-extraction tier, recorded in the runbook, before Phase 5 begins.
- **D-02:** **Tiebreaker = default to Claude.** If both providers have a usable BAA, choose Claude (aligns with the project's Claude lean + STACK.md extraction-quality rating). Switch to OpenAI only if Claude's compliance path is blocked or materially harder.
- **D-03:** **Hard requirements beyond a signed BAA:** zero-data-retention (no PHI persisted by the provider) **AND** a contractual no-training-on-our-data guarantee. This may force a specific enterprise tier — researcher confirms tier + cost implication.
- Note: the model is provider-agnostic at the code layer (AI SDK `generateObject` — only the model param changes in Phase 5). The Phase 2 deliverable is the **signed BAA + tier confirmation recorded in the runbook**, not extraction code.

### Vercel cutover
- **D-04:** Production domain = **`zoetrop.vercel.app`** (Vercel subdomain). No custom domain — public brand is deferred (`docs/NAMING.md`). Revisit at brand launch.
- **D-05:** **Remove Netlify cleanly up front** as part of the cutover (delete `netlify.toml`; remove any Netlify adapter — note: no `@netlify/*` package is currently installed). No parallel-fallback window. **This does NOT mean skip verification** — the executor MUST confirm a green Vercel production deploy + DB connectivity (SC #5) before the cutover is considered done.
- **D-06:** **Vercel BAA tier is unconfirmed.** Researcher confirms which Vercel plan supports a HIPAA BAA (historically Enterprise) and surfaces any upgrade/cost implication **before** the BAA is executed. The "paid account" tier (per memory) is not yet known to cover a BAA.
- **D-07:** Add the **React Router 7 Vercel preset** to `react-router.config.ts` (currently bare `ssr: true`), install the Vercel adapter package, and configure the Vercel project. Researcher confirms the exact current RR7-on-Vercel preset/package + version.

### Env + DB connection
- **D-08:** Set in Vercel project env: `DATABASE_URL` (pooled — runtime) + the **unpooled/direct** Neon URL (for `drizzle-kit` migrations) + auth secrets. `db.server.ts` already falls back `NETLIFY_DATABASE_URL || DATABASE_URL`, so runtime works once `DATABASE_URL` is set. Keeping vs cleaning the `NETLIFY_DATABASE_URL` fallback is planner discretion (the proper cleanup is Phase 4 / DATA-05).

### Neon project continuity (captured with safe default — not discussed live)
- **D-09:** **KEEP the existing Neon project.** Do **NOT** provision a fresh DB via Vercel's Neon integration in any way that creates a new empty database (data-loss risk). The cutover repoints Vercel env vars at the **existing** Neon connection, upgrades that project to the **Scale** plan, and enables **HIPAA mode** on it. Neon was previously wired via the Netlify Neon extension; on Vercel the connection is managed via env vars (and/or Vercel's Neon integration pointed at the **same** existing project). Researcher confirms whether HIPAA-mode enablement carries plan/commitment or irreversibility implications.

### Compliance runbook
- **D-10:** Runbook lives at **`docs/COMPLIANCE-RUNBOOK.md`** — single in-repo, version-controlled markdown (alongside `PLATFORM.md` / `PRINCIPLES.md`).
- **D-11:** Contents = **full register per vendor** (Neon, Vercel, LLM provider): BAA status, execution date, plan/tier, signing contact, and the HIPAA-mode / pgAudit settings applied. **No secrets** (no credentials, connection strings, or keys — those stay in Vercel env / secret manager). The runbook is the auditable proof-of-gate referenced by Phases 3 and 5.

### pgAudit / audit logging
- **D-12:** Establish the pgAudit baseline with logging class **`write, ddl`** now (INSERT/UPDATE/DELETE + schema changes). `log_parameter=off` is fixed by SC #4 — verify a test query records `{user, table, operation, timestamp}` and explicitly **NOT** bind-parameter values.
- **D-13:** **PHI read-access logging is carried forward to Phase 3** (when tenant/PHI tables actually exist). Phase 2 does NOT configure SELECT/read logging — no client PHI to read yet; avoids noise/cost. COMP-03's "PHI access is audit-logged" is satisfied incrementally: baseline + verification here, read-access logging in Phase 3. **Must be recorded as a Phase 3 carry-forward so it isn't lost.**

### Execution model (automate vs manual checklist)
- **D-14:** The plan must split work into:
  - **(a) Claude-automatable:** Vercel preset/adapter cutover, env-var setup guidance, Netlify removal, pgAudit configuration + test-query verification, the runbook scaffold/structure, and the `CLAUDE.md` + `docs/PLATFORM.md` doc updates.
  - **(b) User-action items (inherently manual):** signing the Neon, Vercel, and LLM-provider BAAs (vendor legal turnaround); upgrading Neon to Scale + enabling HIPAA mode (account action); confirming the Vercel BAA-eligible tier. The plan produces a clear **user-action checklist** for (b) and records completion dates in the runbook.

### Claude's Discretion
- Exact RR7-Vercel preset/package name + version, `react-router.config.ts` / `vite.config.ts` specifics, the precise `pgaudit.log` parameter string, runbook section layout, and env-var naming beyond the required `DATABASE_URL`(+unpooled)+auth secrets — planner/researcher discretion, provided the decisions above hold.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 2 goal, the 5 success criteria (the verification bar), and the risk note (LLM BAA = DECISION-02; Vercel HIPAA/BAA typically Enterprise)
- `.planning/REQUIREMENTS.md` — COMP-02 (PHI infra BAA-covered before any PHI write), COMP-03 (PHI access audit-logged, pgAudit, parameters off)

### Research (drives the how)
- `.planning/research/SUMMARY.md` — DECISION-01 (LLM provider compliance-vs-quality), Phase 2 description, build-order dependency rationale
- `.planning/research/STACK.md` — LLM provider recommendation (Claude for extraction quality), AI SDK `generateObject` provider-agnostic note, Netlify Blobs → confirm HIPAA BAA before PHI (storage carries to Phase 5)
- `.planning/research/PITFALLS.md` — pgAudit `log_parameter=off`; "sending PHI to any LLM without a signed BAA is a HIPAA violation"; `SET LOCAL` vs bare `SET` pooler leak (Phase 3 context)
- `.planning/research/ARCHITECTURE.md` — runtime/deploy shape; `withTenantDb` wrapper keystone (Phase 3 context)

### Codebase ground truth (cutover surface)
- `remix-app/app/lib/db.server.ts` — env fallback `NETLIFY_DATABASE_URL || DATABASE_URL`; Neon serverless `Pool` driver (works on Vercel with `DATABASE_URL` set)
- `remix-app/drizzle.config.ts` — migrations config (needs the unpooled/direct Neon URL for `drizzle-kit`)
- `netlify.toml` (repo root) — current Netlify deploy config to remove (base=remix-app, command=`npm run build`, publish=`build/client`)
- `remix-app/react-router.config.ts` — bare `ssr: true` (add the Vercel preset)
- `remix-app/vite.config.ts` — plugin setup (`reactRouter()`, `tailwindcss()`, Vitest block)
- `remix-app/package.json` — current deps; `@react-router/serve` present, **no** `@netlify/*` or `@vercel/*` packages yet
- `.planning/codebase/INTEGRATIONS.md` — current Netlify CI/CD + Neon (Netlify extension) wiring
- `.planning/codebase/STACK.md` — current versions (Drizzle 0.45.x, `@neondatabase/serverless`)
- `.planning/codebase/CONCERNS.md` — debt inventory (context only; cleanup is Phase 4)

### Direction & constraints (and docs to UPDATE per SC #5)
- `docs/PLATFORM.md` §5.7 — PHI / security posture (BAA-readiness, audit trail, consent); **update deploy references to Vercel**
- `docs/PRINCIPLES.md` — TS-strict / no-`any`; LLM extraction + human-review constraint
- `CLAUDE.md` — Deployment section (Netlify URLs + site id); **update to Vercel** per SC #5
- `~/.claude/projects/-Users-mac-Code-zoetrop/memory/deploy-target-vercel.md` — the Vercel decision + its implications (Neon connection moves off the Netlify extension; "Netlify BAA" → "Vercel BAA"). *Outside the repo (Claude memory).*

### Prior phase (tenancy path context for Phase 3, not Phase 2 work)
- `.planning/phases/01-schema-baseline-engine-tests-auth-spike/01-CONTEXT.md` + `01-SPIKE-FINDINGS` — tenancy resolved to the `SET LOCAL` path (D-04 of Phase 1); informs Phase 3's RLS/audit-read work that this gate unblocks
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `remix-app/app/lib/db.server.ts` — already env-fallback-ready (`NETLIFY_DATABASE_URL || DATABASE_URL`); no code change strictly required for Vercel runtime once `DATABASE_URL` is set
- `remix-app/drizzle.config.ts` — already points `out` at `./migrations`; migrations work via the direct/unpooled URL

### Established Patterns
- TS strict, no `any` (PRINCIPLES) — any new config/code holds this
- Neon serverless `Pool` via `drizzle-orm/neon-serverless` — the connection model that the env repoint must preserve

### Integration Points
- `netlify.toml` (root) → **remove**; `react-router.config.ts` (bare) → **add Vercel preset**; `vite.config.ts` plugins; `package.json` (add Vercel adapter; nothing `@netlify/*` to uninstall)
- Existing Neon project → **keep**, repoint Vercel env at it, upgrade to Scale + enable HIPAA mode (D-09)
- `CLAUDE.md` Deployment section + `docs/PLATFORM.md` → update to Vercel (URLs, drop Netlify site id) per SC #5
- New artifact: `docs/COMPLIANCE-RUNBOOK.md` (D-10/D-11)
</code_context>

<specifics>
## Specific Ideas

- Vercel was chosen for monitoring/deploy ergonomics on a paid account ("easier to monitor and deploy" — memory `deploy-target-vercel.md`, 2026-06-08).
- The gate runs on **owner-only data** — no client PHI exists during Phase 2. This is why read-access audit logging can defer to Phase 3 (D-13) and why the BAAs can be signed in parallel without blocking current work.
- Sequencing tip to surface in the plan: kick off the manual BAA paperwork (Neon, Vercel, LLM provider) **now**, in parallel with finishing Phase 04.1, because vendor legal turnaround is the long pole.
</specifics>

<deferred>
## Deferred Ideas

- **Custom domain / public brand** → future (brand launch; `docs/NAMING.md`). Phase 2 uses `zoetrop.vercel.app`.
- **PHI read-access (SELECT) audit logging** → **Phase 3** (when tenant/PHI tables exist). Carry-forward from D-13.
- **`NETLIFY_DATABASE_URL` fallback cleanup**, `as any` casts, `syncStatus`/`syncVersion` vestiges → **Phase 4 / DATA-05**.
- **File-storage BAA coverage** (Netlify Blobs → Vercel Blob or equivalent) → **Phase 5** — must be confirmed BAA-covered before any PHI file is stored.
- **LLM model selection + extraction code** (`generateObject` wiring) → **Phase 5**. Phase 2 only records the signed provider BAA + tier.

None of the above were scope creep — they are genuine cross-phase carry-forwards surfaced during discussion.
</deferred>

---

*Phase: 2-phi-baa-compliance-gate-vercel-cutover*
*Context gathered: 2026-06-08*
