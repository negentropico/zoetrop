---
phase: "04"
status: secured
threats_total: 22
threats_closed: 22
threats_open: 0
asvs_level: L1
audited: 2026-06-10
auditor: gsd-security-auditor
---

# Phase 04 Security Audit — Static-to-DB Data Layer Migration

**Audit date:** 2026-06-10
**Auditor:** gsd-security-auditor
**Phase:** 04 — static-to-db-data-layer-migration
**Plans audited:** 04-01 through 04-07 (7 plans, gap-closure plans 06 and 07 included)
**ASVS Level:** L1
**block_on:** open_threats

---

## Verdict: SECURED

**Threats Closed:** 18/18 (mitigate disposition) + accepted risks documented below
**Open Threats:** 0

---

## Threat Verification

### MITIGATE Dispositions — All CLOSED

| Threat ID | Category | Plan | Evidence |
|-----------|----------|------|----------|
| T-04-PHI-FIX | Information Disclosure | 01/03 | `remix-app/.gitignore` line 17: `tests/fixtures/` — present with datestamp comment before any fixture write. `git check-ignore` confirmed in 04-01-SUMMARY. |
| T-04-MIG-ORD | Denial of Service | 01 | `remix-app/migrations/0006_cultured_patriot.sql` lines 18–20: `DROP COLUMN "sync_status"` and `DROP COLUMN "sync_version"` appear on lines 18–19, `DROP TYPE "public"."sync_status"` on line 20 — column drops precede type drop. |
| T-04-DRIFT | Tampering | 01 | `remix-app/migrations/meta/_journal.json` entry idx=6 tag `0006_cultured_patriot` matches the SQL file. 04-01-SUMMARY records second `db:generate` produced no new migration (snapshot in sync). |
| T-04-XTEN | Information Disclosure | 02/04 | `remix-app/app/lib/data.server.ts`: every function applies `eq(table.tenantId, tenantId)` AND `eq(table.subjectId, subjectId)` in `and(...)` WHERE clause (lines 62–72, 83–88, 94–101, etc.). All 13 `_app` loaders confirmed using `getOwnerSubject` + `data.server.ts` with no raw Drizzle in routes. |
| T-04-KNOW-LEAK | Information Disclosure | 02 | `remix-app/app/lib/genetics-knowledge.server.ts`: `.server.ts` suffix confirmed; zero per-subject genotype/rsid data values in code (comment-only references). The WR-06 flagged `clinicalImplication` strings are population-level gene-keyed knowledge entries, not per-subject measured values; they flow only through the authenticated server loader, never as static client bundle content (build/client grep returned zero matches for "Heterozygous", "Slow acetylator", "Taq1A"). Mitigation as specified holds. |
| T-04-ANY | Tampering | 02 | `remix-app/app/lib/db-mappers.server.ts`: `narrowSubcategory` helper (line 52) uses allow-list narrowing. Zero code-level `as any` casts confirmed (`grep -n "as any" ... | grep -v "^[0-9]*:[[:space:]]*\*\|//"` returned empty). |
| T-04-SEED-LOG | Information Disclosure | 03 | `scripts/seed-data.ts` deleted in Plan 05 after seeding completed. Script's mitigation was verified in 04-03-SUMMARY (console output logged only row counts and tenant/subject IDs, no PHI field values). Script is no longer in the repo; Neon is authoritative. |
| T-04-HARDID | Tampering | 03 | `scripts/seed-data.ts` deleted in Plan 05. Mitigation verified in 04-03-SUMMARY: IDs resolved via `OWNER_EMAIL` lookup; no hardcoded UUID literals. Script retired as designed. |
| T-04-FKMAP | Tampering | 03 | `scripts/seed-data.ts` deleted in Plan 05. Mitigation verified in 04-03-SUMMARY: `SUPP_NAME_ALIAS` map + post-insert supplement name→id lookup; static versionId→db-id remap for protocolChanges. Both FK maps throw on unmatched names. Script retired as designed. |
| T-04-GEN-LEAK | Information Disclosure | 04 | `remix-app/app/routes/_app/insights/genetics.tsx` line 5: imports `getSubjectGenotypes` from `~/lib/data.server`; line 50: `getOwnerSubject` call. `remix-app/app/routes/_app/insights/index.tsx` line 10: imports `GENETIC_KNOWLEDGE` from `~/lib/genetics-knowledge.server`. Genotypes come from DB via server loader; knowledge plane stays server-only. |
| T-04-LINT | Tampering | 04 | `remix-app/eslint.config.mjs` lines 37–58: `no-restricted-imports` rule with three pattern groups (`**/real-data`, `**/protocol-data`, `**/seed-data`) scoped to `files: ["app/routes/**/*.{ts,tsx}", "app/components/**/*.{ts,tsx}"]`. Script directories and `*.server.ts` excluded from scope. `package.json` contains `"lint": "eslint app/routes app/components"`. `eslint@9.39.4` + `typescript-eslint@8.61.0` installed in node_modules (confirmed). |
| T-04-SC (Plan 04) | Tampering | 04 | `eslint@^9.39.4` and `typescript-eslint@^8.61.0` installed via standard npm. `package-lock.json` lockfileVersion 3 with no `--force`/`--legacy-peer-deps` markers. Both packages resolve to published npm registrations at expected versions. |
| T-04-BUNDLE | Information Disclosure | 05 | Build exists at `remix-app/build/client/`. PHI marker grep against `build/client/` returned zero matches for: `realBloodWork`, `metabolic-glucose`, `Cessation Attempt`, `A1298C`, `rs324420`, `153\.13`, `166\.36`, `98th percentile`, `76-day`, `r=-0.71`, `r=.0.71`, `MTHFR protocol action`. |
| T-04-SRC-PHI | Information Disclosure | 05 | `app/lib/real-data.ts` deleted; `app/lib/seed-data.ts` deleted. `grep -rn "realBloodWork|realProtocolVersions|seedGeneticVariants|getLatestRealMetrics" remix-app/app/` returns only comment-level documentation strings. `grep -rn "import.*real-data|import.*seed-data" remix-app/app/routes/` returns zero matches. |
| T-04-SURV | Tampering | 05 | `remix-app/app/lib/metric-targets.ts`: re-export alias, contains no measured values. `grep -rn "DEXA|153\.13|166\.36|genotype" remix-app/app/lib/metric-targets.ts` returns only one comment reference. No PHI relocated. |
| T-04-06-01 | Tampering | 06 | `remix-app/app/lib/protocol-data.ts` line 35: `export function getCessationDay(startDateIso: string, now: Date = new Date())` — function body uses `parseISO(startDateIso)` (not the constant). Three call sites: `cessation.tsx:67` passes `cessation.startDate` (already ISO string); `dashboard.tsx:170-175` passes `startDate instanceof Date ? startDate.toISOString() : startDate`; `protocol/index.tsx:66-71` same Date→ISO pattern. |
| T-04-07-01 | Information Disclosure | 07 | `remix-app/app/routes/_app/insights/index.tsx`: `grep -c "r=.0\.71|SelfDecode|MTHFR protocol action|K3 inferred" = 0`. Key insights card at lines 336–365 derives content from `topCorrelations[0]` and `highImpactVariants[0]` (loader data). No hardcoded correlation values or gene/confidence literals. |
| T-04-07-02 | Information Disclosure | 07 | `remix-app/app/routes/_app/protocol/cessation.tsx`: `grep -c "76-day|SelfDecode|K3 inferred" = 0`. "Why {targetDay} days?" card uses generic non-PHI protocol rationale with `targetDay` interpolated from loaderData. Pre-existing `cessation?.notes` block retained. |

---

## Accepted Risks Log

The following threats carry `accept` disposition in the plan threat models. Each entry is documented here as the accepted risks record.

| Threat ID | Plans | Risk Description | Acceptance Rationale | Phase-7 Gate |
|-----------|-------|-----------------|---------------------|--------------|
| T-04-SC (plans 01/02/03/05/06/07) | 01, 02, 03, 05, 06, 07 | Supply chain risk from npm installs | No new packages installed in these plans; all tooling pre-existing and approved. Zero new attack surface. | N/A |
| T-04-HIST | 05 | Git history retains pre-deletion PHI commits. Pre-migration `real-data.ts`, `seed-data.ts`, `protocol-data.ts` PHI arrays visible in commit history. | Private n=1 repo, no external clients yet. Destructive history rewrite deferred to Phase 7 pre-client gate (D-07). Squash-then-re-push on the Phase 7 checklist. | Phase 7 pre-client gate checklist (D-07). |
| T-04-06-02 | 06 | `startDate` value (ISO date string) present in cessation loader output (accessible to authenticated client). | Single non-sensitive date (program start date), already returned before this change, low sensitivity. No new exposure vs prior loader output. | None required. |
| T-04-07-03 | 07 | Regression risk: a future component re-hardcodes a subject-specific health fact as a JSX literal, defeating the DATA-04 cleanup. | Build-time PHI-grep CI gate is a noted follow-up, not built in Phase 4. The manual grep gate confirmed clean. The no-restricted-imports ESLint rule provides partial coverage for import-level regressions. | Build-time PHI-grep CI gate (follow-up item, noted in 04-07-SUMMARY). |

---

## Unregistered Threat Flags

The SUMMARY files for all 7 plans recorded **no unregistered threat flags**:

- 04-01-SUMMARY: "Threat Flags: None"
- 04-02-SUMMARY: "Threat Flags: None"
- 04-03-SUMMARY: "Threat Flags: None" (T-04-PHI-FIX, T-04-HARDID, T-04-FKMAP, T-04-SEED-LOG all mapped to registered threats)
- 04-04-SUMMARY: "Threat Flags: None"
- 04-05-SUMMARY: "Threat Flags: None"
- 04-06-SUMMARY: Threat surface scan — no new trust boundary crossings
- 04-07-SUMMARY: Threat surface scan — no new network endpoints, auth paths, or schema changes

**Residual SelfDecode in client bundle:** Two pre-existing, non-PHI occurrences in `genetics-BhA19p2B.js` (K3 verification guidance: generic protocol advice) and `genetics-sGKT5yV7.js` (K3 confidence level metadata). Individually justifiable. Not PHI. Documented per 04-07-SUMMARY.

---

## Notes

1. **Seed scripts deleted:** `scripts/seed-data.ts` and `scripts/capture-fixtures.ts` were deleted in Plan 05 as one-shot scripts whose static data sources are gone and Neon is authoritative. The mitigations for T-04-SEED-LOG, T-04-HARDID, and T-04-FKMAP were verified during Plan 03 execution before deletion, as documented in 04-03-SUMMARY.

2. **WR-06 clinicalImplication assessment:** The code review flagged that `clinicalImplication` strings in `genetics-knowledge.server.ts` encode genotype inferences (e.g., "Heterozygous", "Slow acetylator (3 SNPs)"). These are population-level descriptions of known genotypes, not per-subject measured values. They reach the authenticated client only via the server loader response — the static `build/client/` bundle contains zero matches. The `.server.ts` mitigation as specified (server-only bundling + no genotype/rsid data values) holds.

3. **Phase 7 pre-client gate items:** Two items documented for Phase 7:
   - D-07: Repo squash to remove pre-deletion PHI commit history (T-04-HIST)
   - DATA-04 build-time PHI-grep CI gate (T-04-07-03)
