---
phase: 04-static-to-db-data-layer-migration
reviewed: 2026-06-10T12:40:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - remix-app/.gitignore
  - remix-app/app/components/shell/TopNav.tsx
  - remix-app/app/lib/cessation.ts
  - remix-app/app/lib/correlations.ts
  - remix-app/app/lib/data.server.ts
  - remix-app/app/lib/db-mappers.server.ts
  - remix-app/app/lib/db.server.ts
  - remix-app/app/lib/genetics-knowledge.server.ts
  - remix-app/app/lib/metric-targets.ts
  - remix-app/app/lib/metrics.ts
  - remix-app/app/lib/protocol-data.test.ts
  - remix-app/app/lib/protocol-data.ts
  - remix-app/app/lib/seed-data.test.ts
  - remix-app/app/routes/_app/dashboard.tsx
  - remix-app/app/routes/_app/insights/correlations.tsx
  - remix-app/app/routes/_app/insights/genetics.tsx
  - remix-app/app/routes/_app/insights/index.tsx
  - remix-app/app/routes/_app/metrics/category.tsx
  - remix-app/app/routes/_app/metrics/detail.tsx
  - remix-app/app/routes/_app/metrics/index.tsx
  - remix-app/app/routes/_app/protocol/cessation.tsx
  - remix-app/app/routes/_app/protocol/compare.tsx
  - remix-app/app/routes/_app/protocol/index.tsx
  - remix-app/app/routes/_app/protocol/supplements.tsx
  - remix-app/app/routes/_app/protocol/version-detail.tsx
  - remix-app/app/routes/_app/protocol/versions.tsx
  - remix-app/app/types/metrics.ts
  - remix-app/db/schema.ts
  - remix-app/eslint.config.mjs
  - remix-app/migrations/0006_cultured_patriot.sql
  - remix-app/migrations/meta/0006_snapshot.json
  - remix-app/migrations/meta/_journal.json
  - remix-app/package.json
  - remix-app/tests/db/data-seed.test.ts
  - remix-app/tests/lib/data.server.test.ts
  - remix-app/tests/lib/db-mappers.server.test.ts
  - remix-app/tests/parity/loader-parity.test.ts
findings:
  critical: 1
  warning: 7
  info: 9
  total: 17
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-06-10T12:40:00Z
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

Re-review of Phase 4 (static-to-DB data layer migration) after gap-closure plans 04-06 and 04-07. All 38 in-scope files were read in full; the unit test suite (139 passed, 42 live-DB skipped), the DATA-01 ESLint gate, `tsc --noEmit`, and a production build were all run and pass clean.

**Prior-finding verification:**

- **CR-02 (cessation day from hardcoded constant) — VERIFIED FIXED.** `getCessationDay(startDateIso, now)` now requires the start date as a parameter (`remix-app/app/lib/protocol-data.ts:35`), and all three call sites (`dashboard.tsx:170`, `protocol/index.tsx:66`, `protocol/cessation.tsx:67`) pass `cessation_log.startDate` from the DB. `CESSATION_START_DATE` survives only as documentation/test input and is not a runtime input to the day calculation. Unit tests pin `now` injection and phase clamping.
- **CR-03 (PHI string literals in client bundle) — VERIFIED FIXED at the bundle level, with two residual contract violations downgraded to warnings (WR-05, WR-06).** `real-data.ts` and `seed-data.ts` are deleted; genetics knowledge moved to `genetics-knowledge.server.ts`; PHI arrays removed from `protocol-data.ts`. I built the production bundle and grepped `build/client/assets/` for distinctive PHI strings (`102.9`, `NAFLD`, `Slow acetylator`, `Taq1A`, `HOMA-IR`, `ASD paradox`, `Methylfolate 800mcg`) — zero hits. However, subject-specific health details still live in client-bundleable source (see WR-05) and the "non-PHI" genetics knowledge module discloses genotypes (see WR-06).

**New material finding:** the DB-backed loaders authenticate but do not authorize — `assertSubjectAccess` (and `requireRole`) have zero callers, so any authenticated user in the tenant, including invite-created `client`-role users, can read the owner's full PHI (CR-01).

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: PHI loaders enforce authentication but no authorization — client-role users can read all owner PHI

**File:** `remix-app/app/routes/_app/dashboard.tsx:97-116` (and the same pattern in all 12 DB-backed loaders: `metrics/index.tsx:54`, `metrics/category.tsx:61`, `metrics/detail.tsx:40`, `protocol/index.tsx:26`, `protocol/versions.tsx:23`, `protocol/version-detail.tsx:18`, `protocol/supplements.tsx:32`, `protocol/cessation.tsx:24`, `protocol/compare.tsx:17`, `insights/index.tsx:33`, `insights/correlations.tsx:26`, `insights/genetics.tsx:48`)

**Issue:** Every loader calls only `requireUser(request)` then reads the owner subject's metrics, genotypes, cessation log, and supplements. `assertSubjectAccess` in `authz.server.ts` — whose contract (D-13) explicitly says "Denies: client role outright" — has **zero callers** anywhere in `app/` (verified by grep). `requireRole` is likewise never called from these loaders. The invites system (`invites.server.ts`, Phase 3, live) can mint `client`-role and `practitioner`-role users into the same tenant. A `client`-role user who accepts an invite and logs in today can browse `/metrics`, `/insights/genetics`, etc. and read the owner's blood panels and genetic variants. The layout loader (`_app/layout.tsx`) also gates only on session, and even coerces a missing role to `"client"` — a read-everything default in practice.

**Fix:** Enforce subject access in each loader (or centrally, e.g., in `getOwnerSubject` after resolving the subject):

```ts
const { user } = await requireUser(request);
const subject = await getOwnerSubject(user.tenantId!);
assertSubjectAccess(user, subject, user.tenantId!); // denies client role + cross-tenant
```

Alternatively add the check once inside `data.server.ts` so the Phase 7 `withTenantDb` retrofit boundary also carries the role gate. Add a regression test: mocked `requireUser` returning `role: "client"` must produce a 403 from each loader.

## Warnings

### WR-01: Dashboard "Protocol version" tile hardcodes "7 versions" instead of using the DB count

**File:** `remix-app/app/routes/_app/dashboard.tsx:501`
**Issue:** `<StatTile label="Protocol version" value={currentVersion} unit="7 versions" ... />` hardcodes the count while the loader already fetches `protocolVersionsRows`. The moment P7 is logged (or a tenant with fewer versions onboards in M1), the dashboard lies. `protocol/index.tsx` does this correctly with `${totalVersions} versions`.
**Fix:** Return `totalVersions: sortedVersions.length` from the loader and render `` unit={`${totalVersions} versions`} ``.

### WR-02: No ORDER BY anywhere in data.server.ts — "latest milestone" and cessation row selection depend on arbitrary DB row order

**File:** `remix-app/app/lib/data.server.ts` (all read functions); consumers at `remix-app/app/routes/_app/protocol/index.tsx:51,60-62`, `protocol/cessation.tsx:29`, `dashboard.tsx:168`
**Issue:** Postgres does not guarantee row order without `ORDER BY`. Two consumers depend on it anyway: (1) `latestMilestone = normalizedMilestones[normalizedMilestones.length - 1]` treats the last returned row as the most recent milestone — it can be any row after vacuum/update churn; (2) `cessationRows[0]` picks an arbitrary cessation entry if a second cessation cycle is ever logged (the schema permits multiple rows; `endDate` exists precisely for completed cycles). Protocol versions are safe only because every consumer re-sorts in JS.
**Fix:** Add `.orderBy()` in `data.server.ts` (`milestones` by `date desc`, `cessationLog` by `startDate desc`), or sort explicitly at the consumer before indexing:

```ts
const latestMilestone = [...normalizedMilestones]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;
```

### WR-03: `user.tenantId!` non-null assertion in every loader — missing tenantId becomes a 500, not a fail-closed denial

**File:** `remix-app/app/routes/_app/dashboard.tsx:98-99` and the same `user.tenantId!` pattern in all 12 loaders
**Issue:** `requireUser` guarantees a session, not a tenant. Better-Auth's `user.tenantId` is a nullable additional field; a user created outside the invite path (or a half-completed signup) has `tenantId: null/undefined`. The `!` assertion then feeds `undefined` into `eq(subjects.tenantId, undefined)`, which makes Drizzle throw at runtime — an unhandled 500 instead of the fail-closed 401/403/404 the module header promises (Pitfall 5). Twelve copies of an unchecked assertion is also exactly the kind of drift the centralized read module was built to prevent.
**Fix:** Guard once, centrally:

```ts
export async function requireTenantUser(request: Request) {
  const { user, session } = await requireUser(request);
  if (!user.tenantId) throw new Response("No tenant", { status: 403 });
  return { user: user as typeof user & { tenantId: string }, session };
}
```

### WR-04: Compare page shows only the "to" version's changes — misleading for non-adjacent version comparisons

**File:** `remix-app/app/routes/_app/protocol/compare.tsx:50-63`
**Issue:** The loader filters `protocolChanges` to `c.versionId === toVersion.id` only. The `from` selector affects nothing but the header. Comparing P1 → P6 displays just P6's delta from P5, while the page copy promises "what changed ... across the window between them." There is also no validation that `fromVersion` precedes `toVersion` (P6 → P1 renders the same data with a backwards arrow).
**Fix:** Accumulate changes for all versions in `(fromVersion.effectiveDate, toVersion.effectiveDate]`:

```ts
const windowVersionIds = versions
  .filter(v => new Date(v.effectiveDate) > new Date(fromVersion.effectiveDate)
            && new Date(v.effectiveDate) <= new Date(toVersion.effectiveDate))
  .map(v => v.id);
const changes = protocolChanges.filter(c => windowVersionIds.includes(c.versionId));
```

and swap (or reject) when `from` is newer than `to`.

### WR-05: Subject-specific health details remain in client-bundleable protocol-data.ts (CR-03 closure incomplete at the margin)

**File:** `remix-app/app/lib/protocol-data.ts:100-101,118,130,156-166` (`dailySchedule` notes, `avoidList` reasons)
**Issue:** The file header claims "non-PHI survivors ... generic schedule/avoid rules," but the retained constants encode the subject's individual health record: a measured lab value ("Previous elevation (102.9 ug/L B6)"), a measured index ("HOMA-IR 1.16 is excellent"), a diagnostic percentile ("NAFLD 98th percentile"), genotype phenotypes ("CYP1A2 slow metabolizer", "COMT intermediate"), and condition references ("ADHD chronobiotic timing", "ASD paradox risk (~50%)"). This module is **not** `.server.ts` and is re-exported to routes via `cessation.ts:15-21`. Today the bundle is clean only because `dailySchedule`/`avoidList` have zero consumers (verified: no importer outside the lib, and a built-bundle grep found no hits) — i.e., the protection is tree-shaking of dead code, not a boundary. The first component that renders the daily schedule ships this text to every browser.
**Fix:** Either move `dailySchedule`/`avoidList` into a `.server.ts` module (or the DB, alongside the other migrated PHI), or strip the person-specific values from the strings (e.g., "B6 toxicity history" without the 102.9 ug/L reading). If they stay, add them to the ESLint restricted-import gate so a client component cannot import them.

### WR-06: genetics-knowledge.server.ts discloses genotypes despite its "no genotype is stored here" contract

**File:** `remix-app/app/lib/genetics-knowledge.server.ts:95,109,131,134,138` (and header claim at `:8-9`)
**Issue:** The module header asserts "Non-PHI only: no genotype, rsid, or measured values are stored here," but `clinicalImplication` entries state the subject's genotype directly: GPX1 "Heterozygous", NAT2 "Slow acetylator (3 SNPs)", DRD2/ANKK1 "Taq1A heterozygous", HFE "Heterozygous carrier (30% clinical impact)" — and the key `"HFE H63D"` names the specific variant rather than the gene. These are per-subject genetic facts committed to the repo in plain text, duplicating exactly the data the migration moved into the access-controlled `subject_genotypes` table. The `.server.ts` suffix keeps it out of the client bundle but not out of git history.
**Fix:** Rewrite `clinicalImplication` strings as population-level knowledge (describe what the variant means generically; zygosity already lives in `subject_genotypes.genotype`). Rename the `"HFE H63D"` key to `"HFE"` with the variant carried by `subject_genotypes.gene`/`rsid`.

### WR-07: getCorrelationSignificance triplicated across routes while the canonical export sits unused

**File:** `remix-app/app/routes/_app/dashboard.tsx:41-47`, `remix-app/app/routes/_app/insights/index.tsx:18-24`, `remix-app/app/routes/_app/insights/correlations.tsx:11-17` vs. `remix-app/app/lib/correlations.ts:37-45`
**Issue:** `app/lib/correlations.ts` was created in this phase specifically to host the non-PHI correlation helpers, yet all three routes define private byte-identical copies of `getCorrelationSignificance`, and nothing imports the lib version (only its test does; `getCorrelationColor` has zero consumers anywhere). Three copies of the |r| threshold table is a drift bug waiting to happen — change "strong" from 0.7 to 0.6 in one copy and the dashboard, insights overview, and correlations table silently disagree about the same number.
**Fix:** Delete the three local copies and `import { getCorrelationSignificance } from "~/lib/correlations"` (the module is route-importable by design). Delete `getCorrelationColor` if it stays unused.

## Info

### IN-01: Dead sparkline code in metrics index

**File:** `remix-app/app/routes/_app/metrics/index.tsx:28,115-118`
**Issue:** `Sparkline` is imported but never rendered; `getSparkData` unconditionally returns `null` and is never called.
**Fix:** Delete both.

### IN-02: Dead `getTrendInfo` with a latent division-by-zero

**File:** `remix-app/app/routes/_app/metrics/category.tsx:183-197`
**Issue:** `getTrendInfo` is never called; if it is ever wired up, `((last - first) / first) * 100` yields `Infinity`/`NaN` when the first reading is 0.
**Fix:** Delete, or guard `first === 0` before reuse.

### IN-03: genetics.tsx — unused import, unused loader field, and an always-rendered K3 card

**File:** `remix-app/app/routes/_app/insights/genetics.tsx:1,109,413-455`
**Issue:** `useState` is imported and never used; `byCategory` is computed/serialized by the loader and destructured but never rendered; the "K3 verification needed" card renders its header and prose even when the K3 list is empty.
**Fix:** Drop the import and loader field; wrap the K3 card in `variants.some(v => v.confidence === "K3") && (...)`.

### IN-04: correlations.tsx — `bySuplement` typo, unused serialized loader fields

**File:** `remix-app/app/routes/_app/insights/correlations.tsx:54-63,71-74`
**Issue:** `bySuplement` (misspelled) and `supplements` are computed, returned, and serialized into the client payload but never used by the component — wasted bytes and a typo'd public field name.
**Fix:** Remove both from the loader return (or use them).

### IN-05: metric-targets.ts shim has zero importers

**File:** `remix-app/app/lib/metric-targets.ts`
**Issue:** The re-export shim created for the 04-05 artifact contract is imported by nothing (verified by grep); all consumers use `~/lib/metrics` directly.
**Fix:** Delete the shim or repoint one canonical import path; two paths to the same constants invites drift.

### IN-06: supplements.tsx — obfuscated count and inert action buttons

**File:** `remix-app/app/routes/_app/protocol/supplements.tsx:46-48,136-147`
**Issue:** `.filter(...).reduce((sum) => sum + 1, 0)` is `.filter(...).length` in disguise. The expanded card's "Edit" and "Deactivate/Activate" buttons have no `onClick` — clickable UI that silently does nothing.
**Fix:** Use `.length`; either wire the buttons to actions or remove/disable them until mutations land.

### IN-07: Unused imports and parameters left by the migration

**File:** `remix-app/app/routes/_app/dashboard.tsx:34` (`StatusBadge`), `:4` (`CONFIDENCE_LEVELS`), `:240` (`targetDay` param of `buildPhaseBarPhases` never used in the body); `remix-app/app/routes/_app/protocol/index.tsx:13` (`differenceInDays`)
**Issue:** Leftovers from the static-data era; the gate-only ESLint config has no unused-vars rule so these accumulate silently.
**Fix:** Remove; consider enabling `@typescript-eslint/no-unused-vars` (the parser is already configured in `eslint.config.mjs`).

### IN-08: better-auth runtime dependency declared in devDependencies

**File:** `remix-app/package.json:34,43` (also stray indentation at `:16`)
**Issue:** `better-auth` and `@better-auth/drizzle-adapter` are imported by runtime server code (`auth.server.ts`) but declared as devDependencies. Vercel's build/trace currently papers over this, but any deploy path that prunes devDeps before serving (e.g., `npm ci --omit=dev && npm run start` on a VM) breaks auth at boot. The `"ds:audit"` script line is also mis-indented.
**Fix:** Move both packages to `dependencies`; fix the JSON indentation.

### IN-09: ESLint gate patterns reference modules deleted in Plan 05

**File:** `remix-app/eslint.config.mjs:42,52`
**Issue:** The `**/real-data` and `**/seed-data` restricted-import patterns now point at files that no longer exist. Harmless (they fail closed), but the config reads as if those modules are still present.
**Fix:** Prune the dead patterns or annotate them as tombstones; keep the `**/protocol-data` pattern (still load-bearing per WR-05).

---

_Reviewed: 2026-06-10T12:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
