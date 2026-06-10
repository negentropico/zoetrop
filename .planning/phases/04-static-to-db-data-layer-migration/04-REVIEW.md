---
phase: 04-static-to-db-data-layer-migration
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 35
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
  - remix-app/migrations/meta/_journal.json
  - remix-app/package.json
  - remix-app/tests/db/data-seed.test.ts
  - remix-app/tests/lib/data.server.test.ts
  - remix-app/tests/lib/db-mappers.server.test.ts
  - remix-app/tests/parity/loader-parity.test.ts
findings:
  critical: 3
  warning: 13
  info: 8
  total: 24
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-06-10
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

Phase 4 migrated route loaders from static PHI arrays to tenant-scoped Neon reads. The core data layer is well structured: `data.server.ts` is a clean single enforcement point with `tenantId AND subjectId` on every entity read, `db-mappers.server.ts` eliminates `as any` with genuine allow-list narrowing, the ESLint `no-restricted-imports` gate blocks the legacy static modules, `tests/fixtures/` is correctly gitignored before fixtures existed, and the `.server.ts` suffix keeps the genetics knowledge module out of the client bundle.

However, the review found three Critical defects against the phase's own security invariants: (1) none of the 12 migrated PHI loaders performs a role/subject-access check — `assertSubjectAccess` (built in Phase 3 expressly to deny `client`-role access, and mocked in this phase's parity tests) is never called, so a client-role user can read the owner's genotypes and lab values; (2) the cessation day count is still computed from the hardcoded `CESSATION_START_DATE` constant while the DB `cessation_log.startDate` is fetched, displayed, and silently ignored — the migration is incomplete and produces wrong day counts for any subject whose start date differs; (3) subject-specific health facts (a named correlation value, the subject's genetic variant statuses, prior cessation-attempt history) remain hardcoded inside client-bundled route components, so PHI ships in unauthenticated static JS assets.

There is also a cluster of warnings: missing `ORDER BY`/sorting causing unordered sparkline history and arbitrary "latest milestone" selection, repeated `user.tenantId!` assertions that turn a missing tenant into a 500, dead interactive buttons, loader payloads that serialize unused raw rows (including `tenantId`/`subjectId`) to the client, and triplicated significance logic while the canonical extracted helper goes unused.

## Critical Issues

### CR-01: PHI loaders perform no role or subject-access authorization — client-role users can read owner PHI

**File:** `remix-app/app/routes/_app/dashboard.tsx:97-100` (same pattern in all 12 migrated loaders: `metrics/index.tsx:55-57`, `metrics/category.tsx:61-63`, `metrics/detail.tsx:40-42`, `insights/index.tsx:34-37`, `insights/correlations.tsx:27-30`, `insights/genetics.tsx:49-52`, `protocol/index.tsx:27-30`, `protocol/versions.tsx:24-27`, `protocol/version-detail.tsx:21-24`, `protocol/supplements.tsx:33-35`, `protocol/cessation.tsx:25-27`)
**Issue:** Every loader does `requireUser(request)` then `getOwnerSubject(user.tenantId!)` and reads the owner subject's metrics, genotypes, supplements, and cessation log. No loader calls `requireRole` or `assertSubjectAccess`. Per `authz.server.ts` (D-13), `assertSubjectAccess` exists precisely to deny `client`-role users access to subject data ("Denies: client role outright"), and `tests/parity/loader-parity.test.ts:56` mocks `assertSubjectAccess`, showing the gate was expected at these call sites. As written, any authenticated user in the tenant — including a `client` role created via the Phase 3 invite flow — receives the owner's full PHI (genotype strings, rsids, lab values) from every one of these routes. Authentication is enforced; authorization is not.
**Fix:** In each loader (or, better, in a single shared helper that wraps `requireUser` + `getOwnerSubject`), apply the existing gate:
```ts
const { user } = await requireUser(request);
const subject = await getOwnerSubject(user.tenantId!);
assertSubjectAccess(user, subject, user.tenantId!); // 403 for client role + cross-tenant
```
Prefer centralizing as `requireSubjectContext(request)` in `data.server.ts` or `authz.server.ts` so a future loader cannot forget the gate.

### CR-02: Cessation day still computed from hardcoded static constant — DB `cessation_log.startDate` fetched but ignored

**File:** `remix-app/app/lib/protocol-data.ts:24-31`; consumed at `remix-app/app/routes/_app/protocol/cessation.tsx:67`, `remix-app/app/routes/_app/protocol/index.tsx:65`, `remix-app/app/routes/_app/dashboard.tsx:169`
**Issue:** `getCessationDay(now)` computes the day count from the module constant `CESSATION_START_DATE = "2025-12-23"`. All three loaders fetch the cessation row from the DB but use it only as an existence flag — `cessation.startDate` from the database never feeds the day calculation. `cessation.tsx` even displays the DB `startDate` ("Started") and derives `projectedCompletion` from it (line 82-83) while `currentDay` comes from the constant, so the page contradicts itself the moment the DB value differs from the constant. For any second tenant/subject (the M1 multi-client schema this phase built), the day count, phase, progress ring, and PhaseBar are simply wrong. This defeats the phase's purpose: the DB was made the source of truth, but the most prominent derived number still reads static data.
**Fix:** Make the start date a parameter and pass the DB value:
```ts
// protocol-data.ts
export function getCessationDay(startDateIso: string, now: Date = new Date()): number {
  return differenceInDays(now, parseISO(startDateIso));
}
// cessation.tsx loader
const currentDay = getCessationDay(cessation.startDate, now);
```
Keep `CESSATION_START_DATE` only as seed-data documentation, not as runtime input. Update the parity fixtures/tests accordingly.

### CR-03: Subject-specific health data hardcoded in client-bundled route components (PHI in unauthenticated static assets)

**File:** `remix-app/app/routes/_app/insights/index.tsx:333-345`; `remix-app/app/routes/_app/protocol/cessation.tsx:414-419`
**Issue:** The phase invariant is "no PHI may reach the client bundle." Route component bodies (unlike loaders) are compiled into client JS chunks, which are served as static assets without authentication. Two components embed the subject's individual health facts as string literals:
- `insights/index.tsx` "Key insights" card: "Methylfolate → Homocysteine shows a strong negative correlation (r=−0.71)", the subject's MTHFR protocol response, and "FAAH and CYP1A2 variants are K3 (inferred)".
- `cessation.tsx` "Why 150 days?" card: "Lower FAAH activity (K3 inferred from SelfDecode)... The previous 76-day attempt was insufficient." — the subject's genetic interpretation plus cessation history.

Beyond the leak, these hardcoded claims are now stale by construction: the surrounding page is DB-driven, but these numbers/claims will never update when the data does.
**Fix:** Derive these from loader data (the correlations and genotype joins already exist in these loaders) or move the text to a DB/notes field returned by the loader. E.g., compute the strongest negative correlation from `allCorrelations` and render `r=${corr.correlation.toFixed(2)}`; gate the FAAH/K3 narrative on `variants.some(v => v.gene === "FAAH" && v.confidence === "K3")`. Remove the "previous 76-day attempt" sentence or source it from `cessation_log.notes`.

## Warnings

### WR-01: `user.tenantId!` non-null assertion repeated in 12 loaders — missing tenant produces a 500, not a clean denial

**File:** `remix-app/app/routes/_app/dashboard.tsx:98-99` and the same two lines in all other loaders
**Issue:** `requireUser` (authz.server.ts:28-35) only proves a session exists; it does not guarantee `tenantId` is set on the Better-Auth user. Every loader then asserts `user.tenantId!`. If a user record lacks `tenantId` (e.g., created outside the invite flow), Drizzle receives `undefined` in `eq(...)` and throws at query-build time — an unhandled 500 instead of an explicit 401/403. The `!` pattern also hides the gap from the type checker at 12 separate sites.
**Fix:** Fail closed once, centrally:
```ts
export async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect(...);
  if (!session.user.tenantId) throw new Response("No tenant", { status: 403 });
  return { user: session.user as typeof session.user & { tenantId: string }, session };
}
```
Then delete every `!` at the call sites.

### WR-02: "Non-PHI survivor" `protocol-data.ts` contains measured lab values and diagnoses; `dailySchedule`/`avoidList` are dead exports

**File:** `remix-app/app/lib/protocol-data.ts:152-160` (avoidList), `:95,112,124` (dailySchedule notes)
**Issue:** The file header asserts these are "non-PHI display constants," but `avoidList` embeds the subject's measured values and clinical characterizations: "HOMA-IR 1.16 is excellent" (line 152), "Previous elevation (102.9 ug/L B6)" (line 154), "ASD paradox risk (~50%)" (155-156), "NAFLD 98th percentile" (159); `dailySchedule` notes encode "CYP1A2 slow metabolizer" and "ADHD chronobiotic timing." These are individual health data committed to the repo under a non-PHI label. Additionally, grep confirms `dailySchedule` and `avoidList` have zero importers anywhere in `app/` — they are dead exports kept alive only by the `cessation.ts` re-export.
**Fix:** Either delete `dailySchedule`/`avoidList` (nothing consumes them) or move them to the DB alongside the other seeded PHI, and strip the measured values/diagnoses from any text that stays in source. Update `cessation.ts` re-exports to match.

### WR-03: `genetics-knowledge.server.ts` violates its own "no genotype" contract

**File:** `remix-app/app/lib/genetics-knowledge.server.ts:9,95,109,131,138,152`
**Issue:** The header states "Non-PHI only: no genotype, rsid, or measured values are stored here," yet several `clinicalImplication` strings are the subject's genotype calls, not population-level knowledge: GPX1 "Heterozygous" (line 95), NAT2 "Slow acetylator (3 SNPs)" (109), DRD2/ANKK1 "Taq1A heterozygous" (131), HFE "Heterozygous carrier" (138), FUT2 "Non-secretor variant" (152), MAOA "Higher activity" (123). Combined with the gene key, each line discloses the individual's genotype interpretation in committed source. The `.server.ts` suffix keeps it out of the client bundle, but the module's PHI classification — the basis for committing it at all — is wrong.
**Fix:** Rewrite entries as genotype-agnostic knowledge keyed by gene+genotype (e.g., `GENETIC_KNOWLEDGE["GPX1"]["CT"]`), with the subject's genotype coming exclusively from `subject_genotypes`. Minimum fix: move genotype-describing phrases ("Heterozygous", "Slow acetylator", "Non-secretor") out of this file and derive them from the DB `genotype` column at join time.

### WR-04: No `ORDER BY` in `data.server.ts` reads — unordered sparkline history and arbitrary "latest milestone"

**File:** `remix-app/app/lib/data.server.ts:56-181`; `remix-app/app/routes/_app/metrics/category.tsx:77-89,290`; `remix-app/app/routes/_app/protocol/index.tsx:60-62`
**Issue:** Every read in `data.server.ts` returns rows in unspecified order (Postgres guarantees nothing without `ORDER BY`). Two consumers depend on order:
- `category.tsx` builds `historyByName` in row order and feeds it to `TrendSparkline` without sorting (unlike `detail.tsx:52-54`, which sorts). A sparkline drawn from unordered points renders a scrambled, misleading trend line.
- `protocol/index.tsx` takes `normalizedMilestones[length - 1]` as "Latest milestone" without sorting by `date` — the tile shows whichever row the planner returned last.
**Fix:** Add `orderBy` to the relevant queries (e.g., `.orderBy(asc(metrics.timestamp))`, `.orderBy(asc(milestones.date))`), or sort at the use sites: sort `history` by timestamp in `category.tsx`, and pick `latestMilestone` via `sort((a,b) => date diff)` in `protocol/index.tsx`.

### WR-05: `getOwnerSubject` returns an arbitrary subject — breaks under the multi-subject tenants this schema enables

**File:** `remix-app/app/lib/data.server.ts:37-48`
**Issue:** The function selects `WHERE tenant_id = ? LIMIT 1` with no `ORDER BY` and no owner discriminator — `subjects` (schema.ts:220-226) has no `isOwner`/role column. With exactly one subject per tenant this works; the moment a tenant has two subjects (the M1 goal this phase's tenancy work targets), every loader in the app silently binds to a nondeterministic subject. The function name promises a guarantee the query cannot deliver.
**Fix:** Add a deterministic discriminator (e.g., `subjects.kind = 'owner'` column, or `ORDER BY created_at ASC` as an interim) and document the single-subject assumption with a thrown error when `> 1` rows exist:
```ts
const rows = await db.select().from(subjects).where(eq(subjects.tenantId, tenantId)).limit(2);
if (rows.length !== 1) throw new Response("Ambiguous subject", { status: 409 });
```

### WR-06: Compare page shows only the `to` version's changelog, not the from→to diff it advertises

**File:** `remix-app/app/routes/_app/protocol/compare.tsx:50-53,142`
**Issue:** The header promises "Pick two protocol versions to see what changed... between them," but the loader filters `protocolChanges` to `c.versionId === toVersion.id` only — i.e., the changes from `toVersion`'s immediate predecessor. Selecting P1 → P6 shows just P6-vs-P5 changes; `fromVersion` affects nothing except the header. The displayed counts ("Added/Removed/Modified") are therefore wrong for any non-adjacent pair.
**Fix:** Accumulate changes for every version after `fromVersion` up to and including `toVersion` (versions are already sorted):
```ts
const fromIdx = versions.findIndex(v => v.id === fromVersion?.id);
const toIdx = versions.findIndex(v => v.id === toVersion?.id);
const windowIds = new Set(versions.slice(fromIdx + 1, toIdx + 1).map(v => v.id));
const changes = protocolChanges.filter(c => windowIds.has(c.versionId));
```
(With net-out logic for add-then-remove pairs, or document the adjacent-only limitation in the UI.)

### WR-07: `getCorrelationSignificance` triplicated in routes while the canonical extracted helper is never used

**File:** `remix-app/app/routes/_app/dashboard.tsx:41-47`; `remix-app/app/routes/_app/insights/index.tsx:18-24`; `remix-app/app/routes/_app/insights/correlations.tsx:11-17`; canonical: `remix-app/app/lib/correlations.ts:37-45`
**Issue:** Phase 4's D-06 extraction created `~/lib/correlations.ts` exporting exactly this function, yet grep shows no route imports it — instead three identical private copies exist. The thresholds (0.7/0.4/0.2) are additionally duplicated a fourth time in the correlations page's "Interpretation guide" text. Any future threshold change must now be made in four places or the UI silently disagrees with itself.
**Fix:** Delete the three local copies and `import { getCorrelationSignificance } from "~/lib/correlations"`. (It is a pure non-PHI function explicitly marked safe for route import.)

### WR-08: Loaders serialize unused and over-broad data to the client (`bySuplement` typo, raw rows with `tenantId`/`subjectId`)

**File:** `remix-app/app/routes/_app/insights/correlations.tsx:54-74`; also `protocol/index.tsx:74-84`, `protocol/supplements.tsx:50-51`, `protocol/versions.tsx:36-65`, `protocol/version-detail.tsx:70-78`
**Issue:** `correlations.tsx` returns `supplements: supplementsRows` (full DB rows including `tenantId`, `subjectId`, `geneticBasis`, `notes`) and `bySuplement` (misspelled, a second full copy of every correlation grouped by name) — neither is referenced by the component. All loader returns are serialized into the page payload, so this doubles the response and ships internal tenancy identifiers and unused PHI columns to the browser. The protocol loaders similarly spread whole rows (`...v`), serializing `tenantId`/`subjectId`/`createdAt` on every version, change, milestone, supplement, and cessation record.
**Fix:** Return only the fields the component renders (a mapped projection per route), and delete `bySuplement` and the unused `supplements` key from `correlations.tsx`. As a rule for this codebase: never `...row` a Drizzle row into a loader response.

### WR-09: Supplements page renders Edit / Activate-Deactivate buttons with no behavior

**File:** `remix-app/app/routes/_app/protocol/supplements.tsx:136-147`
**Issue:** The expanded supplement card shows "Edit" and "Deactivate"/"Activate" buttons with no `onClick`, no form, no action — clicking does nothing. Dead interactive affordances mislead users into believing mutation is supported (this phase is read-only by design).
**Fix:** Remove the buttons until the mutation actions exist, or render them `disabled` with a "coming soon" tooltip so the UI does not promise functionality it lacks.

### WR-10: `getMetricStatus` reports "optimal" for out-of-range values when `referenceRange` is missing

**File:** `remix-app/app/lib/metrics.ts:72-81`
**Issue:** When a metric has an `optimalRange` but no `referenceRange`, a value outside the optimal band falls through to `return "optimal"` — a green status for a value the data says is not optimal. The comment acknowledges this as a "defensive quirk," but for a health dashboard a false-green is the worst direction to fail. DB rows can legitimately have `optimalMin/Max` set with `referenceMin/Max` null (`buildRange` returns `undefined` independently per pair).
**Fix:** When `optimalRange` exists and the value is outside it but no `referenceRange` is available, return `"borderline"`:
```ts
if (optimalRange && (value < optimalRange.min || value > optimalRange.max) && !referenceRange) return "borderline";
```

### WR-11: Parity suite throws ENOENT instead of skipping when fixtures are absent; production tenant UUID committed

**File:** `remix-app/tests/parity/loader-parity.test.ts:19,29-36,61`
**Issue:** The suite is `skipIf(!connectionString)` only. `tests/fixtures/` is gitignored (by design, T-04-PHI-FIX), so on any environment that has `DATABASE_URL` set but no local fixtures (CI, a fresh clone, another machine), `loadFixture` throws `ENOENT` and the whole suite fails red rather than skipping — turning a deliberate PHI safeguard into a guaranteed test failure. Separately, line 19 hardcodes the real production `tenantId` UUID into committed code; it is an internal identifier rather than PHI, but it narrows the search space for anyone probing the live DB and will go stale if the tenant is reseeded.
**Fix:** Gate on fixture presence too:
```ts
const fixturesPresent = existsSync(resolve(__dirname, "../fixtures/dashboard.json"));
describe.skipIf(!connectionString || !fixturesPresent)(...);
```
Read the tenant id from an env var (`PARITY_TENANT_ID`) with the literal as a documented local-only default.

### WR-12: Runtime auth packages declared as devDependencies

**File:** `remix-app/package.json:34,43`
**Issue:** `better-auth` and `@better-auth/drizzle-adapter` are in `devDependencies`, but `app/lib/auth.server.ts` / `authz.server.ts` import them at runtime for every request. This currently works because Vite bundles them into the server build, but it misdeclares the dependency graph: `npm install --omit=dev` + any non-bundled execution path (scripts, `react-router-serve` with externalized deps, tooling that trusts `dependencies`) breaks, and security scanners will not treat them as production deps.
**Fix:** Move both packages to `dependencies`.

### WR-13: Dashboard hardcodes "7 versions" next to a DB-driven version stat

**File:** `remix-app/app/routes/_app/dashboard.tsx:494`
**Issue:** `<StatTile label="Protocol version" value={currentVersion} unit="7 versions" .../>` — the version value comes from the DB but the count is a string literal. The moment P7 is seeded (or a second tenant has 3 versions), the tile lies. The loader already fetches `protocolVersionsRows` and could return the count.
**Fix:** Return `totalVersions: sortedVersions.length` from the loader and render `unit={`${totalVersions} versions`}`.

## Info

### IN-01: Dead code and unused imports across route files

**File:** `remix-app/app/routes/_app/metrics/category.tsx:182-197` (`getTrendInfo`, never called); `remix-app/app/routes/_app/metrics/index.tsx:28,114-118` (`Sparkline` import and `getSparkData` — a function that ignores its parameter and always returns `null` — both unused); `remix-app/app/routes/_app/dashboard.tsx:34` (`StatusBadge` imported, never rendered)
**Issue:** Leftover scaffolding from the migration. `getTrendInfo` also contains a latent divide-by-zero (`first === 0` → `Infinity`) should anyone revive it.
**Fix:** Delete the dead functions and unused imports.

### IN-02: Dashboard eyebrow date computed with client-side `new Date()` — hydration mismatch risk

**File:** `remix-app/app/routes/_app/dashboard.tsx:457-459`
**Issue:** The component formats "Today's frame · {date}" during render. Server render uses server TZ/time; client hydration recomputes — across midnight or timezone differences the text differs, producing a React hydration warning and content flash.
**Fix:** Compute the display date in the loader (it already accepts a `now` parameter) and pass it down, or render it in a `useEffect`.

### IN-03: `seed-data.test.ts` filename is stale — seed-data.ts no longer exists

**File:** `remix-app/app/lib/seed-data.test.ts:1-26`
**Issue:** The test imports from `~/lib/correlations` (correct post-D-06), but the filename still references the deleted `seed-data.ts` module, and it lives in `app/lib/` while the rest of the suite lives under `tests/`.
**Fix:** Rename/move to `tests/lib/correlations.test.ts`.

### IN-04: `targetDay = 150` magic number duplicated in three loaders

**File:** `remix-app/app/routes/_app/dashboard.tsx:171`; `remix-app/app/routes/_app/protocol/cessation.tsx:68`; `remix-app/app/routes/_app/protocol/index.tsx:155`
**Issue:** The protocol target duration is hardcoded three times; it is derivable from `CESSATION_PHASES[CESSATION_PHASES.length - 1].dayRange.end`. Divergence risk if the protocol is extended.
**Fix:** Export `CESSATION_TARGET_DAY` from `~/lib/cessation` derived from `CESSATION_PHASES` and import it.

### IN-05: Obfuscated count and malformed package.json formatting

**File:** `remix-app/app/routes/_app/protocol/supplements.tsx:46-48`; `remix-app/package.json:16`
**Issue:** `.reduce((sum) => sum + 1, 0)` is `.filter(...).length` written confusingly. The `"ds:audit"` script line is flush-left, breaking the file's indentation.
**Fix:** Use `.length`; reformat the JSON.

### IN-06: `getCessationDay` is zero-based against one-based phase ranges

**File:** `remix-app/app/lib/protocol-data.ts:29-31`
**Issue:** `differenceInDays(now, start)` returns 0 on the start date, while `CESSATION_PHASES` ranges start at day 1 — so on day one the UI shows "Day 0" and `getCurrentCessationPhase(0)` only matches via the clamp fallback. Off-by-one in the most-displayed number.
**Fix:** `return differenceInDays(now, parseISO(start)) + 1;` (verify against the parity fixture expectations when changing).

### IN-07: Genetics page renders the "K3 verification needed" card even when no K3 variants exist

**File:** `remix-app/app/routes/_app/insights/genetics.tsx:413-455`
**Issue:** The card and its intro paragraph render unconditionally; with zero K3 variants the list is empty but the energy-accented warning card still appears (dashboard.tsx:567 guards the equivalent block; this page does not).
**Fix:** Wrap in `{variants.some(v => v.confidence === "K3") && (...)}`.

### IN-08: `narrowImprovement` silently coerces bad data to "higher is better"

**File:** `remix-app/app/lib/db-mappers.server.ts:77-79`
**Issue:** An invalid `improvement` varchar (the column is free text, schema.ts:101) silently becomes "higher is better" — for a metric that is actually "lower is better" this flips the displayed direction label with no signal that the row is corrupt.
**Fix:** Log (server-side) when the fallback fires, or make the fallback "target range" (the least directional member), so bad seed data is visible rather than masked.

---

_Reviewed: 2026-06-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
