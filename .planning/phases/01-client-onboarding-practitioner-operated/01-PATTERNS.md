# Phase 1: Client Onboarding (practitioner-operated) - Pattern Map

**Mapped:** 2026-06-14
**Files analyzed:** 16 (new/modified)
**Analogs found:** 16 / 16

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `db/schema.ts` (modify) | model | batch | itself | exact |
| `app/lib/subjects.server.ts` (new) | service | CRUD | `app/lib/invites.server.ts` | role-match |
| `app/lib/data.server.ts` (modify) | service | request-response | itself | exact |
| `app/lib/invites.server.ts` (modify) | service | CRUD | itself | exact |
| `app/lib/auth.server.ts` (modify) | service | event-driven | itself | exact |
| `app/lib/authz.server.ts` (modify) | middleware | request-response | itself | exact |
| `app/lib/checklist.server.ts` (new) | service | CRUD | `app/lib/data.server.ts` | role-match |
| `app/routes/_app/subject-switch.ts` (new) | route | request-response | `app/routes/_app/settings/invites.ts` | exact |
| `app/routes/_app/clients/index.tsx` (new) | route | CRUD | `app/routes/_app/settings/assignments.tsx` | exact |
| `app/routes/_app/clients/new.tsx` (new) | route | CRUD | `app/routes/_app/settings/assignments.tsx` | role-match |
| `app/routes/_app/layout.tsx` (modify) | route | request-response | itself | exact |
| `app/routes/_app/dashboard.tsx` (modify) | route | request-response | itself | exact |
| `app/routes/_app/protocol/index.tsx` (modify) | route | request-response | itself | exact |
| `app/routes/_app/ingest/consent.tsx` (modify) | route | request-response | itself | exact |
| `app/routes/_app/ingest/upload.tsx` (modify) | route | request-response | itself | exact |
| `app/components/shell/SubjectChip.tsx` (new) | component | event-driven | `app/components/shell/SidebarAccount.tsx` | exact |
| `app/routes.ts` (modify) | config | — | itself | exact |
| `tests/lib/subjects.test.ts` (new) | test | — | `tests/lib/data.server.test.ts` | exact |
| `tests/lib/active-subject.test.ts` (new) | test | — | `tests/lib/require-subject-ctx.test.ts` | exact |
| `tests/lib/checklist.test.ts` (new) | test | — | `tests/lib/require-subject-ctx.test.ts` | role-match |
| `tests/auth/invites-server.test.ts` (modify) | test | — | itself | exact |

---

## Pattern Assignments

---

### `db/schema.ts` — new enums + `subjects` intake fields + `invites.subjectId`

**Analog:** `db/schema.ts` itself (lines 18–89, 96–110, 241–247)

**House enum pattern** (lines 82–89):
```typescript
export const cessationPhaseEnum = pgEnum('cessation_phase', [
  'acute',
  'stabilization',
  'clearing',
  'optimization',
]);

export const appRoleEnum = pgEnum('app_role', ['owner', 'practitioner', 'client']);
```

**New enums to add** (insert after `appRoleEnum`, line 89):
```typescript
export const biologicalSexEnum = pgEnum('biological_sex', ['male', 'female', 'intersex']);

export const programTypeEnum = pgEnum('program_type', [
  'cessation',
  'substance_taper',
  'lifestyle_modification',
  'general',
]);
```

**Current `subjects` table** (lines 241–247):
```typescript
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Intake field additions** — append before closing `}`; all nullable (no `.notNull()`):
```typescript
  dob: timestamp('dob'),
  biologicalSex: biologicalSexEnum('biological_sex'),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  goals: text('goals'),
  intakeNotes: text('intake_notes'),
  programType: programTypeEnum('program_type'),
  programStartDate: timestamp('program_start_date'),
```

**Style notes:** `timestamp` (not `date`) for date fields — consistent with `cessationLog.startDate`, `expiresAt`, etc. `varchar` for contact fields — consistent with `displayName`, `fileName`. `pgEnum` for bounded sets — consistent with `appRoleEnum`, `cessationPhaseEnum`.

**`invites` table delta** (lines 96–110) — add inside the column list after `createdAt`:
```typescript
  subjectId: text('subject_id').references(() => subjects.id),  // nullable — owner-bootstrap invites have no subject
```

**Migration workflow:**
```bash
cd remix-app
npm run db:generate   # generates migration SQL; Drizzle resolves FK ordering automatically
npm run db:migrate    # applies to Neon via DATABASE_URL_UNPOOLED
```

---

### `app/lib/subjects.server.ts` — NEW service (createSubject, listClientSubjects)

**Analog:** `app/lib/invites.server.ts` (lines 1–30, 80–119, 127–134)

**Import pattern** (copy from `invites.server.ts` lines 21–24):
```typescript
import { getDb } from "./db.server";
import { subjects } from "../../db/schema";
import { eq, and, ne } from "drizzle-orm";
```

**Admin-path pattern** — `getDb()` not `withTenantDb` (same reason as `getOwnerSubject`; the subject row is being written before TenantCtx exists):
```typescript
export async function createSubject(data: {
  id: string;
  tenantId: string;
  displayName: string;
  dob?: Date | null;
  biologicalSex?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  goals?: string | null;
  intakeNotes?: string | null;
  programType?: string | null;
  programStartDate?: Date | null;
}) {
  const db = getDb();
  const [row] = await db.insert(subjects).values(data).returning();
  return row;
}
```

**List pattern** — copy structure from `listInvites` (lines 127–134):
```typescript
export async function listClientSubjects(tenantId: string, ownerSubjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(subjects)
    .where(and(eq(subjects.tenantId, tenantId), ne(subjects.id, ownerSubjectId)));
}

export async function listSubjectsForTenant(tenantId: string) {
  const db = getDb();
  return db.select().from(subjects).where(eq(subjects.tenantId, tenantId));
}

export async function getSubjectById(id: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}
```

**Error handling pattern** — throw `Response` (not generic Error), consistent with `getOwnerSubject` line 57:
```typescript
if (!row) {
  throw new Response("Subject not found", { status: 404 });
}
```

---

### `app/lib/data.server.ts` — ADD `getActiveSubject` + `listSubjectsForChip`

**Analog:** `app/lib/data.server.ts` itself (lines 53–64 — `getOwnerSubject`)

**`getOwnerSubject` pattern to replicate** (lines 53–64):
```typescript
export async function getOwnerSubject(tenantId: string) {
  const db = getDb();
  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.tenantId, tenantId))
    .limit(1);
  if (!subject) {
    throw new Response("Subject not found", { status: 404 });
  }
  return subject;
}
```

**New `getActiveSubject` to add** — stays on admin path (same rationale as `getOwnerSubject`, per file header comment lines 13–16):
```typescript
/**
 * Returns the active subject for the request.
 * Reads the httpOnly `zt-subject` session cookie; validates it is within
 * the tenant. Falls back to the owner (first-created) subject if the cookie
 * is absent, invalid, or refers to a deleted subject (self-healing, Pitfall 8).
 *
 * Uses the admin db path (getDb()) intentionally — same reason as getOwnerSubject:
 * this bootstraps subjectId before TenantCtx can be constructed.
 * Must live in data.server.ts (.server.ts suffix) — never import in client components.
 */
export async function getActiveSubject(request: Request, tenantId: string) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const match = /(?:^|;\s*)zt-subject=([^;]+)/.exec(cookieHeader);
  const activeSubjectId = match?.[1] ?? null;

  const db = getDb();

  if (activeSubjectId) {
    const [candidate] = await db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, activeSubjectId), eq(subjects.tenantId, tenantId)))
      .limit(1);
    if (candidate) return candidate; // validated: same tenant, not deleted
  }

  // Fallback: owner subject (first created in tenant, ordered by createdAt ASC)
  // In v1.1 the owner subject is always the first row (created at bootstrap).
  const [owner] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.tenantId, tenantId))
    .orderBy(subjects.createdAt)  // asc default — oldest first
    .limit(1);
  if (!owner) {
    throw new Response("Subject not found", { status: 404 });
  }
  return owner;
}
```

**Cookie-parsing pattern** — copy from `_app/layout.tsx` lines 24–25 (established repo idiom):
```typescript
const cookie = request.headers.get("Cookie") ?? "";
const navCollapsed = /(?:^|;\s*)zt-nav=1(?:\s*;|$)/.test(cookie);
// zt-subject analog:
const match = /(?:^|;\s*)zt-subject=([^;]+)/.exec(cookieHeader);
```

**Import additions needed** in `data.server.ts` (line 21 — add `and` if not already there):
```typescript
import { eq, and, desc } from "drizzle-orm";
// subjects already imported at line 31
```

---

### `app/lib/invites.server.ts` — MODIFY to thread `subjectId`

**Analog:** itself (lines 50–119)

**`GenerateInviteOpts` interface extension** (lines 50–57 — add `subjectId?`):
```typescript
export interface GenerateInviteOpts {
  inviter: {
    id: string;
    role?: string | null;
    tenantId?: string | null;
  };
  role: "practitioner" | "client";
  subjectId?: string | null;  // NEW — bound to existing subject (D-01); null for practitioner invites
}
```

**`GenerateInviteResult` extension** (lines 59–65 — add `subjectId`):
```typescript
export interface GenerateInviteResult {
  token: string;
  role: "practitioner" | "client";
  tenantId: string;
  expiresAt: Date;
  subjectId: string | null;  // NEW
}
```

**`generateInvite` db.insert call** (lines 107–115 — add `subjectId` to values):
```typescript
await db.insert(invites).values({
  id: crypto.randomUUID(),
  tokenHash,
  role,
  tenantId: inviter.tenantId,
  createdBy: inviter.id,
  expiresAt,
  createdAt: now,
  subjectId: opts.subjectId ?? null,  // NEW
});

return { token: raw, role, tenantId: inviter.tenantId, expiresAt, subjectId: opts.subjectId ?? null };
```

**`resolveInviteByToken` return extension** (lines 183–213 — extend return type):
```typescript
export async function resolveInviteByToken(
  raw: string
): Promise<{ role: string; tenantId: string; subjectId: string | null } | null> {
  // ... existing logic unchanged ...
  return { role: invite.role, tenantId: invite.tenantId, subjectId: invite.subjectId ?? null };  // EXTEND
}
```

**`consumeInviteByToken` return extension** (lines 239–298 — same pattern):
```typescript
export async function consumeInviteByToken(
  raw: string,
  consumedBy?: string
): Promise<{ role: string; tenantId: string; subjectId: string | null } | null> {
  // ... existing logic unchanged ...
  return { role: invite.role, tenantId: invite.tenantId, subjectId: invite.subjectId ?? null };  // EXTEND
}
```

---

### `app/lib/auth.server.ts` — MODIFY `PendingInvite` + redemption hooks

**Analog:** itself (lines 40–49, 165–263)

**`PendingInvite` interface extension** (lines 40–48 — add `subjectId`):
```typescript
interface PendingInvite {
  rawToken: string;
  role: string;
  tenantId: string;
  subjectId: string | null;  // NEW — from D-01; null for practitioner invites + break-glass
  breakGlass: boolean;
}
```

**`beforeSignUp` hook — stash `subjectId`** (lines 352–358 — extend the `pendingInvite.set` call):
```typescript
// Step 2: Per-invite path — extend pendingInvite.set to carry subjectId
await pendingInvite.set({
  rawToken: token as string,
  role: invite.role,
  tenantId: invite.tenantId,
  subjectId: invite.subjectId ?? null,  // NEW — thread through from resolveInviteByToken
  breakGlass: false,
});
```

**Break-glass path** (lines 325–330 — also add `subjectId: null`):
```typescript
await pendingInvite.set({
  rawToken: "",
  role: "owner",
  tenantId: ownerTenantId,
  subjectId: null,  // NEW — break-glass has no subject binding
  breakGlass: true,
});
```

**`user.create.after` audit thread** (lines 205–263) — the `subjectId` is now available as `pending?.subjectId` for audit logging. No additional table write required for v1.1 (RESEARCH.md "Correct v1.1 wiring" section). Pattern: best-effort try/catch (same as existing audit calls at lines 221–238).

---

### `app/lib/authz.server.ts` — MODIFY `requireSubjectCtx` swap point

**Analog:** itself (lines 127–146)

**Current `requireSubjectCtx`** (lines 127–146):
```typescript
export async function requireSubjectCtx(request: Request): Promise<{...}> {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);   // ← LINE 135: THE SWAP POINT
  assertSubjectAccess(user, subject, user.tenantId!);
  const ctx: TenantCtx = {
    userId: user.id,
    tenantId: user.tenantId!,
    subjectId: subject.id,
  };
  return { user, subject, ctx };
}
```

**Single-line swap** (line 135 only):
```typescript
// BEFORE:
const subject = await getOwnerSubject(user.tenantId!);
// AFTER:
const subject = await getActiveSubject(request, user.tenantId!);
```

**Import change at line 18** — replace `getOwnerSubject` import with `getActiveSubject` (or add it):
```typescript
// BEFORE:
import { getOwnerSubject } from "./data.server";
// AFTER:
import { getOwnerSubject, getActiveSubject } from "./data.server";
```

Note: `getOwnerSubject` is still used directly by Pattern-B callers (consent, upload, review, ingest index, report routes) which are updated separately. Keep both imports.

**Effect:** This single change propagates correct active-subject scoping to all 13 Pattern-A PHI loaders simultaneously (RESEARCH.md lines 99–113).

---

### `app/lib/checklist.server.ts` — NEW query helper

**Analog:** `app/lib/data.server.ts` (lines 66–90 — `getMetrics` withTenantDb pattern) + `app/lib/invites.server.ts` (lines 127–134 — admin-path query)

**Import pattern:**
```typescript
import { getDb } from "./db.server";
import { withTenantDb } from "./db.server";
import type { TenantCtx } from "./db.server";
import {
  labDocuments, labExtractions, subjectGenotypes, metrics,
  reports, protocolVersions, consentLog, invites, subjects,
} from "../../db/schema";
import { eq, and, count, isNotNull, isNull } from "drizzle-orm";
```

**3-state type:**
```typescript
export type ChecklistState = "missing" | "in_progress" | "done";

export interface ChecklistStatus {
  intake: ChecklistState;
  consent: ChecklistState;
  genetics: ChecklistState;
  labs: ChecklistState;
  whoop: ChecklistState;
  report: ChecklistState;
  protocol: ChecklistState;
  invite: "not_sent" | "pending" | "redeemed";
}
```

**Query pattern — use admin path for cross-subject queries** (checklist reads multiple subjects, so `withTenantDb` per subject is correct for the existing tenant context; admin path acceptable given owner-only access to this surface):
```typescript
export async function getChecklistStatus(
  ctx: TenantCtx,
  targetSubjectId: string
): Promise<ChecklistStatus> {
  // All queries scoped by tenantId + targetSubjectId (defense-in-depth, D-11)
  return withTenantDb(ctx, async (tx) => {
    const [
      consentRows,
      genotypeCount,
      labDocRows,
      approvedLabRows,
      whoopRows,
      reportRows,
      protocolRows,
      inviteRows,
      subjectRow,
    ] = await Promise.all([
      tx.select().from(consentLog)
        .where(and(eq(consentLog.subjectId, targetSubjectId), eq(consentLog.tenantId, ctx.tenantId)))
        .limit(1),
      tx.select({ count: count() }).from(subjectGenotypes)
        .where(and(eq(subjectGenotypes.subjectId, targetSubjectId), eq(subjectGenotypes.tenantId, ctx.tenantId))),
      tx.select().from(labDocuments)
        .where(and(eq(labDocuments.subjectId, targetSubjectId), eq(labDocuments.tenantId, ctx.tenantId)))
        .limit(1),
      tx.select().from(labExtractions)
        .where(and(
          eq(labExtractions.subjectId, targetSubjectId),
          eq(labExtractions.tenantId, ctx.tenantId),
          eq(labExtractions.status, 'approved')
        ))
        .limit(1),
      tx.select().from(metrics)
        .where(and(
          eq(metrics.subjectId, targetSubjectId),
          eq(metrics.tenantId, ctx.tenantId),
          eq(metrics.source, 'whoop')
        ))
        .limit(1),
      tx.select().from(reports)
        .where(and(eq(reports.subjectId, targetSubjectId), eq(reports.tenantId, ctx.tenantId)))
        .limit(1),
      tx.select().from(protocolVersions)
        .where(and(eq(protocolVersions.subjectId, targetSubjectId), eq(protocolVersions.tenantId, ctx.tenantId)))
        .limit(1),
      // invites uses admin path — no RLS on invites table for this query
      // (invites table is tenant-scoped, not subject-scoped in RLS)
      getDb()
        .select()
        .from(invites)
        .where(and(
          eq(invites.tenantId, ctx.tenantId),
          eq(invites.subjectId, targetSubjectId)  // requires new subjectId column (D-01)
        ))
        .limit(1),
      tx.select().from(subjects)
        .where(and(eq(subjects.id, targetSubjectId), eq(subjects.tenantId, ctx.tenantId)))
        .limit(1),
    ]);

    // Intake "done": displayName + dob + biologicalSex present
    const s = subjectRow[0];
    const intakeDone = !!(s?.dob && s?.biologicalSex);
    const consentDone = consentRows.length > 0;
    // Combined intake+consent into one "intake" gate:
    const intake: ChecklistState = intakeDone && consentDone ? "done"
      : (intakeDone || consentDone) ? "in_progress" : "missing";

    const genCount = genotypeCount[0]?.count ?? 0;
    const genetics: ChecklistState = genCount > 0 ? "done" : "missing";

    const hasLabDocs = labDocRows.length > 0;
    const hasApproved = approvedLabRows.length > 0;
    const labs: ChecklistState = hasApproved ? "done" : hasLabDocs ? "in_progress" : "missing";

    const whoop: ChecklistState = whoopRows.length > 0 ? "done" : "missing";
    const report: ChecklistState = reportRows.length > 0 ? "done" : "missing";
    const protocol: ChecklistState = protocolRows.length > 0 ? "done" : "missing";

    const inv = inviteRows[0];
    const invite: ChecklistStatus["invite"] = !inv ? "not_sent"
      : inv.consumedAt ? "redeemed" : "pending";

    return { intake, consent: consentDone ? "done" : "missing", genetics, labs, whoop, report, protocol, invite };
  });
}
```

---

### `app/routes/_app/subject-switch.ts` — NEW resource route (action-only)

**Analog:** `app/routes/_app/settings/invites.ts` (lines 1–56, exact pattern)

**Full resource route pattern** (copy structure from `invites.ts`):
```typescript
/**
 * subject-switch.ts — Resource route: POST sets the zt-subject httpOnly cookie.
 * No loader, no default export — action-only resource route.
 *
 * Security (D-04/D-06):
 *   - requireUser: unauthenticated → redirect to /login
 *   - assertSubjectAccess: validates target subject is within caller's tenant;
 *     client role → 403 (Gate 1); cross-tenant → 403 (Gate 2)
 *   - httpOnly cookie: cannot be read/written by client JS
 *   - Session-scoped: no Max-Age/Expires → clears on browser close (D-06)
 */
import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { requireUser, assertSubjectAccess } from "~/lib/authz.server";
import { getDb } from "~/lib/db.server";
import { subjects } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireUser(request);

  const formData = await request.formData();
  const subjectId = formData.get("subjectId");

  if (typeof subjectId !== "string" || !subjectId.trim()) {
    throw new Response("Missing subjectId", { status: 400 });
  }

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  const db = getDb();
  const [candidate] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId.trim()), eq(subjects.tenantId, user.tenantId)))
    .limit(1);

  if (!candidate) {
    throw new Response("Subject not found", { status: 404 });
  }

  // Validates Gate 1 (client → 403) and Gate 2 (cross-tenant → 403).
  // Gate 3 (practitioner → assigned only) omitted for v1.1 — owners only switch here.
  assertSubjectAccess(user, candidate, user.tenantId);

  const referer = request.headers.get("Referer") ?? "/dashboard";

  // httpOnly, session-scoped: NO Max-Age or Expires (D-06 — clears on browser close).
  return redirect(referer, {
    headers: {
      "Set-Cookie": `zt-subject=${subjectId.trim()}; Path=/; HttpOnly; SameSite=Lax`,
    },
  });
}

// No loader, no default export — action-only resource route
```

**Cookie write pattern:** `redirect(referer, { headers: { "Set-Cookie": "..." } })` — identical structure to `auth/logout.tsx` line 15 (`throw redirect("/login", { headers: response.headers })`).

---

### `app/routes/_app/clients/index.tsx` — NEW list + create route

**Analog:** `app/routes/_app/settings/assignments.tsx` (lines 1–511, entire file)

**Loader pattern** (copy from `assignments.tsx` lines 61–103):
```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);   // gate: clients cannot view /clients

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  // Bootstrap owner subject for TenantCtx (same as assignments.tsx lines 71–77)
  const ownerSubject = await getOwnerSubject(user.tenantId);
  const ctx: TenantCtx = {
    userId: user.id,
    tenantId: user.tenantId,
    subjectId: ownerSubject.id,
  };

  const clientSubjects = await listClientSubjects(user.tenantId, ownerSubject.id);

  // Load checklist status for each client subject in parallel
  const checklistStatuses = await Promise.all(
    clientSubjects.map((s) => getChecklistStatus(ctx, s.id))
  );

  return {
    user,
    clients: clientSubjects.map((s, i) => ({ subject: s, checklist: checklistStatuses[i] })),
  };
}
```

**Action pattern with `_intent`** (copy from `assignments.tsx` lines 107–182):
```typescript
export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);

  if (!user.tenantId) throw new Response("No tenant assignment.", { status: 403 });

  const formData = await request.formData();
  const intent = formData.get("_intent") as string;

  if (intent === "create-client") {
    const displayName = formData.get("displayName");
    if (typeof displayName !== "string" || !displayName.trim()) {
      return { intent: "create-client", success: false, error: "Full name is required." };
    }
    // ... validate other fields ...
    try {
      await createSubject({
        id: crypto.randomUUID(),
        tenantId: user.tenantId,
        displayName: displayName.trim(),
        // ... other intake fields ...
      });
      return { intent: "create-client", success: true, error: null };
    } catch {
      return { intent: "create-client", success: false, error: "Could not create client. Try again or refresh the page." };
    }
  }

  if (intent === "generate-invite") {
    requireRole(user, ["owner", "practitioner"]);
    const subjectId = formData.get("subjectId") as string;
    // ... validate subjectId ...
    try {
      const result = await generateInvite({ inviter: user, role: "client", subjectId });
      return { intent: "generate-invite", success: true, token: result.token, expiresAt: result.expiresAt };
    } catch {
      return { intent: "generate-invite", success: false, error: "Could not generate invite. Try again." };
    }
  }

  return { intent: null, success: false, error: "Unknown intent" };
}
```

**Component pattern** (copy from `assignments.tsx` lines 186–511):
- `PageHeader eyebrow="CLIENTS" title="Clients" right={<Button variant="primary">Add client</Button>}` — matches `assignments.tsx` line 201
- `Card elevation="sm" padding="lg"` — matches line 213
- Inline `<table>` with `.zt-eyebrow` `<th>` headers — matches lines 425–440
- `<Form method="post">` with `<input type="hidden" name="_intent" value="...">` — matches lines 243, 487
- Error/success inline display with `color: var(--danger)` / `color: var(--vital-400)` — matches lines 328–351
- Two-step revoke: button label changes to "Confirm revoke" on first click — matches pattern of "Unassign" in `assignments.tsx`

**Select field style** (copy from `assignments.tsx` lines 268–287):
```typescript
style={{
  width: "100%",
  padding: "8px 12px",
  borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
}}
```

**Invite token "shown once" pattern** — copy from `settings/index.tsx` generate-invite section. The token is returned in action data and displayed inline in the component. After navigation, it is gone (no re-fetch).

---

### `app/routes/_app/layout.tsx` — MODIFY to load subject list for chip

**Analog:** itself (lines 1–47)

**Current loader return** (lines 24–33):
```typescript
const cookie = request.headers.get("Cookie") ?? "";
const navCollapsed = /(?:^|;\s*)zt-nav=1(?:\s*;|$)/.test(cookie);
return {
  user: { name: u.name, email: u.email, role: u.role ?? "client" },
  navCollapsed,
};
```

**Extended loader return** — add subject list + active subject for chip:
```typescript
const cookie = request.headers.get("Cookie") ?? "";
const navCollapsed = /(?:^|;\s*)zt-nav=1(?:\s*;|$)/.test(cookie);

// Load subject list for SubjectChip (only for owner/practitioner — clients have no chip)
let subjectList: Array<{ id: string; displayName: string }> = [];
let activeSubjectId: string | null = null;
if (u.tenantId && (u.role === "owner" || u.role === "practitioner")) {
  const subjectMatch = /(?:^|;\s*)zt-subject=([^;]+)/.exec(cookie);
  activeSubjectId = subjectMatch?.[1] ?? null;
  subjectList = await listSubjectsForTenant(u.tenantId);
}

return {
  user: { name: u.name, email: u.email, role: u.role ?? "client" },
  navCollapsed,
  subjectList,
  activeSubjectId,
};
```

**Component extension** — thread `subjectList` and `activeSubjectId` to `AppShell` → `Sidebar` → footer:
```typescript
export default function AppLayout() {
  const { user, navCollapsed, subjectList, activeSubjectId } = useLoaderData<typeof loader>();
  return (
    <AppShell user={user} navCollapsed={navCollapsed} subjectList={subjectList} activeSubjectId={activeSubjectId}>
      <Outlet />
    </AppShell>
  );
}
```

---

### `app/components/shell/SubjectChip.tsx` — NEW component

**Analog:** `app/components/shell/SidebarAccount.tsx` (lines 1–174, entire file — closest analog per UI-SPEC)

**Props interface** (mirror `SidebarAccountProps` lines 14–18):
```typescript
export interface SubjectChipProps {
  subjects: Array<{ id: string; displayName: string }>;
  activeSubjectId: string | null;
  collapsed: boolean;  // rail mode — popover opens right, not upward
}
```

**State + effects pattern** (copy from `SidebarAccount.tsx` lines 33–55):
```typescript
const [open, setOpen] = useState(false);
const { pathname, search } = useLocation();

// Close on navigation
useEffect(() => { setOpen(false); }, [pathname, search]);
// Close on rail toggle
useEffect(() => { setOpen(false); }, [collapsed]);
// Escape closes
useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [open]);
```

**Trigger button pattern** (copy from `SidebarAccount.tsx` lines 63–101):
```typescript
<button
  type="button"
  className={"zn-account" + (open ? " is-open" : "") + (isClientActive ? " is-elevated" : "")}
  onClick={() => setOpen((a) => !a)}
  aria-expanded={open}
  aria-haspopup="menu"
  aria-label="Switch active subject"
  // Elevated state when viewing a non-owner client:
  style={isClientActive ? {
    background: "var(--focus-50)",
    border: "1px solid var(--accent)",
    borderLeft: "2px solid var(--accent)",
    color: "var(--accent)",
  } : undefined}
>
  <Avatar name={activeSubject?.displayName ?? ""} size={30} />
  <span className="zn-label zn-account-name">
    <span style={{ display: "block", fontWeight: 600, fontSize: "var(--text-sm)", color: isClientActive ? "var(--accent)" : undefined }}>
      {activeSubject?.displayName}
    </span>
    <span style={{ display: "block", color: "var(--text-muted)", fontSize: "var(--text-2xs)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
      {isClientActive ? "VIEWING CLIENT" : "VIEWING"}
    </span>
  </span>
  <span className="zn-account-chev">
    <ChevronDown size={15} strokeWidth={1.8} />
  </span>
</button>
```

**Dropdown pattern** (copy from `SidebarAccount.tsx` lines 104–170):
```typescript
{open && (
  <div
    className={"zn-account-menu" + (collapsed ? " is-rail" : "")}
    role="menu"
    aria-label="Switch active subject"
  >
    <div className="zn-account-head" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
      SWITCH SUBJECT
    </div>
    <div className="zn-account-sep" />
    {subjects.map((s, i) => {
      const isActive = s.id === (activeSubjectId ?? subjects[0]?.id);
      const isOwner = i === 0;  // v1.1: first subject is always owner
      return (
        // Each row submits a hidden form — no client JS cookie writes (Pitfall 2)
        <Form key={s.id} method="post" action="/subject-switch">
          <input type="hidden" name="subjectId" value={s.id} />
          <button type="submit" className={"zn-menu-item" + (isActive ? " is-active" : "")} role="menuitem"
            style={isActive ? { fontWeight: 600, background: "var(--surface-sunken)" } : undefined}>
            <Avatar name={s.displayName} size={24} />
            {s.displayName}
            <Badge tone={isOwner ? "neutral" : "focus"} variant="soft" style={{ marginLeft: "auto" }}>
              {isOwner ? "OWNER" : "CLIENT"}
            </Badge>
            {isActive && <Check size={14} style={{ color: "var(--accent)", marginLeft: 4 }} />}
          </button>
        </Form>
      );
    })}
  </div>
)}
{open && <div className="zn-fly-backdrop" onClick={() => setOpen(false)} />}
```

**Placement in `Sidebar.tsx`** (lines 310–312 — `zn-foot` block):
```typescript
<div className="zn-foot">
  {/* SubjectChip sits ABOVE SidebarAccount (D-05) */}
  <SubjectChip subjects={subjectList} activeSubjectId={activeSubjectId} collapsed={railMode} />
  <SidebarAccount user={user} collapsed={railMode} />
</div>
```

---

### `app/routes/_app/dashboard.tsx` — MODIFY cessation null-guard

**Analog:** itself (lines 177–186)

**Current pattern** (lines 177–186 — no null guard):
```typescript
const cessation = cessationRows[0] ?? null;
const cessationDay = cessation
  ? getCessationDay(cessation.startDate.toISOString(), now)
  : 0;
const cessationPhase = getCurrentCessationPhase(cessationDay);
const targetDay = 150;
```

**Extended loader return** — add `hasCessationProgram` flag:
```typescript
const cessation = cessationRows[0] ?? null;
const hasCessationProgram = cessation !== null;  // NEW: false for client subjects without cessation log
const cessationDay = hasCessationProgram
  ? getCessationDay(
      cessation!.startDate instanceof Date
        ? cessation!.startDate.toISOString()
        : (cessation!.startDate as unknown as string),
      now
    )
  : null;  // NEW: null instead of 0 — distinguishes "no program" from "day 0"
const cessationPhase = hasCessationProgram ? getCurrentCessationPhase(cessationDay!) : null;
const targetDay = 150;

return {
  // ... existing fields ...
  hasCessationProgram,   // NEW
  cessationDay,          // changed: number | null
  cessationPhase,        // changed: Phase | null
};
```

**Component guard** — wrap the PhaseBar / cessation hero card (identify by `hasCessationProgram`):
```typescript
{hasCessationProgram ? (
  <PhaseBar ... />  // existing render
) : (
  <div>
    <div className="zt-eyebrow">PROGRAM</div>
    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-lg)" }}>
      No program started
    </div>
    <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
      Program details will appear here once a program start date is set for this client.
    </p>
  </div>
)}
```

**Same guard applies** to `app/routes/_app/protocol/index.tsx` (lines 63–71 — same null-cessation pattern):
```typescript
const cessationDay = cessation
  ? getCessationDay(..., new Date())
  : 0;  // → change to null; add hasCessationProgram flag
```

---

### Pattern-B ingest/report routes — MODIFY `getOwnerSubject` → `getActiveSubject`

**Analog:** `app/routes/_app/ingest/consent.tsx` (lines 34–42) and `app/routes/_app/ingest/upload.tsx` (lines 64–76)

**Current pattern** (consent.tsx lines 34–41 — Pattern B direct call):
```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);              // ← SWAP
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  const assignedIds = user.role === "practitioner"
    ? await listAssignedSubjectIds(ctx, user.id)
    : undefined;
  assertSubjectAccess(user, subject, user.tenantId!, assignedIds);
  ...
}
```

**After swap:**
```typescript
  const subject = await getActiveSubject(request, user.tenantId!);   // ← SWAPPED
```

Import addition: `import { getOwnerSubject, getActiveSubject } from "~/lib/data.server";` — then remove `getOwnerSubject` from the specific files being swapped.

**Files to apply this swap** (RESEARCH.md Pattern B list, excluding `settings/assignments.tsx` and 2 deferred import routes):
- `app/routes/_app/ingest/consent.tsx` — loader L35, action L60
- `app/routes/_app/ingest/index.tsx` — loader L53
- `app/routes/_app/ingest/review.tsx` — loader L59
- `app/routes/_app/ingest/upload.tsx` — action L70
- `app/routes/_app/reports/detail.tsx` — loader L55
- `app/routes/_app/reports/generate.tsx` — loader L46
- `app/routes/_app/reports/index.tsx` — loader L33

**Do NOT swap:** `app/routes/_app/settings/assignments.tsx` (intentionally owner-scoped, RESEARCH.md line 131)
**Defer:** `app/routes/_app/import/vault.tsx` and `app/routes/_app/import/whoop.tsx` (Phase 2 scope)

---

### `app/routes.ts` — MODIFY to register `/clients`

**Analog:** itself (lines 1–55)

**Registration pattern** (copy from lines 50–53 — settings routes block):
```typescript
// Clients (Phase 1 — practitioner client management)
route("clients", "routes/_app/clients/index.tsx"),
route("clients/new", "routes/_app/clients/new.tsx"),
// Subject switch resource route (action-only)
route("subject-switch", "routes/_app/subject-switch.ts"),
```

All these go inside the `layout("routes/_app/layout.tsx", [...])` block (authenticated area).

---

### Test files — Wave 0 new tests

**Analog for harness/setup:** `tests/lib/data.server.test.ts` (lines 1–60) and `tests/lib/require-subject-ctx.test.ts` (lines 1–99) and `tests/auth/invites-server.test.ts` (lines 1–230)

**Vitest import pattern** (from `require-subject-ctx.test.ts` lines 14–16):
```typescript
import { describe, it, expect } from "vitest";
import { assertSubjectAccess } from "~/lib/authz.server";
```

**DB guard pattern** (from `invites-server.test.ts` lines 23–25):
```typescript
const hasDb = !!(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
// Usage: it.skipIf(!hasDb)("...", async () => { ... });
```

**Lazy import pattern** (from `invites-server.test.ts` lines 29–64 — RED-phase safe):
```typescript
let createSubject: (...) => Promise<...>;
beforeAll(async () => {
  const mod = await import("~/lib/subjects.server");
  createSubject = mod.createSubject as typeof createSubject;
});
```

**`tests/lib/subjects.test.ts` structure:**
```typescript
describe("subjects.server.ts — module contract (ONB-01)", () => {
  it("exports createSubject, listClientSubjects, listSubjectsForTenant, getSubjectById", ...);
  it("createSubject returns a Promise", ...);
  // DB-skipped: creates a subject row with all intake fields, verifies columns
});
```

**`tests/lib/active-subject.test.ts` structure:**
```typescript
describe("getActiveSubject — cookie parsing + fallback (ONB-03)", () => {
  it("falls back to first tenant subject when cookie is absent", ...);
  it("falls back to first tenant subject when cookie subject is cross-tenant", ...);
  it("returns the cookie subject when valid and same-tenant", ...);
  it("is an exported async function", ...);
});
```

**`tests/lib/checklist.test.ts` structure:**
```typescript
describe("getChecklistStatus — 3-state logic (ONB-04)", () => {
  it("returns missing for labs when no lab_documents for subject", ...);
  it("returns in_progress for labs when lab_documents exist but no approved extraction", ...);
  it("returns done for labs when at least one approved extraction exists", ...);
  it("returns done for WHOOP when metrics with source=whoop exist", ...);
  it("returns not_sent for invite when no invite row has this subjectId", ...);
});
```

**`tests/auth/invites-server.test.ts` extensions (ONB-02 additions):**
```typescript
describe("generateInvite — subjectId threading (ONB-02)", () => {
  it("accepts optional subjectId in GenerateInviteOpts", ...);
  it.skipIf(!hasDb)("generateInvite with subjectId writes subjectId to the DB row", ...);
});

describe("resolveInviteByToken — returns subjectId (ONB-02)", () => {
  it("resolveInviteByToken return shape includes subjectId field", ...);
});
```

---

## Shared Patterns

### Authentication guard
**Source:** `app/lib/authz.server.ts` lines 31–38, 46–55
**Apply to:** All new loaders and actions (subject-switch, clients/index, clients/new, subject entity-writes in subjects.server.ts)
```typescript
// Pattern: requireUser → throws redirect(/login) if unauthenticated
const { user } = await requireUser(request);
// Pattern: requireRole → throws 403 Response for unauthorized roles
requireRole(user, ["owner", "practitioner"]);
// Fail-closed: a missing or unknown role is always denied
```

### Subject access gate
**Source:** `app/lib/authz.server.ts` lines 78–106
**Apply to:** `subject-switch.ts` action, `/clients` loader, any subject-scoped write
```typescript
// assertSubjectAccess: Gate 1 (client → 403), Gate 2 (cross-tenant → 403)
// Gate 3 (practitioner + assignedSubjectIds) is optional and scoped to write surfaces
assertSubjectAccess(user, candidate, user.tenantId!);
```

### Cookie reading (httpOnly-safe)
**Source:** `app/routes/_app/layout.tsx` lines 24–25
**Apply to:** `getActiveSubject`, `_app/layout.tsx` extended loader
```typescript
const cookie = request.headers.get("Cookie") ?? "";
const match = /(?:^|;\s*)zt-subject=([^;]+)/.exec(cookie);
const activeSubjectId = match?.[1] ?? null;
```

### Cookie writing (server-only, httpOnly)
**Source:** `app/routes/_app/subject-switch.ts` (new file) — modeled on `auth/logout.tsx` line 15
**Apply to:** `subject-switch.ts` action only (never client JS)
```typescript
return redirect(referer, {
  headers: {
    "Set-Cookie": `zt-subject=${subjectId}; Path=/; HttpOnly; SameSite=Lax`,
    // NO Max-Age or Expires — session-scoped per D-06
  },
});
```

### Admin-path DB queries (bootstrapping)
**Source:** `app/lib/data.server.ts` lines 39–44, 53–64
**Apply to:** `getActiveSubject`, `subjects.server.ts` create/list, `checklist.server.ts` invite query
```typescript
// Admin path (getDb()) not withTenantDb — used ONLY when:
// 1. subjectId is not yet known (bootstrapping TenantCtx)
// 2. Writing a new subject row (pre-context)
// 3. Querying invites by subjectId (no RLS on invites for this access pattern)
// Defense-in-depth: always scope WHERE with tenantId
const db = getDb();
```

### withTenantDb reads (RLS-governed)
**Source:** `app/lib/data.server.ts` lines 77–90
**Apply to:** `checklist.server.ts` main query body (all PHI reads)
```typescript
return withTenantDb(ctx, async (tx) => {
  return tx.select().from(table)
    .where(and(eq(table.tenantId, ctx.tenantId), eq(table.subjectId, ctx.subjectId)));
});
```

### Error response pattern (fail-closed)
**Source:** `app/lib/data.server.ts` line 61, `app/lib/authz.server.ts` lines 51–54, 86–88
**Apply to:** All new service functions
```typescript
// Throw Response (not generic Error) for HTTP-level failures
throw new Response("Subject not found", { status: 404 });
throw new Response("You don't have permission to view this.", { status: 403 });
// Catch-all → return null (fail-closed), from invites.server.ts lines 294–297
} catch { return null; }
```

### Action intent dispatch
**Source:** `app/routes/_app/settings/assignments.tsx` lines 107–182
**Apply to:** `/clients/index.tsx` action
```typescript
const intent = formData.get("_intent") as string;
if (intent === "create-client") { ... }
if (intent === "generate-invite") { ... }
return { intent: null, success: false, error: "Unknown intent" };
```

### Inline form error display
**Source:** `app/routes/_app/settings/assignments.tsx` lines 328–351
**Apply to:** `/clients/index.tsx` and `/clients/new.tsx` components
```typescript
{actionData?.error && (
  <p style={{ margin: 0, color: "var(--danger)", fontSize: "var(--text-sm)" }}>
    {actionData.error}
  </p>
)}
{actionData?.success && (
  <p style={{ margin: 0, color: "var(--vital-400)", fontSize: "var(--text-sm)" }}>
    Done.
  </p>
)}
```

### `Promise.all` multi-query loader
**Source:** `app/routes/_app/dashboard.tsx` lines 109–126
**Apply to:** `/clients/index.tsx` loader (subject list + checklist statuses per client)
```typescript
const [result1, result2, result3] = await Promise.all([
  getThingA(ctx),
  getThingB(ctx),
  getThingC(ctx),
]);
```

### Eyebrow + table header style
**Source:** `app/routes/_app/settings/assignments.tsx` lines 214, 425–440
**Apply to:** `/clients/index.tsx` component table
```typescript
<div className="zt-eyebrow" style={{ marginBottom: 8 }}>SECTION NAME</div>
// Table headers:
<th style={{
  padding: "10px 14px",
  textAlign: "left",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-2xs)",
  color: "var(--text-muted)",
  fontWeight: 400,
}}>COL HEADER</th>
```

---

## No Analog Found

No files in this phase lack an analog. All new files have direct or role-match analogs in the live codebase.

---

## Build-Gate Risk Notes

1. `getActiveSubject` and `subjects.server.ts` functions use `getDb()` — they MUST stay in `.server.ts` files. `SubjectChip.tsx` must NOT import any `.server.ts` module; it receives data only through loader props.
2. `checklist.server.ts` mixes `withTenantDb` calls with a `getDb()` call for the invites table query — both are server-only (`.server.ts` suffix handles this).
3. The `zt-subject` cookie is `httpOnly` — client components can read it from `useLoaderData` (where the loader has parsed it) but must never write it via `document.cookie`. See `AppShell.tsx` line 31 for the contrasting `zt-nav` write pattern to avoid.

---

## Metadata

**Analog search scope:** `remix-app/app/lib/`, `remix-app/app/routes/_app/`, `remix-app/app/components/shell/`, `remix-app/db/schema.ts`, `remix-app/tests/`
**Files scanned:** 22
**Pattern extraction date:** 2026-06-14
