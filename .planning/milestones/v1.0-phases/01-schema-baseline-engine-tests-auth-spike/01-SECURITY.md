---
phase: 01
slug: schema-baseline-engine-tests-auth-spike
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-08
register_authored_at_plan_time: true
---

# Phase 01 — Security: schema-baseline-engine-tests-auth-spike

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register was authored at plan time (all 5 PLAN.md files carried a `<threat_model>` block);
> this audit **verified each mitigation exists** rather than scanning for new threats.

**Audit date:** 2026-06-08
**ASVS Level:** 1 (n=1 personal instrument, M0/M1 stage)
**Auditor:** gsd-security-auditor (sonnet)
**Threats Closed:** 13/13
**Open (BLOCKER):** 0

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → local devDependencies | Untrusted package code pulled into the dev/build toolchain | Third-party JS (vitest, coverage-v8, better-auth) |
| local CLI → production Neon database | Migration tooling holds production DB credentials and can run DDL against live data | DDL + connection string |
| spike client → disposable Neon branch | Auth tokens and JWKS material cross into a throwaway database | JWTs, `request.jwt.claims` |
| tenant A transaction ↔ tenant B transaction (pooled conn) | The cross-tenant leak Phase 3's RLS must prevent — demonstrated here | Tenant claim / row visibility |
| spike code → committed repo | Throwaway code and any secret/token must not persist into the codebase or git history | Source, secrets |
| (plans 04 / 05) | Pure internal refactor + tests on already-trusted in-bundle code — no new boundary, network surface, or untrusted input | n/a |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|-----------------------|--------|
| T-01-SC | Tampering | npm installs (vitest, @vitest/coverage-v8, better-auth) | mitigate | 01-01-SUMMARY: legitimacy gate cleared before install. Lockfile resolves vitest@4.1.8, @vitest/coverage-v8@4.1.8, better-auth@1.6.14 — all `dev: true`; declared ranges (^4.1.8, ^1.6.14) match resolved versions. | closed |
| T-01-01 | Elevation of Privilege | better-auth pulled into runtime bundle | mitigate | `package.json` `dependencies` block: better-auth ABSENT. Present only in `devDependencies: "^1.6.14"` (`dev: true` in lockfile). `remix-app/spikes/` does not exist. | closed |
| T-01-02 | Tampering | drizzle-kit migrate against production | mitigate | No `push` script in `package.json`. Baseline applied via `drizzle-kit migrate` against a verified-empty DB (user-approved); DDL pre-validated by transactional rollback dry-run. Migrations committed + journaled. | closed |
| T-01-03 | Information Disclosure | production DB connection string in env | accept | ACCEPTED RISK (see log). No connection string committed; `.env` git-ignored (root + remix-app); only `.env.example` (placeholders) tracked — `git ls-files \| grep .env` → `.env.example` only. | closed |
| T-01-04 | Tampering | wrong hash inserted into `__drizzle_migrations` | mitigate | SHA-256 of `migrations/0000_light_blue_shield.sql` = `b475bf51…0244`, matches 01-02-SUMMARY verbatim. `_journal.json` entries[0].tag = `0000_light_blue_shield`; hash read from journal then applied at the checkpoint. | closed |
| T-01-05 | Information Disclosure | tenant context leak via bare SET across pooled txns | mitigate | 01-SPIKE-FINDINGS.md: "SET LOCAL did NOT leak into the next transaction on the same pooled connection; bare SET DID leak. (D-05 satisfied.)" `[x] SET LOCAL isolation confirmed`. Verdict mandates SET LOCAL for Phase 3. | closed |
| T-01-06 | Information Disclosure | production PHI exposed to spike | mitigate | 01-SPIKE-FINDINGS.md: ran against disposable Neon branch `spike-auth-rls` (br-rough-rice-aexcqurz), torn down. 01-03-SUMMARY: "deleted the Neon branch." Empty throwaway branch — no production PHI. | closed |
| T-01-07 | Spoofing / Information Disclosure | secrets/tokens committed to git | mitigate | `git grep` over tracked files + history: zero JWTs (`eyJ…`) or connection strings (`postgresql://user:pass@…`) in any `.ts/.tsx/.json/.sql`. Spike files never committed (`git log --all --name-only` shows no `spike-*`). Findings: "No secrets, tokens, or connection strings are recorded here." | closed |
| T-01-08 | Elevation of Privilege | spike code promoted to production runtime | mitigate | `remix-app/spikes/` absent on filesystem. `remix-app/tsconfig.json:8` `"exclude": ["spikes"]`. Vite `include` glob only matches `app/**/*.test.{ts,tsx}`. Spike files were never in git history. | closed |
| T-01-09 | Spoofing | JWT replay after expiry during the spike | accept | ACCEPTED RISK (see log). Spike-only 1h-expiry JWTs on a throwaway branch (torn down); no production trust placed in spike-issued tokens. | closed |
| T-01-10 | Tampering | behavioral divergence during getMetricStatus extraction | mitigate | `app/lib/metrics.ts:9` exports `getMetricStatus`; `metrics.test.ts:2` imports from `~/lib/metrics`, 11 boundary cases. All 4 routes import the shared util (home:19, metrics/index:10, category:10, detail:10). No inline `function getMetricStatus` remains (grep: 0). | closed |
| T-01-11 | Tampering | getCessationDay default-param change altering call-site behavior | mitigate | `app/lib/protocol-data.ts:29` `export function getCessationDay(now: Date = new Date()): number`. Default preserves all no-arg call sites (home.tsx:55); `tsc --noEmit` clean (01-05-SUMMARY). | closed |
| T-01-12 | Tampering | date-coupled test producing a flaky/self-invalidating gate | mitigate | `app/lib/protocol-data.test.ts`: zero bare `getCessationDay()` calls; all 9 day-boundary assertions inject `day(n)`. Phase assertions use `.phase` (line 37), not `.name`. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-03 | Operator-environment secret management is the standard pattern for a server-side DB connection at ASVS L1; no secret in source, `.env` git-ignored, only placeholders tracked. | Mac (operator) | 2026-06-08 |
| AR-02 | T-01-09 | Spike-only exposure; disposable Neon branch torn down immediately after the verdict; no production trust in the throwaway-signed tokens; signing key never committed. | Mac (operator) | 2026-06-08 |

### AR-01 — T-01-03 — Information Disclosure: production DB connection string in env

- **Risk:** Production Neon credentials held in the operator environment (`DATABASE_URL` / `NETLIFY_DATABASE_URL`); if the environment is compromised, the connection string is exposed.
- **Acceptance basis:** Standard operator-environment secret pattern. No alternative for a server-side DB connection at ASVS L1. Credentials are never written to source; `.env` git-ignored; `.env.example` holds only placeholders.
- **Residual:** Operator must rotate credentials if the environment is compromised. The platform (Netlify → Vercel) injects these at build/deploy time via its secret store.
- **Phase to revisit:** Phase 2 (Vercel migration / BAA gate) — evaluate secret-manager integration.

### AR-02 — T-01-09 — Spoofing: JWT replay after expiry during the spike

- **Risk:** Spike-issued JWTs (1h expiry, throwaway `BETTER_AUTH_SECRET`) could be replayed against the spike branch.
- **Acceptance basis:** Spike-only exposure. The disposable Neon branch was torn down immediately after the verdict; no production trust was placed in these tokens; the throwaway secret is in no committed file.
- **Residual:** None — both the branch and the signing-key environment are gone.

---

## Unregistered Flags

The SUMMARY files contain no `## Threat Flags` section. The following surface appeared during verification and has **no** mapping in the phase register:

### UNREGISTERED-01 — npm audit: high-severity vulnerabilities in production dependency `react-router`

- **Source:** `npm audit` from the Phase 01 harness install (18 total: 10 high, 8 moderate).
- **Affected production packages:** `react-router`, `@react-router/node`, `@react-router/serve` (in `dependencies`, not `devDependencies`).
- **High-severity advisories:**
  - GHSA-49rj-9fvp-4h2h — turbo-stream TYPE_ERROR deserialization → unauth RCE
  - GHSA-8646-j5j9-6r62 — XSS in unstable RSC redirect via `javascript:` targets
  - GHSA-8x6r-g9mw-2r78 — DoS via unbounded path expansion in `__manifest`
  - GHSA-rxv8-25v2-qmq8 — DoS via reflected user input in single-fetch
- **Classification:** WARNING (unregistered flag). **Not a Phase 01 blocker** — pre-existing dependency, not introduced by this phase; no register entry covers it.
- **Recommended action:** Register a tracked threat for the react-router advisory set; upgrade to a patched version when available, or document acceptance given the n=1 / no-unauthenticated-network-surface context of M0. Triage in the next planning cycle (candidate for Phase 2 dependency-hygiene pass).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-08 | 13 | 13 | 0 | gsd-security-auditor (sonnet) |

---

## Audit Notes

- Register origin: **authored at plan time** (`register_authored_at_plan_time: true`) — all 5 PLAN.md files carried a `<threat_model>` block. The audit verified each mitigation exists; it did not scan for new threats.
- No `## Threat Flags` section was present in any of the five SUMMARY files (01-01 … 01-05). UNREGISTERED-01 was surfaced proactively during the npm-audit verification step.
- The 01-02 deviation (real `drizzle-kit migrate` vs. planned manual INSERT) was user-approved and does not alter the T-01-02 / T-01-04 verdicts — the hash was still read from `_journal.json` and verified by SHA-256.
- The 01-03 deviation (RLS policy used `current_setting('request.jwt.claims')` instead of `auth.session()`) is recorded in 01-SPIKE-FINDINGS.md and does not change the T-01-05 / T-01-06 verdicts.
- Spike files (`spike-server.ts`, `spike-db.ts`, `spike-rls.sql`) were never committed; only the tsconfig `spikes/` exclusion was committed, as a forward-useful safety measure.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (AR-01, AR-02)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-08
