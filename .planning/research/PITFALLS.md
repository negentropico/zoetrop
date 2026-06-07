# Pitfalls Research

**Domain:** Multi-tenant PHI platform — RLS retrofit + LLM lab ingest + confidence-graded decision engine (Remix + Neon + Drizzle)
**Researched:** 2026-06-07
**Confidence:** HIGH (RLS + PHI sections verified against Neon/Drizzle official docs and Postgres docs; LLM extraction verified against peer-reviewed medical NLP literature; decision-engine section based on clinical CDSS literature and project constraints)

---

## Critical Pitfalls

### Pitfall 1: SET vs SET LOCAL — Tenant Context Leaks Across Pooled Connections

**What goes wrong:**
The RLS pattern requires setting a session variable (e.g., `SET app.tenant_id = 'abc'`) so Postgres policies can read it via `current_setting('app.tenant_id')`. When `SET` (not `SET LOCAL`) is used, the variable persists beyond the current transaction. Neon uses PgBouncer in **transaction mode**, meaning the connection is returned to the pool after each transaction completes. The next request that reuses the connection inherits the previous tenant's context. RLS policies then evaluate with the wrong tenant ID, silently returning the wrong tenant's PHI rows to a completely different user. The query does not error — it returns data.

**Why it happens:**
Developers copy-paste `SET app.tenant_id` from docs that don't emphasize the distinction. Transaction-mode pooling is the Neon default and the behavior is invisible in unit tests that use a single connection.

**How to avoid:**
Always use `SET LOCAL` (scoped to the current transaction). Wrap every database interaction that requires tenant context in an explicit `db.transaction()` block and issue `SET LOCAL app.tenant_id = $1` as the first statement within that transaction. Drizzle's official RLS pattern uses exactly this: `sql\`set local nile.tenant_id = '${sql.raw(tenantId)}'\`` inside a transaction wrapper. Never set tenant context outside a transaction block. Add an integration test that opens two sequential requests on the same connection and asserts that the second request cannot see the first tenant's rows.

**Warning signs:**
- Tenant context is set with bare `SET` at the request middleware level rather than inside a transaction
- No explicit `db.transaction()` wrapper around every loader/action that reads tenant-scoped data
- Tests pass but all use fresh connections (missing pool-reuse test)
- Code that calls `SET app.tenant_id` before beginning a transaction

**Phase to address:**
Identity + tenancy spine phase (the first M1 phase). This is the load-bearing contract for everything downstream. If it ships wrong, every subsequent data operation is potentially leaking PHI.

---

### Pitfall 2: Enabling RLS Without Policies Locks Out the Application

**What goes wrong:**
`ALTER TABLE metrics ENABLE ROW LEVEL SECURITY` on an existing table with no policies in place triggers Postgres's default-deny behavior: zero rows are visible or modifiable by any non-superuser role. The app loses all read/write access to its data instantly. This is a production outage on a table that previously worked fine.

**Why it happens:**
Teams enable RLS across all tables in a migration, then add policies in a subsequent migration. Between migrations — or if the policy migration fails — the application is locked out. Drizzle Kit's `generate` step does not warn about policy-less RLS tables.

**How to avoid:**
Enable RLS and add the initial policies in the **same atomic migration**. Use Drizzle's `pgPolicy()` declarative approach: define policies on the table at schema definition time so `drizzle-kit generate` produces a single migration that enables RLS and creates policies together. For the brownfield tables (all 8 existing tables), write a custom migration that: (1) adds `tenant_id`/`subject_id` columns, (2) backfills them with the owner's tenant/subject identifiers, (3) enables RLS, and (4) creates policies — all in one transaction. Test the migration on a branch before applying to production (`neon branch create` makes this straightforward).

**Warning signs:**
- Migration plan separates `ENABLE ROW LEVEL SECURITY` from `CREATE POLICY` into different files or phases
- No Neon branch used to rehearse the migration before running against production
- Any attempt to `drizzle-kit push` instead of generating proper migration files (CONCERNS.md: no migrations directory exists yet)

**Phase to address:**
Identity + tenancy spine phase, before any real client data is written. The missing migrations directory (flagged in CONCERNS.md) must be baselined first — run `drizzle-kit generate` to snapshot the current schema, commit the resulting `migrations/` directory, then build the tenancy migration on top.

---

### Pitfall 3: Foreign Keys Without Matching Tenant Scope Create Cross-Tenant Join Leaks

**What goes wrong:**
`supplementLog` references `supplements.id`. If `supplements` is tenant-scoped via RLS but `supplementLog`'s RLS policy only checks `subject_id` without verifying the join back to `supplements` is also tenant-scoped, a query joining the two tables can silently return fewer rows than expected (the join fails silently) or, worse, in edge cases return rows from the wrong tenant's supplement set when policies are misconfigured. The broader pattern: every table in the existing schema has foreign keys (`protocolChanges → protocolVersions`, `supplementLog → supplements`, `correlations → supplements`). None of these FK chains will carry tenant isolation automatically — RLS policies must be created on every table in the join graph.

**Why it happens:**
RLS policies are added table-by-table. Teams write a policy on the parent table and assume the FK cascade protects child tables. It does not. Each table's policy is evaluated independently.

**How to avoid:**
Every table that carries tenant-scoped data (all 8 existing tables + all new M1 tables) must have its own RLS policy. Use a policy-coverage test: a superuser-bypassing query that counts rows across all tenant-scoped tables and compares against an authenticated query with the tenant context set — they should match. Maintain a checklist in the schema file: one comment per table noting its RLS policy name and the column it gates on. The Drizzle RLS schema definition makes this explicit in code rather than a separate mental model.

**Warning signs:**
- Any table has `ENABLE ROW LEVEL SECURITY` but no `CREATE POLICY` statement
- FK-linked tables audited at different times without cross-checking the join chain
- An ad-hoc query from an authenticated role returning 0 rows on a non-empty table (silent lockout from missing policy)

**Phase to address:**
Identity + tenancy spine phase. The full table inventory for policy coverage: `metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`, plus all M1 additions (`tenants`, `users`, `subjects`, `labDocuments`, `geneticVariants`, `variantProtocolMap`, `reports`).

---

### Pitfall 4: BYPASSRLS on the Application Role (or Left on the Migration Role)

**What goes wrong:**
The database role used by the Drizzle client (the one encoded in `DATABASE_URL`) is granted `BYPASSRLS`, either intentionally ("for convenience") or because it was the migration role. All RLS policies then silently have no effect on any production query — the multi-tenancy is theater.

**Why it happens:**
Migration tooling needs to write data without RLS restrictions during the migration. Teams use the same role for migrations and runtime queries. This is the Neon default if you use the owner role for both. Drizzle Kit uses `DATABASE_URL` for migrations by default.

**How to avoid:**
Use separate roles: a `migrator` role with `BYPASSRLS` for schema migrations only (used by Drizzle Kit in CI/CD), and an `app` role without `BYPASSRLS` for all runtime queries. The runtime `DATABASE_URL` must connect as the `app` role. Verify by asserting `SELECT current_setting('role')` returns the non-privileged role from within a loader. Add to CI: a query that confirms `pg_roles.rolbypassrls = false` for the runtime role.

**Warning signs:**
- `DATABASE_URL` in `.env` and in Drizzle Kit config are identical
- No separate `DRIZZLE_DATABASE_URL` or `MIGRATION_DATABASE_URL` env var distinguished from `DATABASE_URL`
- Any query from the app role returns rows that should be blocked by RLS

**Phase to address:**
Identity + tenancy spine phase. Configure role separation before the first RLS policy is created, not after.

---

### Pitfall 5: PHI in Static TypeScript Source Files Shipped in the Client Bundle

**What goes wrong:**
`real-data.ts` (1,344 lines), `protocol-data.ts`, and `seed-data.ts` contain actual health data — blood panels, FAAH/CYP1A2 drug-metabolism data, genetic variants, cessation logs. Remix builds these as server modules today, but Remix's boundary between server and client code is enforced by convention (`.server.ts` suffix or loader-only import). If any component imports from `real-data.ts` directly without going through a loader, the entire module gets bundled client-side. Once M1 introduces other clients' PHI into these files (even temporarily), a single misplaced import sends all clients' PHI to every browser.

**Why it happens:**
M0 worked fine because only the owner's data existed. M1 adds real client data. The temptation is to add a second client to `real-data.ts` before the database migration is complete. The static data pattern is familiar; the PHI risk is not.

**How to avoid:**
Before any client PHI is handled: (1) move all data reads behind server-only loaders querying Neon via `db.server.ts` (closing the CONCERNS.md bug: "`db.server.ts` is wired but never called"), (2) delete or stub `real-data.ts` / `seed-data.ts` as runtime data sources (keep as seeds only), (3) add a CI lint rule that prevents direct imports of `*-data.ts` files from non-`.server.ts` modules. The data-migration phase must complete before any real client data is written.

**Warning signs:**
- Any route component importing from `real-data.ts`, `protocol-data.ts`, or `seed-data.ts` directly (not via a loader return)
- Client data being written to static TypeScript files "temporarily" while the DB migration is in progress
- Build output includes health data strings in the client JS bundle (check with `grep` against the `.netlify/functions/` output)

**Phase to address:**
Data-layer migration phase (wiring `db.server.ts` to loaders), which must precede any client onboarding.

---

### Pitfall 6: Neon HIPAA Requires Scale Plan + Explicit Opt-In — Not Automatic

**What goes wrong:**
A team deploys PHI to Neon assuming HIPAA compliance is table-stakes for any Postgres-as-a-service provider. It is not. Neon HIPAA is gated behind: (1) the Scale plan, (2) an executed BAA, and (3) per-project opt-in (irreversible once enabled). Both Netlify HIPAA and Neon HIPAA require Enterprise/Scale agreements — the free and Launch plans are explicitly not HIPAA-compliant. Any PHI stored or processed before these agreements are in place creates regulatory exposure.

**Why it happens:**
HIPAA compliance is easy to assume and hard to verify. Product docs mention compliance without surfacing the plan/tier gating. For a solo builder moving fast, "we'll sort the compliance before launch" becomes "we already launched."

**How to avoid:**
Treat the BAA as a gate before any client PHI enters the system — not after. Sequence: (1) upgrade Neon to Scale, execute Neon BAA; (2) enable HIPAA on the Zoetrop Neon project (triggers compute restart, plan accordingly); (3) execute Netlify BAA (Enterprise agreement); (4) enable pgAudit via support ticket; (5) only then onboard the first client. Add a pre-launch checklist item: "Neon HIPAA enabled + BAA signed." Note: Neon Auth and Neon Data API are explicitly excluded from the BAA — do not use them for any PHI flow.

**Warning signs:**
- Neon project on Free or Launch plan with any PHI in schema
- No `BAA_SIGNED_DATE` or equivalent in an ops runbook
- Netlify on a non-Enterprise plan
- pgAudit not confirmed enabled (audit logs accessed via support ticket on HIPAA projects, not self-serve)

**Phase to address:**
PHI security gate phase — must complete before data-layer migration writes any real client data.

---

### Pitfall 7: Audit Logs That Log PHI Content (Not Just Access)

**What goes wrong:**
pgAudit captures SQL statements. If a query is `SELECT * FROM metrics WHERE subject_id = $1` and the log captures parameter values or result sets, actual PHI values appear in the audit log. HIPAA requires logging *access* (who, what table, when) — not the PHI content itself. Audit logs containing PHI data must be treated as PHI, extending retention obligations and creating another protected surface to secure.

**Why it happens:**
pgAudit's default `log_parameter` setting captures bind parameters. Developers configure it for maximum verbosity to aid debugging, inadvertently turning the audit log into a second copy of all PHI.

**How to avoid:**
Configure pgAudit to log at the object/statement level (who accessed what table, what operation type) but not parameter values or result rows. Log schema: `{user_id, role, table_name, operation, timestamp, tenant_id, subject_id}` — never include actual field values. Neon's own HIPAA documentation explicitly states: "avoid PHI in metadata, system logs, audit trails, query logs, error logs, and support tickets." Treat all error messages that bubble up from Postgres (including constraint violations) as potentially PHI-adjacent — sanitize before surfacing to clients. Retain audit logs for six years minimum per HIPAA requirements.

**Warning signs:**
- pgAudit configured with `pgaudit.log_parameter = on`
- Remix `console.error` calls that log full Drizzle result objects (which may contain PHI field values)
- Audit log storage without access controls (anyone on the team can query raw pgAudit output)
- No documented log-retention policy

**Phase to address:**
PHI security gate phase, alongside pgAudit enablement. Audit log configuration must be locked before data-layer migration goes live.

---

### Pitfall 8: LLM Hallucinating Numerical Lab Values With High Confidence

**What goes wrong:**
The LLM ingest pipeline extracts structured metric data (name, value, unit, reference range) from uploaded lab PDFs. LLMs can and do hallucinate numerical values — inventing a number that is plausible for the field but not present in the source document — while expressing high textual confidence in the output. A testosterone value of 650 ng/dL becomes 65 or 6500 in the extracted JSON with no error signal. Units are confused (ng/dL vs. ng/mL is a 10x scaling difference). Reference ranges from a different lab's normal values get attached to the extracted result. These errors flow through human review if the reviewer is not shown the source document alongside the extraction.

**Why it happens:**
Medical lab documents are semi-structured (lab-specific PDF formats, table layouts, footers that repeat reference ranges). The LLM is completing the structure; when the source is ambiguous (overlapping tables, multi-column layouts, faint OCR), it fills gaps with plausible-but-wrong values rather than expressing uncertainty. Confidence calibration is poor — high softmax probability does not mean high factual accuracy.

**How to avoid:**
Three-layer validation:
1. **Grounding check**: After extraction, verify each extracted numerical value exists verbatim (or in a scaled form, e.g., "548 mV" for "0.548 V") in the raw text of the source document. Reject any extracted value that cannot be located in the source — flag as hallucination rather than propagating.
2. **Range sanity check**: Every extracted metric value must pass a plausibility gate against the known physiological range for that metric and unit (e.g., testosterone in ng/dL cannot exceed 2000). Flag out-of-range values for mandatory human review regardless of model confidence.
3. **Human review interface must show source alongside extraction**: The review UI must display the source document (or the relevant page) side-by-side with the extracted fields. A reviewer who only sees the extracted JSON cannot catch hallucinations. Store `extractionConfidence` per field (not just per document) and surface low-confidence fields with highlighting.

**Warning signs:**
- Review UI shows only extracted JSON, not the source document
- No per-field confidence score, only a document-level confidence
- Extracted values not verified against source text before storage
- No physiological range sanity checks downstream of extraction
- The pipeline has a "batch approve all" path that skips field-level review

**Phase to address:**
Lab ingest pipeline phase. The extraction confidence model and the review UI are not separate concerns — they must be designed together, not added after.

---

### Pitfall 9: K1–K4 Confidence Engine Producing Recommendations That Read as Clinical Prescriptions

**What goes wrong:**
The decision engine grades evidence K1 (strong/clinical) through K4 (speculative/single-study) and generates protocol recommendations. Even K1 recommendations expressed as "supplement X at Y dose" can be interpreted by practitioners or clients as clinical prescriptions, especially when presented in a report with confident formatting. The product constraint is explicit: LLM extraction + drafting only, never final clinical judgment. Scope creep in the report language — moving from "the evidence suggests" to "you should" — crosses a line that creates regulatory exposure (unlicensed medical practice, FTC wellness claims).

**Why it happens:**
Report generation prompts drift toward authoritative language because it reads better. The K-level system is a backend concept; if the UI does not surface the grade prominently in the final output, the practitioner and client see only the recommendation without the uncertainty. "K4: speculative" buried in a tooltip is not meaningful disclosure.

**How to avoid:**
- Every generated recommendation must include the confidence grade in the visible output, not a tooltip — "K3 (limited evidence): consider X because Y" is the minimum template
- The LLM prompt for report generation must have an explicit system instruction: "Do not use imperative language ('you should', 'you must', 'you need to'). Use hedged language ('the evidence supports considering', 'your data is consistent with', 'discuss with your practitioner')"
- K4 recommendations must carry a mandatory disclaimer in the report and cannot be the sole basis for a protocol action
- Add a lint/test on the report renderer: assert that K4 recommendations include the disclaimer string and that no report output contains the forbidden imperative patterns
- The schema `variantProtocolMap.confidence` field must be non-nullable — no recommendation enters the system without an explicit confidence grade

**Warning signs:**
- Report generation prompt does not specify hedged language
- K-level not visible in the printed/exported report output
- `variantProtocolMap.confidence` is nullable in the schema
- UI shows the recommendation prominently but the grade in a collapsed section or footnote
- No automated test asserting confidence-level presence in generated report text

**Phase to address:**
Engine promotion phase (promoting geneticVariants + variantProtocolMap to first-class schema) and report generation phase. The schema constraint (non-nullable confidence) must be enforced at the schema level from day one, not retrofitted.

---

### Pitfall 10: Cessation Day Calculation Time-Coupling Breaks at Phase Boundary

**What goes wrong:**
`getCessationDay()` calls `new Date()` internally and the cessation start date is hardcoded. As of 2026-06-07, the protocol is on Day 167 — past the nominal 150-day optimization endpoint. Phase display logic that was written for Days 1–120 has never been exercised in a post-Day-120 state under tests. When the app is extended to support client cessation protocols (with different start dates and durations), the time-coupled, hardcoded logic will produce wrong phase values for any client whose protocol does not start on 2025-12-23.

**Why it happens:**
N=1 instrument: the hardcode was fine and tests were zero (CONCERNS.md). M1 introduces per-client cessation tracking with arbitrary start dates. The existing function will silently compute phases relative to the owner's start date for all clients if not refactored before client data is written.

**How to avoid:**
Before the first M1 client is onboarded: (1) extract `cessationStartDate` from the `cessationLog` record rather than hardcoding it, (2) accept `now: Date` as a parameter (default `new Date()`) to make the function testable, (3) add Vitest tests covering: Day 1, Day 21 boundary, Day 22, Day 60 boundary, Day 61, Day 120 boundary, Day 121, and a post-endpoint date. This is a direct dependency of CONCERNS.md's testing gap.

**Warning signs:**
- `getCessationDay()` still hardcodes `2025-12-23`
- No Vitest coverage for phase boundary transitions
- `cessationLog` table has no `subject_id` column (still single-subject)

**Phase to address:**
Test harness phase (early M1, per PRINCIPLES.md) and identity/tenancy spine phase (which adds `subject_id` to `cessationLog`).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `real-data.ts` as data source while DB migration is in progress | No downtime; app keeps working | Client PHI stored in source files = data breach risk; must never happen | Only until DB wiring is complete — zero real client data in static files, ever |
| Use same Neon role for migrations and runtime | One fewer env var | BYPASSRLS on runtime role = all RLS policies silently ineffective | Never for PHI-bearing tables |
| Skip Drizzle migrations directory; use `drizzle-kit push` | Fast schema iteration in dev | No migration history; catastrophic in production (DROP COLUMN is instant data loss) | Dev/local only — never against Neon in any environment with real data |
| Add `tenantId`/`subjectId` columns as nullable initially | Easier backfill | Nullable scoping columns mean RLS policies can be bypassed with NULL rows | Never — columns must be NOT NULL; backfill must complete before enabling RLS |
| `as any` casts on subcategory fields | Suppresses type errors | Prevents TypeScript from catching category/subcategory mismatches in lab ingest | Never for new M1 code — existing `as any` debt must be cleaned in schema pass |
| Single LLM call for extract + validate | Simpler pipeline | Hallucinations pass through without independent grounding check | Never for PHI medical values |
| Confidence grade in tooltip only | Cleaner report UI | Practitioners/clients make decisions without seeing evidence quality | Never — K-level must be in the visible body of every recommendation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Neon HIPAA | Assuming HIPAA is available on any plan | Scale plan required; execute BAA + enable per-project before any PHI is written |
| Neon + PgBouncer | Using `SET app.tenant_id` outside a transaction | Always `SET LOCAL` inside `db.transaction()` — transaction mode pooling resets session state |
| Drizzle Kit migrations | Running `drizzle-kit push` against Neon | Use `drizzle-kit generate` + `drizzle-kit migrate`; commit migration files; never push in production |
| Neon HIPAA — Auth + Data API | Using Neon Auth for identity or Neon Data API for PHI queries | Both are explicitly excluded from the BAA — use a separate auth provider (Clerk, Auth.js) |
| pgAudit | Enabling with `log_parameter = on` | Log operation type + table + user + timestamp only; no parameter values containing PHI |
| LLM extraction | Trusting model confidence score as factual accuracy | Verify extracted values against source document text; add range sanity checks independently |
| Netlify + PHI | Deploying PHI on non-Enterprise Netlify plan | Enterprise plan + executed BAA required before any PHI transits Netlify edge functions |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Missing composite index on `(tenant_id, subject_id)` on every RLS-scoped table | RLS policy evaluation causes full-table scans; query latency grows with tenant count | Add composite index `(tenant_id, subject_id)` on all data tables before enabling RLS; `tenant_id` must be the leading column | At ~10K rows across multiple tenants; invisible in single-tenant dev |
| `real-data.ts` re-concatenation on every request | Each request re-runs `getRealMetrics()` concatenation of four arrays | Move to Neon-backed queries in M1 data-layer migration; short-term: module-level memoization | Already a concern at 1,344 lines / n=1; critical at multi-tenant scale |
| LLM extraction blocking the HTTP request cycle | Lab upload hangs for 10–30 seconds; Netlify function timeout (default 10s) | Run LLM extraction as a background job (queue + webhook), not in the upload handler; return a `processing` state immediately | First real lab PDF upload |
| Pearson correlation recompute on every page load | `home.tsx` re-computes correlations inline | Move to a scheduled background job that writes to the `correlations` table; loaders read pre-computed values | At ~5 subjects with ~30 metrics each |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| BYPASSRLS on application database role | All RLS policies silently ineffective; complete tenant isolation failure | Separate migration role (BYPASSRLS) from app role (no bypass); verify with `pg_roles` assertion in CI |
| PHI in Remix error boundaries | Error messages surfacing Postgres constraint violations with PHI field values | Sanitize all DB errors before reaching error boundaries; never log raw Drizzle errors to client |
| No consent capture before PHI collection | Collecting PHI without documented authorization — HIPAA violation | Intake form must include data-use disclosure and signature before any PHI is stored; consent record must be persisted with timestamp |
| Genetic variant data in seed files at M1 | Client genetic data (K1–K4 variant profile) is among the most sensitive PHI | Move to `geneticVariants` + `variantProtocolMap` tables with RLS from day one; never commit client genetic data to source files |
| LLM provider receiving raw PHI without BAA | HIPAA violation — sending PHI to a third party (the LLM API) without a BAA | Confirm LLM provider has a signed BAA for the account (OpenAI has a BAA; confirm it covers the API tier in use) before sending any PHI to the model |
| Obsidian vault import persisting to client records | Vault markdown contains Mac's personal PHI — shipping it as "client data" to a client profile | The vault importer must remain the owner's personal tool; never route vault data through the multi-tenant ingest pipeline |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| K-level confidence shown only in tooltip or footnote | Practitioners treat K4 speculative recommendations as clinical; liability exposure | K-level text in the visible body of every recommendation: "K3 (limited evidence):" as the prefix |
| Batch-approve button in lab review UI | Reviewers rubber-stamp LLM extractions without field-level verification; hallucinations persist to protocol | Force field-by-field confirmation for any metric with extraction confidence below threshold; no batch approve for low-confidence extractions |
| No source document alongside extracted values in review UI | Reviewer cannot detect hallucinations; entire human-in-the-loop value is lost | Side-by-side view: source PDF page + extracted fields; highlight the source text that supports each extracted value |
| Status dots (optimal/borderline/deficient/excess) with no text label | WCAG 2.1 failure (SC 1.4.1: use of color); inaccessible to colorblind users | Always pair status color with a text label or icon; aria-label on status dots |
| Cessation phase display after Day 150 | App shows wrong phase or crashes when Day 121+ is past the optimization endpoint | Handle the post-protocol state explicitly: "Protocol complete (Day N)" instead of array out-of-bounds |

---

## "Looks Done But Isn't" Checklist

- [ ] **RLS enabled:** Verify with `SELECT * FROM pg_policies WHERE tablename = 'metrics'` — must show at least one policy for each data table, not just `ENABLE ROW LEVEL SECURITY` in the schema
- [ ] **Tenant isolation tested:** Must include a test that authenticates as Tenant A, writes a row, then authenticates as Tenant B and confirms the row is invisible
- [ ] **PHI BAA gate:** Neon HIPAA enabled + BAA executed + Netlify BAA executed — all three before any real client data exists in Neon
- [ ] **Audit trail active:** pgAudit logging confirmed via a test query and log inspection; retention policy documented
- [ ] **LLM extraction grounding:** Every extracted lab value verified against source document text — confirmed in the pipeline, not assumed
- [ ] **Report K-level visible:** Every generated report section surfaces the confidence grade in visible text, not metadata only
- [ ] **Consent captured:** Intake flow persists consent record with timestamp before storing any PHI for the client
- [ ] **Migration directory committed:** `remix-app/migrations/` directory exists and is committed before any M1 schema changes
- [ ] **Runtime role verified:** Application's `DATABASE_URL` connects as a non-BYPASSRLS role — confirmed with `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`
- [ ] **LLM provider BAA confirmed:** OpenAI (or chosen provider) has an active BAA for this account before any PHI is sent to the API

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tenant context leak via SET (cross-tenant PHI exposure) | HIGH | Immediate: rotate all credentials, audit pgAudit logs for affected requests, notify affected tenants per HIPAA breach protocol (5-day notification per Neon BAA); Fix: refactor all tenant-context-setting code to SET LOCAL + transaction wrapper |
| RLS lockout (no policies, app locked out) | MEDIUM | Restore via superuser/BYPASSRLS role (migration role); add policies; re-deploy; data intact but downtime occurred |
| PHI in source files shipped to client bundle | HIGH | Immediately remove client PHI from static files; audit git history for committed PHI; rotate if committed; check bundle output for PHI strings; may require HIPAA breach assessment |
| LLM hallucinated values persisted without human review | MEDIUM | Re-run extraction on affected documents; queue for manual re-review; correct persisted metrics; log correction event in audit trail |
| Drizzle `push` instead of `migrate` in production | HIGH | Restore from Neon point-in-time backup (Neon supports this); reapply via proper migration; never use `push` against production again |
| Confidence grade missing from persisted recommendations | LOW | Schema migration to add NOT NULL constraint + backfill; re-grade affected recommendations with explicit K-level |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SET vs SET LOCAL tenant context leak | Identity + tenancy spine | Integration test: sequential requests on pooled connection assert cross-tenant isolation |
| RLS lockout from policy-less enable | Identity + tenancy spine | Migration runs on Neon branch first; policy coverage query passes post-migration |
| Cross-tenant FK join leaks | Identity + tenancy spine | All 8 existing tables + all new M1 tables have `pg_policies` rows confirmed |
| BYPASSRLS on app role | Identity + tenancy spine | CI assertion: `rolbypassrls = false` for runtime role |
| PHI in static TypeScript source files | Data-layer migration (wire `db.server.ts`) | Build output grep: no PHI strings in Netlify function bundle |
| Neon HIPAA plan/BAA gating | PHI security gate (before data-layer migration) | Ops checklist: BAA dates, project HIPAA flag, pgAudit log confirmed |
| PHI in audit logs | PHI security gate | pgAudit config review: `log_parameter = off`; test query confirms no field values in logs |
| LLM hallucinated numerical values | Lab ingest pipeline | Grounding check passes for all extracted values against source; range sanity checks in test suite |
| K1–K4 scope creep to clinical prescription | Engine promotion + report generation | Lint test: no imperative language patterns in generated reports; K-level in visible body confirmed |
| Cessation calculation time-coupling | Test harness phase (early M1) | Vitest coverage: all phase boundary days pass with arbitrary `now` parameter |
| Missing Drizzle migrations directory | Pre-M1 schema baseline | `remix-app/migrations/` committed and CI runs `drizzle-kit migrate --dry-run` successfully |
| LLM provider PHI without BAA | PHI security gate | Ops runbook: LLM provider BAA signed date recorded before any PHI is sent to API |

---

## Sources

- [Postgres RLS Implementation Guide — Best Practices and Common Pitfalls (permit.io)](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [Multi-tenant data isolation with PostgreSQL Row Level Security (AWS)](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [PostgreSQL Documentation: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Drizzle ORM — Row-Level Security (RLS) official docs](https://orm.drizzle.team/docs/rls)
- [Neon Connection Pooling docs](https://neon.com/docs/connect/connection-pooling)
- [Neon HIPAA Compliance docs](https://neon.com/docs/security/hipaa)
- [Building HIPAA-compliant applications on Neon](https://neon.com/guides/hipaa-compliant-applications)
- [Netlify HIPAA-compliant service offering announcement](https://www.netlify.com/blog/netlify-launches-a-hipaa-compliant-service-offering/)
- [The Difference Between Postgres Logging and PGAudit (Neon blog)](https://neon.com/blog/postgres-logging-vs-pgaudit)
- [HIPAA Audit Log Requirements — Compliancy Group](https://compliancy-group.com/hipaa-audit-log-requirements/)
- [HHS.gov — Difference between HIPAA consent and authorization](https://www.hhs.gov/hipaa/for-professionals/faq/264/what-is-the-difference-between-consent-and-authorization/index.html)
- [Multi-Tenant Leakage: When "Row-Level Security" Fails in SaaS (Medium)](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Operationalizing LLMs for Clinical Research Data Extraction (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12932350/)
- [Hallucinations and Key Information Extraction in Medical Texts (arXiv)](https://arxiv.org/html/2504.19061v1)
- [A framework to assess clinical safety and hallucination rates of LLMs for medical text summarisation (npj Digital Medicine)](https://www.nature.com/articles/s41746-025-01670-7)
- [Data Extraction from Oncology Imaging Reports by LLMs (medRxiv)](https://www.medrxiv.org/content/10.64898/2025.12.30.25343206.full.pdf)
- [Drizzle ORM Migrations in Production: Zero-Downtime Schema Changes (DEV)](https://dev.to/whoffagents/drizzle-orm-migrations-in-production-zero-downtime-schema-changes-e71)
- [Bytebase — Postgres RLS Limitations and Alternatives](https://www.bytebase.com/blog/postgres-row-level-security-limitations-and-alternatives/)

---
*Pitfalls research for: Multi-tenant PHI platform M1 — RLS retrofit + Neon + Remix + LLM lab ingest + K1–K4 decision engine*
*Researched: 2026-06-07*
