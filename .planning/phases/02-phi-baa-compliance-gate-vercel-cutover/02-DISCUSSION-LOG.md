# Phase 2: PHI / BAA Compliance Gate + Vercel Cutover - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 2-phi-baa-compliance-gate-vercel-cutover
**Areas discussed:** LLM provider, Vercel cutover shape, Compliance runbook, Audit-logging depth, Neon continuity (offered, deferred to safe default)

---

## LLM provider for PHI extraction (DECISION-01)

### Q1 — Provider direction

| Option | Description | Selected |
|--------|-------------|----------|
| Anthropic Claude | Highest extraction quality (STACK.md); project leans Claude; confirm BAA tier (PITFALLS flagged uncertain) | |
| OpenAI | Research-flagged confirmed enterprise BAA path; quality slightly behind | |
| Decide after research confirms terms | Lock gate criteria now; researcher confirms current BAA availability/terms before commit | ✓ |

**User's choice:** Decide after research confirms terms

### Q2 — Tiebreaker if both have a usable BAA

| Option | Description | Selected |
|--------|-------------|----------|
| Extraction quality | Pick whichever parses lab PDFs most accurately | |
| Default to Claude | Lean Claude for consistency; switch only if its compliance path is blocked/much harder | ✓ |
| Lowest compliance friction | Pick simplest BAA + ZDR + cleanest terms even if quality marginally lower | |

**User's choice:** Default to Claude

### Q3 — Hard compliance requirements beyond a signed BAA

| Option | Description | Selected |
|--------|-------------|----------|
| ZDR + no-train required | Require zero-data-retention AND no-training-on-our-data | ✓ |
| No-train required, ZDR preferred | Hard-require no-train; ZDR strongly preferred but optional | |
| Standard BAA terms OK | Standard HIPAA safeguards sufficient; don't over-constrain | |

**User's choice:** ZDR + no-train required

**Notes:** Provider is provider-agnostic at the code layer (AI SDK `generateObject`); Phase 2 deliverable is the recorded signed BAA + tier confirmation, not extraction code.

---

## Vercel cutover shape

### Q1 — Production domain

| Option | Description | Selected |
|--------|-------------|----------|
| zoetrop.vercel.app | Vercel subdomain; brand deferred (NAMING.md) | ✓ |
| Custom domain now | DNS + verification + a deferred naming decision | |
| Reuse a domain you own | User-supplied existing domain | |

**User's choice:** zoetrop.vercel.app

### Q2 — Netlify teardown timing

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as fallback during cutover | Verify Vercel prod first, then retire Netlify | |
| Remove immediately | Delete netlify.toml / site up front, clean cutover | ✓ |

**User's choice:** Remove immediately

**Notes:** Captured caveat in CONTEXT (D-05) — "remove immediately" = no fallback window, NOT skip verification; executor still confirms a green Vercel prod deploy (SC #5).

### Q3 — Vercel BAA tier knowledge

| Option | Description | Selected |
|--------|-------------|----------|
| Have researcher confirm | Researcher confirms which Vercel plan supports a BAA + cost implication | ✓ |
| Enterprise (BAA supported) | Account already supports a BAA | |
| Pro — may need upgrade | Pro tier; capture likely upgrade requirement | |

**User's choice:** Have researcher confirm

---

## Compliance runbook

### Q1 — Runbook home

| Option | Description | Selected |
|--------|-------------|----------|
| docs/COMPLIANCE-RUNBOOK.md | Single in-repo, version-controlled markdown | ✓ |
| docs/ops/ directory | Room for future ops docs | |
| External (vault/Notion) + pointer | Keep specifics out of git; split source of truth | |

**User's choice:** docs/COMPLIANCE-RUNBOOK.md

### Q2 — Level of detail committed

| Option | Description | Selected |
|--------|-------------|----------|
| Full register, no secrets | Per-vendor BAA status/date/tier/contact + HIPAA/pgAudit settings; no creds | ✓ |
| Status table only | Compact vendor + signed Y/N + date checklist | |

**User's choice:** Full register, no secrets

---

## Audit-logging depth (pgAudit)

### Q1 — pgAudit logging class

| Option | Description | Selected |
|--------|-------------|----------|
| Writes + DDL now | Log write, ddl; add PHI read-logging in Phase 3 | ✓ |
| Reads + writes now | Log read, write, ddl immediately; heavier volume | |
| Object-level on PHI tables | Surgical read logging on PHI tables (tables land Phase 3) | |

**User's choice:** Writes + DDL now

### Q2 — COMP-03 read-access handling across phases

| Option | Description | Selected |
|--------|-------------|----------|
| Baseline now, read-logging Phase 3 | Establish baseline + verify test query here; read-logging when PHI tables exist | ✓ |
| Full read+write logging now | Close COMP-03 entirely in this phase | |

**User's choice:** Baseline now, read-logging Phase 3

---

## Neon continuity (offered as an additional area)

| Option | Description | Selected |
|--------|-------------|----------|
| Discuss Neon continuity | Deep-dive the keep-vs-reprovision decision | |
| Ready for context | Capture with the safe default (keep existing project, repoint env, Scale + HIPAA mode) | ✓ |

**User's choice:** Ready for context — captured as D-09 with the safe default (keep existing Neon project; do not create a new DB via Vercel's Neon integration).

---

## Claude's Discretion

- Exact RR7-Vercel preset/package name + version, `react-router.config.ts` / `vite.config.ts` specifics, `pgaudit.log` parameter string, runbook section layout, env-var naming beyond required `DATABASE_URL`(+unpooled)+auth secrets.

## Deferred Ideas

- Custom domain / public brand → brand launch
- PHI read-access (SELECT) audit logging → Phase 3
- `NETLIFY_DATABASE_URL` fallback cleanup, `as any`, sync vestiges → Phase 4 / DATA-05
- File-storage BAA coverage (Blobs) → Phase 5
- LLM model selection + extraction code → Phase 5
